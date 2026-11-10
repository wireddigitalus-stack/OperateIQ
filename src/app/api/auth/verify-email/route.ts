import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthUser } from "@/lib/server-auth";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  createEmailVerifyToken,
  readEmailVerifyToken,
  sendEmail,
  emailConfigured,
  platformUrl,
  verificationEmailHtml,
} from "@/lib/email";

/**
 * GET  /api/auth/verify-email?token=…  → marks the account's email as verified, then redirects to /admin
 * POST /api/auth/verify-email          → (signed-in) re-sends the verification email
 */
export async function GET(req: NextRequest) {
  const base = platformUrl();
  const token = req.nextUrl.searchParams.get("token") || "";
  const data = readEmailVerifyToken(token);
  if (!data) return NextResponse.redirect(`${base}/admin?email_verified=invalid`);

  const { data: found } = await supabaseAdmin.auth.admin.getUserById(data.uid);
  const u = found?.user;
  if (!u || (u.email || "").toLowerCase() !== data.email) {
    return NextResponse.redirect(`${base}/admin?email_verified=invalid`);
  }

  await supabaseAdmin.auth.admin.updateUserById(u.id, {
    app_metadata: { ...(u.app_metadata || {}), email_verified: true },
  });
  return NextResponse.redirect(`${base}/admin?email_verified=1`);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ success: true, alreadyVerified: true });
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Email delivery isn't configured yet. Please contact support." }, { status: 503 });
  }
  if (!(await checkRateLimit(`verify-email:${user.id}`, 3, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Verification email already sent. Please check your inbox (and spam) or try again in an hour." }, { status: 429 });
  }
  const link = `${platformUrl()}/api/auth/verify-email?token=${encodeURIComponent(createEmailVerifyToken(user.id, user.email))}`;
  const ok = await sendEmail({ to: user.email, subject: "Confirm your email", html: verificationEmailHtml(user.name, link) });
  if (!ok) return NextResponse.json({ error: "Could not send the email right now. Please try again shortly." }, { status: 502 });
  return NextResponse.json({ success: true });
}
