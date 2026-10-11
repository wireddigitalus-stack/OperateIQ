import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { IMPERSONATE_COOKIE } from "@/lib/platform";
import { checkRateLimit } from "@/lib/rateLimit";

function sanitize(val: unknown): string {
  return String(val ?? "").trim().slice(0, 500);
}

function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "portfolio";
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (!checkRateLimit(`signup:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many signup requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const cleanName = sanitize(body.name);
    const cleanEmail = sanitize(body.email).toLowerCase();
    const cleanCompany = sanitize(body.company);
    const cleanPhone = sanitize(body.phone);
    const cleanPlan = (["starter", "growth", "pro"].includes(body.plan) ? body.plan : "pro") as "starter" | "growth" | "pro";
    const cleanUnitCount = sanitize(body.unitCount) || "11 - 50 Units";
    const cleanPortfolioType = sanitize(body.portfolioType) || "Commercial & Residential";

    if (!cleanName || !cleanEmail || !cleanCompany) {
      return NextResponse.json(
        { error: "Name, work email, and company name are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid work email address." },
        { status: 400 }
      );
    }

    let orgId: string = crypto.randomUUID();
    let orgSlug: string = generateSlug(cleanCompany);
    let createdOrg: any = null;

    if (supabaseAdmin) {
      // 1. Create Organization in Supabase
      let slugCandidate = orgSlug;
      let attempts = 0;
      while (attempts < 3) {
        const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: newOrg, error: orgError } = await supabaseAdmin
          .from("organizations")
          .insert({
            id: orgId,
            name: cleanCompany,
            slug: slugCandidate,
            tier: cleanPlan,
            subscription_status: "trialing",
            trial_ends_at: trialEndDate,
            contact_email: cleanEmail,
            contact_phone: cleanPhone || null,
            brand_name: cleanCompany,
          })
          .select()
          .single();

        if (!orgError && newOrg) {
          createdOrg = newOrg;
          orgId = newOrg.id;
          orgSlug = newOrg.slug;
          break;
        }

        if (orgError?.code === "23505") {
          // Slug collision, retry with random suffix
          attempts++;
          slugCandidate = `${orgSlug}-${Math.random().toString(36).slice(2, 6)}`;
        } else {
          console.warn("[signup] organizations insert notice:", orgError?.message);
          break;
        }
      }

      // 2. Grant admin access in allowed_users for this organization
      try {
        await supabaseAdmin.from("allowed_users").insert({
          email: cleanEmail,
          role: "admin",
          active: true,
          org_id: orgId,
        });
      } catch (err) {
        console.warn("[signup] allowed_users insert notice:", err);
      }

      // 3. Store in contact_submissions for the Master Admin
      try {
        await supabaseAdmin.from("contact_submissions").insert({
          id: `signup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          submitted_at: new Date().toISOString(),
          name: cleanName,
          email: cleanEmail,
          company: cleanCompany,
          phone: cleanPhone,
          interest: `14-Day Trial (${cleanPlan.toUpperCase()})`,
          city: cleanPortfolioType,
          message: `Trial Signup Intake:\n- Plan: ${cleanPlan}\n- Units: ${cleanUnitCount}\n- Portfolio: ${cleanPortfolioType}\n- Phone: ${cleanPhone || "None"}\n- Org ID: ${orgId}`,
          org_id: orgId,
          ip_hash: ip.split(".").slice(0, 3).join(".") + ".x",
        });
      } catch (err) {
        console.warn("[signup] contact_submissions insert notice:", err);
      }
    }

    // 4. Return success response and set active organization cookie so the user lands on their workspace
    const res = NextResponse.json({
      success: true,
      orgId,
      slug: orgSlug,
      company: cleanCompany,
      plan: cleanPlan,
      trialDays: 14,
    });

    res.cookies.set({
      name: IMPERSONATE_COOKIE,
      value: orgId,
      path: "/",
      maxAge: 14 * 24 * 60 * 60, // 14 days
      sameSite: "lax",
      httpOnly: false, // Accessible to client-side components to read active org name
    });

    return res;
  } catch (error) {
    console.error("[signup] error:", error);
    return NextResponse.json(
      { error: "Could not create workspace. Please try again." },
      { status: 500 }
    );
  }
}
