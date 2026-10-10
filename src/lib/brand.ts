// Single source of truth for OperateIQ brand details.
// Contact info intentionally blank until the new business email/phone exist.
export const BRAND = {
  name: "OperateIQ",
  assistant: "OpsIQ",
  tagline: "Property operations, finally intelligent.",
  description:
    "OperateIQ is the all-in-one property management platform for small and mid-size owners — rent, tenants, maintenance, cleaning, inspections, reporting, and an AI assistant in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  email: "",
  phone: "",
} as const;
