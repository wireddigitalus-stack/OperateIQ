import { MetadataRoute } from "next";

// Pre-launch: block ALL crawlers until OperateIQ goes live.
// This prevents any preview deploy from being indexed as duplicate content
// (which could hurt the original site this codebase was cloned from).
// To launch: set NEXT_PUBLIC_ALLOW_INDEXING=true in Vercel env.
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth/", "/staff/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
