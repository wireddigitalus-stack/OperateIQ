import { NextRequest, NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ACTIVE_ORG_COOKIE, DEFAULT_PLATFORM_ORG_ID, IMPERSONATE_COOKIE } from "@/lib/platform";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { orgId, org, role, impersonating } = g.ctx;

  if (impersonating) {
    return NextResponse.json(
      { error: "Workspace deletion is disabled while impersonating a customer." },
      { status: 403 }
    );
  }

  if (role !== "owner") {
    return NextResponse.json(
      { error: "Only the workspace owner can permanently delete this workspace." },
      { status: 403 }
    );
  }

  if (orgId === DEFAULT_PLATFORM_ORG_ID || org.slug === "operateiq-demo") {
    return NextResponse.json(
      { error: "The platform demo workspace cannot be deleted." },
      { status: 403 }
    );
  }

  if (!(await checkRateLimit(`acct-delete:${orgId}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const confirmText = String(body.confirm || body.confirmSlug || "").trim().toLowerCase();
  const expectedSlug = String(org.slug || "").trim().toLowerCase();
  const expectedName = String(org.name || "").trim().toLowerCase();

  if (!confirmText || (confirmText !== expectedSlug && confirmText !== expectedName)) {
    return NextResponse.json(
      { error: `Please type "${org.slug}" to confirm permanent deletion.` },
      { status: 400 }
    );
  }

  // 1. Cancel active Stripe subscription if one exists so the owner is never billed after deletion
  if (org.stripe_subscription_id && STRIPE_SECRET_KEY) {
    try {
      await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(org.stripe_subscription_id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        }
      );
    } catch (err) {
      console.warn("[account/delete] Stripe subscription cancel warning:", err);
    }
  }

  // 2. Delete organization row (all 26 operational child tables cascade on delete)
  const { error: delErr } = await supabaseAdmin
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (delErr) {
    console.error("[account/delete] delete error:", delErr);
    return NextResponse.json(
      { error: "Failed to delete workspace. Please contact support." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true, success: true, deletedOrgId: orgId });
  res.cookies.delete(ACTIVE_ORG_COOKIE);
  res.cookies.delete(IMPERSONATE_COOKIE);
  return res;
}
