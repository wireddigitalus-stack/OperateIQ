import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE, getCustomerCode } from "@/lib/platform";
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
    const password = typeof body.password === "string" ? body.password.trim() : "";
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

    if (!authedUser && (!password || password.length < 8)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!authedUser) {
      const { data: existingAllowed } = await supabaseAdmin
        .from("allowed_users")
        .select("id")
        .eq("email", cleanEmail)
        .eq("active", true)
        .in("role", ["owner", "admin", "manager"])
        .limit(1);
      if (existingAllowed && existingAllowed.length > 0) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in to create a new workspace." },
          { status: 409 }
        );
      }
    }

    let createdNewAuthUserId: string | null = null;
    if (!authedUser && password.length >= 8) {
      const { data: createdUser, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: cleanName },
      });
      if (createUserErr) {
        const msg = (createUserErr.message || "").toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in." },
            { status: 409 }
          );
        }
        console.error("[signup] auth.admin.createUser error:", createUserErr.message);
        return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 });
      }
      createdNewAuthUserId = createdUser?.user?.id || null;
    }

    let orgId: string = crypto.randomUUID();
    let orgSlug: string = generateSlug(cleanCompany);
    let createdOrg: { id: string; slug: string } | null = null;

    // 1. Create Organization (retry on slug collision)
    let slugCandidate = orgSlug;
    for (let attempt = 0; attempt < 5 && !createdOrg; attempt++) {
      const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: newOrg, error: orgErr } = await supabaseAdmin
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

      if (!orgErr && newOrg) {
        createdOrg = newOrg;
        break;
      }
      if (orgErr?.code === "23505") {
        slugCandidate = `${orgSlug}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      console.error("[signup] organizations insert failed:", orgErr?.message);
      if (createdNewAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdNewAuthUserId).catch(() => {});
      }
      return NextResponse.json({ error: "Could not create workspace. Please try again." }, { status: 500 });
    }
    if (!createdOrg) {
      if (createdNewAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdNewAuthUserId).catch(() => {});
      }
      return NextResponse.json({ error: "That company name is taken. Try a slightly different name." }, { status: 409 });
    }
    orgId = createdOrg.id;
    orgSlug = createdOrg.slug;
    const customerCode = getCustomerCode(orgId);

    // 2. Owner access. allowed_users drives the dashboard team list; memberships drives
    //    authorization (it is created now if signed in or created with password, otherwise on first login).
    const { error: memberErr } = await supabaseAdmin.from("allowed_users").insert({
      email: ownerEmail,
      name: cleanName,
      role: "owner",
      active: true,
      org_id: orgId,
    });
    if (memberErr) {
      console.error("[signup] allowed_users insert failed:", memberErr.message);
      await supabaseAdmin.from("organizations").delete().eq("id", orgId);
      if (createdNewAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdNewAuthUserId).catch(() => {});
      }
      return NextResponse.json({ error: "Could not create workspace. Please try again." }, { status: 500 });
    }
    const targetUserId = authedUser?.id || createdNewAuthUserId;
    if (targetUserId) {
      const { error: membershipErr } = await supabaseAdmin
        .from("memberships")
        .insert({ org_id: orgId, user_id: targetUserId, role: "owner" });
      if (membershipErr) {
        console.error("[signup] memberships insert failed:", membershipErr.message);
        await supabaseAdmin.from("allowed_users").delete().eq("org_id", orgId);
        await supabaseAdmin.from("organizations").delete().eq("id", orgId);
        if (createdNewAuthUserId) {
          await supabaseAdmin.auth.admin.deleteUser(createdNewAuthUserId).catch(() => {});
        }
        return NextResponse.json({ error: "Could not create workspace. Please try again." }, { status: 500 });
      }
    }

    // 2b. Save customer_code in org_profile setting
    await supabaseAdmin
      .from("site_settings")
      .upsert(
        {
          org_id: orgId,
          key: "org_profile",
          value: { customer_code: customerCode, city: "", state: "", description: "" },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,key" }
      )
      .then(() => {}, () => {});

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
      message: `Trial Signup Intake:\n- Support Code: ${customerCode}\n- Plan: ${cleanPlan}\n- Units: ${cleanUnitCount}\n- Portfolio: ${cleanPortfolioType}\n- Phone: ${cleanPhone || "None"}\n- Org ID: ${orgId}`,
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
      accountCreated: !!createdNewAuthUserId,
      email: ownerEmail,
      customerCode,
      organization: {
        id: orgId,
        slug: orgSlug,
        name: cleanCompany,
        tier: cleanPlan,
        customerCode,
        customer_code: customerCode,
      },
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
