"use client";

import { usePathname } from "next/navigation";
import OpsIQWidget from "./OpsIQWidget";

export default function AIChatWidgetConditional() {
  const pathname = usePathname();
  // Public SaaS marketing site only — admin, staff, platform, and demo property sites have their own tools
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/staff") ||
    pathname?.startsWith("/platform") ||
    pathname?.startsWith("/demo-site")
  ) return null;
  return <OpsIQWidget />;
}
