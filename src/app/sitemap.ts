import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { BRAND } from "@/lib/brand";
import { getPublishedPosts } from "@/lib/blog";
import { resolveOrgIdBySlug } from "@/lib/public-org";
import { DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform";
import { isSubscriptionActive } from "@/lib/plans";
import { isSampleProperty } from "@/lib/sample-data";
import { supabaseAdmin } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const h = await headers();
    const customDomain = h.get("x-custom-domain");
    const tenantSlug = h.get("x-tenant-slug");

    if (customDomain && tenantSlug) {
      const customBase = `https://${customDomain}`;
      const orgId = await resolveOrgIdBySlug(tenantSlug);
      const tenantPosts = orgId ? await getPublishedPosts(orgId) : [];

      return [
        {
          url: customBase,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 1,
        },
        ...(tenantPosts.length > 0
          ? [
              {
                url: `${customBase}/blog`,
                lastModified: new Date(),
                changeFrequency: "weekly" as const,
                priority: 0.8,
              },
              ...tenantPosts.map((p) => ({
                url: `${customBase}/blog/${p.slug}`,
                lastModified: new Date(p.updatedAt || p.publishedAt),
                changeFrequency: "monthly" as const,
                priority: 0.7,
              })),
            ]
          : []),
      ];
    }
  } catch {
    // Fallback to platform sitemap if headers() is not available
  }

  const base = BRAND.url.replace(/\/$/, "");
  const pages = ["", "/features", "/pricing", "/help", "/blog", "/contact", "/signup", "/privacy", "/terms"].map((p) => ({
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

  // Include ONLY explicitly published, active tenant sites (never expose unpublished customer slugs)
  let tenantSites: MetadataRoute.Sitemap = [];
  try {
    if (supabaseAdmin) {
      const [{ data: orgs }, { data: profiles }, { data: pubProps }] = await Promise.all([
        supabaseAdmin
          .from("organizations")
          .select("id, slug, custom_domain, subscription_status, trial_ends_at, updated_at")
          .not("slug", "is", null),
        supabaseAdmin
          .from("site_settings")
          .select("org_id, value")
          .eq("key", "org_profile"),
        supabaseAdmin
          .from("properties")
          .select("id, org_id, badge")
          .eq("published", true),
      ]);

      const profileMap = new Map<string, Record<string, unknown>>();
      for (const row of profiles || []) {
        const val = typeof row.value === "string" ? (() => { try { return JSON.parse(row.value); } catch { return {}; } })() : (row.value || {});
        if (val && typeof val === "object") {
          profileMap.set(row.org_id, val as Record<string, unknown>);
        }
      }

      const orgsWithPublishedRealProps = new Set<string>();
      for (const p of pubProps || []) {
        if (!isSampleProperty(p)) {
          orgsWithPublishedRealProps.add(p.org_id);
        }
      }

      if (orgs && orgs.length > 0) {
        tenantSites = orgs
          .filter((o) => {
            if (!o.slug || o.slug === "demo" || o.slug === "operateiq-demo" || o.id === DEFAULT_PLATFORM_ORG_ID) {
              return false;
            }
            if (!isSubscriptionActive(o)) return false;
            // Custom-domain tenants have their own canonical sitemap on their domain
            if (o.custom_domain) return false;

            const prof = profileMap.get(o.id);
            if (prof && typeof prof.site_published === "boolean") {
              return prof.site_published;
            }
            return orgsWithPublishedRealProps.has(o.id);
          })
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
