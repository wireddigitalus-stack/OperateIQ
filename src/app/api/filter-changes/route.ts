import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";
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
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "filter_changes" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 250, maxLimit: 500 });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/filter_changes?org_id=eq.${orgId}&order=property.asc`, {
      headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`filter_changes GET (${res.status}): ${errText}`),
        "Failed to load HVAC filter schedule.",
        { route: "/api/filter-changes", orgId }
      );
    }
    const records = (await res.json()) as unknown[];
    const total = parseContentRangeTotal(res.headers.get("content-range"), records.length);

    return NextResponse.json({
      records,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: records.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load HVAC filter schedule.", { route: "/api/filter-changes", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "filter_changes" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { orgId, user, staff } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  try {
    const property = str(body.property || body.property_name);
    const updatedBy = str(body.updatedBy) || user?.name || staff?.name || "Staff";
    const nowIso = new Date().toISOString();

    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/filter_changes?select=id&org_id=eq.${orgId}&property=eq.${encodeURIComponent(property)}&limit=1`,
      { headers: H, cache: "no-store" }
    );
    const existingRows = existingRes.ok ? await existingRes.json() : [];
    const existingRow = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

    if (existingRow?.id) {
      const patchPayload = {
        property,
        last_changed: body.lastChanged || null,
        next_due: body.nextDue || null,
        notes: str(body.notes),
        updated_by: updatedBy,
        updated_at: nowIso,
      };

      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/filter_changes?id=eq.${encodeURIComponent(existingRow.id)}&org_id=eq.${orgId}`,
        {
          method: "PATCH",
          headers: { ...H, Prefer: "return=representation" },
          body: JSON.stringify(patchPayload),
        }
      );

      if (!patchRes.ok) {
        const err = await patchRes.text();
        return apiErrorResponse(
          new Error(`filter_changes PATCH (${patchRes.status}): ${err}`),
          "Failed to update filter change record.",
          { route: "/api/filter-changes", orgId }
        );
      }

      const patchedRows = await patchRes.json();
      const saved =
        Array.isArray(patchedRows) && patchedRows[0]
          ? patchedRows[0]
          : { id: existingRow.id, org_id: orgId, ...patchPayload };

      await writeActivityLog({
        org_id: orgId,
        actor_email: user?.email || staff?.name || "unknown",
        actor_name: user?.name || staff?.name || updatedBy,
        action: "updated",
        resource_type: "maintenance",
        resource_name: property,
        resource_id: existingRow.id,
        metadata: { last_changed: patchPayload.last_changed },
      });

      return NextResponse.json({ success: true, record: saved });
    }

    const record = {
      org_id: orgId,
      id: `filt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      property,
      last_changed: body.lastChanged || null,
      next_due: body.nextDue || null,
      notes: str(body.notes),
      updated_by: updatedBy,
      updated_at: nowIso,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/filter_changes?on_conflict=org_id,property`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`filter_changes POST (${res.status}): ${err}`),
        "Failed to save filter change record.",
        { route: "/api/filter-changes", orgId }
      );
    }

    const rows = await res.json();
    const saved = Array.isArray(rows) && rows[0] ? rows[0] : record;

    await writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || staff?.name || "unknown",
      actor_name: user?.name || staff?.name || record.updated_by,
      action: "created",
      resource_type: "maintenance",
      resource_name: record.property,
      resource_id: saved.id,
      metadata: { last_changed: record.last_changed },
    });

    return NextResponse.json({ success: true, record: saved });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save filter change record.", { route: "/api/filter-changes", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "filter_changes" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { orgId, user, staff } = g.ctx;

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
    if (body.property !== undefined) patchPayload.property = str(body.property);
    if (body.lastChanged !== undefined) patchPayload.last_changed = body.lastChanged || null;
    if (body.nextDue !== undefined) patchPayload.next_due = body.nextDue || null;
    if (body.notes !== undefined) patchPayload.notes = str(body.notes);
    if (body.updatedBy !== undefined) patchPayload.updated_by = str(body.updatedBy);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/filter_changes?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify(patchPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`filter_changes PATCH (${res.status}): ${err}`),
        "Failed to update filter change record.",
        { route: "/api/filter-changes", orgId }
      );
    }

    await writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || staff?.name || "unknown",
      actor_name:
        user?.name ||
        staff?.name ||
        (typeof patchPayload.updated_by === "string" ? patchPayload.updated_by : "Staff"),
      action: "updated",
      resource_type: "maintenance",
      resource_name:
        typeof patchPayload.property === "string" && patchPayload.property ? patchPayload.property : id,
      resource_id: id,
      metadata: patchPayload,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update filter change record.", { route: "/api/filter-changes", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrgAdmin(req, { requireFeature: "filter_changes" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/filter_changes?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "DELETE",
      headers: H,
    });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`filter_changes DELETE (${res.status}): ${errText}`),
        "Failed to delete filter change record.",
        { route: "/api/filter-changes", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete filter change record.", { route: "/api/filter-changes", orgId });
  }
}
