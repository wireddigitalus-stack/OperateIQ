import { NextRequest, NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/server-auth";
import { BRAND, formatPlatformOrigin } from "@/lib/brand";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || "PropOpsIQ <notifications@PropOpsIQ.com>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const g = await requireOrgAdmin(req);
    if (!g.ok) return g.res;
    const { org } = g.ctx;

    const body = await req.json();
    const { email, name, role } = body;
    if (!email || !String(email).trim()) {
      return NextResponse.json(
        { error: "Email is required to send an invitation." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || "").trim() || cleanEmail.split("@")[0];
    const orgName = org?.name || "PropOpsIQ Workspace";
    const rawRole = String(role || "member").trim().toLowerCase();
    const roleDescription =
      rawRole === "owner"
        ? "an owner"
        : rawRole === "admin"
        ? "an administrator"
        : rawRole === "manager"
        ? "a manager"
        : rawRole === "maintenance"
        ? "a maintenance crew member"
        : rawRole === "cleaning"
        ? "a cleaning crew member"
        : "a team member";

    const safeName = escapeHtml(cleanName);
    const safeOrgName = escapeHtml(orgName);
    const safeRole = escapeHtml(String(role || "team member").trim());
    const safeEmail = escapeHtml(cleanEmail);

    const origin = formatPlatformOrigin(
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.PropOpsIQ.com"
    );
    const loginUrl = `${origin}/admin/login?email=${encodeURIComponent(cleanEmail)}`;

    if (!RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        message:
          "User added to team. Resend API key is not configured, so copy the invitation link to send to them directly.",
        loginUrl,
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [cleanEmail],
        subject: `You've been invited to join ${orgName} on ${BRAND.name}`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080C14; color: #FFFFFF; padding: 40px 20px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0E1320; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 900; color: #38BDF8; letter-spacing: -0.5px;">${BRAND.name}</span>
    </div>
    <h2 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px 0;">Team Workspace Invitation</h2>
    <p style="font-size: 14px; color: #94A3B8; line-height: 1.6; margin: 0 0 20px 0;">
      Hi ${safeName}, you have been invited to join the <strong>${safeOrgName}</strong> team on ${BRAND.name} as ${roleDescription} (${safeRole}).
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #0284C7, #4F46E5); color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 10px; box-shadow: 0 4px 14px rgba(2,132,199,0.35);">
        Accept Invitation & Sign In
      </a>
    </div>
    <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin: 0;">
      Sign in using Google or request a 1-click Email Magic Link using <strong>${safeEmail}</strong> to access the dashboard.
    </p>
  </div>
</body>
</html>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.warn("[team-invite] Resend API error:", errText);
      return NextResponse.json({
        success: true,
        emailSent: false,
        message:
          "User added. Email delivery was unavailable; please share the login link directly.",
        loginUrl,
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: `Invitation email sent to ${cleanEmail}.`,
      loginUrl,
    });
  } catch (err) {
    console.error("[team-invite] error:", err);
    return NextResponse.json(
      { error: "Failed to send team invitation." },
      { status: 500 }
    );
  }
}
