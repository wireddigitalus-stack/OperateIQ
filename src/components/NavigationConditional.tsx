"use client";

import { usePathname } from "next/navigation";
import Navigation from "./Navigation";

export default function NavigationConditional() {
  const pathname = usePathname();
  // Dashboard and crew portals have their own UI — public nav not needed
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/staff")) return null;
  return <Navigation />;
}
