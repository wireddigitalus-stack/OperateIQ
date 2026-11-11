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

function configuredPriceId(tier: Tier, billingCycle: "monthly" | "annual"): string | null {
  const envKey = `STRIPE_PRICE_${tier.toUpperCase()}_${billingCycle.toUpperCase()}`;
  const raw = (process.env[envKey] || "").trim();
  return raw.startsWith("price_") ? raw : null;
}

export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req, { allowExpired: true });
  if (!g.ok) return g.res;

  const rawKey = (process.env.STRIPE_SECRET_KEY || "").trim();
  const secretKey = rawKey.replace(/^['"]+|['"]+$/g, "").replace(/^Bearer\s+/i, "").trim();
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured on the server (missing STRIPE_SECRET_KEY in Vercel Environment Variables)." },
      { status: 503 }
    );
  }
  if (secretKey.startsWith("mk_")) {
    return NextResponse.json(
      {
        error:
          "STRIPE_SECRET_KEY is set to a Stripe Key ID ('mk_...'). Please replace it with the actual Secret Key token starting with 'sk_test_...' or 'sk_live_...'.",
      },
      { status: 503 }
    );
  }
  if (secretKey.includes("...") || secretKey.includes("*") || secretKey.length < 30) {
    return NextResponse.json(
      {
        error:
          "STRIPE_SECRET_KEY in Vercel is set to a masked/truncated preview (e.g. 'sk_live_...'). In your Stripe Dashboard → Developers → API keys, click 'Reveal live key' (or create a new Secret Key) and paste the full key.",
      },
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
      .select("id, name, contact_email, stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at")
      .eq("id", orgId)
      .maybeSingle();

    let customerId: string | null =
      (orgRow as { stripe_customer_id?: string | null } | null)?.stripe_customer_id || null;
    const existingSubId: string | null =
      (orgRow as { stripe_subscription_id?: string | null } | null)?.stripe_subscription_id || null;
    const existingStatus = String(
      (orgRow as { subscription_status?: string | null } | null)?.subscription_status || ""
    ).toLowerCase();
    const trialEndsAt: string | null =
      (orgRow as { trial_ends_at?: string | null } | null)?.trial_ends_at || null;

    const reqOrigin = req.nextUrl.origin || BRAND.url;

    // Prevent duplicate subscriptions: if this workspace already has a live Stripe subscription,
    // route them to the Stripe Billing Portal to switch plans or update their card.
    if (
      customerId &&
      existingSubId &&
      ["active", "past_due", "trialing"].includes(existingStatus)
    ) {
      const portalParams = new URLSearchParams({
        customer: customerId,
        return_url: `${reqOrigin}/admin?tab=settings`,
      });
      const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: portalParams.toString(),
      });
      const portalData = await portalRes.json().catch(() => ({}));
      if (portalRes.ok && portalData?.url) {
        return NextResponse.json({ url: portalData.url, portal: true });
      }
      return NextResponse.json(
        {
          error:
            "This workspace already has an active subscription. Use 'Manage Billing & Invoices' to change plans or update your payment method.",
        },
        { status: 409 }
      );
    }

    const customerEmail = g.ctx.org.contact_email || g.ctx.user?.email || "";
    const customerName = g.ctx.org.brand_name || g.ctx.org.name || "PropOpsIQ Customer";

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

    const fixedPriceId = configuredPriceId(plan.id, billingCycle);
    const unitAmountCents = String((billingCycle === "annual" ? plan.annual : plan.monthly) * 100);
    const interval = billingCycle === "annual" ? "year" : "month";
    const productName = `PropOpsIQ ${plan.name} Plan (${
      billingCycle === "annual" ? "Annual" : "Monthly"
    })`;

    const checkoutParams: Record<string, string> = {
      mode: "subscription",
      client_reference_id: orgId,
      success_url: `${reqOrigin}/admin?tab=settings&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${reqOrigin}/admin?tab=settings&checkout=canceled`,
      allow_promotion_codes: "true",
      "line_items[0][quantity]": "1",
      "metadata[org_id]": orgId,
      "metadata[tier]": plan.id,
      "metadata[billing_cycle]": billingCycle,
      "subscription_data[metadata][org_id]": orgId,
      "subscription_data[metadata][tier]": plan.id,
      "subscription_data[metadata][billing_cycle]": billingCycle,
    };

    if (fixedPriceId) {
      checkoutParams["line_items[0][price]"] = fixedPriceId;
    } else {
      checkoutParams["line_items[0][price_data][currency]"] = "usd";
      checkoutParams["line_items[0][price_data][unit_amount]"] = unitAmountCents;
      checkoutParams["line_items[0][price_data][recurring][interval]"] = interval;
      checkoutParams["line_items[0][price_data][product_data][name]"] = productName;
      checkoutParams["line_items[0][price_data][product_data][description]"] = plan.blurb;
    }

    // Honor remaining trial days when upgrading during an unbilled trial
    // (Stripe requires subscription_data.trial_end to be at least 48h in the future)
    if (!existingSubId && trialEndsAt) {
      const endMs = Date.parse(trialEndsAt);
      const minFutureMs = Date.now() + 49 * 3600 * 1000;
      if (!Number.isNaN(endMs) && endMs > minFutureMs) {
        checkoutParams["subscription_data[trial_end]"] = String(Math.floor(endMs / 1000));
      }
    }

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
