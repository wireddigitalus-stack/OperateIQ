import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  try {
    const parts = sigHeader.split(",").map((p) => p.trim());
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));
    if (!tPart || !v1Part) return false;
    const timestamp = tPart.slice(2);
    const signature = v1Part.slice(3);
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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature") || "";
      if (!verifyStripeSignature(rawBody, sig, webhookSecret)) {
        return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
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
        if (typeof obj.customer === "string") updates.stripe_customer_id = obj.customer;
        if (typeof obj.subscription === "string") updates.stripe_subscription_id = obj.subscription;
        await supabaseAdmin.from("organizations").update(updates).eq("id", orgId);
      }
    } else if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
      const orgId = obj.metadata?.org_id;
      const subId = typeof obj.id === "string" ? obj.id : null;
      const stripeStatus = String(obj.status || "").toLowerCase();
      const rawTier = String(obj.metadata?.tier || "").toLowerCase();

      const mappedStatus =
        type === "customer.subscription.deleted" || stripeStatus === "canceled" || stripeStatus === "unpaid"
          ? "canceled"
          : stripeStatus === "past_due"
          ? "past_due"
          : stripeStatus === "paused"
          ? "paused"
          : stripeStatus === "trialing"
          ? "trialing"
          : "active";

      const updates: Record<string, unknown> = { subscription_status: mappedStatus };
      if (["starter", "growth", "pro"].includes(rawTier)) updates.tier = rawTier;

      if (orgId) {
        await supabaseAdmin.from("organizations").update(updates).eq("id", orgId);
      } else if (subId) {
        await supabaseAdmin.from("organizations").update(updates).eq("stripe_subscription_id", subId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] error:", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
