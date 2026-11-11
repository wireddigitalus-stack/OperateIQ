/**
 * Transactional email via Resend. Returns false (never throws) when email is
 * not configured or delivery fails, so callers can fall back gracefully.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { BRAND, formatPlatformOrigin } from "@/lib/brand";

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || `${BRAND.name} <notifications@propopsiq.com>`;

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) console.warn("[email] Resend error:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.warn("[email] send failed:", e);
    return false;
  }
}

/** Canonical platform base URL for links in emails (never derived from request headers). */
export function platformUrl(): string {
  return formatPlatformOrigin(process.env.NEXT_PUBLIC_SITE_URL || BRAND.url);
}

// ── Email verification tokens ────────────────────────────────────────────────
function tokenSecret(): string {
  const s = process.env.EMAIL_VERIFY_SECRET || process.env.STAFF_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!s) throw new Error("A signing secret (EMAIL_VERIFY_SECRET / STAFF_SESSION_SECRET / SUPABASE_SERVICE_ROLE_KEY) must be set");
  return s;
}

/** Signed, expiring token proving control of `email` for user `uid`. */
export function createEmailVerifyToken(uid: string, email: string, ttlHours = 72): string {
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
  const payload = Buffer.from(JSON.stringify({ uid, email: email.toLowerCase(), exp, p: "email-verify" })).toString("base64url");
  const sig = createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readEmailVerifyToken(token: string): { uid: string; email: string } | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  try {
    const expected = Buffer.from(createHmac("sha256", tokenSecret()).update(payload).digest("base64url"));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.p !== "email-verify" || !data.uid || !data.email || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: data.uid, email: data.email };
  } catch {
    return null;
  }
}

export function verificationEmailHtml(name: string, link: string): string {
  const safeName = escapeHtml(name || "there");
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#080C14;color:#fff;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#0E1320;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:32px;">
    <div style="font-size:20px;font-weight:900;color:#38BDF8;margin-bottom:24px;">${escapeHtml(BRAND.name)}</div>
    <h2 style="font-size:22px;font-weight:800;margin:0 0 12px;">Confirm your email</h2>
    <p style="font-size:14px;color:#94A3B8;line-height:1.6;margin:0 0 20px;">Hi ${safeName}, please confirm this is your email address. This keeps your workspace secure and lets teammates invite you.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0284C7,#4F46E5);color:#fff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:10px;">Confirm my email</a>
    </div>
    <p style="font-size:12px;color:#64748B;line-height:1.5;margin:0;">This link expires in 72 hours. If you didn't create a ${escapeHtml(BRAND.name)} account, you can ignore this email.</p>
  </div></body></html>`;
}

export function welcomeWorkspaceEmailHtml(opts: {
  name: string;
  company: string;
  planName: string;
  customerCode: string;
  verifyLink?: string;
}): string {
  const safeName = escapeHtml(opts.name || "there");
  const safeCompany = escapeHtml(opts.company || "your portfolio");
  const safePlan = escapeHtml(opts.planName || "Growth");
  const safeCode = escapeHtml(opts.customerCode || "");
  const dashUrl = `${platformUrl()}/admin`;

  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#080C14;color:#fff;padding:40px 20px;margin:0;">
  <div style="max-width:540px;margin:0 auto;background:#0E1320;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:32px;">
    <div style="font-size:20px;font-weight:900;color:#38BDF8;margin-bottom:20px;">${escapeHtml(BRAND.name)}</div>
    <h2 style="font-size:22px;font-weight:800;margin:0 0 12px;">Welcome to ${escapeHtml(BRAND.name)}, ${safeName}</h2>
    <p style="font-size:14px;color:#CBD5E1;line-height:1.6;margin:0 0 16px;">
      Your 14-day free trial workspace for <strong>${safeCompany}</strong> (${safePlan} Plan) is ready.
    </p>
    ${
      opts.verifyLink
        ? `<div style="margin:24px 0;padding:18px;border-radius:12px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);text-align:center;">
            <p style="font-size:13px;color:#E2E8F0;margin:0 0 12px;">First, confirm your email address to secure your workspace:</p>
            <a href="${opts.verifyLink}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0284C7,#4F46E5);color:#fff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:10px;">Confirm Email &amp; Open Dashboard</a>
          </div>`
        : `<div style="text-align:center;margin:24px 0;">
            <a href="${dashUrl}" style="display:inline-block;padding:13px 26px;background:linear-gradient(135deg,#0284C7,#4F46E5);color:#fff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:10px;">Open Your Dashboard</a>
          </div>`
    }
    <div style="margin:20px 0;padding:16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#94A3B8;line-height:1.7;">
      <strong style="color:#fff;display:block;margin-bottom:6px;">Quick first steps:</strong>
      1. Add your first building (or import an existing Excel/CSV rent roll in 1 click)<br/>
      2. Review this month's Rent Ledger &amp; payment instructions<br/>
      3. Create a 6-digit crew PIN for maintenance or cleaning staff<br/>
      ${safeCode ? `<span style="display:block;margin-top:8px;color:#38BDF8;">Support Code: <strong>${safeCode}</strong></span>` : ""}
    </div>
    <p style="font-size:12px;color:#64748B;line-height:1.5;margin:0;">Need a hand importing your rent roll? Reply directly to this email or use the Help button inside your dashboard.</p>
  </div></body></html>`;
}
