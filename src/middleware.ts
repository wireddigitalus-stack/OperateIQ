import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes that don't need rewrites
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. Static files (e.g. /favicon.ico, /icon.png, *.svg, *.jpg, *.png)
     */
    "/((?!_next/static|_next/image|_static|favicon.ico|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host")?.toLowerCase() || "";
  const host = hostname.split(":")[0]; // Strip port if present

  // Platform and local domain patterns that shouldn't be treated as tenant custom domains
  const isPlatformHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app") ||
    host === "operateiq.com" ||
    host === "www.operateiq.com";

  // If request arrives via a custom domain from GoDaddy, IONOS, etc.
  if (!isPlatformHost) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-custom-domain", host);

    // If visiting the root of their custom domain, rewrite internally to their public site
    if (url.pathname === "/") {
      return NextResponse.rewrite(new URL("/wired-digital", req.url), {
        headers: requestHeaders,
      });
    }

    // For other paths on custom domain, pass through with custom domain header
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}
