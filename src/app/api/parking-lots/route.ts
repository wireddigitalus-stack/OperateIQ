import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots?org_id=eq.${orgId}&order=name.asc`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes("does not exist")) return NextResponse.json({ needsMigration: true });
    return NextResponse.json({ lots: [] });
  }
  const lots = await res.json();
  return NextResponse.json({ lots });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const body = await req.json();
  const suppliedId = body.id ? String(body.id) : null;

  const fields = {
    name: body.name || "",
    address: body.address || "",
    city: body.city ?? "",
    county: body.county ?? "",
    parent_property_id: body.parent_property_id ?? body.associated_property_id ?? null,
    associated_property_id: body.associated_property_id ?? body.parent_property_id ?? null,
    renewal_date: body.renewal_date || null,
    tax_city_annual: Number(body.tax_city_annual ?? body.city_tax ?? 0) || 0,
    city_tax: Number(body.city_tax ?? body.tax_city_annual ?? 0) || 0,
    tax_county_annual: Number(body.tax_county_annual ?? body.county_tax ?? 0) || 0,
    county_tax: Number(body.county_tax ?? body.tax_county_annual ?? 0) || 0,
    lease_price_paid: Number(body.lease_price_paid ?? body.price_paid ?? 0) || 0,
    price_paid: Number(body.price_paid ?? body.lease_price_paid ?? 0) || 0,
    notes: body.notes ?? "",
    updated_at: new Date().toISOString(),
  };

  // Update an existing lot only if it belongs to this org …
  if (suppliedId) {
    const upd = await fetch(
      `${SUPABASE_URL}/rest/v1/parking_lots?id=eq.${encodeURIComponent(suppliedId)}&org_id=eq.${orgId}`,
      { method: "PATCH", headers: { ...HEADERS, Prefer: "return=representation" }, body: JSON.stringify(fields) }
    );
    if (!upd.ok) return NextResponse.json({ error: await upd.text() }, { status: 500 });
    const rows = await upd.json();
    if (Array.isArray(rows) && rows.length) return NextResponse.json({ success: true, lot: rows[0] });
  }

  // … otherwise insert a new one with a fresh UUID so a client-supplied id can never collide with another tenant's global PK.
  const insertId = crypto.randomUUID();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ id: insertId, ...fields, org_id: orgId }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json({ success: true, lot: data[0] });
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
    method: "DELETE",
    headers: HEADERS,
  });

  if (!res.ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
