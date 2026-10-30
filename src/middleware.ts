import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static assets.
     */
    "/((?!_next/static|_next/image|_static|favicon.ico|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};

const PLATFORM_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "propopsiq.com",
  "www.propopsiq.com",
  "operateiq.com",
  "www.operateiq.com",
  "getoperateiq.com",
  "www.getoperateiq.com",
]);

function isPlatformHost(host: string): boolean {
  if (PLATFORM_HOSTS.has(host) || host.endsWith(".vercel.app")) return true;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  return !!site && (host === site || host === `www.${site}`);
}

// Small edge-local cache: host → org slug (or null for unknown hosts).
const domainCache = new Map<string, { slug: string | null; expires: number }>();
const TTL_MS = 60_000;

async function resolveOrgSlugForHost(host: string): Promise<string | null> {
  const bare = host.replace(/^www\./, "");
  const hit = domainCache.get(bare);
  if (hit && hit.expires > Date.now()) return hit.slug;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let slug: string | null = null;
  if (url && key) {
    try {
      const res = await fetch(
        `${url}/rest/v1/organizations?select=slug&custom_domain=in.(${encodeURIComponent(bare)},${encodeURIComponent(`www.${bare}`)})&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      if (res.ok) {
        const rows = (await res.json()) as { slug: string }[];
        slug = rows[0]?.slug || null;
      }
    } catch {
      /* treat as unknown */
    }
  }
  domainCache.set(bare, { slug, expires: Date.now() + TTL_MS });
  return slug;
}

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];

  if (isPlatformHost(host)) return NextResponse.next();

  // ── Tenant custom domain (GoDaddy / IONOS → Vercel) ──────────────────────
  const slug = await resolveOrgSlugForHost(host);
  if (!slug) {
    // Unknown host (e.g. a platform alias not listed above): serve the app normally.
    return NextResponse.next();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-custom-domain", host);
  requestHeaders.set("x-tenant-slug", slug);

  // Public site lives at the domain root.
  if (url.pathname === "/") {
    return NextResponse.rewrite(new URL(`/site/${slug}`, req.url), { request: { headers: requestHeaders } });
  }

  // Never expose the platform console on a tenant's domain.
  if (url.pathname.startsWith("/platform")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}
