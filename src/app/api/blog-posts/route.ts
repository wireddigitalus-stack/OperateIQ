import { NextRequest, NextResponse } from "next/server";
import { requireOrg, sanitizeUpdate } from "@/lib/server-auth";
import { getPublicOrgSlug, resolveOrgIdBySlug } from "@/lib/public-org";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const BLOG_COLUMNS = [
  "slug", "title", "meta_title", "meta_description", "excerpt", "category", "tags",
  "read_time", "content", "status", "published_at", "author", "author_title",
  "image_url", "image_alt", "target_keyword", "updated_at",
] as const;

function pickBlog(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of BLOG_COLUMNS) if (k in body) out[k] = body[k];
  return out;
}

/**
 * GET /api/blog-posts
 *  • Public: `?org_slug=<org>` → published posts for that org only.
 *  • Authenticated: caller's org; `?all=1` includes drafts, `?status=` filters.
 */
export async function GET(req: NextRequest) {
  const publicSlug = getPublicOrgSlug(req);
  if (publicSlug) {
    const orgId = await resolveOrgIdBySlug(publicSlug);
    if (!orgId) return NextResponse.json({ posts: [] });
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?org_id=eq.${orgId}&status=eq.published&order=published_at.desc`,
      { headers: H }
    );
    if (!res.ok) return NextResponse.json({ posts: [] });
    const posts = await res.json();
    return NextResponse.json({ posts: Array.isArray(posts) ? posts : [] });
  }

  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const status = req.nextUrl.searchParams.get("status") || "published";
  const all    = req.nextUrl.searchParams.get("all");
  const filter = all ? "" : `&status=eq.${encodeURIComponent(status)}`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?org_id=eq.${orgId}&order=published_at.desc${filter}`,
    { headers: H }
  );
  if (!res.ok) return NextResponse.json({ posts: [] });
  const posts = await res.json();
  return NextResponse.json({ posts: Array.isArray(posts) ? posts : [] });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const body = (await req.json()) as Record<string, unknown>;
  const row: Record<string, unknown> = { ...pickBlog(body), org_id: orgId };
  if (!row.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  // Upsert on (org_id, slug) — prevents duplicates when saving a static post for the first time.
  // If a record with this slug already exists in this org it gets updated; otherwise a new row is inserted.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?on_conflict=org_id,slug`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  const data = await res.json();
  return NextResponse.json({ success: true, post: Array.isArray(data) ? data[0] : data });
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id  = req.nextUrl.searchParams.get("id");
  const slug = req.nextUrl.searchParams.get("slug");
  // Must have either a DB id or a slug to update by
  if (!id && !slug) return NextResponse.json({ error: "id or slug required" }, { status: 400 });
  if (id === "undefined" || id === "null") return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const body = (await req.json()) as Record<string, unknown>;
  const filter = id ? `id=eq.${encodeURIComponent(id)}` : `slug=eq.${encodeURIComponent(slug!)}`;
  const res  = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?${filter}&org_id=eq.${orgId}`,
    {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(pickBlog(sanitizeUpdate(body))),
    }
  );
  if (!res.ok) return NextResponse.json({ error: "update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
    method: "DELETE", headers: H,
  });
  return NextResponse.json({ success: true });
}
