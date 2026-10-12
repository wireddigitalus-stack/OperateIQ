import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE } from "@/lib/platform";
import { getAuthUser, getRequestContext } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Switch the signed-in user's active workspace.
 * Body: { orgId } or { slug }. The user MUST be a member of the target org.
 * The cookie is only a preference — server-auth re-checks membership on every request.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const ctx = await getRequestContext(req);
    if (!ctx) return NextResponse.json({ error: "No organization is linked to this account." }, { status: 403 });

    const { orgId, slug } = await req.json().catch(() => ({}));
    let targetId: string | null = orgId || null;

    if (!targetId && slug) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("slug", String(slug).toLowerCase().trim())
        .maybeSingle();
      targetId = org?.id || null;
    }
    if (!targetId) targetId = ctx.orgId;

    if (!ctx.memberships.some((m) => m.org_id === targetId)) {
      return NextResponse.json({ error: "You are not a member of that organization." }, { status: 403 });
    }

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id,name,slug,tier")
      .eq("id", targetId)
      .maybeSingle();
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const res = NextResponse.json({ success: true, activeOrgId: org.id, orgName: org.name, slug: org.slug, tier: org.tier });
    res.cookies.set(ACTIVE_ORG_COOKIE, org.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.delete(IMPERSONATE_COOKIE);
    return res;
  } catch (error) {
    console.error("[set-active-org] error:", error);
    return NextResponse.json({ error: "Failed to switch active organization" }, { status: 500 });
  }
}
