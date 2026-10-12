import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/rent-payments/submit   Body: { month: "2025-06" }
// Marks all draft rows for the month (in the caller's org) as submitted.
// Only called from the admin Rent Ledger tab → requires a signed-in org member.
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;
  const actorEmail = user?.email || "unknown";
  const actorName = user?.name || "Staff";

  try {
    const body = await req.json();
    const { month } = body as { month: string };

    if (!month) {
      return NextResponse.json({ error: "month required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&is_submitted=eq.false`,
      {
        method: "PATCH",
        headers: { ...HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({
          is_submitted: true,
          submitted_at: now,
          submitted_by: actorName || actorEmail || "Staff",
          updated_at: now,
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("rent_payments submit error:", errText);
      return NextResponse.json({ error: "Submit failed" }, { status: 500 });
    }

    writeActivityLog({
      org_id: orgId,
      actor_email: actorEmail,
      actor_name: actorName,
      action: "submitted",
      resource_type: "rent_ledger",
      resource_name: `${month} rent ledger`,
      resource_id: month,
    });

    return NextResponse.json({ success: true, submittedAt: now });
  } catch (err) {
    console.error("rent_payments submit catch:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
