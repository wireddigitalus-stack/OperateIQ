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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots?org_id=eq.${orgId}&order=name.asc`, {
      headers: { ...HEADERS, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`parking_lots GET (${res.status}): ${errText}`),
        "Failed to load parking lots.",
        { route: "/api/parking-lots", orgId }
      );
    }
    const raw = await res.json();
    const lots = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), lots.length);

    return NextResponse.json({
      lots,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: lots.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load parking lots.", { route: "/api/parking-lots", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const suppliedId = body.id ? String(body.id) : null;

  const fields = {
    name: body.name || "",
    address: body.address || "",
    city: body.city ?? "",
    county: body.county ?? "",
    parent_property_id: body.parent_property_id ?? body.associated_property_id ?? null,
    associated_property_id: body.associated_property_id ?? body.parent_property_id ?? null,
    renewal_date: body.renewal_date || null,
    tax_city_annual: Number(body.tax_city_annual ?? body.city_tax ?? 0) || 0,
    city_tax: Number(body.city_tax ?? body.tax_city_annual ?? 0) || 0,
    tax_county_annual: Number(body.tax_county_annual ?? body.county_tax ?? 0) || 0,
    county_tax: Number(body.county_tax ?? body.tax_county_annual ?? 0) || 0,
    lease_price_paid: Number(body.lease_price_paid ?? body.price_paid ?? 0) || 0,
    price_paid: Number(body.price_paid ?? body.lease_price_paid ?? 0) || 0,
    notes: body.notes ?? "",
    updated_at: new Date().toISOString(),
  };

  try {
    if (suppliedId) {
      const upd = await fetch(
        `${SUPABASE_URL}/rest/v1/parking_lots?id=eq.${encodeURIComponent(suppliedId)}&org_id=eq.${orgId}`,
        {
          method: "PATCH",
          headers: { ...HEADERS, Prefer: "return=representation" },
          body: JSON.stringify(fields),
        }
      );
      if (!upd.ok) {
        const errText = await upd.text();
        return apiErrorResponse(
          new Error(`parking_lots PATCH (${upd.status}): ${errText}`),
          "Failed to update parking lot.",
          { route: "/api/parking-lots", orgId }
        );
      }
      const rows = await upd.json();
      if (Array.isArray(rows) && rows.length) return NextResponse.json({ success: true, lot: rows[0] });
    }

    const insertId = crypto.randomUUID();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({ id: insertId, ...fields, org_id: orgId }),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`parking_lots POST (${res.status}): ${err}`),
        "Failed to create parking lot.",
        { route: "/api/parking-lots", orgId }
      );
    }
    const data = await res.json();
    return NextResponse.json({ success: true, lot: data[0] });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save parking lot.", { route: "/api/parking-lots", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/parking_lots?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "DELETE",
      headers: HEADERS,
    });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`parking_lots DELETE (${res.status}): ${errText}`),
        "Failed to delete parking lot.",
        { route: "/api/parking-lots", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete parking lot.", { route: "/api/parking-lots", orgId });
  }
}
