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
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "inspections" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const month = req.nextUrl.searchParams.get("month");
  const compliance = req.nextUrl.searchParams.get("compliance");
  const config = req.nextUrl.searchParams.get("config");
  const pg = parsePagination(req, { defaultLimit: 300, maxLimit: 1000 });

  try {
    if (config === "true") {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspection_config?org_id=eq.${orgId}`, {
        headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
        cache: "no-store",
      });
      if (!res.ok) {
        const errText = await res.text();
        return apiErrorResponse(
          new Error(`building_inspection_config GET (${res.status}): ${errText}`),
          "Failed to load inspection configuration.",
          { route: "/api/building-inspections", orgId }
        );
      }
      const configRows = (await res.json()) as unknown[];
      const total = parseContentRangeTotal(res.headers.get("content-range"), configRows.length);
      return NextResponse.json({
        config: configRows,
        pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: configRows.length }),
      });
    }

    let url = `${SUPABASE_URL}/rest/v1/building_inspections?org_id=eq.${orgId}`;
    if (compliance) {
      url += `&month=like.${encodeURIComponent(compliance)}*&order=property.asc`;
    } else if (month) {
      url += `&month=eq.${encodeURIComponent(month)}&order=property.asc,inspection_type.asc`;
    } else {
      url += `&order=property.asc`;
    }

    const res = await fetch(url, {
      headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`building_inspections GET (${res.status}): ${errText}`),
        "Failed to load building inspections.",
        { route: "/api/building-inspections", orgId }
      );
    }
    const records = (await res.json()) as unknown[];
    const total = parseContentRangeTotal(res.headers.get("content-range"), records.length);

    return NextResponse.json({
      records,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: records.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load building inspections.", { route: "/api/building-inspections", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "inspections" });
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
    if (body.configUpdate) {
      const cfgId = `cfg_${body.property}_${body.inspectionType}`.replace(/[^a-zA-Z0-9_]/g, "_");
      const configRecord = {
        org_id: orgId,
        id: cfgId,
        property: body.property,
        inspection_type: body.inspectionType,
        enabled: body.enabled !== undefined ? body.enabled : true,
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspection_config?on_conflict=org_id,id`, {
        method: "POST",
        headers: { ...H, Prefer: "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify(configRecord),
      });

      if (!res.ok) {
        const err = await res.text();
        return apiErrorResponse(
          new Error(`building_inspection_config POST (${res.status}): ${err}`),
          "Failed to update inspection configuration.",
          { route: "/api/building-inspections", orgId }
        );
      }
      const records = await res.json();
      return NextResponse.json({ success: true, record: records[0] });
    }

    const property = str(body.property);
    const inspectionType = str(body.inspectionType || body.type_key);
    const month = body.month || null;
    const updatedBy = str(body.updatedBy) || user?.name || staff?.name || "Staff";
    const nowIso = new Date().toISOString();

    let checkUrl = `${SUPABASE_URL}/rest/v1/building_inspections?select=id&org_id=eq.${orgId}&property=eq.${encodeURIComponent(property)}&inspection_type=eq.${encodeURIComponent(inspectionType)}`;
    if (month) {
      checkUrl += `&month=eq.${encodeURIComponent(String(month))}`;
    } else {
      checkUrl += `&month=is.null`;
    }
    checkUrl += `&limit=1`;

    const existingRes = await fetch(checkUrl, { headers: H, cache: "no-store" });
    const existingRows = existingRes.ok ? await existingRes.json() : [];
    const existingRow = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

    if (existingRow?.id) {
      const patchPayload = {
        property,
        inspection_type: inspectionType,
        inspection_date: body.inspectionDate || null,
        crew_type: body.crewType || "internal",
        notes: str(body.notes),
        month,
        status: body.inspectionDate ? "completed" : "pending",
        updated_by: updatedBy,
        updated_at: nowIso,
      };

      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/building_inspections?id=eq.${encodeURIComponent(existingRow.id)}&org_id=eq.${orgId}`,
        {
          method: "PATCH",
          headers: { ...H, Prefer: "return=representation" },
          body: JSON.stringify(patchPayload),
        }
      );

      if (!patchRes.ok) {
        const err = await patchRes.text();
        return apiErrorResponse(
          new Error(`building_inspections PATCH (${patchRes.status}): ${err}`),
          "Failed to update building inspection.",
          { route: "/api/building-inspections", orgId }
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
        metadata: { inspection_type: inspectionType, inspection_date: patchPayload.inspection_date, month },
      });

      return NextResponse.json({ success: true, record: saved });
    }

    const record = {
      org_id: orgId,
      id: `insp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      property,
      inspection_type: inspectionType,
      inspection_date: body.inspectionDate || null,
      crew_type: body.crewType || "internal",
      notes: str(body.notes),
      month,
      status: body.inspectionDate ? "completed" : "pending",
      updated_by: updatedBy,
      updated_at: nowIso,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspections`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`building_inspections POST (${res.status}): ${err}`),
        "Failed to save building inspection.",
        { route: "/api/building-inspections", orgId }
      );
    }

    const records = await res.json();

    await writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || staff?.name || "unknown",
      actor_name: user?.name || staff?.name || record.updated_by,
      action: "created",
      resource_type: "maintenance",
      resource_name: record.property,
      resource_id: record.id,
      metadata: {
        inspection_type: record.inspection_type,
        inspection_date: record.inspection_date,
        month: record.month,
      },
    });

    return NextResponse.json({ success: true, record: records[0] });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save building inspection.", { route: "/api/building-inspections", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "inspections" });
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
    if (body.inspectionType !== undefined) patchPayload.inspection_type = str(body.inspectionType);
    if (body.inspectionDate !== undefined) {
      patchPayload.inspection_date = body.inspectionDate || null;
      patchPayload.status = body.inspectionDate ? "completed" : "pending";
    }
    if (body.crewType !== undefined) patchPayload.crew_type = body.crewType;
    if (body.notes !== undefined) patchPayload.notes = str(body.notes);
    if (body.status !== undefined) patchPayload.status = body.status;
    if (body.updatedBy !== undefined) patchPayload.updated_by = str(body.updatedBy);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/building_inspections?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      {
        method: "PATCH",
        headers: H,
        body: JSON.stringify(patchPayload),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`building_inspections PATCH (${res.status}): ${err}`),
        "Failed to update building inspection.",
        { route: "/api/building-inspections", orgId }
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
    return apiErrorResponse(err, "Failed to update building inspection.", { route: "/api/building-inspections", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "inspections" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/building_inspections?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      {
        method: "DELETE",
        headers: H,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`building_inspections DELETE (${res.status}): ${errText}`),
        "Failed to delete building inspection.",
        { route: "/api/building-inspections", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete building inspection.", { route: "/api/building-inspections", orgId });
  }
}
