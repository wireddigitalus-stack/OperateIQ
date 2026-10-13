/**
 * The organization that owns OperateIQ's own marketing traffic (homepage,
 * pricing, platform contact form). Since 002_tenancy_hardening.sql removed the
 * org_id column default, rows that don't belong to a tenant must name this org
 * explicitly. Override with PLATFORM_ORG_ID; defaults to the seeded demo/platform org.
 */
export const DEFAULT_PLATFORM_ORG_ID = "00000000-0000-0000-0000-000000000001";

export function platformOrgId(): string {
  return process.env.PLATFORM_ORG_ID?.trim() || DEFAULT_PLATFORM_ORG_ID;
}
