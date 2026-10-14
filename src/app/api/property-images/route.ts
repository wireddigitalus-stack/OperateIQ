import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};
const BUCKET = "property-images";
// Upserts are always resolved against the org-scoped primary key (org_id, property_id)
const UPSERT_URL = `${SUPABASE_URL}/rest/v1/property_image_overrides?on_conflict=org_id,property_id`;

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

async function ensureBucket() {
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  // Ignore 409 (already exists)
}

/** GET — fetch all overrides (hero_url + all_urls) for the caller's org */
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}`,
    { headers: H, cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json({ overrides: Array.isArray(data) ? data : [] });
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** POST — upload a single image file for a property, append to its gallery */
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const form = await req.formData();
  const file       = form.get("file") as File | null;
  const propertyId = form.get("propertyId") as string | null;

  if (!file || !propertyId)
    return NextResponse.json({ error: "file and propertyId required" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return NextResponse.json({ error: "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF." }, { status: 400 });

  await ensureBucket();

  const ext      = (file.name.split(".").pop()?.toLowerCase() || "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
  const safeProp = propertyId.replace(/[^a-zA-Z0-9_-]/g, "_");
  // Object paths are always namespaced by the caller's org
  const filename = `${orgId}/${safeProp}-${Date.now()}.${ext}`;
  const buffer   = await file.arrayBuffer();

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
    console.error("Storage upload error:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

  // Fetch existing record to merge all_urls
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(propertyId)}`,
    { headers: H, cache: "no-store" }
  );
  const existing = await existingRes.json();
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
          existingAllUrls = propRow.images.filter((u: unknown) => typeof u === "string" && u.trim()) as string[];
        } else if (typeof propRow.hero_image === "string" && propRow.hero_image.trim()) {
          existingAllUrls = [propRow.hero_image];
        }
        if (!initialHero && typeof propRow.hero_image === "string" && propRow.hero_image.trim()) {
          initialHero = propRow.hero_image;
        }
      }
    }
  }

  const newAllUrls = existingAllUrls.includes(publicUrl) ? existingAllUrls : [...existingAllUrls, publicUrl];
  const heroUrl = initialHero || existingAllUrls[0] || publicUrl;

  // Upsert with merged all_urls + preserve/set hero_url
  await fetch(UPSERT_URL, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      org_id:      orgId,
      property_id: propertyId,
      image_url:   heroUrl,       // legacy compat field
      hero_url:    heroUrl,
      all_urls:    newAllUrls,
      updated_at:  new Date().toISOString(),
    }),
  });

  // Also sync directly to public.properties row if it exists in this org
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
}

/** PATCH — update hero_url and/or all_urls for a property (no file upload) */
export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const { propertyId, heroUrl, allUrls } = await req.json();

  if (!propertyId)
    return NextResponse.json({ error: "propertyId required" }, { status: 400 });

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (heroUrl !== undefined) { body.hero_url = heroUrl; body.image_url = heroUrl; }
  if (allUrls !== undefined) { body.all_urls = allUrls; }

  // ── Step 1: Try to UPDATE the existing row by property_id ───────────────
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(propertyId)}`,
    {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(body),
    }
  );

  const updated = await updateRes.json();

  // ── Step 2: If no row existed, INSERT a new one ─────────────────────────
  if (!Array.isArray(updated) || updated.length === 0) {
    await fetch(UPSERT_URL, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ ...body, property_id: propertyId, org_id: orgId }),
    });
  }

  // Also sync directly to public.properties row
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
}


/**
 * DELETE — remove a single image file from Supabase Storage AND update the DB.
 * Body: { propertyId: string, url: string }
 */
export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const { propertyId, url } = await req.json();

  if (!propertyId || !url)
    return NextResponse.json({ error: "propertyId and url required" }, { status: 400 });

  // ── 1. Extract the storage filename from the public URL ─────────────────
  // URL format: <SUPABASE_URL>/storage/v1/object/public/property-images/<orgId>/<filename>
  const rawName = String(url).split(`/storage/v1/object/public/${BUCKET}/`)[1];
  const filename = rawName ? decodeURIComponent(rawName.split("?")[0]) : "";

  // Only objects inside the caller's org folder may be deleted from storage.
  // Legacy (un-prefixed) or foreign objects are left in place; the URL is still
  // removed from this org's gallery below.
  if (filename && filename.startsWith(`${orgId}/`) && !filename.includes("..")) {
    const deleteRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(filename)}`,
      {
        method: "DELETE",
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      }
    );
    if (!deleteRes.ok) {
      const err = await deleteRes.text();
      console.error("Storage delete error:", err);
      // Don't hard-fail — still update the DB record so the UI stays consistent
    }
  }

  // ── 2. Fetch the current DB record (seed from public.properties if empty) ──
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(propertyId)}`,
    { headers: H, cache: "no-store" }
  );
  const existing = await existingRes.json();
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
          prevAll = propRow.images.filter((u: unknown) => typeof u === "string" && u.trim()) as string[];
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
    return NextResponse.json({ success: true }); // nothing to update
  }

  // ── 3. Remove the URL from all_urls, promote a new hero if needed ───────
  const updatedUrls = prevAll.filter((u: string) => u !== url);
  const newPrimary = currentHero === url ? (updatedUrls[0] ?? null) : (currentHero ?? updatedUrls[0] ?? null);

  await fetch(UPSERT_URL, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      org_id:      orgId,
      property_id: propertyId,
      hero_url:    newPrimary,
      image_url:   newPrimary, // legacy compat
      all_urls:    updatedUrls,
      updated_at:  new Date().toISOString(),
    }),
  });

  // Also sync directly to public.properties row
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
}
