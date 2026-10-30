import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
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

  if (config === "true") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspection_config?org_id=eq.${orgId}`, { headers: H, cache: "no-store" });
    if (!res.ok) return NextResponse.json({ config: [] });
    return NextResponse.json({ config: await res.json() });
  }

  if (compliance) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/building_inspections?org_id=eq.${orgId}&month=like.${encodeURIComponent(compliance)}*&order=property.asc`,
      { headers: H, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ records: [] });
    return NextResponse.json({ records: await res.json() });
  }

  if (month) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/building_inspections?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&order=property.asc,inspection_type.asc`,
      { headers: H, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ records: [] });
    return NextResponse.json({ records: await res.json() });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/building_inspections?org_id=eq.${orgId}&order=property.asc`,
    { headers: H, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ records: [] });
  return NextResponse.json({ records: await res.json() });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "inspections" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { orgId, user, staff } = g.ctx;

  try {
    const body = await req.json();

    if (body.configUpdate) {
      const cfgId = `cfg_${body.property}_${body.inspectionType}`.replace(/[^a-zA-Z0-9_]/g, '_');
      const configRecord = {
        org_id: orgId,
        id: cfgId,
        property: body.property,
        inspection_type: body.inspectionType,
        enabled: body.enabled !== undefined ? body.enabled : true,
      };

      // Conflict target is the org-scoped primary key (org_id, id)
      const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspection_config?on_conflict=org_id,id`, {
        method: "POST",
        headers: { ...H, "Prefer": "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify(configRecord),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Config update failed: ${err}` }, { status: 500 });
      }
      const records = await res.json();
      return NextResponse.json({ success: true, record: records[0] });
    }

    const property = body.property?.trim() || "";
    const inspectionType = (body.inspectionType || body.type_key || "")?.trim() || "";
    const month = body.month || null;
    const updatedBy = body.updatedBy?.trim() || user?.name || staff?.name || "Staff";
    const nowIso = new Date().toISOString();

    // Check if a row already exists for (org_id, property, inspection_type, month)
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
        notes: body.notes?.trim() || "",
        month,
        status: body.inspectionDate ? "completed" : "pending",
        updated_by: updatedBy,
        updated_at: nowIso,
      };

      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/building_inspections?id=eq.${encodeURIComponent(existingRow.id)}&org_id=eq.${orgId}`,
        {
          method: "PATCH",
          headers: { ...H, "Prefer": "return=representation" },
          body: JSON.stringify(patchPayload),
        }
      );

      if (!patchRes.ok) {
        const err = await patchRes.text();
        return NextResponse.json({ error: `Update failed: ${err}` }, { status: 500 });
      }

      const patchedRows = await patchRes.json();
      const saved = Array.isArray(patchedRows) && patchedRows[0] ? patchedRows[0] : { id: existingRow.id, org_id: orgId, ...patchPayload };

      writeActivityLog({
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
      notes: body.notes?.trim() || "",
      month,
      status: body.inspectionDate ? "completed" : "pending",
      updated_by: updatedBy,
      updated_at: nowIso,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspections`, {
      method: "POST",
      headers: { ...H, "Prefer": "return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Insert failed: ${err}` }, { status: 500 });
    }

    const records = await res.json();

    writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || staff?.name || "unknown",
      actor_name: user?.name || staff?.name || record.updated_by,
      action: "created",
      resource_type: "maintenance",
      resource_name: record.property,
      resource_id: record.id,
      metadata: { inspection_type: record.inspection_type, inspection_date: record.inspection_date, month: record.month },
    });

    return NextResponse.json({ success: true, record: records[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "inspections" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { orgId, user, staff } = g.ctx;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();

    const patchPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (body.property !== undefined) patchPayload.property = body.property.trim();
    if (body.inspectionType !== undefined) patchPayload.inspection_type = body.inspectionType.trim();
    if (body.inspectionDate !== undefined) {
      patchPayload.inspection_date = body.inspectionDate || null;
      patchPayload.status = body.inspectionDate ? "completed" : "pending";
    }
    if (body.crewType !== undefined) patchPayload.crew_type = body.crewType;
    if (body.notes !== undefined) patchPayload.notes = body.notes.trim();
    if (body.status !== undefined) patchPayload.status = body.status;
    if (body.updatedBy !== undefined) patchPayload.updated_by = body.updatedBy.trim();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspections?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify(patchPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Update failed: ${err}` }, { status: 500 });
    }

    writeActivityLog({
      org_id: orgId,
      actor_email: user?.email || staff?.name || "unknown",
      actor_name: user?.name || staff?.name || patchPayload.updated_by || "Staff",
      action: "updated",
      resource_type: "maintenance",
      resource_name: patchPayload.property || id,
      resource_id: id,
      metadata: patchPayload,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "inspections" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspections?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "DELETE",
      headers: H,
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
