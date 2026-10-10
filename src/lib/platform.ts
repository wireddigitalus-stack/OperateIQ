// ─────────────────────────────────────────────────────────────────────────────
// OperateIQ Platform Super-Admin & Master Console utilities
// ─────────────────────────────────────────────────────────────────────────────

export const SUPER_ADMIN_EMAILS = [
  "wireddigitalus@gmail.com",
  ...(process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

export const IMPERSONATE_COOKIE = "oiq_impersonate_org_id";

/**
 * Returns true if the email is a recognized Platform Super-Admin
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean === "wireddigitalus@gmail.com" ||
    SUPER_ADMIN_EMAILS.includes(clean)
  );
}
