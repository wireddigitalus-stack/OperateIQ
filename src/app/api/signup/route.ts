import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE } from "@/lib/platform";
import { checkRateLimit } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/server-auth";

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
    const cleanPlan = (["starter", "growth", "pro"].includes(body.plan) ? body.plan : "starter") as "starter" | "growth" | "pro";
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

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Signup is temporarily unavailable. Please try again shortly." }, { status: 503 });
    }

    // If the visitor is already signed in, the new workspace belongs to THAT verified account.
    const authedUser = await getAuthUser(req);
    const ownerEmail = authedUser?.email || cleanEmail;

    let orgId: string = crypto.randomUUID();
    let orgSlug: string = generateSlug(cleanCompany);
    let createdOrg: { id: string; slug: string } | null = null;

    // 1. Create Organization (retry on slug collision)
    let slugCandidate = orgSlug;
    for (let attempt = 0; attempt < 5 && !createdOrg; attempt++) {
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
          contact_email: ownerEmail,
          contact_phone: cleanPhone || null,
          brand_name: cleanCompany,
        })
        .select("id, slug")
        .single();

      if (!orgError && newOrg) {
        createdOrg = newOrg;
        break;
      }
      if (orgError?.code === "23505") {
        slugCandidate = `${orgSlug}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      console.error("[signup] organizations insert failed:", orgError?.message);
      return NextResponse.json({ error: "Could not create workspace. Please try again." }, { status: 500 });
    }
    if (!createdOrg) {
      return NextResponse.json({ error: "That company name is taken. Try a slightly different name." }, { status: 409 });
    }
    orgId = createdOrg.id;
    orgSlug = createdOrg.slug;

    // 2. Owner access. allowed_users drives the dashboard team list; memberships drives
    //    authorization (it is created now if signed in, otherwise on first login).
    const { error: accessErr } = await supabaseAdmin.from("allowed_users").insert({
      email: ownerEmail,
      name: cleanName,
      role: "admin",
      active: true,
      org_id: orgId,
    });
    if (accessErr) {
      console.error("[signup] allowed_users insert failed:", accessErr.message);
      await supabaseAdmin.from("organizations").delete().eq("id", orgId);
      return NextResponse.json({ error: "Could not create workspace. Please try again." }, { status: 500 });
    }
    if (authedUser) {
      await supabaseAdmin.from("memberships").insert({ org_id: orgId, user_id: authedUser.id, role: "owner" });
    }

    // 3. Record the signup for the platform console (platform org-agnostic log)
    const { error: subErr } = await supabaseAdmin.from("contact_submissions").insert({
      id: `signup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      submitted_at: new Date().toISOString(),
      name: cleanName,
      email: ownerEmail,
      company: cleanCompany,
      phone: cleanPhone,
      interest: `14-Day Trial (${cleanPlan.toUpperCase()})`,
      city: cleanPortfolioType,
      message: `Trial Signup Intake:\n- Plan: ${cleanPlan}\n- Units: ${cleanUnitCount}\n- Portfolio: ${cleanPortfolioType}\n- Phone: ${cleanPhone || "None"}\n- Org ID: ${orgId}`,
      org_id: orgId,
      ip_hash: ip.split(".").slice(0, 3).join(".") + ".x",
    });
    if (subErr) console.warn("[signup] contact_submissions insert notice:", subErr.message);

    // 4. Return success response and set active organization cookie so the user lands on their workspace
    const res = NextResponse.json({
      success: true,
      orgId,
      slug: orgSlug,
      company: cleanCompany,
      plan: cleanPlan,
      trialDays: 14,
      signedIn: !!authedUser,
      email: ownerEmail,
    });

    res.cookies.set({
      name: ACTIVE_ORG_COOKIE,
      value: orgId,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "lax",
      httpOnly: false, // preference only — server re-checks membership on every request
      secure: process.env.NODE_ENV === "production",
    });

    // Ensure leftover impersonation cookie is cleared so new user is never in support mode
    res.cookies.delete(IMPERSONATE_COOKIE);

    return res;
  } catch (error) {
    console.error("[signup] error:", error);
    return NextResponse.json(
      { error: "Could not create workspace. Please try again." },
      { status: 500 }
    );
  }
}
