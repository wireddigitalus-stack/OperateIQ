"use client";

import { usePathname } from "next/navigation";
import AIChatWidget from "./AIChatWidget";

export default function AIChatWidgetConditional() {
  const pathname = usePathname();
  // Hide on admin (CRM tool, not prospect), QR landing pages, and staff portals
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/meet") ||
    pathname?.startsWith("/staff")
  ) return null;
  return <AIChatWidget />;
}
