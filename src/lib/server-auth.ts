// ─────────────────────────────────────────────────────────────────────────────
// Server-side identity & tenancy resolution (the ONLY trusted source of org_id)
//
//   Browser (supabase-js session) ──Authorization: Bearer <jwt>──▶ API route
//   API route ──getRequestContext()──▶ verified user ▶ memberships ▶ orgId
//
// Rules:
//  • org_id is NEVER taken from a request body, query string, or plain cookie.
//  • The `oiq_active_org_id` cookie is only a *preference*; it is honoured only
//    if the verified user is a member of that org.
//  • Impersonation is honoured only for verified platform super-admins.
//  • Staff (PIN) sessions use an HMAC-signed httpOnly cookie (see staff-session).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE, DEFAULT_PLATFORM_ORG_ID, isSuperAdmin, getCustomerCode } from "@/lib/platform";
import { readStaffSession, type StaffSession } from "@/lib/staff-session";
import { hasFeature, isSubscriptionActive, FEATURE_LABELS, type Feature } from "@/lib/plans";

export const ACCESS_TOKEN_COOKIE = "oiq_at";

export type OrgRole = "owner" | "admin" | "manager" | "member" | "maintenance" | "cleaning";

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  tier: "starter" | "growth" | "pro";
  subscription_status: string;
  trial_ends_at: string | null;
  custom_domain: string | null;
  brand_name: string | null;
  brand_logo_url?: string | null;
  brand_primary_color?: string | null;
  brand_accent_color?: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  description?: string | null;
  customer_code?: string;
}

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
}

export interface RequestContext {
  kind: "user" | "staff";
  user: AuthedUser | null;
  staff: StaffSession | null;
  orgId: string;
  org: OrgSummary;
  role: OrgRole | "platform";
  isSuperAdmin: boolean;
  impersonating: boolean;
  memberships: { org_id: string; role: OrgRole }[];
}

const ORG_COLUMNS =
  "id,name,slug,tier,subscription_status,trial_ends_at,custom_domain,brand_name,brand_logo_url,brand_primary_color,brand_accent_color,contact_email,contact_phone,created_at";

const ADMIN_ROLES: OrgRole[] = ["owner", "admin", "manager"];

// ── Token extraction ────────────────────────────────────────────────────────
async function extractToken(req?: NextRequest): Promise<string | null> {
  const header = req?.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    const t = header.slice(7).trim();
    if (t) return t;
  }
  try {
    const store = await cookies();
    const c = store.get(ACCESS_TOKEN_COOKIE)?.value;
    if (c) return decodeURIComponent(c);
  } catch {
    /* outside request scope */
  }
  return null;
}

/** Verifies the Supabase JWT with the auth server. Returns null if missing/invalid/expired. */
export async function getAuthUser(req?: NextRequest): Promise<AuthedUser | null> {
  if (!supabaseAdmin) return null;
  const token = await extractToken(req);
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.email) return null;
    const u = data.user;
    return {
      id: u.id,
      email: (u.email || "").toLowerCase(),
      name: (u.user_metadata?.full_name as string) || (u.email || "").split("@")[0],
    };
  } catch {
    return null;
  }
}

/**
 * Loads memberships for a user, reconciling with active admin/manager rows in
 * `allowed_users` (that's where Settings → Team adds admins by email, and where
 * legacy signups recorded the owner). Missing memberships are created so the
 * invited admin gets access on first sign-in.
 */
