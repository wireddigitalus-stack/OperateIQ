import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
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
  const g = await requireOrg(req, { requireFeature: "subcontractors" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const service = req.nextUrl.searchParams.get("service");
  const pg = parsePagination(req, { defaultLimit: 250, maxLimit: 500 });

  let url = `${SUPABASE_URL}/rest/v1/subcontractor_contacts?org_id=eq.${orgId}&order=name.asc`;
  if (service && service !== "All") {
    url += `&service_type=eq.${encodeURIComponent(service)}`;
  }

  try {
    const res = await fetch(url, {
      headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`subcontractor_contacts GET (${res.status}): ${errText}`),
        "Failed to load vendor contacts.",
        { route: "/api/subcontractor-contacts", orgId }
      );
    }
    const contacts = (await res.json()) as unknown[];
    const total = parseContentRangeTotal(res.headers.get("content-range"), contacts.length);

    return NextResponse.json({
      contacts,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: contacts.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load vendor contacts.", { route: "/api/subcontractor-contacts", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "subcontractors" });
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  try {
    const record = {
      org_id: orgId,
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: str(body.name),
      phone: str(body.phone),
      service_type: str(body.service_type) || "Other",
      company: str(body.company),
      email: str(body.email),
      notes: str(body.notes),
      rating: Number(body.rating) || 0,
      updated_by: str(body.updatedBy) || user?.name || "Staff",
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/subcontractor_contacts`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`subcontractor_contacts POST (${res.status}): ${err}`),
        "Failed to save vendor contact.",
        { route: "/api/subcontractor-contacts", orgId }
      );
    }

    await writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || "unknown",
      actor_name: user?.name || record.updated_by,
      action: "created",
      resource_type: "maintenance",
      resource_name: `Subcontractor: ${record.name}`,
      resource_id: record.id,
      metadata: { service_type: record.service_type, phone: record.phone },
    });

    return NextResponse.json({ success: true, contact: record });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save vendor contact.", { route: "/api/subcontractor-contacts", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "subcontractors" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  try {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = str(body.name);
    if (body.phone !== undefined) patch.phone = str(body.phone);
    if (body.service_type !== undefined) patch.service_type = body.service_type;
    if (body.company !== undefined) patch.company = str(body.company);
    if (body.email !== undefined) patch.email = str(body.email);
    if (body.notes !== undefined) patch.notes = str(body.notes);
    if (body.rating !== undefined) patch.rating = Number(body.rating) || 0;
    if (body.updatedBy !== undefined) patch.updated_by = str(body.updatedBy);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subcontractor_contacts?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { method: "PATCH", headers: H, body: JSON.stringify(patch) }
    );

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`subcontractor_contacts PATCH (${res.status}): ${errText}`),
        "Failed to update vendor contact.",
        { route: "/api/subcontractor-contacts", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update vendor contact.", { route: "/api/subcontractor-contacts", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "subcontractors" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subcontractor_contacts?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { method: "DELETE", headers: H }
    );

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`subcontractor_contacts DELETE (${res.status}): ${errText}`),
        "Failed to delete vendor contact.",
        { route: "/api/subcontractor-contacts", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete vendor contact.", { route: "/api/subcontractor-contacts", orgId });
  }
}
