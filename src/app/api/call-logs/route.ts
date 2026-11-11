import { NextRequest, NextResponse } from "next/server";
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
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  "Content-Type": "application/json",
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "call_logs" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });
    const dw = parseDateWindow(req);
    const leadId = req.nextUrl.searchParams.get("lead_id");

    let url = `${SUPABASE_URL}/rest/v1/call_logs?org_id=eq.${orgId}&order=created_at.desc`;
    if (leadId) url += `&lead_id=eq.${encodeURIComponent(leadId)}`;
    if (dw.from) url += `&created_at=gte.${encodeURIComponent(dw.from)}`;
    if (dw.to) url += `&created_at=lt.${encodeURIComponent(dw.to)}`;

    const res = await fetch(url, {
      headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`call_logs GET (${res.status}): ${errText}`),
        "Failed to load call logs.",
        { route: "/api/call-logs", orgId }
      );
    }
    const raw = await res.json();
    const logs = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), logs.length);

    return NextResponse.json({
      logs,
      pagination: buildPaginationMeta({
        limit: pg.limit,
        offset: pg.offset,
        total,
        returnedCount: logs.length,
      }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load call logs.", { route: "/api/call-logs", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "call_logs" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const { lead_id, lead_name, called_by, notes, outcome, follow_up_date } = parsed.body;

  if (!lead_id || !outcome) {
    return NextResponse.json({ error: "lead_id and outcome required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({
        org_id: orgId,
        lead_id,
        lead_name: lead_name || "",
        called_by: called_by || "Staff",
        notes: notes || "",
        outcome,
        follow_up_date: follow_up_date || null,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`call_logs POST (${res.status}): ${errText}`),
        "Failed to save call log.",
        { route: "/api/call-logs", orgId }
      );
    }
    const data = await res.json();
    return NextResponse.json({ success: true, log: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save call log.", { route: "/api/call-logs", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "call_logs" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/call_logs?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { method: "DELETE", headers: H }
    );
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`call_logs DELETE (${res.status}): ${errText}`),
        "Failed to delete call log.",
        { route: "/api/call-logs", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete call log.", { route: "/api/call-logs", orgId });
  }
}
