import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 250, maxLimit: 500 });
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/property_details?org_id=eq.${orgId}&order=property_id.asc`,
      {
        headers: { ...HEADERS, Range: pg.rangeHeader, Prefer: "count=exact" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return apiErrorResponse(
        new Error(`property-details GET (${res.status}): ${text}`),
        "Failed to load property details.",
        { route: "/api/property-details", orgId }
      );
    }
    const raw = await res.json();
    const details = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), details.length);

    return NextResponse.json(
      {
        details,
        pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: details.length }),
      },
      { headers: { "Cache-Control": "no-store, no-cache" } }
    );
  } catch (err) {
    return apiErrorResponse(err, "Failed to load property details.", { route: "/api/property-details", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const { propertyId, ...fields } = parsed.body;
  if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });

  try {
    const taxesCounty = Number(fields.taxesCountyAnnual) || 0;
    const taxesCity = Number(fields.taxesCityAnnual) || 0;
    const computedTaxesAnnual = taxesCounty + taxesCity;

    const row: Record<string, unknown> = {
      org_id: orgId,
      property_id: propertyId,
      total_units: Number(fields.totalUnits) || 0,
      taxes_county_annual: taxesCounty,
      taxes_city_annual: taxesCity,
      taxes_annual: computedTaxesAnnual || Number(fields.taxesAnnual) || 0,
      insurance_annual: Number(fields.insuranceAnnual) || 0,
      fire_security_annual: Number(fields.fireSecurityAnnual) || 0,
      gas_annual: Number(fields.gasAnnual) || 0,
      internet_annual: Number(fields.internetAnnual) || 0,
      electric_annual: Number(fields.electricAnnual) || 0,
      water_annual: Number(fields.waterAnnual) || 0,
      trash_annual: Number(fields.trashAnnual) || 0,
      electric_monthly: Number(fields.electricMonthly) || 0,
      water_monthly: Number(fields.waterMonthly) || 0,
      other_monthly: Number(fields.otherMonthly) || 0,
      trend: (fields.trend as string) || "stable",
      notes: typeof fields.notes === "string" ? fields.notes.trim() : "",
      updated_at: new Date().toISOString(),
    };
    if (typeof fields.displayName === "string") {
      row.display_name = fields.displayName.trim() || null;
    }

    let res = await fetch(`${SUPABASE_URL}/rest/v1/property_details?on_conflict=org_id,property_id`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });

    let text = await res.text();

    if (!res.ok && (text.includes("column") || res.status === 400)) {
      const fallbackRow = { ...row };
      [
        "taxes_county_annual",
        "taxes_city_annual",
        "fire_security_annual",
        "gas_annual",
        "internet_annual",
        "electric_annual",
        "water_annual",
        "trash_annual",
      ].forEach((col) => delete fallbackRow[col]);

      res = await fetch(`${SUPABASE_URL}/rest/v1/property_details?on_conflict=org_id,property_id`, {
        method: "POST",
        headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(fallbackRow),
      });
      text = await res.text();
    }

    if (!res.ok) {
      return apiErrorResponse(
        new Error(`property-details POST (${res.status}): ${text}`),
        "Failed to save property details.",
        { route: "/api/property-details", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save property details.", { route: "/api/property-details", orgId });
  }
}
