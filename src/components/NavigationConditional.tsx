"use client";

import { usePathname } from "next/navigation";
import Navigation from "./Navigation";

export default function NavigationConditional() {
  const pathname = usePathname();
  // Dashboard, crew portals, platform console, and ACME demo property site have their own headers
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/staff") ||
    pathname?.startsWith("/platform") ||
    pathname?.startsWith("/demo-site")
  ) return null;
  return <Navigation />;
}
