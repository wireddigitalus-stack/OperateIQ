"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

function isTenantCustomDomain(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "getoperateiq.com" ||
    h === "www.getoperateiq.com" ||
    h === "operateiq.com" ||
    h === "www.operateiq.com" ||
    h.endsWith(".vercel.app")
  ) {
    return false;
  }
  return true;
}

export default function FooterConditional() {
  const pathname = usePathname();
  // No SaaS footer on admin dashboard, crew portals, platform console, custom domains, or demo property site
  if (
    isTenantCustomDomain() ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/staff") ||
    pathname?.startsWith("/platform") ||
    pathname?.startsWith("/demo-site") ||
    pathname?.startsWith("/site") ||
    pathname?.startsWith("/wired-digital") ||
    pathname?.toLowerCase().includes("-admin")
  ) return null;
  return <Footer />;
}
