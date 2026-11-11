import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { escapeHtml, platformUrl, sendEmail } from "@/lib/email";
import { BRAND } from "@/lib/brand";
import type { Tier } from "@/lib/plans";

function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  try {
    const parts = sigHeader.split(",").map((p) => p.trim());
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));
    if (!tPart || !v1Part) return false;
    const timestamp = tPart.slice(2);
    const signature = v1Part.slice(3);
    // Reject events signed more than 5 minutes ago (replay protection, as Stripe's SDK does).
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`, "utf8")
      .digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function inferTierFromSubscriptionObject(obj: any): Tier | null {
  const firstItem = obj?.items?.data?.[0];
  const priceId = String(firstItem?.price?.id || "");
  if (priceId) {
    const pairs: [Tier, string | undefined][] = [
      ["starter", process.env.STRIPE_PRICE_STARTER_MONTHLY],
      ["starter", process.env.STRIPE_PRICE_STARTER_ANNUAL],
      ["growth", process.env.STRIPE_PRICE_GROWTH_MONTHLY],
      ["growth", process.env.STRIPE_PRICE_GROWTH_ANNUAL],
      ["pro", process.env.STRIPE_PRICE_PRO_MONTHLY],
      ["pro", process.env.STRIPE_PRICE_PRO_ANNUAL],
    ];
    for (const [tier, configured] of pairs) {
      if (configured && configured.trim() === priceId) return tier;
    }
  }

  const unitAmount = Number(firstItem?.price?.unit_amount || 0);
  if (unitAmount === 9900 || unitAmount === 99000) return "starter";
  if (unitAmount === 24900 || unitAmount === 249000) return "growth";
  if (unitAmount === 49900 || unitAmount === 499000) return "pro";

  const metaTier = String(obj?.metadata?.tier || "").toLowerCase();
  if (metaTier === "starter" || metaTier === "growth" || metaTier === "pro") {
    return metaTier;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "")
      .trim()
      .replace(/^['"]+|['"]+$/g, "");

    if (!webhookSecret) {
      return NextResponse.json({ error: "Stripe webhook secret is not configured." }, { status: 503 });
    }

    const sig = req.headers.get("stripe-signature") || "";
    if (!verifyStripeSignature(rawBody, sig, webhookSecret)) {
      return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventId = typeof event?.id === "string" ? event.id : "";
    if (eventId) {
      const firstSeen = await checkRateLimit(`stripe-evt:${eventId}`, 1, 7 * 86_400_000);
      if (!firstSeen) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    const type = String(event?.type || "");
    const obj = event?.data?.object || {};

    if (type === "checkout.session.completed") {
      const orgId = obj.metadata?.org_id || obj.client_reference_id;
      const rawTier = String(obj.metadata?.tier || "").toLowerCase();
      if (orgId) {
        const updates: Record<string, unknown> = {
          subscription_status: "active",
          trial_ends_at: null,
        };
        if (["starter", "growth", "pro"].includes(rawTier)) updates.tier = rawTier;
        const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id || null;
        const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id || null;
        if (customerId) updates.stripe_customer_id = customerId;
        if (subscriptionId) updates.stripe_subscription_id = subscriptionId;
        await supabaseAdmin.from("organizations").update(updates).eq("id", orgId);
      }
    } else if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
      const orgId = obj.metadata?.org_id;
      const subId = typeof obj.id === "string" ? obj.id : null;
      const stripeStatus = String(obj.status || "").toLowerCase();

      const mappedStatus =
        type === "customer.subscription.deleted" ||
        stripeStatus === "canceled" ||
        stripeStatus === "unpaid" ||
        stripeStatus === "incomplete_expired"
          ? "canceled"
          : stripeStatus === "past_due" || stripeStatus === "incomplete"
          ? "past_due"
          : stripeStatus === "paused"
          ? "paused"
          : "active";

      const updates: Record<string, unknown> = { subscription_status: mappedStatus };
      const inferredTier = inferTierFromSubscriptionObject(obj);
      if (inferredTier) updates.tier = inferredTier;

      if (orgId) {
        await supabaseAdmin.from("organizations").update(updates).eq("id", orgId);
      } else if (subId) {
        await supabaseAdmin.from("organizations").update(updates).eq("stripe_subscription_id", subId);
      }
    } else if (type === "invoice.payment_failed") {
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id || null;
      const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id || null;

      let orgQuery = supabaseAdmin
        .from("organizations")
        .select("id, name, contact_email");
      if (subId) orgQuery = orgQuery.eq("stripe_subscription_id", subId);
      else if (customerId) orgQuery = orgQuery.eq("stripe_customer_id", customerId);
      else orgQuery = orgQuery.eq("id", "00000000-0000-0000-0000-000000000000");

      const { data: targetOrg } = await orgQuery.maybeSingle();
      if (targetOrg?.id) {
        await supabaseAdmin
          .from("organizations")
          .update({ subscription_status: "past_due" })
          .eq("id", targetOrg.id);

        if (targetOrg.contact_email) {
          const billingUrl = `${platformUrl()}/admin?tab=settings`;
          await sendEmail({
            to: targetOrg.contact_email,
            subject: `Action needed: Payment failed for ${targetOrg.name}`,
            html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#080C14;color:#fff;padding:36px 20px;margin:0;">
              <div style="max-width:520px;margin:0 auto;background:#0E1320;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:30px;">
                <div style="font-size:19px;font-weight:900;color:#38BDF8;margin-bottom:18px;">${escapeHtml(BRAND.name)}</div>
                <h2 style="font-size:20px;margin:0 0 12px;">We couldn't process your latest payment</h2>
                <p style="font-size:14px;color:#CBD5E1;line-height:1.6;margin:0 0 20px;">
                  Stripe reported a failed renewal charge for <strong>${escapeHtml(targetOrg.name)}</strong>. Your workspace data is safe and accessible during the grace period — please update your payment method in Settings → Plan &amp; Billing.
                </p>
                <a href="${billingUrl}" style="display:inline-block;padding:12px 22px;background:#0284C7;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:10px;">Update Payment Method</a>
              </div></body></html>`,
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] error:", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
