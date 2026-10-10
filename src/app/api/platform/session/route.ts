import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { IMPERSONATE_COOKIE, isSuperAdmin } from "@/lib/platform";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonateOrgId = cookieStore.get(IMPERSONATE_COOKIE)?.value || null;

    // Check query param or header for email if passed from client
    const emailHeader = req.headers.get("x-user-email");
    const emailQuery = req.nextUrl.searchParams.get("email");
    const userEmail = emailHeader || emailQuery || "";

    const userIsSuperAdmin = isSuperAdmin(userEmail);

    let impersonatingOrg: { id: string; name: string; slug: string; tier: string } | null = null;

    if (impersonateOrgId && supabaseAdmin) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("id, name, slug, tier, subscription_status")
        .eq("id", impersonateOrgId)
        .maybeSingle();

      if (org) {
        impersonatingOrg = org;
      }
    }

    return NextResponse.json({
      isSuperAdmin: userIsSuperAdmin,
      impersonatingOrg,
    });
  } catch (error) {
    console.error("[platform/session] error:", error);
    return NextResponse.json({ isSuperAdmin: false, impersonatingOrg: null });
  }
}
