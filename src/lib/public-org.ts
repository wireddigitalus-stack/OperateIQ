// ─────────────────────────────────────────────────────────────────────────────
// Public (unauthenticated) org resolution for read-only marketing endpoints.
// Resolves an explicit `?org_slug=` (or `?slug=`) query param to an org id.
// Never use this for writes — writes must go through requireOrg().
// ─────────────────────────────────────────────────────────────────────────────
import type { NextRequest } from "next/server";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/i;

/** Returns the raw slug param if present (org_slug preferred, then slug). */
export function getPublicOrgSlug(req: NextRequest, opts: { allowSlugParam?: boolean } = {}): string | null {
  const sp = req.nextUrl.searchParams;
  const raw = sp.get("org_slug") || (opts.allowSlugParam ? sp.get("slug") : null);
  return raw ? raw.trim() : null;
}

/** Resolve an organization slug to its id. Returns null if unknown/invalid. */
export async function resolveOrgIdBySlug(slug: string | null | undefined): Promise<string | null> {
  if (!slug || !SLUG_RE.test(slug)) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : null;
  } catch {
    return null;
  }
}
