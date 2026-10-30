import { COMPANY } from "@/lib/data";
import { BRAND } from "@/lib/brand";

// The CUSTOMER's company profile used in AI prompts, emails, one-sheets, etc.
// Phase 1–2: returns the sample COMPANY placeholder.
// Phase 3: resolves from the signed-in org (organizations.brand_name, contact_*).
export interface OrgProfile {
  name: string;          // customer company name, e.g. "Acme Properties"
  location: string;      // service area, e.g. "Anytown, ST"
  phone: string;         // may be ""
  email: string;         // may be ""
  website: string;       // may be ""
  description: string;   // one-line about
  platform: string;      // "OpsIQ"
}

export function getOrgProfile(): OrgProfile {
  return {
    name: COMPANY.name,
    location: `${COMPANY.city}, ${COMPANY.state}`,
    phone: COMPANY.phone,
    email: COMPANY.email,
    website: "",
    description: COMPANY.about,
    platform: BRAND.name,
  };
}

/** Contact line for AI copy — only includes details that exist. */
export function orgContactLine(o: OrgProfile = getOrgProfile()): string {
  return [o.phone, o.email, o.website].filter(Boolean).join(" · ");
}
