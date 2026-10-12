// Builds the OrgProfile used in AI prompts from the verified caller's org.
// Name + contact details come from the tenant's organizations row; fields we
// don't store per-org yet (location, description) fall back to getOrgProfile().
import { getOrgProfile, type OrgProfile } from "@/lib/org-profile";
import type { OrgSummary } from "@/lib/server-auth";

export function profileForOrg(org: OrgSummary | null | undefined): OrgProfile {
  const base = getOrgProfile();
  if (!org) return base;
  return {
    ...base,
    name: org.brand_name || org.name || base.name,
    phone: org.contact_phone || "",
    email: org.contact_email || "",
    website: org.custom_domain ? `https://${org.custom_domain}` : "",
  };
}
