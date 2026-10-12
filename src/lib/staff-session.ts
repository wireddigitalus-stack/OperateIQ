// ─────────────────────────────────────────────────────────────────────────────
// Signed, httpOnly session cookie for PIN-based crew portals (maintenance /
// cleaning). Payload is HMAC-SHA256 signed so it cannot be forged or edited.
// ─────────────────────────────────────────────────────────────────────────────
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const STAFF_COOKIE = "oiq_staff";
const MAX_AGE_SECONDS = 12 * 60 * 60; // one shift

export interface StaffSession {
  uid: string;
  orgId: string;
  role: "maintenance" | "cleaning";
  name: string;
  exp: number; // unix seconds
}

function secret(): string {
  const s = process.env.STAFF_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!s) throw new Error("STAFF_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeStaffSession(s: Omit<StaffSession, "exp">): { value: string; maxAge: number } {
  const full: StaffSession = { ...s, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const payload = Buffer.from(JSON.stringify(full)).toString("base64url");
  return { value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

export function decodeStaffSession(value: string | undefined | null): StaffSession | null {
  if (!value || !value.includes(".")) return null;
  const [payload, sig] = value.split(".");
  try {
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as StaffSession;
    if (!s.orgId || !s.uid || s.exp < Math.floor(Date.now() / 1000)) return null;
    return s;
  } catch {
    return null;
  }
}

export async function readStaffSession(): Promise<StaffSession | null> {
  try {
    const store = await cookies();
    return decodeStaffSession(store.get(STAFF_COOKIE)?.value);
  } catch {
    return null;
  }
}
