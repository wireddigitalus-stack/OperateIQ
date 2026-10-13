import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { getPublishedPosts } from "@/lib/blog";
import { supabaseAdmin } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND.url.replace(/\/$/, "");
  const pages = ["", "/features", "/pricing", "/blog", "/contact", "/signup", "/privacy", "/terms"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  let posts: MetadataRoute.Sitemap = [];
  try {
    posts = (await getPublishedPosts()).map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt || p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.warn("[sitemap] Failed to load blog posts:", err);
  }

  // Include published tenant public sites for Google search index
  let tenantSites: MetadataRoute.Sitemap = [];
  try {
    if (supabaseAdmin) {
      const { data: orgs } = await supabaseAdmin
        .from("organizations")
        .select("slug, updated_at")
        .not("slug", "is", null);
      if (orgs && orgs.length > 0) {
        tenantSites = orgs
          .filter((o) => o.slug && o.slug !== "demo")
          .map((o) => ({
            url: `${base}/site/${o.slug}`,
            lastModified: o.updated_at ? new Date(o.updated_at) : new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.8,
          }));
      }
    }
  } catch (err) {
    console.warn("[sitemap] Failed to load tenant sites:", err);
  }

  return [...pages, ...posts, ...tenantSites];
}