async function loadMemberships(user: AuthedUser): Promise<{ org_id: string; role: OrgRole }[]> {
  const [{ data: existing }, { data: invited }] = await Promise.all([
    supabaseAdmin.from("memberships").select("org_id, role, created_at").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabaseAdmin.from("allowed_users").select("org_id, role").eq("email", user.email).eq("active", true).in("role", ["owner", "admin", "manager"]),
  ]);

  const result = ((existing || []) as { org_id: string; role: OrgRole }[]).map((m) => ({ org_id: m.org_id, role: m.role }));
  const have = new Set(result.map((m) => m.org_id));
  const toAdd = ((invited || []) as { org_id: string; role: string }[])
    .filter((r) => r.org_id && !have.has(r.org_id))
    .map((r) => ({
      org_id: r.org_id,
      user_id: user.id,
      // The first admin of an org with no members yet becomes its owner.
      role: (r.role === "owner" ? "owner" : r.role === "manager" ? "manager" : "admin") as OrgRole,
    }));

  if (toAdd.length) {
    for (const row of toAdd) {
      const { count } = await supabaseAdmin.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", row.org_id);
      if (!count) row.role = "owner";
    }
    await supabaseAdmin.from("memberships").upsert(toAdd, { onConflict: "org_id,user_id", ignoreDuplicates: true });
    result.push(...toAdd.map((r) => ({ org_id: r.org_id, role: r.role })));
  }
  return result;
}

async function loadOrg(orgId: string): Promise<OrgSummary | null> {
  const [{ data }, { data: profileSetting }] = await Promise.all([
    supabaseAdmin.from("organizations").select(ORG_COLUMNS).eq("id", orgId).maybeSingle(),
    supabaseAdmin.from("site_settings").select("value").eq("org_id", orgId).eq("key", "org_profile").maybeSingle(),
  ]);
  if (!data) return null;
  const org = data as OrgSummary;
  const prof = (profileSetting?.value || {}) as Record<string, unknown>;
  const customCode = typeof prof.customer_code === "string" ? prof.customer_code : null;
  return {
    ...org,
    city: typeof prof.city === "string" ? prof.city : null,
    state: typeof prof.state === "string" ? prof.state : null,
    address: typeof prof.address === "string" ? prof.address : null,
    description: typeof prof.description === "string" ? prof.description : null,
    customer_code: getCustomerCode(org.id, customCode),
  };
}

async function readCookie(name: string): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(name)?.value?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Resolve the verified caller + their active org. Returns null when the caller
 * is anonymous or belongs to no organization.
 */
export async function getRequestContext(
  req?: NextRequest,
  opts: { allowStaff?: boolean } = {}
): Promise<RequestContext | null> {
  if (!supabaseAdmin) return null;

  const user = await getAuthUser(req);
  if (user) {
    const superAdmin = isSuperAdmin(user.email);
    const memberships = await loadMemberships(user);

    // Platform super-admin support mode:
    // Strictly isolate the Master Admin from client tenant workspaces unless IMPERSONATE_COOKIE is set.
    if (superAdmin) {
      const imp = await readCookie(IMPERSONATE_COOKIE);
      if (imp) {
        const org = await loadOrg(imp);
        if (org) {
          return {
            kind: "user",
            user,
            staff: null,
            orgId: org.id,
            org,
            role: "platform",
            isSuperAdmin: true,
            impersonating: true,
            memberships: [{ org_id: org.id, role: "owner" }],
          };
        }
      }
      const fallbackOrg = await loadOrg(DEFAULT_PLATFORM_ORG_ID);
      if (fallbackOrg) {
        return {
          kind: "user",
          user,
          staff: null,
          orgId: fallbackOrg.id,
          org: fallbackOrg,
          role: "platform",
          isSuperAdmin: true,
          impersonating: false,
          memberships: [{ org_id: fallbackOrg.id, role: "owner" }],
        };
      }
    }

    if (!memberships.length) return null;
    const preferred = await readCookie(ACTIVE_ORG_COOKIE);
    const chosen = memberships.find((m) => m.org_id === preferred) || memberships[0];
    const org = await loadOrg(chosen.org_id);
    if (!org) return null;
    return { kind: "user", user, staff: null, orgId: org.id, org, role: chosen.role, isSuperAdmin: superAdmin, impersonating: false, memberships };
  }

  if (opts.allowStaff) {
    const staff = await readStaffSession();
    if (staff) {
      const org = await loadOrg(staff.orgId);
      if (org) {
        return { kind: "staff", user: null, staff, orgId: org.id, org, role: staff.role, isSuperAdmin: false, impersonating: false, memberships: [] };
      }
    }
  }
  return null;
}

