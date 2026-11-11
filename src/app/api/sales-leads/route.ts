import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parseDateWindow,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "sales_crm" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });
    const dw = parseDateWindow(req);

    let url = `${SUPABASE_URL}/rest/v1/sales_leads?org_id=eq.${orgId}&order=created_at.desc`;
    if (dw.from) url += `&created_at=gte.${encodeURIComponent(dw.from)}`;
    if (dw.to) url += `&created_at=lt.${encodeURIComponent(dw.to)}`;

    const res = await fetch(url, {
      headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`sales_leads GET (${res.status}): ${errText}`),
        "Failed to load sales leads.",
        { route: "/api/sales-leads", orgId }
      );
    }
    const leads = (await res.json()) as unknown[];
    const total = parseContentRangeTotal(res.headers.get("content-range"), leads.length);

    return NextResponse.json({
      leads,
      pagination: buildPaginationMeta({
        limit: pg.limit,
        offset: pg.offset,
        total,
        returnedCount: leads.length,
      }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load sales leads.", { route: "/api/sales-leads", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "sales_crm" });
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  try {
    const record = {
      id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      org_id: orgId,
      poc_name: str(body.pocName),
      poc_phone: str(body.pocPhone),
      poc_email: str(body.pocEmail),
      building_interested: str(body.buildingInterested),
      progress: str(body.progress) || "Inquire",
      deal_progress: str(body.dealProgress) || "0-25%",
      listing_price: Number(body.listingPrice) || 0,
      quoted_price: Number(body.quotedPrice) || 0,
      counter_offer: Number(body.counterOffer) || 0,
      offer_price: Number(body.offerPrice) || 0,
      notes: str(body.notes),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales_leads`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`sales_leads POST (${res.status}): ${err}`),
        "Failed to create sales lead.",
        { route: "/api/sales-leads", orgId }
      );
    }

    await writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || "unknown",
      actor_name: user?.name || "Staff",
      action: "created",
      resource_type: "lead",
      resource_name: `${record.poc_name} (Sales)`,
      resource_id: record.id,
      metadata: { building: record.building_interested, progress: record.progress },
    });

    return NextResponse.json({ success: true, lead: record });
  } catch (err) {
    return apiErrorResponse(err, "Failed to create sales lead.", { route: "/api/sales-leads", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "sales_crm" });
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  try {
    const patchPayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.pocName !== undefined) patchPayload.poc_name = str(body.pocName);
    if (body.pocPhone !== undefined) patchPayload.poc_phone = str(body.pocPhone);
    if (body.pocEmail !== undefined) patchPayload.poc_email = str(body.pocEmail);
    if (body.buildingInterested !== undefined) patchPayload.building_interested = body.buildingInterested;
    if (body.progress !== undefined) patchPayload.progress = body.progress;
    if (body.dealProgress !== undefined) patchPayload.deal_progress = body.dealProgress;
    if (body.listingPrice !== undefined) patchPayload.listing_price = Number(body.listingPrice) || 0;
    if (body.quotedPrice !== undefined) patchPayload.quoted_price = Number(body.quotedPrice) || 0;
    if (body.counterOffer !== undefined) patchPayload.counter_offer = Number(body.counterOffer) || 0;
    if (body.offerPrice !== undefined) patchPayload.offer_price = Number(body.offerPrice) || 0;
    if (body.notes !== undefined) patchPayload.notes = str(body.notes);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales_leads?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify(patchPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`sales_leads PATCH (${res.status}): ${err}`),
        "Failed to update sales lead.",
        { route: "/api/sales-leads", orgId }
      );
    }

    await writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || "unknown",
      actor_name: user?.name || "Staff",
      action: "updated",
      resource_type: "lead",
      resource_name: typeof patchPayload.poc_name === "string" && patchPayload.poc_name ? patchPayload.poc_name : id,
      resource_id: id,
      metadata: patchPayload,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update sales lead.", { route: "/api/sales-leads", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "sales_crm" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sales_leads?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "DELETE",
      headers: H,
    });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`sales_leads DELETE (${res.status}): ${errText}`),
        "Failed to delete sales lead.",
        { route: "/api/sales-leads", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete sales lead.", { route: "/api/sales-leads", orgId });
  }
}
