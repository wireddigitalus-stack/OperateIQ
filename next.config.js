// Supabase storage host is derived from env so this build can only ever
// talk to the OperateIQ Supabase project configured in .env.local / Vercel.
const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
  } catch {
    return null;
  }
})();

/**
 * Content-Security-Policy. Primary goal: even if markup injection slipped
 * through, scripts can't load from or send data to attacker-controlled hosts.
 * ('unsafe-inline' scripts are still required by Next.js without nonces.)
 */
const isDev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${SUPABASE_HOST ? ` https://${SUPABASE_HOST} wss://${SUPABASE_HOST}` : ""} https://challenges.cloudflare.com${isDev ? " ws: http://localhost:*" : ""}`,
  "frame-src 'self' https://challenges.cloudflare.com",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase storage — property gallery images
      ...(SUPABASE_HOST ? [{ protocol: "https", hostname: SUPABASE_HOST }] : []),
    ],
    unoptimized: false,
  },

  // ── Security headers applied to every response ─────────────────────────────
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking — only our own domain can frame the site
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop browsers from MIME-sniffing the content-type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer info: send origin on same-site, only origin on cross-site HTTPS
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Allow camera and microphone for same-origin (crew photo capture & voice-to-text)
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
          // Enable browser XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // DNS prefetch for performance without leaking
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Enforce HTTPS everywhere for 2 years + preload (anti-SSL-stripping / MITM)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Isolate browsing context from malicious cross-origin popups/openers
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // Block Adobe Flash / PDF cross-domain policy abuse
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
      // ── No-cache for API routes — never serve stale auth responses ──────────
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Social redirect shortcut to admin login
      { source: "/l/admin", destination: "/admin/login", permanent: false },
      // Legacy bookmarks → canonical multi-tenant routes
      { source: "/wired-digital", destination: "/site/wired-digital-llc", permanent: false },
      { source: "/wired-digital-admin", destination: "/admin", permanent: false },
      { source: "/WIREDDIGITALLLC-admin", destination: "/admin", permanent: false },
    ];
  },
};

module.exports = nextConfig;
