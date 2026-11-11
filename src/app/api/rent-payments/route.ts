import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg, requireOrgAdmin, type RequestContext } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Verified actor identity for audit logs (never trust client-sent actor fields). */
function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || "staff",
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

function defaultHistoryStartMonth(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 24);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/rent-payments?month=2025-06          → rows for one month (paginated)
// GET /api/rent-payments?history=true           → submitted month summaries
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const month = req.nextUrl.searchParams.get("month");
  const history = req.nextUrl.searchParams.get("history");

  try {
    if (history === "true") {
      const fromMonthParam = (req.nextUrl.searchParams.get("from_month") || "").trim();
      const toMonthParam = (req.nextUrl.searchParams.get("to_month") || "").trim();
      const fromMonth = MONTH_RE.test(fromMonthParam) ? fromMonthParam : defaultHistoryStartMonth();
      const toMonth = MONTH_RE.test(toMonthParam) ? toMonthParam : null;
      const pg = parsePagination(req, { defaultLimit: 1000, maxLimit: 2500 });

      let url = `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&is_submitted=eq.true&month=gte.${fromMonth}&order=month.desc,tenant_name.asc`;
      if (toMonth) {
        url += `&month=lte.${toMonth}`;
      }

      const res = await fetch(url, {
        headers: {
          ...HEADERS,
          Range: pg.rangeHeader,
          Prefer: "count=exact",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const errText = await res.text();
        return apiErrorResponse(
          new Error(`rent_payments history GET (${res.status}): ${errText}`),
          "Failed to load submitted rent history.",
          { route: "/api/rent-payments", orgId }
        );
      }

      const rows = (await res.json()) as Array<Record<string, unknown>>;
      const total = parseContentRangeTotal(res.headers.get("content-range"), rows.length);

      const byMonth: Record<
        string,
        {
          month: string;
          submittedAt: string;
          submittedBy: string;
          tenantCount: number;
          totalDue: number;
          totalPaid: number;
          totalLateFees: number;
          rows: typeof rows;
        }
      > = {};

      for (const r of rows) {
        const m = r.month as string;
        if (!byMonth[m]) {
          byMonth[m] = {
            month: m,
            submittedAt: r.submitted_at as string,
            submittedBy: r.submitted_by as string,
            tenantCount: 0,
            totalDue: 0,
            totalPaid: 0,
            totalLateFees: 0,
            rows: [],
          };
        }
        byMonth[m].tenantCount++;
        byMonth[m].totalDue +=
          (Number(r.rent_due) || 0) +
          (Number(r.nn_fee) || 0) +
          (Number(r.nnn_fee) || 0) +
          (Number(r.utility_fee) || 0) +
          (Number(r.cleaning_fee) || 0) +
          (Number(r.cam_fee) || 0);
        byMonth[m].totalPaid += Number(r.amount_paid) || 0;
        byMonth[m].totalLateFees += Number(r.late_fee) || 0;
        byMonth[m].rows.push(r);
      }

      return NextResponse.json(
        {
          months: Object.values(byMonth),
          window: { fromMonth, toMonth },
          pagination: buildPaginationMeta({
            limit: pg.limit,
            offset: pg.offset,
            total,
            returnedCount: rows.length,
          }),
        },
        { headers: { "Cache-Control": "no-store, no-cache" } }
      );
    }

    if (!month || !MONTH_RE.test(month)) {
      return NextResponse.json({ error: "Valid month parameter required (YYYY-MM)" }, { status: 400 });
    }

    const pg = parsePagination(req, { defaultLimit: 500, maxLimit: 1000 });
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&order=tenant_name.asc`,
      {
        headers: {
          ...HEADERS,
          Range: pg.rangeHeader,
          Prefer: "count=exact",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`rent_payments GET (${res.status}): ${errText}`),
        "Failed to load rent ledger entries.",
        { route: "/api/rent-payments", orgId }
      );
    }

    const payments = (await res.json()) as unknown[];
    const total = parseContentRangeTotal(res.headers.get("content-range"), payments.length);

    return NextResponse.json(
      {
        payments,
        pagination: buildPaginationMeta({
          limit: pg.limit,
          offset: pg.offset,
          total,
          returnedCount: payments.length,
        }),
      },
      { headers: { "Cache-Control": "no-store, no-cache" } }
    );
  } catch (err) {
    return apiErrorResponse(err, "Failed to load rent ledger.", { route: "/api/rent-payments", orgId });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/rent-payments — bulk-create draft rows for a month
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;
  const actor = actorOf(g.ctx);

  try {
    const parsed = await safeJsonBody<{
      month?: string;
      tenants?: Array<{
        id: string;
        name: string;
        building: string;
        unit: string;
        monthlyRent: number;
        nnFee?: number;
        nnnFee?: number;
        utilityFee?: number;
        cleaningFee?: number;
        camFee?: number;
      }>;
    }>(req);
    if (!parsed.ok) return parsed.res;
    const { month, tenants: requested } = parsed.body;

    if (!month || !requested?.length) {
      return NextResponse.json({ error: "month and tenants[] required" }, { status: 400 });
    }
    if (!MONTH_RE.test(month)) {
      return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
    }

    const ids = requested.map((t) => String(t.id)).filter(Boolean);
    const inList = ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
    const ownRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?select=id&org_id=eq.${orgId}&id=in.(${encodeURIComponent(inList)})`,
      { headers: HEADERS, cache: "no-store" }
    );
    const ownRows = ownRes.ok ? ((await ownRes.json()) as { id: string }[]) : [];
    const owned = new Set(ownRows.map((r) => r.id));
    const tenants = requested.filter((t) => owned.has(String(t.id)));
    if (!tenants.length) {
      return NextResponse.json({ error: "No matching tenants in your organization" }, { status: 400 });
    }

    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}`,
      { headers: { ...HEADERS, Range: "0-999" }, cache: "no-store" }
    );
    const existingRows = existingRes.ok ? ((await existingRes.json()) as Array<Record<string, unknown>>) : [];
    const existingByTenantId = new Map<string, Record<string, unknown>>();
    for (const r of existingRows) {
      if (r.tenant_id) existingByTenantId.set(String(r.tenant_id), r);
    }

    const roundCents = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

    const rows = tenants.map((t) => ({
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
      return apiErrorResponse(
        new Error(`rent_payments POST (${res.status}): ${errText}`),
        "Failed to initialize rent ledger rows.",
        { route: "/api/rent-payments", orgId }
      );
    }

    const tenantsToPatch = tenants.filter((t) => {
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
        tenantsToPatch.map((t) => {
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
            }
          );
        })
      );
    }

    await writeActivityLog({
      ...actor,
      org_id: orgId,
      action: "created",
      resource_type: "rent_ledger",
      resource_name: `${month} rent entries`,
      resource_id: month,
      metadata: { tenant_count: tenants.length },
    });

    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&order=tenant_name.asc`,
      { headers: { ...HEADERS, Range: "0-999" }, cache: "no-store" }
    );
    const payments = getRes.ok ? await getRes.json() : [];

    return NextResponse.json({ success: true, payments });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update rent ledger.", { route: "/api/rent-payments", orgId });
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

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

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

  const numericFields = new Set([
    "amount_paid",
    "late_fee",
    "nn_fee",
    "nnn_fee",
    "utility_fee",
    "cleaning_fee",
    "cam_fee",
    "rent_due",
  ]);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [js, db] of Object.entries(allowedFields)) {
    if (body[js] !== undefined) {
      patch[db] = numericFields.has(db) ? Math.round((Number(body[js]) || 0) * 100) / 100 : body[js];
    }
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rent_payments?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      {
        method: "PATCH",
        headers: { ...HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`rent_payments PATCH (${res.status}): ${errText}`),
        "Failed to save rent payment update.",
        { route: "/api/rent-payments", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save rent payment update.", { route: "/api/rent-payments", orgId });
  }
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

  const g = id ? await requireOrg(req) : await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  let url = `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}`;
  if (id) {
    url += `&id=eq.${encodeURIComponent(id)}`;
  } else if (month) {
    url += `&month=eq.${encodeURIComponent(month)}`;
  }

  try {
    const res = await fetch(url, { method: "DELETE", headers: HEADERS });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`rent_payments DELETE (${res.status}): ${errText}`),
        "Failed to delete rent entry.",
        { route: "/api/rent-payments", orgId }
      );
    }

    if (month) {
      await writeActivityLog({
        ...actorOf(g.ctx),
        org_id: orgId,
        action: "deleted",
        resource_type: "rent_ledger",
        resource_name: `${month} rent entries (Reset)`,
        resource_id: month,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete rent entry.", { route: "/api/rent-payments", orgId });
  }
}