// ── Guards (return either a context or a ready-to-return NextResponse) ──────
export type Guarded<T> = { ok: true; ctx: T } | { ok: false; res: NextResponse };

const unauthorized = () => NextResponse.json({ error: "Authentication required." }, { status: 401 });
const forbidden = (msg = "You do not have access to this resource.", extra?: Record<string, unknown>) =>
  NextResponse.json({ error: msg, ...extra }, { status: 403 });

/**
 * Require a signed-in org member (any role). Pass `allowStaff` for endpoints
 * used by the PIN-based crew portals, `roles` to restrict further, and
 * `requireFeature` to enforce subscription tier access.
 */
export async function requireOrg(
  req: NextRequest,
  opts: {
    allowStaff?: boolean;
    roles?: (OrgRole | "platform")[];
    requireFeature?: Feature;
    allowExpired?: boolean;
  } = {}
): Promise<Guarded<RequestContext>> {
  const ctx = await getRequestContext(req, { allowStaff: opts.allowStaff });
  if (!ctx) {
    const user = await getAuthUser(req);
    return { ok: false, res: user ? forbidden("No organization is linked to this account.") : unauthorized() };
  }
  if (opts.roles && !opts.roles.includes(ctx.role)) return { ok: false, res: forbidden() };

  // Enforce subscription / trial status on state-changing requests (and AI POSTs)
  const isWriteOrAction = req.method !== "GET" && req.method !== "HEAD";
  if (isWriteOrAction && !opts.allowExpired && !ctx.isSuperAdmin && !isSubscriptionActive(ctx.org)) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          error: "Your trial or subscription has ended. Please update your plan in Settings → Billing to continue.",
          code: "SUBSCRIPTION_INACTIVE",
        },
        { status: 402 }
      ),
    };
  }

  // Enforce subscription plan feature gating if requested
  if (opts.requireFeature && !ctx.isSuperAdmin && !hasFeature(ctx.org.tier, opts.requireFeature)) {
    const label = FEATURE_LABELS[opts.requireFeature] || opts.requireFeature;
    return {
      ok: false,
      res: forbidden(`${label} requires a higher plan tier. Upgrade in Settings → Billing.`, {
        code: "FEATURE_LOCKED",
        feature: opts.requireFeature,
        currentTier: ctx.org.tier,
      }),
    };
  }

  return { ok: true, ctx };
}

/** Require an org owner/admin/manager (or super-admin in support mode). */
export function requireOrgAdmin(
  req: NextRequest,
  opts: { requireFeature?: Feature; allowExpired?: boolean } = {}
) {
  return requireOrg(req, { roles: [...ADMIN_ROLES, "platform"], ...opts });
}

/** Require a verified OperateIQ platform super-admin. */
export async function requireSuperAdmin(req: NextRequest): Promise<Guarded<AuthedUser>> {
  const user = await getAuthUser(req);
  if (!user) return { ok: false, res: unauthorized() };
  if (!isSuperAdmin(user.email)) return { ok: false, res: forbidden("Platform administrator access required.") };
  return { ok: true, ctx: user };
}

/** Strip any client-supplied tenancy fields and stamp the trusted org_id. */
export function withOrg<T extends Record<string, unknown>>(row: T, orgId: string): T & { org_id: string } {
  return { ...row, org_id: orgId };
}

/** Remove fields a client must never be able to change on update. */
export function sanitizeUpdate<T extends Record<string, unknown>>(row: T): Omit<T, "org_id" | "id" | "created_at"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { org_id, id, created_at, ...rest } = row;
  return rest;
}
