"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function FooterConditional() {
  const pathname = usePathname();
  // No footer on admin dashboard or crew portals — they’re apps, not pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/staff")) return null;
  return <Footer />;
}
