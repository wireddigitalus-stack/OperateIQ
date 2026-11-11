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
      `${SUPABASE_URL}/rest/v1/available_spaces?org_id=eq.${orgId}&order=created_at.desc`,
      {
        headers: { ...HEADERS, Range: pg.rangeHeader, Prefer: "count=exact" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return apiErrorResponse(
        new Error(`available-spaces GET (${res.status}): ${text}`),
        "Failed to load available spaces.",
        { route: "/api/available-spaces", orgId }
      );
    }
    const raw = await res.json();
    const spaces = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), spaces.length);

    return NextResponse.json(
      {
        spaces,
        pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: spaces.length }),
      },
      { headers: { "Cache-Control": "no-store, no-cache" } }
    );
  } catch (err) {
    return apiErrorResponse(err, "Failed to load available spaces.", { route: "/api/available-spaces", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const { propertyId, name, monthlyRent, sqft, nnnFee, nnFee, utilityFee } = parsed.body;
  if (!propertyId || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "propertyId and name required" }, { status: 400 });
  }

  try {
    const row = {
      org_id: orgId,
      property_id: propertyId,
      name: name.trim(),
      monthly_rent: Number(monthlyRent) || 0,
      sqft: typeof sqft === "string" ? sqft.trim() : "",
      nnn_fee: Number(nnnFee) || 0,
      nn_fee: Number(nnFee) || 0,
      utility_fee: Number(utilityFee) || 0,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/available_spaces`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const text = await res.text();
      return apiErrorResponse(
        new Error(`available-spaces POST (${res.status}): ${text}`),
        "Failed to save available space.",
        { route: "/api/available-spaces", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save available space.", { route: "/api/available-spaces", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/available_spaces?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { method: "DELETE", headers: HEADERS }
    );

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`available-spaces DELETE (${res.status}): ${errText}`),
        "Failed to delete available space.",
        { route: "/api/available-spaces", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete available space.", { route: "/api/available-spaces", orgId });
  }
}
