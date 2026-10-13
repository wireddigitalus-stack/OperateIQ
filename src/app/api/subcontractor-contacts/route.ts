import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// ─── GET — list all contacts ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "subcontractors" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const service = req.nextUrl.searchParams.get("service");

  let url = `${SUPABASE_URL}/rest/v1/subcontractor_contacts?org_id=eq.${orgId}&order=name.asc`;
  if (service && service !== "All") {
    url += `&service_type=eq.${encodeURIComponent(service)}`;
  }

  const res = await fetch(url, { headers: H, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ contacts: [] });
  return NextResponse.json({ contacts: await res.json() });
}

// ─── POST — create new contact ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "subcontractors" });
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  try {
    const body = await req.json();
    const record = {
      org_id: orgId,
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: body.name?.trim() || "",
      phone: body.phone?.trim() || "",
      service_type: body.service_type || "Other",
      company: body.company?.trim() || "",
      email: body.email?.trim() || "",
      notes: body.notes?.trim() || "",
      rating: body.rating || 0,
      updated_by: body.updatedBy?.trim() || user?.name || "Staff",
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/subcontractor_contacts`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Insert failed: ${err}` }, { status: 500 });
    }

    writeActivityLog({
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH — update contact ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "subcontractors" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.phone !== undefined) patch.phone = body.phone.trim();
    if (body.service_type !== undefined) patch.service_type = body.service_type;
    if (body.company !== undefined) patch.company = body.company.trim();
    if (body.email !== undefined) patch.email = body.email.trim();
    if (body.notes !== undefined) patch.notes = body.notes.trim();
    if (body.rating !== undefined) patch.rating = body.rating;
    if (body.updatedBy !== undefined) patch.updated_by = body.updatedBy.trim();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subcontractor_contacts?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { method: "PATCH", headers: H, body: JSON.stringify(patch) }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE — remove contact ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "subcontractors" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subcontractor_contacts?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { method: "DELETE", headers: H }
    );

    if (!res.ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
