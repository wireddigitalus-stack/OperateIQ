import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const H = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "portfolio_snapshots" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const rawMonths = parseInt(req.nextUrl.searchParams.get("months") || "6", 10);
  const months = Number.isFinite(rawMonths) ? Math.min(Math.max(rawMonths, 1), 120) : 6;
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceISO = since.toISOString().split("T")[0];
  const pg = parsePagination(req, { defaultLimit: 400, maxLimit: 1000 });

  try {
    const url = `${SUPABASE_URL}/rest/v1/portfolio_snapshots?org_id=eq.${orgId}&snapshot_date=gte.${sinceISO}&order=snapshot_date.asc`;
    const res = await fetch(url, {
      headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return apiErrorResponse(
        new Error(`portfolio_snapshots GET (${res.status}): ${text}`),
        "Failed to load portfolio snapshots.",
        { route: "/api/portfolio-snapshot", orgId }
      );
    }

    const raw = await res.json();
    const snapshots = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), snapshots.length);

    return NextResponse.json(
      {
        snapshots,
        pagination: buildPaginationMeta({
          limit: pg.limit,
          offset: pg.offset,
          total,
          returnedCount: snapshots.length,
        }),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return apiErrorResponse(err, "Failed to load portfolio snapshots.", { route: "/api/portfolio-snapshot", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req, { requireFeature: "portfolio_snapshots" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const today = new Date().toISOString().split("T")[0];

  const totalRevenue = Number(body.total_revenue) || 0;
  const totalExpenses = Number(body.total_expenses) || 0;

  const payload = {
    org_id: orgId,
    snapshot_date: typeof body.snapshot_date === "string" && body.snapshot_date ? body.snapshot_date : today,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    net_income: totalRevenue - totalExpenses,
    occupancy_rate: Number(body.occupancy_rate) || 0,
    total_tenants: Number(body.total_tenants) || 0,
    open_tickets: Number(body.open_tickets) || 0,
    notes: typeof body.notes === "string" ? body.notes : "",
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/portfolio_snapshots?on_conflict=org_id,snapshot_date`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return apiErrorResponse(
        new Error(`portfolio_snapshots POST (${res.status}): ${text}`),
        "Failed to record portfolio snapshot.",
        { route: "/api/portfolio-snapshot", orgId }
      );
    }

    const data = await res.json();
    return NextResponse.json({ snapshot: data[0] ?? payload });
  } catch (err) {
    return apiErrorResponse(err, "Failed to record portfolio snapshot.", { route: "/api/portfolio-snapshot", orgId });
  }
}
