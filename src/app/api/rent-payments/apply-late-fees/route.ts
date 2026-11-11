import { NextRequest, NextResponse } from "next/server";
import { requireOrg, type RequestContext } from "@/lib/server-auth";
import { writeActivityLog } from "@/lib/activity-log";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface LateFeePolicy {
  dueDay: number;        // 1..28 (default 1)
  graceDays: number;     // 0..25 (default 5 -> late after 6th)
  feeType: "flat" | "percent";
  feeAmount: number;     // e.g. 50 ($50) or 5 (5%)
  maxFee: number;        // 0 = no cap
  autoApply: boolean;    // daily cron auto-applies after grace period
  autoRemind: boolean;   // daily cron emails reminders
}

const DEFAULT_LATE_FEE_POLICY: LateFeePolicy = {
  dueDay: 1,
  graceDays: 5,
  feeType: "flat",
  feeAmount: 50,
  maxFee: 0,
  autoApply: false,
  autoRemind: false,
};

function sanitizePolicy(raw: Partial<LateFeePolicy> | null | undefined): LateFeePolicy {
  return {
    dueDay: Math.min(28, Math.max(1, Math.round(Number(raw?.dueDay ?? 1) || 1))),
    graceDays: Math.min(25, Math.max(0, Math.round(Number(raw?.graceDays ?? 5) || 0))),
    feeType: raw?.feeType === "percent" ? "percent" : "flat",
    feeAmount: Math.max(0, Number(raw?.feeAmount ?? 50) || 0),
    maxFee: Math.max(0, Number(raw?.maxFee ?? 0) || 0),
    autoApply: Boolean(raw?.autoApply),
    autoRemind: Boolean(raw?.autoRemind),
  };
}

function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || "staff",
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "rent_ledger" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<{
    action?: "save_policy" | "apply_now";
    month?: string;
    force?: boolean;
    policy?: Partial<LateFeePolicy>;
  }>(req);
  if (!parsed.ok) return parsed.res;

  const action = parsed.body?.action || "apply_now";

  try {
    let policy = DEFAULT_LATE_FEE_POLICY;
    if (parsed.body?.policy) {
      policy = sanitizePolicy(parsed.body.policy);
      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/site_content?on_conflict=org_id,section,key`, {
        method: "POST",
        headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          org_id: orgId,
          section: "rent_ledger",
          key: "late_fee_policy",
          value: JSON.stringify(policy),
          updated_at: new Date().toISOString(),
        }),
      });
      if (!saveRes.ok) {
        const errText = await saveRes.text();
        return apiErrorResponse(
          new Error(`save late_fee_policy (${saveRes.status}): ${errText}`),
          "Failed to save late-fee policy.",
          { route: "/api/rent-payments/apply-late-fees", orgId }
        );
      }
      if (action === "save_policy") {
        return NextResponse.json({ ok: true, policy });
      }
    } else {
      const pRes = await fetch(
        `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=eq.rent_ledger&key=eq.late_fee_policy&select=value&limit=1`,
        { headers: HEADERS, cache: "no-store" }
      );
      if (pRes.ok) {
        const rows = (await pRes.json()) as Array<{ value?: string }>;
        if (rows[0]?.value) {
          try {
            policy = sanitizePolicy(JSON.parse(rows[0].value));
          } catch {
            policy = DEFAULT_LATE_FEE_POLICY;
          }
        }
      }
    }

    const month = String(parsed.body?.month || "").trim();
    if (!MONTH_RE.test(month)) {
      return NextResponse.json({ error: "Valid month (YYYY-MM) is required." }, { status: 400 });
    }

    // Check grace date unless landlord explicitly clicked "Apply Now" with force=true
    const [yearNum, monthNum] = month.split("-").map(Number);
    const graceCutoff = new Date(yearNum, monthNum - 1, policy.dueDay + policy.graceDays, 23, 59, 59);
    const now = new Date();
    if (!parsed.body?.force && now <= graceCutoff) {
      return NextResponse.json(
        {
          ok: false,
          withinGracePeriod: true,
          error: `Grace period for ${month} ends after ${month}-${String(policy.dueDay + policy.graceDays).padStart(2, "0")}. Pass force=true to assess fees early.`,
        },
        { status: 400 }
      );
    }

    const rowsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&is_submitted=eq.false&limit=500`,
      { headers: HEADERS, cache: "no-store" }
    );
    if (!rowsRes.ok) {
      const errText = await rowsRes.text();
      return apiErrorResponse(
        new Error(`apply-late-fees GET (${rowsRes.status}): ${errText}`),
        "Failed to load rent rows.",
        { route: "/api/rent-payments/apply-late-fees", orgId }
      );
    }

    const rows = (await rowsRes.json()) as Array<Record<string, unknown>>;
    let appliedCount = 0;
    let totalFeesAdded = 0;

    for (const r of rows) {
      if (r.paid) continue;
      if ((Number(r.late_fee) || 0) > 0) continue; // Idempotent: never double-assess

      const baseRent = Number(r.rent_due) || 0;
      const totalObligation =
        baseRent +
        (Number(r.nn_fee) || 0) +
        (Number(r.nnn_fee) || 0) +
        (Number(r.utility_fee) || 0) +
        (Number(r.cleaning_fee) || 0) +
        (Number(r.cam_fee) || 0);
      const paid = Number(r.amount_paid) || 0;

      if (totalObligation <= 0 || paid >= totalObligation - 0.009) continue;

      let computedFee =
        policy.feeType === "percent"
          ? Math.round(baseRent * (policy.feeAmount / 100) * 100) / 100
          : policy.feeAmount;
      if (policy.maxFee > 0 && computedFee > policy.maxFee) {
        computedFee = policy.maxFee;
      }
      if (computedFee <= 0) continue;

      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&id=eq.${encodeURIComponent(String(r.id))}`,
        {
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ late_fee: computedFee }),
        }
      );
      if (patchRes.ok) {
        appliedCount++;
        totalFeesAdded += computedFee;
      }
    }

    if (appliedCount > 0) {
      await writeActivityLog({
        ...actorOf(g.ctx),
        org_id: orgId,
        action: "updated",
        resource_type: "rent_ledger",
        resource_id: month,
        resource_name: `Assessed late fees on ${appliedCount} unpaid unit(s) ($${totalFeesAdded.toFixed(2)})`,
        metadata: { month, appliedCount, totalFeesAdded, policy },
      });
    }

    return NextResponse.json({
      ok: true,
      appliedCount,
      totalFeesAdded: Math.round(totalFeesAdded * 100) / 100,
      policy,
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to apply late fees.", {
      route: "/api/rent-payments/apply-late-fees",
      orgId,
    });
  }
}
