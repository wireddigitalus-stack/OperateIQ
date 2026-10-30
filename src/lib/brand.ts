// Single source of truth for PropOpsIQ brand details.
export const BRAND = {
  name: "PropOpsIQ",
  assistant: "OpsIQ",
  tagline: "Property operations, intelligence Platform.",
  description:
    "PropOpsIQ is the all-in-one property management platform for small and mid-size owners — rent, tenants, maintenance, cleaning, inspections, reporting, and an AI assistant in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.PropOpsIQ.com",
  domain: "www.PropOpsIQ.com",
  email: "hello@PropOpsIQ.com",
  phone: "",
} as const;

/**
 * Formats any platform origin into the canonical camelCase `https://www.PropOpsIQ.com`
 * while preserving tenant custom domains when present.
 */
export function formatPlatformOrigin(rawOrigin?: string | null): string {
  if (!rawOrigin) return "https://www.PropOpsIQ.com";
  const lower = rawOrigin.toLowerCase();
  if (
    lower.includes("propopsiq.com") ||
    lower.includes("getoperateiq.com") ||
    lower.includes("operateiq.com")
  ) {
    return "https://www.PropOpsIQ.com";
  }
  return rawOrigin;
}
