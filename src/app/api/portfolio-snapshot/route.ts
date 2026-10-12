import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const H = {
  "apikey":        SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type":  "application/json",
};

const MIGRATION_SQL = `
-- Run once in your Supabase SQL editor to enable P&L trending
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  total_revenue   NUMERIC(12,2) DEFAULT 0,
  total_expenses  NUMERIC(12,2) DEFAULT 0,
  net_income      NUMERIC(12,2) DEFAULT 0,
  occupancy_rate  NUMERIC(5,2)  DEFAULT 0,
  total_tenants   INT DEFAULT 0,
  open_tickets    INT DEFAULT 0,
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, snapshot_date)
);
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
`.trim();

// GET  /api/portfolio-snapshot?months=6
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const rawMonths = parseInt(req.nextUrl.searchParams.get("months") || "6", 10);
  const months = Number.isFinite(rawMonths) ? Math.min(Math.max(rawMonths, 1), 120) : 6;
  const since  = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceISO = since.toISOString().split("T")[0];

  const url = `${SUPABASE_URL}/rest/v1/portfolio_snapshots?org_id=eq.${orgId}&snapshot_date=gte.${sinceISO}&order=snapshot_date.asc`;
  const res = await fetch(url, { headers: H, cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();
    if (text.includes("relation") && text.includes("does not exist")) {
      return NextResponse.json({ snapshots: [], migrationSql: MIGRATION_SQL });
    }
    return NextResponse.json({ snapshots: [] });
  }

  const snapshots = await res.json();
  return NextResponse.json({ snapshots }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// POST /api/portfolio-snapshot — write today's snapshot (call from a cron or manually)
export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const body = await req.json();
  const today = new Date().toISOString().split("T")[0];

  const payload = {
    org_id:         orgId,
    snapshot_date:  body.snapshot_date || today,
    total_revenue:  body.total_revenue  ?? 0,
    total_expenses: body.total_expenses ?? 0,
    net_income:     (body.total_revenue ?? 0) - (body.total_expenses ?? 0),
    occupancy_rate: body.occupancy_rate ?? 0,
    total_tenants:  body.total_tenants  ?? 0,
    open_tickets:   body.open_tickets   ?? 0,
    notes:          body.notes || "",
  };

  // Upsert by date (idempotent if called multiple times same day)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/portfolio_snapshots?on_conflict=org_id,snapshot_date`,
    {
      method: "POST",
      headers: { ...H, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    if (text.includes("relation") && text.includes("does not exist")) {
      return NextResponse.json({ error: "table_missing", migrationSql: MIGRATION_SQL }, { status: 404 });
    }
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ snapshot: data[0] ?? payload });
}
