import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Service role bypasses RLS — required since property_details has RLS enabled
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const HEADERS = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// GET /api/property-details — fetch all rows for the caller's org
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/property_details?org_id=eq.${orgId}&order=property_id.asc`,
    { headers: HEADERS, cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    // Table may not exist yet — return empty gracefully
    if (text.includes("does not exist") || text.includes("relation")) {
      return NextResponse.json({ details: [], needsMigration: true });
    }
    console.error("property-details GET error:", text);
    return NextResponse.json({ details: [] });
  }
  const details = await res.json();
  return NextResponse.json({ details }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}

// POST /api/property-details — upsert (create or replace) a property row
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const body = await req.json();
    const { propertyId, ...fields } = body;
    if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });

    const taxesCounty = Number(fields.taxesCountyAnnual) || 0;
    const taxesCity = Number(fields.taxesCityAnnual) || 0;
    const computedTaxesAnnual = taxesCounty + taxesCity;

    const row: Record<string, unknown> = {
      org_id:           orgId,
      property_id:      propertyId,
      total_units:      Number(fields.totalUnits)    || 0,
      taxes_county_annual: taxesCounty,
      taxes_city_annual:  taxesCity,
      taxes_annual:     computedTaxesAnnual || Number(fields.taxesAnnual) || 0,
      insurance_annual: Number(fields.insuranceAnnual) || 0,
      fire_security_annual: Number(fields.fireSecurityAnnual) || 0,
      gas_annual:       Number(fields.gasAnnual) || 0,
      internet_annual:  Number(fields.internetAnnual) || 0,
      electric_annual:  Number(fields.electricAnnual) || 0,
      water_annual:     Number(fields.waterAnnual) || 0,
      trash_annual:     Number(fields.trashAnnual) || 0,
      electric_monthly: Number(fields.electricMonthly) || 0,
      water_monthly:    Number(fields.waterMonthly)   || 0,
      other_monthly:    Number(fields.otherMonthly)   || 0,
      trend:            (fields.trend as string) || "stable",
      notes:            (fields.notes as string)?.trim() || "",
      updated_at:       new Date().toISOString(),
    };
    // Optional display_name override (allows renaming without changing ID)
    if (typeof fields.displayName === "string") {
      row.display_name = fields.displayName.trim() || null;
    }

    let res = await fetch(`${SUPABASE_URL}/rest/v1/property_details?on_conflict=org_id,property_id`, {
      method: "POST",
      headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });

    let text = await res.text();

    if (!res.ok) {
      // If the table doesn't exist, surface it clearly
      if (text.includes("does not exist") || text.includes("relation")) {
        return NextResponse.json({ error: "migration_required", sql: MIGRATION_SQL }, { status: 503 });
      }
      
      // Fail-safe fallback retry if new columns do not exist in DB yet
      if (text.includes("column") || res.status === 400) {
        console.warn("property_details new columns might not exist yet. Retrying fallback save.");
        const fallbackRow = { ...row };
        // Remove columns that might be missing in older DB versions
        [
          "taxes_county_annual", "taxes_city_annual", 
          "fire_security_annual", "gas_annual", "internet_annual",
          "electric_annual", "water_annual", "trash_annual"
        ].forEach(col => delete fallbackRow[col]);
        
        res = await fetch(`${SUPABASE_URL}/rest/v1/property_details?on_conflict=org_id,property_id`, {
          method: "POST",
          headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(fallbackRow),
        });
        text = await res.text();
      }
    }

    if (!res.ok) {
      console.error("property-details POST error:", text);
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("property-details POST catch:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// The SQL admin needs to run once in Supabase if the table doesn't exist
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS property_details (
  property_id          TEXT PRIMARY KEY,
  total_units          INT DEFAULT 0,
  taxes_annual         NUMERIC(10,2) DEFAULT 0,
  taxes_county_annual  NUMERIC(10,2) DEFAULT 0,
  taxes_city_annual    NUMERIC(10,2) DEFAULT 0,
  insurance_annual     NUMERIC(10,2) DEFAULT 0,
  fire_security_annual NUMERIC(10,2) DEFAULT 0,
  gas_annual           NUMERIC(10,2) DEFAULT 0,
  internet_annual      NUMERIC(10,2) DEFAULT 0,
  electric_annual      NUMERIC(10,2) DEFAULT 0,
  water_annual         NUMERIC(10,2) DEFAULT 0,
  trash_annual         NUMERIC(10,2) DEFAULT 0,
  electric_monthly     NUMERIC(10,2) DEFAULT 0,
  water_monthly        NUMERIC(10,2) DEFAULT 0,
  other_monthly        NUMERIC(10,2) DEFAULT 0,
  trend                TEXT DEFAULT 'stable',
  notes                TEXT DEFAULT '',
  display_name         TEXT DEFAULT NULL,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE property_details ENABLE ROW LEVEL SECURITY;
-- If table already exists, add missing columns:
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS taxes_county_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS taxes_city_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS fire_security_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS gas_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS internet_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS electric_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS water_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS trash_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT NULL;
`.trim();
