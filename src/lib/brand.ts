// Single source of truth for OpsIQ brand details.
export const BRAND = {
  name: "OpsIQ",
  assistant: "OpsIQ",
  tagline: "Property operations, intelligence Platform.",
  description:
    "OpsIQ is the all-in-one property management platform for small and mid-size owners — rent, tenants, maintenance, cleaning, inspections, reporting, and an AI assistant in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.getoperateiq.com",
  domain: "www.getoperateiq.com",
  email: "hello@getoperateiq.com",
  phone: "",
} as const;
