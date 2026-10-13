import { NextRequest } from "next/server";
import { getRequestContext } from "@/lib/server-auth";

export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Resolves the verified organization ID for the current request via server-auth.
 * Falls back to DEFAULT_ORG_ID only when unauthenticated.
 */
export async function resolveCurrentOrgId(req?: NextRequest): Promise<string> {
  const ctx = await getRequestContext(req, { allowStaff: true });
  return ctx?.orgId || DEFAULT_ORG_ID;
}
