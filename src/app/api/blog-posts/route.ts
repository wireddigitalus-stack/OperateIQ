import { NextRequest, NextResponse } from "next/server";
import { requireOrg, sanitizeUpdate } from "@/lib/server-auth";
import { getPublicOrgSlug, resolveOrgIdBySlug } from "@/lib/public-org";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const BLOG_COLUMNS = [
  "slug",
  "title",
  "meta_title",
  "meta_description",
  "excerpt",
  "category",
  "tags",
  "read_time",
  "content",
  "status",
  "published_at",
  "author",
  "author_title",
  "image_url",
  "image_alt",
  "target_keyword",
  "updated_at",
] as const;

function pickBlog(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of BLOG_COLUMNS) if (k in body) out[k] = body[k];
  return out;
}

export async function GET(req: NextRequest) {
  const pg = parsePagination(req, { defaultLimit: 100, maxLimit: 300 });
  const publicSlug = getPublicOrgSlug(req);

  if (publicSlug) {
    try {
      const orgId = await resolveOrgIdBySlug(publicSlug);
      if (!orgId) return NextResponse.json({ posts: [] });
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/blog_posts?org_id=eq.${orgId}&status=eq.published&order=published_at.desc`,
        { headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" }, cache: "no-store" }
      );
      if (!res.ok) {
        const errText = await res.text();
        return apiErrorResponse(
          new Error(`blog_posts public GET (${res.status}): ${errText}`),
          "Failed to load blog posts.",
          { route: "/api/blog-posts", orgId }
        );
      }
      const raw = await res.json();
      const posts = Array.isArray(raw) ? raw : [];
      const total = parseContentRangeTotal(res.headers.get("content-range"), posts.length);
      return NextResponse.json({
        posts,
        pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: posts.length }),
      });
    } catch (err) {
      return apiErrorResponse(err, "Failed to load blog posts.", { route: "/api/blog-posts" });
    }
  }

  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const status = req.nextUrl.searchParams.get("status") || "published";
    const all = req.nextUrl.searchParams.get("all");
    const filter = all ? "" : `&status=eq.${encodeURIComponent(status)}`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?org_id=eq.${orgId}&order=published_at.desc${filter}`,
      { headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" }, cache: "no-store" }
    );
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`blog_posts GET (${res.status}): ${errText}`),
        "Failed to load blog posts.",
        { route: "/api/blog-posts", orgId }
      );
    }
    const raw = await res.json();
    const posts = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), posts.length);

    return NextResponse.json({
      posts,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: posts.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load blog posts.", { route: "/api/blog-posts", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "blog" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;

  const row: Record<string, unknown> = { ...pickBlog(parsed.body), org_id: orgId };
  if (!row.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?on_conflict=org_id,slug`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`blog_posts POST (${res.status}): ${errText}`),
        "Failed to save blog post.",
        { route: "/api/blog-posts", orgId }
      );
    }
    const data = await res.json();
    return NextResponse.json({ success: true, post: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save blog post.", { route: "/api/blog-posts", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "blog" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  const slug = req.nextUrl.searchParams.get("slug");
  if (!id && !slug) return NextResponse.json({ error: "id or slug required" }, { status: 400 });
  if (id === "undefined" || id === "null") return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;

  try {
    const filter = id ? `id=eq.${encodeURIComponent(id)}` : `slug=eq.${encodeURIComponent(slug!)}`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?${filter}&org_id=eq.${orgId}`, {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(pickBlog(sanitizeUpdate(parsed.body))),
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`blog_posts PATCH (${res.status}): ${errText}`),
        "Failed to update blog post.",
        { route: "/api/blog-posts", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update blog post.", { route: "/api/blog-posts", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "blog" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "DELETE",
      headers: H,
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`blog_posts DELETE (${res.status}): ${errText}`),
        "Failed to delete blog post.",
        { route: "/api/blog-posts", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete blog post.", { route: "/api/blog-posts", orgId });
  }
}
