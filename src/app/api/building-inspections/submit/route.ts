import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/building-inspections/submit   Body: { month: "2025-06", actorEmail, actorName }
// Marks all draft rows for the month as submitted
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { month, actorEmail, actorName } = body as {
      month: string;
      actorEmail?: string;
      actorName?: string;
    };

    if (!month) {
      return NextResponse.json({ error: "month required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/building_inspections?month=eq.${encodeURIComponent(month)}&is_submitted=eq.false`,
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
      console.error("building_inspections submit error:", errText);
      return NextResponse.json({ error: "Submit failed" }, { status: 500 });
    }

    writeActivityLog({
      actor_email: actorEmail || "unknown",
      actor_name: actorName || actorEmail?.split("@")[0] || "Staff",
      action: "submitted",
      resource_type: "maintenance",
      resource_name: `${month} building inspections`,
      resource_id: month,
    });

    return NextResponse.json({ success: true, submittedAt: now });
  } catch (err) {
    console.error("building_inspections submit catch:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
