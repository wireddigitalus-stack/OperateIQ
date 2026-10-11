import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE, isSuperAdmin } from "@/lib/platform";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value || null;
    const impersonateOrgId = cookieStore.get(IMPERSONATE_COOKIE)?.value || null;
    const orgToFetch = activeOrgId || impersonateOrgId;

    // Check query param or header for email if passed from client
    const emailHeader = req.headers.get("x-user-email");
    const emailQuery = req.nextUrl.searchParams.get("email");
    const userEmail = emailHeader || emailQuery || "";

    const userIsSuperAdmin = isSuperAdmin(userEmail);

    let activeOrg: { id: string; name: string; slug: string; tier: string } | null = null;
    let impersonatingOrg: { id: string; name: string; slug: string; tier: string } | null = null;

    if (orgToFetch && supabaseAdmin) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("id, name, slug, tier, subscription_status")
        .eq("id", orgToFetch)
        .maybeSingle();

      if (org) {
        activeOrg = org;
        if (impersonateOrgId && !activeOrgId) {
          impersonatingOrg = org;
        }
      }
    }

    return NextResponse.json({
      isSuperAdmin: userIsSuperAdmin,
      activeOrg,
      impersonatingOrg,
    });
  } catch (error) {
    console.error("[platform/session] error:", error);
    return NextResponse.json({ isSuperAdmin: false, activeOrg: null, impersonatingOrg: null });
  }
}
