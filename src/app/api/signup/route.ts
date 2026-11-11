import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE, getCustomerCode, isSuperAdmin } from "@/lib/platform";
import { checkRateLimit } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/server-auth";
import { createEmailVerifyToken, escapeHtml, platformUrl, sendEmail, welcomeWorkspaceEmailHtml } from "@/lib/email";

/** Turnstile is enforced only when BOTH keys are configured (otherwise the widget isn't rendered). */
async function turnstileOk(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const d = await r.json();
    return !!d.success;
  } catch {
    return false;
  }
}

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

    if (!(await checkRateLimit(`signup:${ip}`, 10, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many signup requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    if (!(await turnstileOk(body.turnstileToken, ip))) {
      return NextResponse.json({ error: "Security check failed. Please reload the page and try again." }, { status: 400 });
    }
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

    if (body.agreedToTerms !== true) {
      return NextResponse.json(
        { error: "Please agree to the Terms of Service and Privacy Policy to continue." },
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

    // Only reuse an existing session if it is NOT a platform super-admin and its email matches the signup form email.
    // This prevents Master Admin testing or shared browsers from attaching new tenant workspaces to the wrong user.
    const rawAuthedUser = await getAuthUser(req);
    const authedUser =
      rawAuthedUser &&
      !isSuperAdmin(rawAuthedUser.email) &&
      rawAuthedUser.email.toLowerCase() === cleanEmail
        ? rawAuthedUser
        : null;
    const ownerEmail = cleanEmail;

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
        // Lets the new owner sign straight into the workspace they're creating.
        // Ownership of the email is NOT assumed: email_verified=false until they
        // click the verification link, which gates invites and admin access.
        email_confirm: true,
        user_metadata: { full_name: cleanName },
        app_metadata: { email_verified: false },
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

    // 2b. Save customer_code & honest first-run flags in org_profile setting
    const enableCommercialByDefault =
      cleanPortfolioType.toLowerCase().includes("commercial") ||
      cleanPortfolioType.toLowerCase().includes("industrial");
    await supabaseAdmin
      .from("site_settings")
      .upsert(
        {
          org_id: orgId,
          key: "org_profile",
          value: {
            customer_code: customerCode,
            city: "",
            state: "",
            description: "",
            site_published: false,
            commercial_tools_enabled: enableCommercialByDefault,
            checklist_dismissed: false,
            terms_accepted_at: new Date().toISOString(),
          },
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

    // 3b. Welcome + Email verification for new signups, plus founder notification.
    let verificationSent = false;
    const planLabel = cleanPlan.charAt(0).toUpperCase() + cleanPlan.slice(1);
    const verifyLink = createdNewAuthUserId
      ? `${platformUrl()}/api/auth/verify-email?token=${encodeURIComponent(
          createEmailVerifyToken(createdNewAuthUserId, ownerEmail)
        )}`
      : undefined;

    verificationSent = await sendEmail({
      to: ownerEmail,
      subject: verifyLink
        ? `Welcome to PropOpsIQ — Confirm your email`
        : `Welcome to PropOpsIQ — Your ${cleanCompany} workspace is ready`,
      html: welcomeWorkspaceEmailHtml({
        name: cleanName,
        company: cleanCompany,
        planName: planLabel,
        customerCode,
        verifyLink,
      }),
    });

    const notifyList = (process.env.CONTACT_NOTIFY_TO || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    for (const adminTo of notifyList) {
      await sendEmail({
        to: adminTo,
        replyTo: ownerEmail,
        subject: `[New Trial Signup] ${cleanCompany} (${planLabel})`,
        html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;">
          <h3>New PropOpsIQ Trial Workspace</h3>
          <p><strong>Owner:</strong> ${escapeHtml(cleanName)} (${escapeHtml(ownerEmail)})</p>
          <p><strong>Company:</strong> ${escapeHtml(cleanCompany)} (<code>${escapeHtml(orgSlug)}</code>)</p>
          <p><strong>Plan:</strong> ${escapeHtml(planLabel)} · <strong>Units:</strong> ${escapeHtml(cleanUnitCount)}</p>
          <p><strong>Portfolio Type:</strong> ${escapeHtml(cleanPortfolioType)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(cleanPhone || "Not provided")}</p>
          <p><strong>Support Code:</strong> <code>${escapeHtml(customerCode)}</code></p>
        </div>`,
      }).catch(() => {});
    }

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
      verificationSent,
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
