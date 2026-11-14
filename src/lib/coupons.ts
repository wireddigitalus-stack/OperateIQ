import { supabaseAdmin } from "@/lib/supabase";
import { BETA_TRIAL_DAYS, resolveBetaInviteCode, type Tier } from "@/lib/plans";

export interface CouponCode {
  code: string;
  plan: Tier;
  trialDays: number;
  maxUses: number | null;
  uses: number;
  active: boolean;
  expiresAt: string | null;
  note: string;
  recipientEmail?: string;
  recipientPhone?: string;
  createdAt: string;
  lastUsedAt?: string | null;
  redeemedBy?: string[];
}

export interface ResolvedCoupon {
  code: string;
  plan: Tier;
  trialDays: number;
  source: "dynamic" | "static";
}

const SECTION = "platform_coupons";
const KEY = "registry";
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // excludes 0/O, 1/I/L for human readability

export function normalizeCouponCode(raw?: string | null): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}

export function generateRandomCouponCode(prefix = "BETA"): string {
  const cleanPrefix = normalizeCouponCode(prefix) || "BETA";
  const seg = (len: number) =>
    Array.from({ length: len }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
  return `${cleanPrefix}-${seg(4)}-${seg(4)}`;
}

async function getPlatformAnchorOrgId(): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  return data?.[0]?.id ? String(data[0].id) : null;
}

export async function loadCoupons(): Promise<CouponCode[]> {
  if (!supabaseAdmin) return [];
  const orgId = await getPlatformAnchorOrgId();
  if (!orgId) return [];

  const { data } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("org_id", orgId)
    .eq("section", SECTION)
    .eq("key", KEY)
    .limit(1);

  const raw = data?.[0]?.value;
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as CouponCode[]) : [];
  } catch {
    return [];
  }
}

export async function saveCoupons(coupons: CouponCode[]): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error("Database admin client is not configured.");
  }
  const orgId = await getPlatformAnchorOrgId();
  if (!orgId) {
    throw new Error("No platform anchor organization found.");
  }

  const { error } = await supabaseAdmin.from("site_content").upsert(
    {
      org_id: orgId,
      section: SECTION,
      key: KEY,
      value: JSON.stringify(coupons),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,section,key" }
  );
  if (error) {
    throw new Error(error.message);
  }
}

export function isCouponRedeemable(c: CouponCode, now = new Date()): { ok: boolean; reason?: string } {
  if (!c.active) return { ok: false, reason: "This code is currently paused." };
  if (c.expiresAt) {
    const exp = new Date(c.expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime()) {
      return { ok: false, reason: "This code has expired." };
    }
  }
  if (c.maxUses !== null && c.uses >= c.maxUses) {
    return { ok: false, reason: "This code has reached its maximum number of redemptions." };
  }
  return { ok: true };
}

export async function validateAndResolveCoupon(
  rawCode?: string | null
): Promise<{ valid: boolean; coupon?: ResolvedCoupon; error?: string }> {
  const clean = normalizeCouponCode(rawCode);
  if (!clean) return { valid: false };

  // 1. Check dynamic coupon registry first
  const coupons = await loadCoupons();
  const match = coupons.find((c) => normalizeCouponCode(c.code) === clean);
  if (match) {
    const check = isCouponRedeemable(match);
    if (!check.ok) {
      return { valid: false, error: check.reason };
    }
    return {
      valid: true,
      coupon: {
        code: match.code,
        plan: match.plan,
        trialDays: match.trialDays,
        source: "dynamic",
      },
    };
  }

  // 2. Fallback to built-in static beta codes
  const staticCode = resolveBetaInviteCode(clean);
  if (staticCode) {
    return {
      valid: true,
      coupon: {
        code: staticCode,
        plan: "pro",
        trialDays: BETA_TRIAL_DAYS,
        source: "static",
      },
    };
  }

  return { valid: false, error: "Invalid invite or coupon code." };
}

export async function recordCouponRedemption(code: string, email: string): Promise<void> {
  const clean = normalizeCouponCode(code);
  if (!clean) return;
  const coupons = await loadCoupons();
  const idx = coupons.findIndex((c) => normalizeCouponCode(c.code) === clean);
  if (idx === -1) return;

  const current = coupons[idx];
  const prevEmails = Array.isArray(current.redeemedBy) ? current.redeemedBy : [];
  const nextEmails = [email, ...prevEmails.filter((e) => e !== email)].slice(0, 20);

  coupons[idx] = {
    ...current,
    uses: (current.uses || 0) + 1,
    lastUsedAt: new Date().toISOString(),
    redeemedBy: nextEmails,
  };
  await saveCoupons(coupons);
}
