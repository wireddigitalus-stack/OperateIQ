import { NextResponse } from "next/server";
import { BLOG_POSTS } from "@/lib/blog-data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

/**
 * POST /api/blog-import-static
 * Seeds all static BLOG_POSTS from blog-data.ts into Supabase.
 * Only imports slugs that don't already exist (idempotent).
 * Returns { imported: string[], skipped: string[], errors: string[] }
 */
export async function POST() {
  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const post of BLOG_POSTS) {
    // Check if slug already exists in DB
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(post.slug)}&select=slug`,
      { headers: H }
    );
    const existing = await checkRes.json();
    if (Array.isArray(existing) && existing.length > 0) {
      skipped.push(post.slug);
      continue;
    }

    // Insert the full post with content from the static file
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
      method: "POST",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({
        slug: post.slug,
        title: post.title,
        meta_title: post.metaTitle || post.title,
        meta_description: post.metaDescription || "",
        excerpt: post.excerpt || "",
        category: post.category || "Market Reports",
        tags: post.tags || [],
        read_time: post.readTime || 5,
        content: post.content || "",
        status: "published",
        published_at: post.publishedAt
          ? new Date(post.publishedAt).toISOString()
          : new Date().toISOString(),
        author: post.author || "Vision LLC",
        author_title: post.authorTitle || "Commercial Real Estate",
        image_url: post.image || "",
        image_alt: post.imageAlt || "",
      }),
    });

    if (insertRes.ok || insertRes.status === 201) {
      imported.push(post.slug);
    } else {
      const errText = await insertRes.text();
      // Treat unique constraint violations as "already exists" (race condition)
      if (errText.includes("duplicate") || errText.includes("unique")) {
        skipped.push(post.slug);
      } else {
        errors.push(`${post.slug}: ${errText}`);
      }
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}

/**
 * GET /api/blog-import-static
 * Returns which static posts are already in the DB vs. not yet imported.
 */
export async function GET() {
  const slugs = BLOG_POSTS.map(p => p.slug);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=in.(${slugs.map(s => `"${s}"`).join(",")})&select=slug`,
    { headers: H }
  );

  const existing = await res.json();
  const existingSlugs = new Set(
    Array.isArray(existing) ? existing.map((r: { slug: string }) => r.slug) : []
  );

  return NextResponse.json({
    total: slugs.length,
    inDatabase: slugs.filter(s => existingSlugs.has(s)),
    notImported: slugs.filter(s => !existingSlugs.has(s)),
    posts: BLOG_POSTS.map(p => ({
      slug: p.slug,
      title: p.title,
      inDatabase: existingSlugs.has(p.slug),
    })),
  });
}
