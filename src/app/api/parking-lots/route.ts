import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots?order=name.asc`, {
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
  const body = await req.json();
  const id = body.id || `lot_${Date.now()}`;
  
  const lot = {
    id,
    name: body.name,
    address: body.address,
    parent_property_id: body.parent_property_id,
    renewal_date: body.renewal_date || null,
    tax_city_annual: Number(body.tax_city_annual) || 0,
    tax_county_annual: Number(body.tax_county_annual) || 0,
    lease_price_paid: Number(body.lease_price_paid) || 0,
    notes: body.notes,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(lot),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json({ success: true, lot: data[0] });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots?id=eq.${id}`, {
    method: "DELETE",
    headers: HEADERS,
  });

  if (!res.ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
