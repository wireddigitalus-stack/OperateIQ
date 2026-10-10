import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || "published";
  const all    = req.nextUrl.searchParams.get("all");
  const filter = all ? "" : `&status=eq.${status}`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?order=published_at.desc${filter}`,
    { headers: H }
  );
  if (!res.ok) return NextResponse.json({ posts: [] });
  const posts = await res.json();
  return NextResponse.json({ posts: Array.isArray(posts) ? posts : [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Upsert on slug — prevents duplicates when saving a static post for the first time.
  // If a record with this slug already exists it gets updated; otherwise a new row is inserted.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  const data = await res.json();
  return NextResponse.json({ success: true, post: Array.isArray(data) ? data[0] : data });
}

export async function PATCH(req: NextRequest) {
  const id  = req.nextUrl.searchParams.get("id");
  const slug = req.nextUrl.searchParams.get("slug");
  // Must have either a DB id or a slug to update by
  if (!id && !slug) return NextResponse.json({ error: "id or slug required" }, { status: 400 });
  if (id === "undefined" || id === "null") return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const body = await req.json();
  const filter = id ? `id=eq.${id}` : `slug=eq.${encodeURIComponent(slug!)}`;
  const res  = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?${filter}`,
    {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) return NextResponse.json({ error: "update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${id}`, {
    method: "DELETE", headers: H,
  });
  return NextResponse.json({ success: true });
}
