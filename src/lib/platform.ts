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

export interface TrialCountdownInfo {
  isTrialing: boolean;
  daysRemaining: number;
  rawDaysRemaining: number;
  isExpired: boolean;
  totalDays: number;
  remainingPct: number;
  elapsedPct: number;
  endDate: Date | null;
  endDateShort: string;
  endDateFull: string;
  shortLabel: string;
  longLabel: string;
  urgency: "healthy" | "warning" | "critical" | "expired";
}

/**
 * Computes a rich 14-day trial countdown state from `trial_ends_at` (or `created_at` + 14 days fallback).
 */
export function getTrialCountdown(org?: {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
} | null): TrialCountdownInfo | null {
  if (!org) return null;
  const status = (org.subscription_status || "").toLowerCase();
  const isTrialing = status === "trialing";
  if (!isTrialing && !org.trial_ends_at) return null;

  const totalDays = 14;
  let endMs: number | null = null;

  if (org.trial_ends_at) {
    const parsed = Date.parse(org.trial_ends_at);
    if (!Number.isNaN(parsed)) endMs = parsed;
  }
  if (endMs === null && org.created_at) {
    const createdMs = Date.parse(org.created_at);
    if (!Number.isNaN(createdMs)) {
      endMs = createdMs + totalDays * 86_400_000;
    }
  }
  if (endMs === null) {
    endMs = Date.now() + totalDays * 86_400_000;
  }

  const nowMs = Date.now();
  const diffMs = endMs - nowMs;
  const rawDaysRemaining = Math.ceil(diffMs / 86_400_000);
  const daysRemaining = Math.max(0, rawDaysRemaining);
  const isExpired = diffMs <= 0;

  const remainingPct = Math.max(0, Math.min(100, Math.round((daysRemaining / totalDays) * 100)));
  const elapsedPct = Math.max(0, Math.min(100, 100 - remainingPct));

  const endDate = new Date(endMs);
  const endDateShort = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endDateFull = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  let urgency: "healthy" | "warning" | "critical" | "expired" = "healthy";
  if (isExpired) urgency = "expired";
  else if (daysRemaining <= 3) urgency = "critical";
  else if (daysRemaining <= 7) urgency = "warning";

  let shortLabel = `${daysRemaining}d left`;
  let longLabel = `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`;
  if (isExpired) {
    const daysAgo = Math.abs(rawDaysRemaining);
    shortLabel = daysAgo === 0 ? "Ended today" : `Expired ${daysAgo}d ago`;
    longLabel = daysAgo === 0 ? "Trial ended today" : `Trial expired ${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
  } else if (daysRemaining === 1) {
    shortLabel = "1d left";
    longLabel = "1 day remaining";
  }

  return {
    isTrialing,
    daysRemaining,
    rawDaysRemaining,
    isExpired,
    totalDays,
    remainingPct,
    elapsedPct,
    endDate,
    endDateShort,
    endDateFull,
    shortLabel,
    longLabel,
    urgency,
  };
}
