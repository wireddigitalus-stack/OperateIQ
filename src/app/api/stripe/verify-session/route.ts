import { NextRequest, NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { Tier } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req, { allowExpired: true });
  if (!g.ok) return g.res;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "").trim();
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid Stripe session ID." }, { status: 400 });
    }

    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: "no-store",
      }
    );

    const session = await res.json();
    if (!res.ok || !session?.id) {
      return NextResponse.json({ error: "Could not verify checkout session." }, { status: 400 });
    }

    const sessionOrgId = session.metadata?.org_id || session.client_reference_id;
    if (sessionOrgId !== g.ctx.orgId) {
      return NextResponse.json({ error: "Checkout session does not belong to this organization." }, { status: 403 });
    }

    if (session.status !== "complete") {
      return NextResponse.json({ error: "Checkout session is not yet complete." }, { status: 400 });
    }

    const rawTier = String(session.metadata?.tier || "").toLowerCase();
    const tier: Tier = (["starter", "growth", "pro"].includes(rawTier) ? rawTier : g.ctx.org.tier) as Tier;
    const customerId = typeof session.customer === "string" ? session.customer : null;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

    const updates: Record<string, unknown> = {
      tier,
      subscription_status: "active",
      trial_ends_at: null,
    };
    if (customerId) updates.stripe_customer_id = customerId;
    if (subscriptionId) updates.stripe_subscription_id = subscriptionId;

    const { error } = await supabaseAdmin
      .from("organizations")
      .update(updates)
      .eq("id", g.ctx.orgId);

    if (error) {
      console.error("[stripe/verify-session] DB update error:", error);
      return NextResponse.json({ error: "Failed to update organization subscription." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      tier,
      subscription_status: "active",
    });
  } catch (err) {
    console.error("[stripe/verify-session] error:", err);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
