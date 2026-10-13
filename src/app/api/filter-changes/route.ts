import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "filter_changes" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/filter_changes?org_id=eq.${orgId}&order=property.asc`,
    { headers: H, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ records: [] });
  return NextResponse.json({ records: await res.json() });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "filter_changes" });
  if (!g.ok) return g.res;
  const { orgId, user, staff } = g.ctx;

  try {
    const body = await req.json();
    const record = {
      org_id: orgId,
      id: `filt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      property: body.property?.trim() || "",
      last_changed: body.lastChanged || null,
      next_due: body.nextDue || null,
      notes: body.notes?.trim() || "",
      updated_by: body.updatedBy?.trim() || user?.name || staff?.name || "Staff",
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/filter_changes?on_conflict=org_id,property`, {
      method: "POST",
      headers: { ...H, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Insert failed: ${err}` }, { status: 500 });
    }

    const rows = await res.json();
    const saved = Array.isArray(rows) && rows[0] ? rows[0] : record;

    writeActivityLog({
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "filter_changes" });
  if (!g.ok) return g.res;
  const { orgId, user, staff } = g.ctx;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();

    const patchPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (body.property !== undefined) patchPayload.property = body.property.trim();
    if (body.lastChanged !== undefined) patchPayload.last_changed = body.lastChanged || null;
    if (body.nextDue !== undefined) patchPayload.next_due = body.nextDue || null;
    if (body.notes !== undefined) patchPayload.notes = body.notes.trim();
    if (body.updatedBy !== undefined) patchPayload.updated_by = body.updatedBy.trim();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/filter_changes?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
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
  const g = await requireOrgAdmin(req, { requireFeature: "filter_changes" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/filter_changes?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
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
