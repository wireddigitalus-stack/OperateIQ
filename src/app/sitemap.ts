import { MetadataRoute } from "next";
import { GEO_PAGES, PROPERTIES, SPACE_TYPE_PAGES } from "@/lib/data";
import { BLOG_POSTS } from "@/lib/blog-data";

const BASE_URL = "https://www.teamvisionllc.com";

// Static route last-modified dates — update when content changes
const STATIC_DATES: Record<string, string> = {
  "/":                        "2026-06-08",
  "/commercial-real-estate":  "2026-06-08",
  "/markets":                 "2026-05-01",
  "/cowork":                  "2026-05-01",
  "/executive-advisement":    "2026-05-01",
  "/about":                   "2026-05-01",
  "/contact":                 "2026-05-01",
  "/blog":                    "2026-06-08",
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                                  lastModified: new Date(STATIC_DATES["/"]),                        changeFrequency: "weekly",  priority: 1.0  },
    { url: `${BASE_URL}/commercial-real-estate`,      lastModified: new Date(STATIC_DATES["/commercial-real-estate"]),  changeFrequency: "weekly",  priority: 0.9  },
    { url: `${BASE_URL}/markets`,                     lastModified: new Date(STATIC_DATES["/markets"]),                 changeFrequency: "weekly",  priority: 0.9  },
    { url: `${BASE_URL}/cowork`,                      lastModified: new Date(STATIC_DATES["/cowork"]),                  changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/executive-advisement`,        lastModified: new Date(STATIC_DATES["/executive-advisement"]),    changeFrequency: "monthly", priority: 0.8  },
    { url: `${BASE_URL}/about`,                       lastModified: new Date(STATIC_DATES["/about"]),                   changeFrequency: "monthly", priority: 0.7  },
    { url: `${BASE_URL}/contact`,                     lastModified: new Date(STATIC_DATES["/contact"]),                 changeFrequency: "monthly", priority: 0.7  },
    { url: `${BASE_URL}/blog`,                        lastModified: new Date(STATIC_DATES["/blog"]),                    changeFrequency: "weekly",  priority: 0.85 },
    { url: `${BASE_URL}/privacy`,                     lastModified: new Date("2025-04-29"),                             changeFrequency: "yearly",  priority: 0.3  },
    { url: `${BASE_URL}/sitemap-page`,                lastModified: new Date("2026-05-01"),                             changeFrequency: "monthly", priority: 0.3  },
  ];

  // Geo landing pages — highest local SEO priority
  const geoRoutes: MetadataRoute.Sitemap = GEO_PAGES.map((geo) => ({
    url: `${BASE_URL}/markets/${geo.slug}`,
    lastModified: new Date("2026-05-01"),
    changeFrequency: "monthly" as const,
    priority: geo.isPrimary ? 0.95 : 0.85,
  }));

  // Space-type landing pages — high-value local keyword targets
  const spaceTypeRoutes: MetadataRoute.Sitemap = SPACE_TYPE_PAGES.map((page) => ({
    url: `${BASE_URL}/spaces/${page.slug}`,
    lastModified: new Date("2026-05-01"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Static blog posts from blog-data.ts
  const staticBlogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Property detail pages (static)
  const propertyRoutes: MetadataRoute.Sitemap = PROPERTIES.map((p) => ({
    url: `${BASE_URL}/properties/${p.id}`,
    lastModified: new Date("2026-05-01"),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  // ── Supabase DB blog posts — critical: every published post the VP creates ──
  // These are NOT in BLOG_POSTS (static data) and would otherwise be invisible
  // to Google until it stumbles on them. This fetches published posts and adds
  // them to the sitemap so Google discovers them immediately on next crawl.
  let dbBlogRoutes: MetadataRoute.Sitemap = [];
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (SUPABASE_URL && KEY) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/blog_posts?status=eq.published&select=slug,published_at,created_at&order=published_at.desc`,
        {
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
          next: { revalidate: 3600 }, // cache for 1 hour — sitemap doesn't need real-time updates
        }
      );
      if (res.ok) {
        const rows: { slug: string; published_at: string; created_at: string }[] = await res.json();
        // De-duplicate against static posts (imported static posts appear in both)
        const staticSlugs = new Set(BLOG_POSTS.map((p) => p.slug));
        dbBlogRoutes = rows
          .filter((r) => !staticSlugs.has(r.slug))
          .map((r) => ({
            url: `${BASE_URL}/blog/${r.slug}`,
            lastModified: new Date(r.published_at || r.created_at),
            changeFrequency: "monthly" as const,
            priority: 0.75,
          }));
      }
    }
  } catch {
    // Sitemap must never throw — a failure here would break Google's crawl
    // Fall back to static-only sitemap silently
    console.warn("[sitemap] Could not fetch DB blog posts — falling back to static list only");
  }

  return [
    ...staticRoutes,
    ...geoRoutes,
    ...spaceTypeRoutes,
    ...staticBlogRoutes,
    ...dbBlogRoutes,
    ...propertyRoutes,
  ];
}
