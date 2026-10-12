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

/** Returns true if the email is a recognized Platform Super-Admin. */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
