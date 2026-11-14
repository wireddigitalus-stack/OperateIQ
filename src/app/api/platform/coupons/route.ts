import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/server-auth";
import { emailConfigured, escapeHtml, platformUrl, sendEmail } from "@/lib/email";
import { getPlan, type Tier } from "@/lib/plans";
import {
  generateRandomCouponCode,
  loadCoupons,
  normalizeCouponCode,
  saveCoupons,
  type CouponCode,
} from "@/lib/coupons";

export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;

  const coupons = await loadCoupons();
  return NextResponse.json({
    coupons,
    emailConfigured: emailConfigured(),
    platformUrl: platformUrl(),
  });
}

export async function POST(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "create");

  if (action === "create") {
    const rawCode = String(body.code || "").trim();
    const prefix = String(body.prefix || "BETA").trim();
    const code = rawCode ? normalizeCouponCode(rawCode) : generateRandomCouponCode(prefix);

    if (!code || code.length < 3) {
      return NextResponse.json({ error: "Coupon code must be at least 3 characters." }, { status: 400 });
    }

    const plan = (["starter", "growth", "pro"].includes(body.plan) ? body.plan : "pro") as Tier;
    const trialDays = Math.min(365, Math.max(7, Math.round(Number(body.trialDays) || 60)));
    const maxUsesRaw = body.maxUses === null || body.maxUses === "" || body.maxUses === undefined
      ? null
      : Math.max(1, Math.round(Number(body.maxUses)));
    const expiresAt = body.expiresAt ? String(body.expiresAt).trim() : null;
    const note = String(body.note || "").trim().slice(0, 200);

    const coupons = await loadCoupons();
    if (coupons.some((c) => normalizeCouponCode(c.code) === code)) {
      return NextResponse.json({ error: `Code "${code}" already exists.` }, { status: 409 });
    }

    const created: CouponCode = {
      code,
      plan,
      trialDays,
      maxUses: maxUsesRaw,
      uses: 0,
      active: true,
      expiresAt,
      note,
      createdAt: new Date().toISOString(),
      redeemedBy: [],
    };

    const next = [created, ...coupons];
    await saveCoupons(next);
    return NextResponse.json({ ok: true, coupon: created, coupons: next });
  }

  if (action === "toggle") {
    const code = normalizeCouponCode(body.code);
    const coupons = await loadCoupons();
    const idx = coupons.findIndex((c) => normalizeCouponCode(c.code) === code);
    if (idx === -1) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }
    coupons[idx] = { ...coupons[idx], active: !coupons[idx].active };
    await saveCoupons(coupons);
    return NextResponse.json({ ok: true, coupons });
  }

  if (action === "delete") {
    const code = normalizeCouponCode(body.code);
    const coupons = await loadCoupons();
    const next = coupons.filter((c) => normalizeCouponCode(c.code) !== code);
    await saveCoupons(next);
    return NextResponse.json({ ok: true, coupons: next });
  }

  if (action === "send_email") {
    const code = normalizeCouponCode(body.code);
    const toEmail = String(body.recipientEmail || "").trim().toLowerCase();
    const recipientName = String(body.recipientName || "").trim();
    const personalMessage = String(body.personalMessage || "").trim().slice(0, 1000);

    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return NextResponse.json({ error: "Please enter a valid recipient email." }, { status: 400 });
    }
    if (!emailConfigured()) {
      return NextResponse.json(
        { error: "Resend email (RESEND_API_KEY) is not configured yet — copy the code or link to send manually." },
        { status: 503 }
      );
    }

    const coupons = await loadCoupons();
    const idx = coupons.findIndex((c) => normalizeCouponCode(c.code) === code);
    if (idx === -1) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    const coupon = coupons[idx];
    const planName = getPlan(coupon.plan).name;
    const signupLink = `${platformUrl()}/signup?code=${encodeURIComponent(coupon.code)}`;
    const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi there,";
    const messageHtml = personalMessage
      ? escapeHtml(personalMessage).replace(/\n/g, "<br/>")
      : `I'd love to invite you to try <strong>PropOpsIQ</strong>. Use the personal invite code below to unlock <strong>${coupon.trialDays} days free on the ${escapeHtml(planName)} plan</strong> (no credit card required).`;

    const sent = await sendEmail({
      to: toEmail,
      subject: `Your ${coupon.trialDays}-Day PropOpsIQ ${planName} Invite (${coupon.code})`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;margin:0 auto;padding:28px;background:#080C14;color:#f8fafc;border-radius:16px">
        <div style="font-size:18px;font-weight:900;color:#38bdf8;margin-bottom:16px">PropOpsIQ</div>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#e2e8f0">${greeting}</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#cbd5e1">${messageHtml}</p>
        <div style="margin:20px 0;padding:16px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);border-radius:12px;text-align:center">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:6px">Your Invite Code</div>
          <div style="font-size:22px;font-weight:900;letter-spacing:0.12em;color:#ffffff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(coupon.code)}</div>
          <div style="font-size:12px;color:#34d399;margin-top:6px;font-weight:700">${coupon.trialDays} Days Free · ${escapeHtml(planName)} Plan</div>
        </div>
        <div style="margin:24px 0;text-align:center">
          <a href="${escapeHtml(signupLink)}" style="display:inline-block;padding:13px 26px;background:linear-gradient(135deg,#0284c7,#4f46e5);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px">Claim My Invite →</a>
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#64748b">
          Or go to <a href="${escapeHtml(signupLink)}" style="color:#38bdf8">${escapeHtml(signupLink)}</a>
        </p>
      </div>`,
    });

    if (!sent) {
      return NextResponse.json({ error: "Email delivery failed. You can still copy the code or link." }, { status: 502 });
    }

    coupons[idx] = {
      ...coupon,
      recipientEmail: toEmail,
      note: coupon.note || (recipientName ? `Emailed to ${recipientName} (${toEmail})` : `Emailed to ${toEmail}`),
    };
    await saveCoupons(coupons);
    return NextResponse.json({ ok: true, coupons });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
