import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE } from "@/lib/platform";

export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Resolves the active organization ID for the current request.
 * Prioritizes:
 * 1. Active User Organization cookie (`oiq_active_org_id`)
 * 2. Support Impersonation cookie (`oiq_impersonate_org_id`)
 * 3. Explicit header (`x-org-id`)
 * 4. Default demo organization ID
 */
export async function resolveCurrentOrgId(req?: NextRequest): Promise<string> {
  try {
    const cookieStore = await cookies();
    const active = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
    if (active && active.trim()) {
      return active.trim();
    }
    const impersonated = cookieStore.get(IMPERSONATE_COOKIE)?.value;
    if (impersonated && impersonated.trim()) {
      return impersonated.trim();
    }
  } catch {
    // If called outside of a request context where cookies() isn't accessible
  }

  if (req) {
    const headerOrgId = req.headers.get("x-org-id");
    if (headerOrgId && headerOrgId.trim()) {
      return headerOrgId.trim();
    }
  }

  return DEFAULT_ORG_ID;
}
