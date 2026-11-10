import { NextRequest, NextResponse } from "next/server";
import { IMPERSONATE_COOKIE, DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform";
import { requireSuperAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

// Platform super-admin "support mode": view a tenant workspace as that org.
// Only verified super-admins can set it, and server-auth only honours the
// cookie for verified super-admins, so a forged cookie grants nothing.
export async function POST(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;
  try {
    const { orgId } = await req.json();
    const res = NextResponse.json({ success: true, impersonatingOrgId: orgId || null });

    if (!orgId) {
      res.cookies.delete(IMPERSONATE_COOKIE);
      return res;
    }

    const { data: org } = await supabaseAdmin.from("organizations").select("id,name").eq("id", orgId).maybeSingle();
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    // Audit trail — written to the customer's log AND to the platform org's log,
    // which customers cannot access or delete.
    const entry = {
      action: "platform_impersonation_start",
      resource_type: "auth",
      resource_name: org.name,
      resource_id: org.id,
      actor_name: sa.ctx.name,
      actor_email: sa.ctx.email,
      metadata: { by: sa.ctx.email, target_org_id: org.id },
    };
    await supabaseAdmin
      .from("activity_log")
      .insert([
        { ...entry, org_id: org.id },
        ...(org.id !== DEFAULT_PLATFORM_ORG_ID ? [{ ...entry, org_id: DEFAULT_PLATFORM_ORG_ID }] : []),
      ])
      .then(() => null, () => null);

    res.cookies.set(IMPERSONATE_COOKIE, org.id, {
      path: "/",
      httpOnly: false, // read by the ImpersonationBanner; trust is enforced server-side
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 4, // 4 hours
    });
    return res;
  } catch (error) {
    console.error("[platform/impersonate] error:", error);
    return NextResponse.json({ error: "Failed to update impersonation session" }, { status: 500 });
  }
}

// Anyone may END impersonation (it only removes a cookie).
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(IMPERSONATE_COOKIE);
  return res;
}
