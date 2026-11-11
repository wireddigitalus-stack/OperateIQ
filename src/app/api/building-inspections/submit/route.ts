import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg } from "@/lib/server-auth";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "inspections" });
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;
  const actorEmail = user?.email || "unknown";
  const actorName = user?.name || "Staff";

  try {
    const parsed = await safeJsonBody<{ month?: string }>(req);
    if (!parsed.ok) return parsed.res;
    const month = String(parsed.body.month || "").trim();

    if (!month) {
      return NextResponse.json({ error: "month required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/building_inspections?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&is_submitted=eq.false`,
      {
        method: "PATCH",
        headers: { ...HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({
          is_submitted: true,
          submitted_at: now,
          submitted_by: actorName || actorEmail || "Staff",
          updated_at: now,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`building_inspections submit (${res.status}): ${errText}`),
        "Failed to submit building inspections.",
        { route: "/api/building-inspections/submit", orgId }
      );
    }

    await writeActivityLog({
      org_id: orgId,
      actor_email: actorEmail,
      actor_name: actorName,
      action: "submitted",
      resource_type: "maintenance",
      resource_name: `${month} building inspections`,
      resource_id: month,
    });

    return NextResponse.json({ success: true, submittedAt: now });
  } catch (err) {
    return apiErrorResponse(err, "Failed to submit building inspections.", {
      route: "/api/building-inspections/submit",
      orgId,
    });
  }
}
