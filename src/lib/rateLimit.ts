/**
 * Rate limiting.
 *
 * `checkRateLimit` is DURABLE: it counts hits in Postgres (public.rate_limit_hit,
 * migration 004) so limits hold across Vercel serverless instances. If the
 * database function is unavailable (e.g. migration not applied yet, or a DB
 * outage) it falls back to a per-instance in-memory counter rather than
 * failing open entirely.
 */
import { supabaseAdmin } from "@/lib/supabase";

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = memory.get(key);
  if (!record || now > record.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count++;
  return true;
}

let durableUnavailableUntil = 0;

/** Returns true if the request is within limits, false if the limit was exceeded. */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  // Always count locally too, so a single hot instance is throttled even if the DB call is slow.
  const localOk = memoryHit(key, limit, windowMs);

  if (supabaseAdmin && Date.now() > durableUnavailableUntil) {
    try {
      const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", {
        p_key: key,
        p_max: limit,
        p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
      });
      if (!error && typeof data === "boolean") return data && localOk;
      // Function missing / DB error → back off for a minute and use memory only.
      durableUnavailableUntil = Date.now() + 60_000;
      if (error) console.warn("[rateLimit] durable limiter unavailable:", error.message);
    } catch (e) {
      durableUnavailableUntil = Date.now() + 60_000;
      console.warn("[rateLimit] durable limiter error:", e);
    }
  }
  return localOk;
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: { headers: Headers }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Per-organization daily AI budget shared by all Gemini-backed routes.
 * Trial orgs get a smaller budget than paying orgs.
 */
export async function checkAiQuota(orgId: string, opts?: { trialing?: boolean }): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const limit = opts?.trialing ? 150 : 600;
  return checkRateLimit(`ai:${orgId}:${day}`, limit, 24 * 60 * 60 * 1000);
}
