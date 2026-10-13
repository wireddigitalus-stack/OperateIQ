import { NextRequest, NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getPlan, type Tier } from "@/lib/plans";
import { BRAND } from "@/lib/brand";

function toFormUrlEncoded(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) sp.append(k, v);
  }
  return sp.toString();
}

export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req, { allowExpired: true });
  if (!g.ok) return g.res;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured on the server (missing STRIPE_SECRET_KEY)." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const rawTier = String(body.tier || "").toLowerCase();
    const tier: Tier = (["starter", "growth", "pro"].includes(rawTier) ? rawTier : "growth") as Tier;
    const billingCycle: "monthly" | "annual" = body.billingCycle === "annual" ? "annual" : "monthly";
    const plan = getPlan(tier);

    const orgId = g.ctx.orgId;
    const { data: orgRow } = await supabaseAdmin
      .from("organizations")
      .select("id, name, contact_email, stripe_customer_id")
      .eq("id", orgId)
      .maybeSingle();

    let customerId: string | null = (orgRow as { stripe_customer_id?: string | null } | null)?.stripe_customer_id || null;
    const customerEmail = g.ctx.org.contact_email || g.ctx.user?.email || "";
    const customerName = g.ctx.org.brand_name || g.ctx.org.name || "OperateIQ Customer";

    // Create a Stripe Customer if the organization doesn't have one yet
    if (!customerId) {
      const custRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormUrlEncoded({
          email: customerEmail,
          name: customerName,
          "metadata[org_id]": orgId,
          "metadata[org_slug]": g.ctx.org.slug,
        }),
      });
      if (custRes.ok) {
        const custData = await custRes.json();
        if (custData?.id) {
          customerId = String(custData.id);
          await supabaseAdmin
            .from("organizations")
            .update({ stripe_customer_id: customerId })
            .eq("id", orgId);
        }
      }
    }

    const reqOrigin = req.nextUrl.origin || BRAND.url;
    const unitAmountCents = String((billingCycle === "annual" ? plan.annual : plan.monthly) * 100);
    const interval = billingCycle === "annual" ? "year" : "month";
    const productName = `OperateIQ ${plan.id === "pro" ? "Scale (Pro)" : plan.name} Plan (${
      billingCycle === "annual" ? "Annual" : "Monthly"
    })`;

    const checkoutParams: Record<string, string> = {
      mode: "subscription",
      client_reference_id: orgId,
      success_url: `${reqOrigin}/admin?tab=settings&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${reqOrigin}/admin?tab=settings&checkout=canceled`,
      allow_promotion_codes: "true",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": unitAmountCents,
      "line_items[0][price_data][recurring][interval]": interval,
      "line_items[0][price_data][product_data][name]": productName,
      "line_items[0][price_data][product_data][description]": plan.blurb,
      "metadata[org_id]": orgId,
      "metadata[tier]": plan.id,
      "metadata[billing_cycle]": billingCycle,
      "subscription_data[metadata][org_id]": orgId,
      "subscription_data[metadata][tier]": plan.id,
      "subscription_data[metadata][billing_cycle]": billingCycle,
    };

    if (customerId) {
      checkoutParams.customer = customerId;
    } else if (customerEmail) {
      checkoutParams.customer_email = customerEmail;
    }

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: toFormUrlEncoded(checkoutParams),
    });

    const sessionData = await sessionRes.json();
    if (!sessionRes.ok || !sessionData?.url) {
      console.error("[stripe/checkout] Stripe API error:", sessionData);
      return NextResponse.json(
        { error: sessionData?.error?.message || "Could not create Stripe Checkout session." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: sessionData.url, sessionId: sessionData.id });
  } catch (err) {
    console.error("[stripe/checkout] error:", err);
    return NextResponse.json({ error: "Failed to start Stripe Checkout." }, { status: 500 });
  }
}
