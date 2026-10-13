import { NextRequest, NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { BRAND } from "@/lib/brand";

export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req, { allowExpired: true });
  if (!g.ok) return g.res;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  try {
    const orgId = g.ctx.orgId;
    const { data: orgRow } = await supabaseAdmin
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", orgId)
      .maybeSingle();

    const customerId = (orgRow as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No active billing profile found yet. Choose a plan below to subscribe first." },
        { status: 400 }
      );
    }

    const reqOrigin = req.nextUrl.origin || BRAND.url;
    const params = new URLSearchParams({
      customer: customerId,
      return_url: `${reqOrigin}/admin?tab=settings`,
    });

    const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const portalData = await portalRes.json();
    if (!portalRes.ok || !portalData?.url) {
      return NextResponse.json(
        { error: portalData?.error?.message || "Could not open Stripe Billing Portal." },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: portalData.url });
  } catch (err) {
    console.error("[stripe/portal] error:", err);
    return NextResponse.json({ error: "Failed to open billing portal." }, { status: 500 });
  }
}
