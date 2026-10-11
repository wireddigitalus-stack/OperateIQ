import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE } from "@/lib/platform";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, slug } = body;
    const cookieStore = await cookies();

    let resolvedOrgId = orgId;
    let resolvedOrgName = "WIRED DIGITAL LLC";
    let resolvedSlug = slug || "wired-digital";

    if (!resolvedOrgId && (slug || !orgId)) {
      const searchSlug = (slug || "wired-digital").toLowerCase().trim();

      if (supabaseAdmin) {
        let { data: org } = await supabaseAdmin
          .from("organizations")
          .select("*")
          .ilike("slug", searchSlug)
          .maybeSingle();

        if (!org && (searchSlug === "wired-digital" || searchSlug === "wireddigitalllc")) {
          const { data: created } = await supabaseAdmin
            .from("organizations")
            .upsert(
              {
                name: "WIRED DIGITAL LLC",
                slug: "wired-digital",
                tier: "pro",
                subscription_status: "active",
                contact_email: "wireddigitalus@gmail.com",
                brand_name: "WIRED DIGITAL LLC",
              },
              { onConflict: "slug" }
            )
            .select()
            .single();
          org = created;
        }

        if (org) {
          resolvedOrgId = org.id;
          resolvedOrgName = org.name;
          resolvedSlug = org.slug;
        }
      }

      if (!resolvedOrgId) {
        // Fallback demo/wired org ID
        resolvedOrgId = "11111111-2222-3333-4444-555555555555";
      }
    }

    // Set active organization cookie for 30 days
    cookieStore.set(ACTIVE_ORG_COOKIE, resolvedOrgId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Remove any lingering impersonation
    cookieStore.delete(IMPERSONATE_COOKIE);

    return NextResponse.json({
      success: true,
      activeOrgId: resolvedOrgId,
      orgName: resolvedOrgName,
      slug: resolvedSlug,
    });
  } catch (error) {
    console.error("[set-active-org] error:", error);
    return NextResponse.json({ error: "Failed to switch active organization" }, { status: 500 });
  }
}
