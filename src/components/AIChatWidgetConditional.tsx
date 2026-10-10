"use client";

import { usePathname } from "next/navigation";
import OpsIQWidget from "./OpsIQWidget";

export default function AIChatWidgetConditional() {
  const pathname = usePathname();
  // Public marketing site only — admin and staff portals have their own tools
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/staff")) return null;
  return <OpsIQWidget />;
}
