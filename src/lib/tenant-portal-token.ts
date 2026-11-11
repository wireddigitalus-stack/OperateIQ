import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless, HMAC-SHA256 signed Resident Portal tokens (`tp1.<payloadB64Url>.<sigB64Url>`).
 *
 * - Scopes access strictly to a single `(orgId, tenantId)` pair + revocation version `v`.
 * - Domain-separated key derivation ensures portal tokens can never collide with staff
 *   session cookies or email verification tokens.
 */

export interface TenantPortalClaims {
  orgId: string;
  tenantId: string;
  v: number;
}

function getSigningKey(): Buffer {
  const rawSecret =
    process.env.PORTAL_TOKEN_SECRET ||
    process.env.STAFF_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!rawSecret) {
    throw new Error("Missing server signing secret for tenant portal tokens.");
  }
  return createHmac("sha256", rawSecret)
    .update("propopsiq:tenant-portal-token:v1")
    .digest();
}

export function createTenantPortalToken(claims: {
  orgId: string;
  tenantId: string;
  version?: number;
}): string {
  const payloadObj: TenantPortalClaims = {
    orgId: claims.orgId.trim(),
    tenantId: claims.tenantId.trim(),
    v: Number.isInteger(claims.version) && (claims.version as number) > 0 ? (claims.version as number) : 1,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url");
  const sigB64 = createHmac("sha256", getSigningKey())
    .update(`tp1.${payloadB64}`)
    .digest("base64url");
  return `tp1.${payloadB64}.${sigB64}`;
}

export function verifyTenantPortalToken(token: string): TenantPortalClaims | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "tp1") return null;

  const [, payloadB64, providedSigB64] = parts;
  if (!payloadB64 || !providedSigB64) return null;

  try {
    const expectedSig = createHmac("sha256", getSigningKey())
      .update(`tp1.${payloadB64}`)
      .digest();
    const providedSig = Buffer.from(providedSigB64, "base64url");
    if (expectedSig.length !== providedSig.length) return null;
    if (!timingSafeEqual(expectedSig, providedSig)) return null;

    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as Partial<TenantPortalClaims>;
    if (
      !decoded ||
      typeof decoded.orgId !== "string" ||
      !decoded.orgId.trim() ||
      typeof decoded.tenantId !== "string" ||
      !decoded.tenantId.trim()
    ) {
      return null;
    }

    return {
      orgId: decoded.orgId.trim(),
      tenantId: decoded.tenantId.trim(),
      v: typeof decoded.v === "number" && decoded.v > 0 ? decoded.v : 1,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies both the cryptographic HMAC signature AND the live revocation version
 * (`site_content` section=`portal_tokens`, key=`v:${tenantId}`) so rotated links
 * are immediately rejected across document downloads and photo uploads too.
 */
export async function verifyActiveTenantPortalToken(
  token: string
): Promise<TenantPortalClaims | null> {
  const claims = verifyTenantPortalToken(token);
  if (!claims) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return claims;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_content?org_id=eq.${encodeURIComponent(claims.orgId)}&section=eq.portal_tokens&key=eq.${encodeURIComponent(`v:${claims.tenantId}`)}&select=value&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value?: string }>;
    const requiredVersion = rows[0]?.value ? Number(rows[0].value) || 1 : 1;
    if (claims.v < requiredVersion) return null;
    return claims;
  } catch {
    return null;
  }
}
