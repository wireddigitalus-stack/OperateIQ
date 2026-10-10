import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  const compliance = req.nextUrl.searchParams.get("compliance");
  const config = req.nextUrl.searchParams.get("config");

  if (config === "true") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspection_config`, { headers: H, cache: "no-store" });
    if (!res.ok) return NextResponse.json({ config: [] });
    return NextResponse.json({ config: await res.json() });
  }

  if (compliance) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/building_inspections?month=like.${encodeURIComponent(compliance)}*&order=property.asc`,
      { headers: H, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ records: [] });
    return NextResponse.json({ records: await res.json() });
  }

  if (month) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/building_inspections?month=eq.${encodeURIComponent(month)}&order=property.asc,inspection_type.asc`,
      { headers: H, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ records: [] });
    return NextResponse.json({ records: await res.json() });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/building_inspections?order=property.asc`,
    { headers: H, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ records: [] });
  return NextResponse.json({ records: await res.json() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.configUpdate) {
      const cfgId = `cfg_${body.property}_${body.inspectionType}`.replace(/[^a-zA-Z0-9_]/g, '_');
      const configRecord = {
        id: cfgId,
        property: body.property,
        inspection_type: body.inspectionType,
        enabled: body.enabled !== undefined ? body.enabled : true,
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspection_config`, {
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

    const record = {
      id: `insp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      property: body.property?.trim() || "",
      inspection_type: body.inspectionType?.trim() || "",
      inspection_date: body.inspectionDate || null,
      crew_type: body.crewType || "internal",
      notes: body.notes?.trim() || "",
      month: body.month || null,
      status: body.inspectionDate ? "completed" : "pending",
      updated_by: body.updatedBy?.trim() || "Staff",
      updated_at: new Date().toISOString(),
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
      actor_email: "unknown",
      actor_name: record.updated_by,
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

    const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspections?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify(patchPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Update failed: ${err}` }, { status: 500 });
    }

    writeActivityLog({
      actor_email: "unknown",
      actor_name: patchPayload.updated_by || "Staff",
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
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/building_inspections?id=eq.${encodeURIComponent(id)}`, {
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
