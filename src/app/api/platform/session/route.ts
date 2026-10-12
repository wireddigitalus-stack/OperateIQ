import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { IMPERSONATE_COOKIE, isSuperAdmin } from "@/lib/platform";
import { getAuthUser, getRequestContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Who am I + which workspace am I in — derived ONLY from the verified session.
 * Response shape kept backward-compatible: { isSuperAdmin, activeOrg, impersonatingOrg }
 * plus { user, role, memberships } for org switchers.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ authenticated: false, isSuperAdmin: false, activeOrg: null, impersonatingOrg: null, memberships: [] });
    }

    const ctx = await getRequestContext(req);
    let memberships: { id: string; name: string; slug: string; tier: string; role: string }[] = [];
    if (ctx?.memberships.length) {
      const { data: orgs } = await supabaseAdmin
        .from("organizations")
        .select("id,name,slug,tier")
        .in("id", ctx.memberships.map((m) => m.org_id));
      memberships = (orgs || []).map((o: { id: string; name: string; slug: string; tier: string }) => ({
        ...o,
        role: ctx.memberships.find((m) => m.org_id === o.id)?.role || "member",
      }));
    }

    const org = ctx?.org || null;
    const activeOrg = org
      ? {
          id: org.id,
          name: org.name,
          slug: org.slug,
          tier: org.tier,
          subscription_status: org.subscription_status,
          trial_ends_at: org.trial_ends_at,
          custom_domain: org.custom_domain,
        }
      : null;

    // Clean up a stale impersonation cookie for non-super-admins.
    if (!ctx?.isSuperAdmin) {
      try {
        const store = await cookies();
        if (store.get(IMPERSONATE_COOKIE)) store.delete(IMPERSONATE_COOKIE);
      } catch { /* read-only context */ }
    }

    return NextResponse.json({
      authenticated: true,
      user: { email: user.email, name: user.name },
      isSuperAdmin: !!ctx?.isSuperAdmin || isSuperAdmin(user.email),
      role: ctx?.role || null,
      activeOrg,
      impersonatingOrg: ctx?.impersonating ? activeOrg : null,
      memberships,
    });
  } catch (error) {
    console.error("[platform/session] error:", error);
    return NextResponse.json({ authenticated: false, isSuperAdmin: false, activeOrg: null, impersonatingOrg: null, memberships: [] });
  }
}
