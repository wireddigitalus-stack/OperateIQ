// Single source of truth for PropOpsIQ brand details.
export const BRAND = {
  name: "PropOpsIQ",
  assistant: "PropOpsIQ",
  tagline: "Property operations, intelligence Platform.",
  description:
    "PropOpsIQ is the all-in-one property management platform for small and mid-size owners — rent, tenants, maintenance, cleaning, inspections, reporting, and an AI assistant in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.getoperateiq.com",
  domain: "www.getoperateiq.com",
  email: "hello@getoperateiq.com",
  phone: "",
} as const;
