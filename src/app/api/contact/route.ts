import { NextRequest, NextResponse } from "next/server";
import { platformOrgId } from "@/lib/platform-org";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { BRAND } from "@/lib/brand";
import { orgContactLine } from "@/lib/org-profile";
import { GoogleGenerativeAI } from "@google/generative-ai";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Recipients come from env (comma-separated). Email is OFF until both
// RESEND_API_KEY and CONTACT_NOTIFY_TO are set — submissions still save to the DB.
const TO_EMAILS = (process.env.CONTACT_NOTIFY_TO || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
// Must match a verified domain in Resend — set RESEND_FROM_EMAIL or RESEND_FROM env var
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  process.env.RESEND_FROM ||
  "PropOpsIQ <notifications@PropOpsIQ.com>";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitize(s: unknown): string {
  return String(s ?? "").trim().slice(0, 2000);
}

async function detectSpamWithAI(data: {
  name: string; email: string; company: string; phone: string;
  interest: string; city: string; message: string;
}): Promise<{ isSpam: boolean; reason: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { isSpam: false, reason: "" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Analyze the following website contact form submission to determine if it is spam/sales-solicitation (like SEO pitching, link building, forex/crypto scams, general business services advertising, marketing pitches, domain sales, unrelated recruitment outreach, or automated bots) or if it is a genuine commercial inquiry (interested in leasing office/retail/warehouse space, property development partnerships, or executive business advisement).

SUBMISSION:
Name: ${data.name}
Email: ${data.email}
Company: ${data.company}
Interested In: ${data.interest}
Preferred Market: ${data.city}
Message: ${data.message}

Respond strictly in JSON format:
{
  "isSpam": true or false,
  "reason": "Clear explanation of why it is spam (e.g., 'SEO optimization solicitation', 'Crypto scam advertising', 'Unsolicited marketing pitch') or empty if genuine"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    return {
      isSpam: !!parsed.isSpam,
      reason: String(parsed.reason || "")
    };
  } catch (err) {
    console.error("AI spam check failed:", err);
    return { isSpam: false, reason: "" };
  }
}

function buildHtml(data: {
  name: string; email: string; company: string; phone: string;
  interest: string; city: string; message: string;
  isSpam?: boolean; spamReason?: string;
}): string {
  const row = (label: string, value: string) =>
    value
      ? `<tr>
           <td style="padding:8px 12px 8px 0;color:#4B5563;font-size:11px;font-weight:700;text-transform:uppercase;white-space:nowrap;vertical-align:top;width:120px;">${label}</td>
           <td style="padding:8px 0;color:#111827;font-weight:600;font-size:14px;">${value}</td>
         </tr>`
      : "";

  const spamHeader = data.isSpam
    ? `<div style="margin-bottom:20px;padding:12px 16px;background-color:#FEE2E2;border:1.5px solid #EF4444;border-radius:10px;">
         <p style="margin:0;font-size:13px;font-weight:900;color:#991B1B;">⚠️ POTENTIAL SPAM WARNING</p>
         <p style="margin:4px 0 0;font-size:12px;color:#7F1D1D;">AI Reason: ${data.spamReason || "Sales outreach or marketing solicitation."}</p>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;">
  <div style="max-width:580px;margin:40px auto;padding:0 16px;">
    <div style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03);">
      ${spamHeader}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        <div style="width:10px;height:10px;border-radius:50%;background-color:${data.isSpam ? "#EF4444" : "#16A34A"};flex-shrink:0;"></div>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#111827;">${data.isSpam ? "Flagged Inquiry (Spam)" : "New Contact Inquiry"}</h1>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        ${row("Name", data.name)}
        ${row("Email", data.email)}
        ${row("Company", data.company)}
        ${row("Phone", data.phone)}
        ${row("Interested In", data.interest)}
        ${row("Preferred Market", data.city)}
      </table>

      ${data.message ? `
      <div style="margin-top:20px;padding:16px;background-color:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;">
        <p style="margin:0 0 8px;color:#4B5563;font-size:11px;font-weight:700;text-transform:uppercase;">Message</p>
        <p style="margin:0;color:#1F2937;font-size:14px;line-height:1.6;white-space:pre-wrap;">${data.message}</p>
      </div>` : ""}

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E5E7EB;">
        <p style="margin:0;color:#4B5563;font-size:12px;">
          Reply directly to this email to reach <strong style="color:#111827;">${data.name}</strong> at
          <a href="mailto:${data.email}" style="color:#16A34A;font-weight:600;text-decoration:none;">${data.email}</a>
        </p>
        <p style="margin:8px 0 0;color:#9CA3AF;font-size:11px;">Submitted via ${BRAND.name} contact form</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name, email, company, phone, interest, city, message,
      // Anti-spam fields
      website,        // honeypot — bots fill this, humans don't
      formOpenedAt,   // timestamp set when form renders
      // Analytics correlation
      sessionId,      // anonymous browser session from useAnalytics
    } = body;

    // ── 1. Honeypot check — return silent 200 to fool bots ──────────────────
    if (website) {
      return NextResponse.json({ success: true });
    }

    // ── 2. Timing check — reject submissions faster than 4 seconds ──────────
    const elapsed = Date.now() - Number(formOpenedAt ?? 0);
    if (elapsed < 4000) {
      return NextResponse.json({ success: true }); // Silent OK
    }

    // ── 3. Rate limiting — 5 submissions per IP per hour ────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    if (!checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later or call us directly." },
        { status: 429 }
      );
    }

    // ── 3.4 Resolve tenant organization (public tenant-site forms) ───────────
    // The org is looked up server-side; an unknown id/slug resolves to null.
    let targetOrg: { id: string; name: string; contact_email: string | null } | null = null;
    const requestedOrgId = typeof body.org_id === "string" ? body.org_id : null;
    const headerSlug = req.headers.get("x-tenant-slug");
    const requestedOrgSlug = typeof body.org_slug === "string" ? body.org_slug : (headerSlug || null);

    if (supabaseAdmin && (requestedOrgId || requestedOrgSlug)) {
      let q = supabaseAdmin.from("organizations").select("id, name, contact_email");
      if (requestedOrgSlug) {
        q = q.eq("slug", requestedOrgSlug.toLowerCase().trim());
      } else if (requestedOrgId && /^[0-9a-f-]{36}$/i.test(requestedOrgId)) {
        q = q.eq("id", requestedOrgId);
      }
      const { data: orgData } = await q.maybeSingle();
      if (orgData) targetOrg = orgData;
    }

    // ── 3.5 Turnstile Verification ───────────────────────────────────────────
    const turnstileToken = body.turnstileToken;
    const secretKey = process.env.TURNSTILE_SECRET_KEY || "1x00000000000000000000000000000000";

    // Required on the marketing contact form. Tenant-site forms (which resolved
    // to a real org) don't embed Turnstile yet and rely on honeypot + timing + rate limit.
    const isTourRequest = Boolean(targetOrg);
    if (turnstileToken || (process.env.TURNSTILE_SECRET_KEY && !isTourRequest)) {
      if (!turnstileToken && !isTourRequest) {
        return NextResponse.json(
          { error: "Security check token is missing. Please reload the page and try again." },
          { status: 400 }
        );
      }

      if (turnstileToken) {
        try {
          const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              secret: secretKey,
              response: turnstileToken,
              remoteip: ip,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            return NextResponse.json(
              { error: "Security check failed. Please refresh and try again." },
              { status: 400 }
            );
          }
        } catch (err) {
          console.error("Turnstile verification error:", err);
          if (process.env.TURNSTILE_SECRET_KEY && !isTourRequest) {
            return NextResponse.json(
              { error: "Security service temporarily unavailable. Please try again later." },
              { status: 503 }
            );
          }
        }
      }
    }

    // ── 4. Server-side validation ────────────────────────────────────────────
    const cleanName     = sanitize(name);
    const cleanEmail    = sanitize(email).toLowerCase();
    const cleanCompany  = sanitize(company);
    const cleanPhone    = sanitize(phone);
    const cleanInterest = sanitize(interest);
    const cleanCity     = sanitize(city);
    const cleanMessage  = sanitize(message);

    if (!cleanName || !cleanEmail || !cleanInterest) {
      return NextResponse.json(
        { error: "Name, email, and interest are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // ── 5. Store in the tenant's leads CRM (must succeed for tenant forms) ──
    if (targetOrg) {
      const { error: leadErr } = await supabaseAdmin.from("leads").insert({
        id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        org_id: targetOrg.id,
        timestamp: new Date().toISOString(),
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || "",
        space_type: sanitize(body.space_type) || null,
        budget: sanitize(body.budget) || null,
        timeline: sanitize(body.timeline) || null,
        team_size: sanitize(body.team_size) || null,
        additional_info: [cleanInterest, cleanCompany && `Company: ${cleanCompany}`, cleanMessage]
          .filter(Boolean)
          .join(" — "),
        score: 0,
        score_label: "New",
        source: sanitize(body.source) || "public_site",
        medium: sanitize(body.medium) || "website_form",
        progress: "0-25%",
      });
      if (leadErr) {
        console.error("[contact] Tenant lead insert failed:", leadErr);
        return NextResponse.json(
          { error: "We couldn't save your request. Please try again in a moment." },
          { status: 500 }
        );
      }
    }

    // ── 5a. Contact audit row (best effort). Tenant forms → that tenant;
    // the platform's own contact form → the platform org.
    const auditRow: Record<string, unknown> = {
      id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      submitted_at: new Date().toISOString(),
      name: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      phone: cleanPhone || "",
      interest: cleanInterest,
      city: cleanCity,
      message: cleanMessage,
      ip_hash: ip.split(".").slice(0, 3).join(".") + ".x",
      session_id: sessionId || null,
    };
    auditRow.org_id = targetOrg?.id || platformOrgId();
    const { error: auditErr } = await supabaseAdmin.from("contact_submissions").insert(auditRow);
    if (auditErr) console.warn("[contact] Audit insert skipped:", auditErr.message);

    // ── 5b. AI Spam Check for notification email ────────────────────────────
    let isSpam = false;
    let spamReason = "";
    try {
      const spamCheck = await detectSpamWithAI({
        name: cleanName,
        email: cleanEmail,
        company: cleanCompany,
        phone: cleanPhone,
        interest: cleanInterest,
        city: cleanCity,
        message: cleanMessage,
      });
      if (spamCheck.isSpam) {
        isSpam = true;
        spamReason = spamCheck.reason;
      }
    } catch (err) {
      console.warn("[contact AI spam check failed]", err);
    }

    // ── 6. Send email via Resend REST API ────────────────────────────────────
    // Tenant-site leads go to that tenant only; platform leads go to the platform inbox.
    const recipients = targetOrg
      ? (targetOrg.contact_email ? [targetOrg.contact_email] : [])
      : TO_EMAILS;
    if (RESEND_API_KEY && recipients.length > 0) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: recipients,
          reply_to: cleanEmail,
          subject: `${isSpam ? "[POTENTIAL SPAM] " : ""}${targetOrg ? `[${targetOrg.name}] ` : ""}New Inquiry: ${cleanInterest} — ${cleanName}`,
          html: buildHtml({
            name: cleanName, email: cleanEmail, company: cleanCompany,
            phone: cleanPhone, interest: cleanInterest, city: cleanCity,
            message: cleanMessage,
            isSpam,
            spamReason,
          }),
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("[contact] Resend error:", errText);
        // Don't fail the user-facing response if email fails but DB save worked
      }
    } else {
      console.warn("[contact] Email delivery disabled (RESEND_API_KEY / CONTACT_NOTIFY_TO not set). Submission saved to DB only.");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    const contact = orgContactLine();
    return NextResponse.json(
      {
        error: contact
          ? `Something went wrong. Please contact us directly: ${contact}`
          : "Something went wrong. Please try again later.",
      },
      { status: 500 }
    );
  }
}
