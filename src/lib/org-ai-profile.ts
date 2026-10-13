// Builds the OrgProfile used in AI prompts from the verified caller's org.
// Name, contact details, and location/description come from the tenant's
// organizations row + org_profile site_settings; only the seeded Demo org falls
// back to the sample ACME Regional profile.
import { getOrgProfile, type OrgProfile } from "@/lib/org-profile";
import { DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform-org";
import { BRAND } from "@/lib/brand";
import type { OrgSummary } from "@/lib/server-auth";

export function profileForOrg(org: OrgSummary | null | undefined): OrgProfile {
  const base = getOrgProfile();
  if (!org) return base;
  const isDemo = org.id === DEFAULT_PLATFORM_ORG_ID;
  const displayName = org.brand_name || org.name || (isDemo ? base.name : "Property Management");
  const customLocation = [org.city, org.state].filter(Boolean).join(", ").trim();

  return {
    name: displayName,
    location: customLocation || (isDemo ? base.location : "your local market"),
    phone: org.contact_phone || (isDemo ? base.phone : ""),
    email: org.contact_email || (isDemo ? base.email : ""),
    website: org.custom_domain ? `https://${org.custom_domain}` : "",
    description:
      org.description?.trim() ||
      (isDemo
        ? base.description
        : `${displayName} manages commercial, mixed-use, and residential properties.`),
    platform: BRAND.name,
  };
}
