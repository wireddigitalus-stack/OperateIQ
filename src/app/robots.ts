import { MetadataRoute } from "next";
import { headers } from "next/headers";

// Allow indexing on production and custom domains unless explicitly disabled via NEXT_PUBLIC_ALLOW_INDEXING=false.
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.PropOpsIQ.com";

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!ALLOW_INDEXING) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  let baseUrl = SITE_URL.replace(/\/$/, "");
  try {
    const h = await headers();
    const customDomain = h.get("x-custom-domain");
    if (customDomain) {
      baseUrl = `https://${customDomain}`;
    }
  } catch {
    // Fallback to SITE_URL if headers() is unavailable at static build time
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth/", "/staff/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
