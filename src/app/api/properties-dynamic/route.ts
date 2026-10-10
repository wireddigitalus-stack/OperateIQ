import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminMode = searchParams.get("admin") === "1";

  const filter = adminMode ? "" : "&published=eq.true";
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?select=*&order=created_at.desc${filter}`,
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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?id=eq.${id}`,
    { method: "DELETE", headers: H }
  );
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
