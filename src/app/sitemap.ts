import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { getPublishedPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND.url.replace(/\/$/, "");
  const pages = ["", "/features", "/pricing", "/blog", "/contact", "/signup", "/privacy", "/terms"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  const posts = (await getPublishedPosts()).map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt || p.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...pages, ...posts];
}
