import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/todos?order=created_at.desc`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ todos: [] });
  const todos = await res.json();
  return NextResponse.json({ todos });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = `todo_${Date.now()}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/todos`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ ...body, id }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  const data = await res.json();
  return NextResponse.json({ success: true, todo: data[0] });
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const body = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (!res.ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
