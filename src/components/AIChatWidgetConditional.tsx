"use client";

import { usePathname } from "next/navigation";
import OpsIQWidget from "./OpsIQWidget";

function isTenantCustomDomain(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "propopsiq.com" ||
    h === "www.propopsiq.com" ||
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

export default function AIChatWidgetConditional() {
  const pathname = usePathname();
  // Public SaaS marketing site only — admin, staff, platform, custom domains, and demo property sites have their own tools
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
  return <OpsIQWidget />;
}
