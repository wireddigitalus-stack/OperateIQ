import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg, type RequestContext } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

/** Verified actor identity for audit logs (never trust client-sent actor fields). */
function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || (ctx.staff ? `staff:${ctx.staff.uid}` : "unknown"),
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

// Used by the admin Maintenance tab AND the PIN-based crew portals (staff cookie).
export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "maintenance" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/maintenance_tickets?org_id=eq.${orgId}&order=priority.asc,created_at.desc`,
    { headers: H, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ tickets: [] });
  return NextResponse.json({ tickets: await res.json() });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "maintenance" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const body = await req.json();
  const ticket = {
    org_id: orgId,
    id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: body.title?.trim() || "",
    description: body.description?.trim() || "",
    building: body.building?.trim() || "",
    unit: body.unit?.trim() || "",
    tenant: body.tenant?.trim() || "",
    category: body.category || "Other",
    priority: Number(body.priority) || 3,
    status: body.status || "open",
    assigned_to: body.assignedTo?.trim() || "",
    reported_by: body.reportedBy?.trim() || "",
    estimated_cost: Number(body.estimatedCost) || 0,
    actual_cost: Number(body.actualCost) || 0,
    estimated_hours: Number(body.estimatedHours) || 0,
    scheduled_date: body.scheduledDate || null,
    completed_date: body.completedDate || null,
    notes: body.notes?.trim() || "",
    parts_needed: body.partsNeeded ?? false,
    source: body.source || "admin",
    billable: body.billable ?? false,
    material_amount: Number(body.materialAmount) || 0,
    photo_url: body.photoUrl?.trim() || null,
    created_at: new Date().toISOString(),
    first_response_at: body.firstResponseAt || (body.status && body.status !== "open" && body.status !== "cancelled" ? new Date().toISOString() : null),
    completed_at: body.completedAt || (body.status === "complete" ? new Date().toISOString() : null),
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets`, {
    method: "POST",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(ticket),
  });
  if (!res.ok) {
    const sbError = await res.text();
    console.error("maintenance_tickets POST error:", sbError);
    return NextResponse.json({ error: `Insert failed: ${sbError}` }, { status: 500 });
  }

  writeActivityLog({
    ...actorOf(g.ctx),
    org_id:        orgId,
    action:        "created",
    resource_type: "maintenance",
    resource_name: ticket.title,
    resource_id:   ticket.id,
    metadata: { building: ticket.building, priority: ticket.priority, category: ticket.category },
  });

  return NextResponse.json({ success: true, ticket });
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "maintenance" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "maintenance") {
    return NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();

  // Fetch current ticket state to handle SLA timestamps (and confirm org ownership)
  const currentRes = await fetch(
    `${SUPABASE_URL}/rest/v1/maintenance_tickets?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
    { headers: H, cache: "no-store" }
  );
  let currentTicket: any = null;
  if (currentRes.ok) {
    const list = await currentRes.json();
    if (list && list.length > 0) {
      currentTicket = list[0];
    }
  }
  if (!currentTicket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const map: Record<string, string> = {
    title: "title", description: "description", building: "building", unit: "unit", tenant: "tenant",
    category: "category", priority: "priority", status: "status",
    assignedTo: "assigned_to", reportedBy: "reported_by",
    estimatedCost: "estimated_cost", actualCost: "actual_cost",
    estimatedHours: "estimated_hours", scheduledDate: "scheduled_date",
    completedDate: "completed_date", notes: "notes",
    photoUrl: "photo_url", completionNotes: "completion_notes", actualMinutes: "actual_minutes",
    partsNeeded: "parts_needed",
    firstResponseAt: "first_response_at",
    completedAt: "completed_at",
    billable: "billable",
    materialAmount: "material_amount",
  };
  const patch: Record<string, unknown> = {};
  Object.entries(map).forEach(([js, db]) => { if (body[js] !== undefined) patch[db] = body[js]; });

  // Staff sessions must not modify financial/billing fields on tickets
  if (g.ctx.kind === "staff") {
    delete patch.estimated_cost;
    delete patch.actual_cost;
    delete patch.billable;
  }

  // SLA timing logic:
  // If moving out of 'open' status to 'scheduled' or 'in_progress', record response time (if not already set)
  if (body.status && body.status !== "open" && body.status !== "cancelled") {
    if (!currentTicket || !currentTicket.first_response_at) {
      patch.first_response_at = new Date().toISOString();
    }
  }
  // If moving to complete, set completed_at
  if (body.status === "complete") {
    if (!currentTicket || !currentTicket.completed_at) {
      patch.completed_at = new Date().toISOString();
    }
    // Sync completed_date to match completed_at if not set
    if (!patch.completed_date && (!currentTicket || !currentTicket.completed_date)) {
      patch.completed_date = new Date().toISOString().split("T")[0];
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
    method: "PATCH",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const sbError = await res.text();
    console.error("maintenance_tickets PATCH error:", sbError);
    return NextResponse.json({ error: `Update failed: ${sbError}` }, { status: 500 });
  }

  writeActivityLog({
    ...actorOf(g.ctx),
    org_id:        orgId,
    action:        "updated",
    resource_type: "maintenance",
    resource_name: body.title     || currentTicket.title || id,
    resource_id:   id,
    metadata: { status: body.status, fields_changed: Object.keys(patch) },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "maintenance" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff") {
    return NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
    method: "DELETE", headers: { ...H, "Prefer": "return=representation" },
  });
  if (!res.ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  const deleted = await res.json().catch(() => []);
  if (!Array.isArray(deleted) || !deleted.length) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  writeActivityLog({
    ...actorOf(g.ctx),
    org_id:        orgId,
    action:        "deleted",
    resource_type: "maintenance",
    resource_name: deleted[0]?.title || req.nextUrl.searchParams.get("name") || id,
    resource_id:   id,
  });

  return NextResponse.json({ success: true });
}
