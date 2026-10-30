import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg, requireOrgAdmin, type RequestContext } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

/** Verified actor identity for audit logs (never trust client-sent actor fields). */
function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || "staff",
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Migration SQL — returned when the table doesn't exist
// ────────────────────────────────────────────────────────────────────────────
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS rent_payments (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  tenant_name   TEXT NOT NULL DEFAULT '',
  building      TEXT DEFAULT '',
  unit          TEXT DEFAULT '',
  month         TEXT NOT NULL,
  rent_due      NUMERIC DEFAULT 0,
  amount_paid   NUMERIC DEFAULT 0,
  paid          BOOLEAN DEFAULT FALSE,
  payment_type  TEXT DEFAULT '',
  payment_date  DATE,
  late_fee      NUMERIC DEFAULT 0,
  nn_fee        NUMERIC DEFAULT 0,
  nnn_fee       NUMERIC DEFAULT 0,
  utility_fee   NUMERIC DEFAULT 0,
  cleaning_fee  NUMERIC DEFAULT 0,
  cam_fee       NUMERIC DEFAULT 0,
  notes         TEXT DEFAULT '',
  is_submitted  BOOLEAN DEFAULT FALSE,
  submitted_at  TIMESTAMPTZ,
  submitted_by  TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rent_payments_month ON rent_payments(month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_payments_tenant_month ON rent_payments(tenant_id, month);
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- Add missing columns if they don't exist
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS nn_fee NUMERIC DEFAULT 0;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS nnn_fee NUMERIC DEFAULT 0;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS utility_fee NUMERIC DEFAULT 0;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS cleaning_fee NUMERIC DEFAULT 0;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS cam_fee NUMERIC DEFAULT 0;
`.trim();

function isTableMissing(text: string): boolean {
  return text.includes("rent_payments") && (text.includes("does not exist") || text.includes("Could not find"));
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/rent-payments?month=2025-06          → rows for one month
// GET /api/rent-payments?history=true           → submitted month summaries
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const month = req.nextUrl.searchParams.get("month");
  const history = req.nextUrl.searchParams.get("history");

  if (history === "true") {
    // Return distinct submitted months with aggregate totals
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&is_submitted=eq.true&order=month.desc`,
      { headers: HEADERS, cache: "no-store" },
    );
    if (!res.ok) {
      const errText = await res.text();
      if (isTableMissing(errText)) {
        return NextResponse.json({ months: [], migrationSql: MIGRATION_SQL });
      }
      console.error("rent_payments history GET error:", errText);
      return NextResponse.json({ months: [] });
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;

    // Group by month and compute summaries
    const byMonth: Record<string, { month: string; submittedAt: string; submittedBy: string; tenantCount: number; totalDue: number; totalPaid: number; totalLateFees: number; rows: typeof rows }> = {};
    for (const r of rows) {
      const m = r.month as string;
      if (!byMonth[m]) {
        byMonth[m] = { month: m, submittedAt: r.submitted_at as string, submittedBy: r.submitted_by as string, tenantCount: 0, totalDue: 0, totalPaid: 0, totalLateFees: 0, rows: [] };
      }
      byMonth[m].tenantCount++;
      byMonth[m].totalDue += (Number(r.rent_due) || 0) + (Number(r.nn_fee) || 0) + (Number(r.nnn_fee) || 0) + (Number(r.utility_fee) || 0) + (Number(r.cleaning_fee) || 0) + (Number(r.cam_fee) || 0);
      byMonth[m].totalPaid += Number(r.amount_paid) || 0;
      byMonth[m].totalLateFees += Number(r.late_fee) || 0;
      byMonth[m].rows.push(r);
    }

    return NextResponse.json({ months: Object.values(byMonth) }, {
      headers: { "Cache-Control": "no-store, no-cache" },
    });
  }

  if (!month) {
    return NextResponse.json({ error: "month parameter required (YYYY-MM)" }, { status: 400 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&order=tenant_name.asc`,
    { headers: HEADERS, cache: "no-store" },
  );
  if (!res.ok) {
    const errText = await res.text();
    if (isTableMissing(errText)) {
      return NextResponse.json({ payments: [], migrationSql: MIGRATION_SQL });
    }
    console.error("rent_payments GET error:", errText);
    return NextResponse.json({ payments: [] });
  }
  const payments = await res.json();
  return NextResponse.json({ payments }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/rent-payments — bulk-create draft rows for a month
// Body: { month: "2025-06", tenants: [{ id, name, building, unit, monthlyRent }] }
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;
  const actor = actorOf(g.ctx);

  try {
    const body = await req.json();
    const { month, tenants: requested } = body as {
      month: string;
      tenants: Array<{ id: string; name: string; building: string; unit: string; monthlyRent: number; nnFee?: number; nnnFee?: number; utilityFee?: number; cleaningFee?: number; camFee?: number }>;
    };

    if (!month || !requested?.length) {
      return NextResponse.json({ error: "month and tenants[] required" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
    }

    // Only allow tenants that belong to the caller's org
    const ids = requested.map(t => String(t.id)).filter(Boolean);
    const inList = ids.map(id => `"${id.replace(/"/g, "")}"`).join(",");
    const ownRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?select=id&org_id=eq.${orgId}&id=in.(${encodeURIComponent(inList)})`,
      { headers: HEADERS, cache: "no-store" },
    );
    const ownRows = ownRes.ok ? ((await ownRes.json()) as { id: string }[]) : [];
    const owned = new Set(ownRows.map(r => r.id));
    const tenants = requested.filter(t => owned.has(String(t.id)));
    if (!tenants.length) {
      return NextResponse.json({ error: "No matching tenants in your organization" }, { status: 400 });
    }

    // Fetch existing rows for this month first to avoid redundant sequential PATCHes
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}`,
      { headers: HEADERS, cache: "no-store" },
    );
    const existingRows = existingRes.ok ? ((await existingRes.json()) as Array<Record<string, unknown>>) : [];
    const existingByTenantId = new Map<string, Record<string, unknown>>();
    for (const r of existingRows) {
      if (r.tenant_id) existingByTenantId.set(String(r.tenant_id), r);
    }

    const roundCents = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

    const rows = tenants.map(t => ({
      org_id: orgId,
      id: `rp_${t.id}_${month}`,
      tenant_id: t.id,
      tenant_name: t.name,
      building: t.building || "",
      unit: t.unit || "",
      month,
      rent_due: roundCents(t.monthlyRent),
      amount_paid: 0,
      paid: false,
      payment_type: "",
      payment_date: null,
      late_fee: 0,
      nn_fee: roundCents(t.nnFee),
      nnn_fee: roundCents(t.nnnFee),
      utility_fee: roundCents(t.utilityFee),
      cleaning_fee: roundCents(t.cleaningFee),
      cam_fee: roundCents(t.camFee),
      notes: "",
      is_submitted: false,
      submitted_at: null,
      submitted_by: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Upsert — on conflict do nothing (don't overwrite existing entries)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rent_payments?on_conflict=org_id,tenant_id,month`, {
      method: "POST",
      headers: {
        ...HEADERS,
        Prefer: "return=representation,resolution=ignore-duplicates",
      },
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("rent_payments POST error:", errText);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    // Sync fee/rent columns in parallel ONLY for pre-existing unsubmitted rows where values actually differ
    const tenantsToPatch = tenants.filter(t => {
      const ex = existingByTenantId.get(String(t.id));
      if (!ex || ex.is_submitted) return false;
      return (
        roundCents(ex.rent_due) !== roundCents(t.monthlyRent) ||
        roundCents(ex.nn_fee) !== roundCents(t.nnFee) ||
        roundCents(ex.nnn_fee) !== roundCents(t.nnnFee) ||
        roundCents(ex.utility_fee) !== roundCents(t.utilityFee) ||
        roundCents(ex.cleaning_fee) !== roundCents(t.cleaningFee) ||
        roundCents(ex.cam_fee) !== roundCents(t.camFee)
      );
    });

    if (tenantsToPatch.length > 0) {
      await Promise.all(
        tenantsToPatch.map(t => {
          const feePatch = {
            rent_due: roundCents(t.monthlyRent),
            nn_fee: roundCents(t.nnFee),
            nnn_fee: roundCents(t.nnnFee),
            utility_fee: roundCents(t.utilityFee),
            cleaning_fee: roundCents(t.cleaningFee),
            cam_fee: roundCents(t.camFee),
            updated_at: new Date().toISOString(),
          };
          return fetch(
            `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&tenant_id=eq.${encodeURIComponent(t.id)}&month=eq.${encodeURIComponent(month)}&is_submitted=eq.false`,
            {
              method: "PATCH",
              headers: { ...HEADERS, Prefer: "return=minimal" },
              body: JSON.stringify(feePatch),
            },
          );
        }),
      );
    }

    writeActivityLog({
      ...actor,
      org_id: orgId,
      action: "created",
      resource_type: "rent_ledger",
      resource_name: `${month} rent entries`,
      resource_id: month,
      metadata: { tenant_count: tenants.length },
    });

    // Return ALL rows for the month (including previously existing ones)
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&order=tenant_name.asc`,
      { headers: HEADERS, cache: "no-store" },
    );
    const payments = getRes.ok ? await getRes.json() : [];

    return NextResponse.json({ success: true, payments });
  } catch (err) {
    console.error("rent_payments POST catch:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/rent-payments?id=xxx — update a single payment row
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const allowedFields: Record<string, string> = {
    amountPaid: "amount_paid",
    paid: "paid",
    paymentType: "payment_type",
    paymentDate: "payment_date",
    lateFee: "late_fee",
    nnFee: "nn_fee",
    nnnFee: "nnn_fee",
    utilityFee: "utility_fee",
    cleaningFee: "cleaning_fee",
    camFee: "cam_fee",
    notes: "notes",
    rentDue: "rent_due",
  };

  // Numeric fields that should preserve cents (rounded to 2 decimal places)
  const numericFields = new Set(["amount_paid", "late_fee", "nn_fee", "nnn_fee", "utility_fee", "cleaning_fee", "cam_fee", "rent_due"]);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [js, db] of Object.entries(allowedFields)) {
    if (body[js] !== undefined) {
      patch[db] = numericFields.has(db) ? Math.round((Number(body[js]) || 0) * 100) / 100 : body[js];
    }
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rent_payments?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
    {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("rent_payments PATCH error:", errText);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/rent-payments — delete a single row or entire month's ledger
// ────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const month = req.nextUrl.searchParams.get("month");

  if (!id && !month) {
    return NextResponse.json({ error: "id or month required" }, { status: 400 });
  }

  // Resetting a whole month is destructive → admin only
  const g = id ? await requireOrg(req) : await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  let url = `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}`;
  if (id) {
    url += `&id=eq.${encodeURIComponent(id)}`;
  } else if (month) {
    url += `&month=eq.${encodeURIComponent(month)}`;
  }

  const res = await fetch(url, { method: "DELETE", headers: HEADERS });

  if (!res.ok) {
    console.error("rent_payments DELETE error:", await res.text());
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  // If a month was deleted/reset, write to activity log
  if (month) {
    writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "deleted",
      resource_type: "rent_ledger",
      resource_name: `${month} rent entries (Reset)`,
      resource_id: month,
    });
  }

  return NextResponse.json({ success: true });
}
