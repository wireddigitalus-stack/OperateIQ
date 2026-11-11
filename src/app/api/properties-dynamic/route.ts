import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";
import { getPlan } from "@/lib/plans";
import {
  SAMPLE_LANDLORD_PROPERTIES,
  SAMPLE_PROP_BADGE,
  SAMPLE_PROP_PREFIX,
  isSampleProperty,
} from "@/lib/sample-data";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

/** Columns safe to expose on public marketing sites. */
const PUBLIC_COLUMNS =
  "id,name,type,address,city,sqft,lease_status,badge,badge_color,description,features,images,hero_image,in_banner,published,created_at";

async function resolveOrgIdBySlug(slug: string): Promise<string | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/organizations?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`,
    { headers: H, cache: "no-store" }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0]?.id ? (rows[0].id as string) : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publicSlug = searchParams.get("org_slug") || searchParams.get("slug");
  const pg = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });

  let orgId: string;
  let filter: string;
  let select = "*";
  if (publicSlug) {
    const resolved = await resolveOrgIdBySlug(publicSlug);
    if (!resolved) return NextResponse.json({ properties: [], tableExists: true });
    orgId = resolved;
    filter = "&published=eq.true";
    select = PUBLIC_COLUMNS;
  } else {
    const g = await requireOrg(req);
    if (!g.ok) return g.res;
    orgId = g.ctx.orgId;
    const adminMode = searchParams.get("admin") === "1";
    filter = adminMode ? "" : "&published=eq.true";
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?select=${select}&org_id=eq.${orgId}&order=created_at.desc${filter}`,
      {
        headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`properties GET (${res.status}): ${err}`),
        "Failed to load properties.",
        { route: "/api/properties-dynamic", orgId }
      );
    }
    const raw = await res.json();
    const list = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), list.length);
    const properties = publicSlug ? list.filter((p) => !isSampleProperty(p)) : list;

    return NextResponse.json({
      properties,
      tableExists: true,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: list.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load properties.", { route: "/api/properties-dynamic", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  try {
    if (body.action === "seed_demo") {
      const existingRes = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?select=*&org_id=eq.${orgId}&limit=50`,
        { headers: H, cache: "no-store" }
      );
      const existingRows = existingRes.ok ? await existingRes.json() : [];
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        return NextResponse.json({ success: true, properties: existingRows, seeded: 0 });
      }

      const demoRows = SAMPLE_LANDLORD_PROPERTIES.map((p) => ({
        id: `${SAMPLE_PROP_PREFIX}${crypto.randomUUID()}`,
        org_id: orgId,
        name: p.name,
        type: p.type,
        address: p.address || null,
        city: p.city,
        sqft: p.sqft || null,
        lease_status: "available",
        badge: SAMPLE_PROP_BADGE,
        badge_color: "#F59E0B",
        description: p.description || null,
        features: p.features || [],
        images: [p.image],
        hero_image: p.image || null,
        in_banner: false,
        published: false,
      }));

      const seedRes = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
        method: "POST",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify(demoRows),
      });
      if (!seedRes.ok) {
        const err = await seedRes.text();
        return apiErrorResponse(
          new Error(`properties seed_demo (${seedRes.status}): ${err}`),
          "Failed to load sample properties.",
          { route: "/api/properties-dynamic", orgId }
        );
      }
      const created = await seedRes.json();
      return NextResponse.json({
        success: true,
        properties: created,
        seeded: Array.isArray(created) ? created.length : 0,
      });
    }

    // Sample properties can only be created via action="seed_demo" above; never trust client is_sample on arbitrary POST
    const isSample = false;
    const rawBadge = typeof body.badge === "string" ? body.badge.trim() : null;
    const safeBadge =
      rawBadge && rawBadge.toUpperCase() === SAMPLE_PROP_BADGE.toUpperCase() ? null : rawBadge;
    const limit = getPlan(g.ctx.org.tier).limits.properties;
    if (limit !== null && !g.ctx.isSuperAdmin) {
      const countRes = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?select=id,badge&org_id=eq.${orgId}&limit=1000`,
        { headers: H, cache: "no-store" }
      );
      const existing = countRes.ok ? await countRes.json() : [];
      const realCount = Array.isArray(existing)
        ? existing.filter((p) => !isSampleProperty(p)).length
        : 0;
      if (realCount >= limit) {
        return NextResponse.json(
          {
            error:
              "You have reached the maximum number of properties for your current plan. Upgrade in Settings → Billing.",
            code: "LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
    }

    const record: Record<string, unknown> = {
      name: body.name,
      type: body.type,
      address: body.address || null,
      city: body.city,
      sqft: body.sqft || null,
      lease_status: body.lease_status || "available",
      badge: isSample ? SAMPLE_PROP_BADGE : safeBadge,
      badge_color: isSample ? "#F59E0B" : body.badge_color || "#4ADE80",
      description: body.description || null,
      features: body.features || [],
      images: body.images || [],
      hero_image: body.hero_image || null,
      in_banner: isSample ? false : !!body.in_banner,
      published: isSample ? false : !!body.published,
      org_id: orgId,
    };
    if (isSample) {
      record.id = `${SAMPLE_PROP_PREFIX}${crypto.randomUUID()}`;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`properties POST (${res.status}): ${err}`),
        "Failed to create property.",
        { route: "/api/properties-dynamic", orgId }
      );
    }
    const data = await res.json();
    return NextResponse.json({ property: data[0] });
  } catch (err) {
    return apiErrorResponse(err, "Failed to create property.", { route: "/api/properties-dynamic", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const { searchParams } = new URL(req.url);

  try {
    if (searchParams.get("clear_sample") === "1") {
      const listRes = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?select=id,name,badge&org_id=eq.${orgId}&limit=500`,
        { headers: H, cache: "no-store" }
      );
      const rows = listRes.ok ? await listRes.json() : [];
      const sampleIds = Array.isArray(rows)
        ? rows.filter((r) => isSampleProperty(r)).map((r) => String(r.id))
        : [];

      if (sampleIds.length > 0) {
        const inList = sampleIds.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
        const delRes = await fetch(
          `${SUPABASE_URL}/rest/v1/properties?org_id=eq.${orgId}&id=in.(${encodeURIComponent(inList)})`,
          { method: "DELETE", headers: H }
        );
        if (!delRes.ok) {
          const err = await delRes.text();
          return apiErrorResponse(
            new Error(`properties clear_sample (${delRes.status}): ${err}`),
            "Failed to clear sample properties.",
            { route: "/api/properties-dynamic", orgId }
          );
        }
        await fetch(
          `${SUPABASE_URL}/rest/v1/property_details?org_id=eq.${orgId}&property_id=in.(${encodeURIComponent(inList)})`,
          { method: "DELETE", headers: H }
        ).catch(() => {});
      }
      return NextResponse.json({ success: true, cleared: sampleIds.length });
    }

    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { method: "DELETE", headers: H }
    );
    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`properties DELETE (${res.status}): ${err}`),
        "Failed to delete property.",
        { route: "/api/properties-dynamic", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete property.", { route: "/api/properties-dynamic", orgId });
  }
}
