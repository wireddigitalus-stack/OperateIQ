import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import { PROPERTIES } from "@/lib/data";

// ── Supabase helpers ──────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const H = {
  "apikey":        SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type":  "application/json",
};

// Building-name aliases per property id. Tenants' "building" field is matched
// against these (plus the property display name). Driven from the property
// catalogue so it reflects the customer's own portfolio.
const PROPERTY_DROPDOWN_NAMES: Record<string, string[]> = Object.fromEntries(
  PROPERTIES.map((p) => [p.id, [p.name]])
);

function exactBuildingMatch(tenantBuilding: string, propertyId: string, displayName: string): boolean {
  if (!tenantBuilding) return false;
  const b = tenantBuilding.trim().toLowerCase();
  if (displayName && b === displayName.trim().toLowerCase()) return true;
  const names = PROPERTY_DROPDOWN_NAMES[propertyId];
  if (names && names.some(n => b === n.toLowerCase())) return true;
  return false;
}

// ── Helper to safely fetch Supabase tables (returns [] if table missing) ──────

async function safeFetch<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: H,
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ── POST /api/portfolio-snapshot/record ───────────────────────────────────────
// Computes today's portfolio snapshot from LIVE tenant + property + maintenance
// data and upserts it into the portfolio_snapshots table.

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;
  const scope = `org_id=eq.${orgId}`;

  try {
    // Pull live data from Supabase in parallel
    const [tenants, details, tickets, dynProps] = await Promise.all([
      safeFetch<Record<string, unknown>>(`tenants?select=*&${scope}`),
      safeFetch<Record<string, unknown>>(`property_details?select=*&${scope}`),
      safeFetch<Record<string, unknown>>(`maintenance_tickets?status=eq.open&select=id&${scope}`),
      safeFetch<Record<string, unknown>>(`properties?select=*&${scope}`),
    ]);

    // Build property list (static + dynamic)
    const staticProps = PROPERTIES.map(p => ({
      id: p.id, name: p.name,
    }));
    const staticIds = new Set(staticProps.map(p => p.id));
    const allProps = [
      ...staticProps,
      ...dynProps.filter(p => !staticIds.has(String(p.id))).map(p => ({
        id: String(p.id),
        name: String(p.name || ""),
      })),
    ];

    // Build detail map
    const detailMap: Record<string, Record<string, unknown>> = {};
    details.forEach(d => { detailMap[String(d.property_id)] = d; });

    // Active tenants
    const activeTenants = tenants.filter(t => t.status === "active");

    // Revenue = sum of all rent + fees from active tenants
    const totalRevenue = activeTenants.reduce((s, t) => {
      return s
        + (Number(t.monthly_rent) || 0)
        + (Number(t.nnn_fee) || 0)
        + (Number(t.nn_fee) || 0)
        + (Number(t.cam_fee) || 0)
        + (Number(t.utilities_fee) || 0)
        + (Number(t.cleaning_fee) || 0);
    }, 0);

    // Expenses = sum of property-level expenses from property_details
    const totalExpenses = details.reduce((s, d) => {
      const taxCounty = Number(d.taxes_county_annual) || 0;
      const taxCity = Number(d.taxes_city_annual) || 0;
      const totalTaxAnnual = (taxCounty === 0 && taxCity === 0) ? (Number(d.taxes_annual) || 0) : (taxCounty + taxCity);
      
      const taxMo = totalTaxAnnual / 12;
      const insMo = (Number(d.insurance_annual) || 0) / 12;
      const fireMo = (Number(d.fire_security_annual) || 0) / 12;
      const gasMo = (Number(d.gas_annual) || 0) / 12;
      const internetMo = (Number(d.internet_annual) || 0) / 12;
      const electricMo = Number(d.electric_annual) ? (Number(d.electric_annual) / 12) : (Number(d.electric_monthly) || 0);
      const waterMo = Number(d.water_annual) ? (Number(d.water_annual) / 12) : (Number(d.water_monthly) || 0);
      const otherMo = Number(d.other_monthly) || 0;
      
      return s + taxMo + insMo + fireMo + gasMo + internetMo + electricMo + waterMo + otherMo;
    }, 0);

    // Occupancy = total occupied units / total units (weighted across portfolio)
    let portfolioUnits = 0;
    let portfolioOccupied = 0;
    allProps.forEach(p => {
      const d = detailMap[p.id];
      const displayName = String(d?.display_name || p.name);
      const propActiveTenants = activeTenants.filter(t =>
        exactBuildingMatch(String(t.building || ""), p.id, displayName)
      );
      const totalUnits = Number(d?.total_units) || propActiveTenants.length || 1;
      portfolioUnits += totalUnits;
      portfolioOccupied += propActiveTenants.length;
    });
    const occupancyRate = portfolioUnits > 0
      ? Math.min(100, Math.round((portfolioOccupied / portfolioUnits) * 1000) / 10)
      : 0;

    const today = new Date().toISOString().split("T")[0];
    const payload = {
      org_id:         orgId,
      snapshot_date:  today,
      total_revenue:  Math.round(totalRevenue * 100) / 100,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      net_income:     Math.round((totalRevenue - totalExpenses) * 100) / 100,
      occupancy_rate: occupancyRate,
      total_tenants:  activeTenants.length,
      open_tickets:   tickets.length,
    };

    // Upsert into portfolio_snapshots (idempotent per day)
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
      // Table might not exist yet — that's fine, just return the computed data
      if (text.includes("relation") && text.includes("does not exist")) {
        return NextResponse.json({ snapshot: payload, saved: false, reason: "table_missing" });
      }
      return NextResponse.json({ snapshot: payload, saved: false, reason: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ snapshot: data[0] ?? payload, saved: true });
  } catch (err) {
    console.error("[portfolio-snapshot/record] error:", err);
    return NextResponse.json({ error: "Failed to compute snapshot" }, { status: 500 });
  }
}
