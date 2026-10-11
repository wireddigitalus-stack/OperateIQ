"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function FooterConditional() {
  const pathname = usePathname();
  // No SaaS footer on admin dashboard, crew portals, platform console, or demo property site
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/staff") ||
    pathname?.startsWith("/platform") ||
    pathname?.startsWith("/demo-site")
  ) return null;
  return <Footer />;
}
