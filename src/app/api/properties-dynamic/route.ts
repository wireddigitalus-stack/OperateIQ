import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

/**
 * GET
 *  • Public mode:  ?org_slug=<slug> (or ?slug=<slug>) → published properties of that org only.
 *  • Authed mode:  org members get their own org's properties. `?admin=1` includes unpublished.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publicSlug = searchParams.get("org_slug") || searchParams.get("slug");

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

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?select=${select}&org_id=eq.${orgId}&order=created_at.desc${filter}`,
    { headers: H, cache: "no-store" }
  );
  if (!res.ok) {
    const err = await res.text();
    if (err.includes("42P01") || err.includes("does not exist")) {
      return NextResponse.json({ properties: [], tableExists: false });
    }
    return NextResponse.json({ error: err }, { status: 500 });
  }
  const properties = await res.json();
  return NextResponse.json({ properties, tableExists: true });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const body = await req.json();
  const record = {
    name: body.name,
    type: body.type,
    address: body.address || null,
    city: body.city,
    sqft: body.sqft || null,
    lease_status: body.lease_status || "available",
    badge: body.badge || null,
    badge_color: body.badge_color || "#4ADE80",
    description: body.description || null,
    features: body.features || [],
    images: body.images || [],
    hero_image: body.hero_image || null,
    in_banner: !!body.in_banner,
    published: !!body.published,
    org_id: orgId,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("42P01") || err.includes("does not exist")) {
      return NextResponse.json({ error: "TABLE_MISSING" }, { status: 422 });
    }
    return NextResponse.json({ error: err }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json({ property: data[0] });
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
    { method: "DELETE", headers: H }
  );
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
