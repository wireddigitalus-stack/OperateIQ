// ─────────────────────────────────────────────────────────────────────────────
// OperateIQ Platform Super-Admin & Master Console utilities
//
// SECURITY: super-admin status is only ever *trusted* on the server, where it
// is checked against the VERIFIED Supabase session email (see server-auth.ts).
// Client-side calls to isSuperAdmin() are for UI visibility only.
//
// Configure additional platform admins with the server-only env var
// PLATFORM_ADMIN_EMAILS (comma-separated). NEXT_PUBLIC_ADMIN_EMAILS is no
// longer treated as super-admin (it ships to every browser).
// ─────────────────────────────────────────────────────────────────────────────

/** Founding platform owner. TODO: move to PLATFORM_ADMIN_EMAILS once a dedicated platform-admin email exists. */
const FOUNDER_EMAIL = "wireddigitalus@gmail.com";

export const SUPER_ADMIN_EMAILS = [
  FOUNDER_EMAIL,
  ...(process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

export const ACTIVE_ORG_COOKIE = "oiq_active_org_id";
export const IMPERSONATE_COOKIE = "oiq_impersonate_org_id";
export const DEFAULT_PLATFORM_ORG_ID = "00000000-0000-0000-0000-000000000001";

/** Returns true if the email is a recognized Platform Super-Admin. */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Unambiguous 32-character alphabet (no 0/O/1/I) for phone-safe Customer Support Codes.
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates or normalizes a deterministic, human-readable Customer Support Code (`OIQ-XXXX`)
 * from an organization's UUID (or an explicit stored `customCode`).
 * Works identically on server and client with zero database migrations required.
 */
export function getCustomerCode(
  orgId: string | null | undefined,
  customCode?: string | null
): string {
  if (customCode && typeof customCode === "string") {
    const cleaned = customCode.trim().toUpperCase();
    if (/^OIQ-[A-Z0-9]{4,8}$/.test(cleaned)) return cleaned;
  }
  if (!orgId) return "OIQ-0000";
  const normalized = orgId.trim().toLowerCase();
  if (normalized === DEFAULT_PLATFORM_ORG_ID) return "OIQ-DEMO";

  // FNV-1a 32-bit hash over the UUID string for uniform 20-bit code distribution
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }

  const chars: string[] = [];
  let v = (h1 ^ (h2 >>> 3)) >>> 0;
  for (let i = 0; i < 4; i++) {
    chars.push(CODE_ALPHABET[v & 31]);
    v = (v >>> 5) ^ ((h2 >>> (i * 4)) & 31);
  }
  return `OIQ-${chars.join("")}`;
}
