// Supabase storage host is derived from env so this build can only ever
// talk to the OperateIQ Supabase project configured in .env.local / Vercel.
const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
  } catch {
    return null;
  }
})();

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
          // Disable browser features we don't need
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Enable browser XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // DNS prefetch for performance without leaking
          { key: "X-DNS-Prefetch-Control", value: "on" },
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
    ];
  },
};

module.exports = nextConfig;
