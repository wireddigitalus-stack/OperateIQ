import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};
const BUCKET = "property-images";
const UPSERT_URL = `${SUPABASE_URL}/rest/v1/property_image_overrides?on_conflict=org_id,property_id`;

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

async function ensureBucket() {
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
}

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 250, maxLimit: 500 });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}`, {
      headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`property-images GET (${res.status}): ${errText}`),
        "Failed to load property images.",
        { route: "/api/property-images", orgId }
      );
    }
    const data = await res.json();
    const overrides = Array.isArray(data) ? data : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), overrides.length);

    return NextResponse.json({
      overrides,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: overrides.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load property images.", { route: "/api/property-images", orgId });
  }
}

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
];
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const propertyId = form.get("propertyId") as string | null;

    if (!file || !propertyId)
      return NextResponse.json({ error: "file and propertyId required" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
    const isAllowedImage =
      ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
      (!file.type && IMAGE_EXT_RE.test(file.name));
    if (!isAllowedImage)
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF, HEIC." },
        { status: 400 }
      );

    await ensureBucket();

    const ext = (file.name.split(".").pop()?.toLowerCase() || "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
    const safeProp = propertyId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${orgId}/${safeProp}-${Date.now()}.${ext}`;
    const buffer = await file.arrayBuffer();

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(filename)}`,
      {
        method: "POST",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": file.type || "image/jpeg",
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return apiErrorResponse(
        new Error(`Storage upload error (${uploadRes.status}): ${err}`),
        "Failed to upload property photo.",
        { route: "/api/property-images", orgId }
      );
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(propertyId)}`,
      { headers: H, cache: "no-store" }
    );
    const existing = existingRes.ok ? await existingRes.json() : [];
    const existingRow = Array.isArray(existing) ? existing[0] : null;

    let existingAllUrls: string[] =
      Array.isArray(existingRow?.all_urls) && existingRow.all_urls.length > 0
        ? existingRow.all_urls
        : existingRow?.image_url
          ? [existingRow.image_url]
          : [];
    let initialHero: string | null = existingRow?.hero_url || existingRow?.image_url || null;

    if (existingAllUrls.length === 0) {
      const propRes = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&org_id=eq.${orgId}&select=images,hero_image`,
        { headers: H, cache: "no-store" }
      );
      if (propRes.ok) {
        const propRows = await propRes.json();
        const propRow = Array.isArray(propRows) ? propRows[0] : null;
        if (propRow) {
          if (Array.isArray(propRow.images) && propRow.images.length > 0) {
            existingAllUrls = propRow.images.filter(
              (u: unknown) => typeof u === "string" && u.trim()
            ) as string[];
          } else if (typeof propRow.hero_image === "string" && propRow.hero_image.trim()) {
            existingAllUrls = [propRow.hero_image];
          }
          if (!initialHero && typeof propRow.hero_image === "string" && propRow.hero_image.trim()) {
            initialHero = propRow.hero_image;
          }
        }
      }
    }

    const newAllUrls = existingAllUrls.includes(publicUrl)
      ? existingAllUrls
      : [...existingAllUrls, publicUrl];
    const heroUrl = initialHero || existingAllUrls[0] || publicUrl;

    await fetch(UPSERT_URL, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        org_id: orgId,
        property_id: propertyId,
        image_url: heroUrl,
        hero_url: heroUrl,
        all_urls: newAllUrls,
        updated_at: new Date().toISOString(),
      }),
    });

    await fetch(
      `${SUPABASE_URL}/rest/v1/properties?org_id=eq.${orgId}&id=eq.${encodeURIComponent(propertyId)}`,
      {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({
          hero_image: heroUrl,
          images: newAllUrls,
          updated_at: new Date().toISOString(),
        }),
      }
    ).catch(() => {});

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    return apiErrorResponse(err, "Failed to upload property photo.", { route: "/api/property-images", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const { propertyId, heroUrl, allUrls } = parsed.body as {
    propertyId?: string;
    heroUrl?: string | null;
    allUrls?: string[];
  };

  if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });

  try {
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (heroUrl !== undefined) {
      body.hero_url = heroUrl;
      body.image_url = heroUrl;
    }
    if (allUrls !== undefined) {
      body.all_urls = allUrls;
    }

    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(propertyId)}`,
      {
        method: "PATCH",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify(body),
      }
    );

    const updated = updateRes.ok ? await updateRes.json() : [];

    if (!Array.isArray(updated) || updated.length === 0) {
      const insRes = await fetch(UPSERT_URL, {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ ...body, property_id: propertyId, org_id: orgId }),
      });
      if (!insRes.ok) {
        const errText = await insRes.text();
        return apiErrorResponse(
          new Error(`property-images PATCH upsert (${insRes.status}): ${errText}`),
          "Failed to update property gallery.",
          { route: "/api/property-images", orgId }
        );
      }
    }

    const propPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (heroUrl !== undefined) propPatch.hero_image = heroUrl;
    if (allUrls !== undefined) propPatch.images = allUrls;
    await fetch(
      `${SUPABASE_URL}/rest/v1/properties?org_id=eq.${orgId}&id=eq.${encodeURIComponent(propertyId)}`,
      {
        method: "PATCH",
        headers: H,
        body: JSON.stringify(propPatch),
      }
    ).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update property gallery.", { route: "/api/property-images", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<{ propertyId?: string; url?: string }>(req);
  if (!parsed.ok) return parsed.res;
  const { propertyId, url } = parsed.body;

  if (!propertyId || !url)
    return NextResponse.json({ error: "propertyId and url required" }, { status: 400 });

  try {
    const rawName = String(url).split(`/storage/v1/object/public/${BUCKET}/`)[1];
    const filename = rawName ? decodeURIComponent(rawName.split("?")[0]) : "";

    if (filename && filename.startsWith(`${orgId}/`) && !filename.includes("..")) {
      const deleteRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(filename)}`,
        {
          method: "DELETE",
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
        }
      );
      if (!deleteRes.ok) {
        console.error("Storage delete error:", await deleteRes.text());
      }
    }

    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(propertyId)}`,
      { headers: H, cache: "no-store" }
    );
    const existing = existingRes.ok ? await existingRes.json() : [];
    const existingRow = Array.isArray(existing) ? existing[0] : null;

    let prevAll: string[] =
      Array.isArray(existingRow?.all_urls) && existingRow.all_urls.length > 0
        ? existingRow.all_urls
        : existingRow?.image_url
          ? [existingRow.image_url]
          : [];
    let currentHero: string | null = existingRow?.hero_url || existingRow?.image_url || null;

    if (prevAll.length === 0) {
      const propRes = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&org_id=eq.${orgId}&select=images,hero_image`,
        { headers: H, cache: "no-store" }
      );
      if (propRes.ok) {
        const propRows = await propRes.json();
        const propRow = Array.isArray(propRows) ? propRows[0] : null;
        if (propRow) {
          if (Array.isArray(propRow.images) && propRow.images.length > 0) {
            prevAll = propRow.images.filter(
              (u: unknown) => typeof u === "string" && u.trim()
            ) as string[];
          } else if (typeof propRow.hero_image === "string" && propRow.hero_image.trim()) {
            prevAll = [propRow.hero_image];
          }
          if (!currentHero && typeof propRow.hero_image === "string" && propRow.hero_image.trim()) {
            currentHero = propRow.hero_image;
          }
        }
      }
    }

    if (!existingRow && prevAll.length === 0) {
      return NextResponse.json({ success: true });
    }

    const updatedUrls = prevAll.filter((u: string) => u !== url);
    const newPrimary =
      currentHero === url ? updatedUrls[0] ?? null : currentHero ?? updatedUrls[0] ?? null;

    await fetch(UPSERT_URL, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        org_id: orgId,
        property_id: propertyId,
        hero_url: newPrimary,
        image_url: newPrimary,
        all_urls: updatedUrls,
        updated_at: new Date().toISOString(),
      }),
    });

    await fetch(
      `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&org_id=eq.${orgId}`,
      {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({
          hero_image: newPrimary,
          images: updatedUrls,
          updated_at: new Date().toISOString(),
        }),
      }
    ).catch(() => {});

    return NextResponse.json({ success: true, remaining: updatedUrls.length });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete property image.", { route: "/api/property-images", orgId });
  }
}
