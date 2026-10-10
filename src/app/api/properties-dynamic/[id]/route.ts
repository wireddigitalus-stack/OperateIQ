import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await req.json();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) { const err = await res.text(); return NextResponse.json({ error: err }, { status: 500 }); }
  const data = await res.json();
  return NextResponse.json({ property: data[0] });
}

export async function DELETE(_: NextRequest, { params }: Props) {
  const { id } = await params;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?id=eq.${id}`, {
    method: "DELETE",
    headers: H,
  });
  if (!res.ok) { const err = await res.text(); return NextResponse.json({ error: err }, { status: 500 }); }
  return NextResponse.json({ success: true });
}
