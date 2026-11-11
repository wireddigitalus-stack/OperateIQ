import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg, type RequestContext } from "@/lib/server-auth";
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

  try {
    const pg = parsePagination(req, { defaultLimit: 250, maxLimit: 500 });
    const dw = parseDateWindow(req);
    const status = req.nextUrl.searchParams.get("status")?.trim();

    let url = `${SUPABASE_URL}/rest/v1/maintenance_tickets?org_id=eq.${orgId}&order=priority.asc,created_at.desc`;
    if (status) url += `&status=eq.${encodeURIComponent(status)}`;
    if (dw.from) url += `&created_at=gte.${encodeURIComponent(dw.from)}`;
    if (dw.to) url += `&created_at=lt.${encodeURIComponent(dw.to)}`;

    const res = await fetch(url, {
      headers: {
        ...H,
        Range: pg.rangeHeader,
        Prefer: "count=exact",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`maintenance GET (${res.status}): ${errText}`),
        "Failed to load maintenance tickets.",
        { route: "/api/maintenance", orgId }
      );
    }

    const tickets = (await res.json()) as unknown[];
    const total = parseContentRangeTotal(res.headers.get("content-range"), tickets.length);

    return NextResponse.json({
      tickets,
      pagination: buildPaginationMeta({
        limit: pg.limit,
        offset: pg.offset,
        total,
        returnedCount: tickets.length,
      }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load maintenance tickets.", { route: "/api/maintenance", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "maintenance" });
  if (!g.ok) return g.res;
  if (
    g.ctx.kind === "staff" &&
    g.ctx.staff?.role !== "maintenance" &&
    g.ctx.staff?.role !== "cleaning"
  ) {
    return NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const statusVal = str(body.status) || "open";

  const ticket = {
    org_id: orgId,
    id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: str(body.title),
    description: str(body.description),
    building: str(body.building),
    unit: str(body.unit),
    tenant: str(body.tenant),
    category: str(body.category) || "Other",
    priority: Number(body.priority) || 3,
    status: statusVal,
    assigned_to: str(body.assignedTo),
    reported_by: str(body.reportedBy),
    estimated_cost: Number(body.estimatedCost) || 0,
    actual_cost: Number(body.actualCost) || 0,
    estimated_hours: Number(body.estimatedHours) || 0,
    scheduled_date: (typeof body.scheduledDate === "string" && body.scheduledDate) || null,
    completed_date: (typeof body.completedDate === "string" && body.completedDate) || null,
    notes: str(body.notes),
    parts_needed: Boolean(body.partsNeeded),
    source: str(body.source) || "admin",
    billable: Boolean(body.billable),
    material_amount: Number(body.materialAmount) || 0,
    photo_url: str(body.photoUrl) || null,
    created_at: new Date().toISOString(),
    first_response_at:
      (typeof body.firstResponseAt === "string" && body.firstResponseAt) ||
      (statusVal !== "open" && statusVal !== "cancelled" ? new Date().toISOString() : null),
    completed_at:
      (typeof body.completedAt === "string" && body.completedAt) ||
      (statusVal === "complete" ? new Date().toISOString() : null),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(ticket),
    });
    if (!res.ok) {
      const sbError = await res.text();
      return apiErrorResponse(
        new Error(`maintenance POST (${res.status}): ${sbError}`),
        "Failed to create maintenance ticket.",
        { route: "/api/maintenance", orgId }
      );
    }

    await writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "created",
      resource_type: "maintenance",
      resource_name: ticket.title,
      resource_id: ticket.id,
      metadata: { building: ticket.building, priority: ticket.priority, category: ticket.category },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    return apiErrorResponse(err, "Failed to create maintenance ticket.", { route: "/api/maintenance", orgId });
  }
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

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  try {
    const currentRes = await fetch(
      `${SUPABASE_URL}/rest/v1/maintenance_tickets?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { headers: H, cache: "no-store" }
    );
    let currentTicket: Record<string, unknown> | null = null;
    if (currentRes.ok) {
      const list = (await currentRes.json()) as Array<Record<string, unknown>>;
      if (list && list.length > 0) {
        currentTicket = list[0];
      }
    }
    if (!currentTicket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const map: Record<string, string> = {
      title: "title",
      description: "description",
      building: "building",
      unit: "unit",
      tenant: "tenant",
      category: "category",
      priority: "priority",
      status: "status",
      assignedTo: "assigned_to",
      reportedBy: "reported_by",
      estimatedCost: "estimated_cost",
      actualCost: "actual_cost",
      estimatedHours: "estimated_hours",
      scheduledDate: "scheduled_date",
      completedDate: "completed_date",
      notes: "notes",
      photoUrl: "photo_url",
      photo_url: "photo_url",
      completionNotes: "completion_notes",
      actualMinutes: "actual_minutes",
      partsNeeded: "parts_needed",
      firstResponseAt: "first_response_at",
      completedAt: "completed_at",
      billable: "billable",
      materialAmount: "material_amount",
    };
    const patch: Record<string, unknown> = {};
    Object.entries(map).forEach(([js, db]) => {
      if (body[js] !== undefined) patch[db] = body[js];
    });

    if (g.ctx.kind === "staff") {
      delete patch.estimated_cost;
      delete patch.actual_cost;
      delete patch.billable;
    }

    if (body.status && body.status !== "open" && body.status !== "cancelled") {
      if (!currentTicket.first_response_at) {
        patch.first_response_at = new Date().toISOString();
      }
    }
    if (body.status === "complete") {
      if (!currentTicket.completed_at) {
        patch.completed_at = new Date().toISOString();
      }
      if (!patch.completed_date && !currentTicket.completed_date) {
        patch.completed_date = new Date().toISOString().split("T")[0];
      }
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/maintenance_tickets?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      {
        method: "PATCH",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) {
      const sbError = await res.text();
      return apiErrorResponse(
        new Error(`maintenance PATCH (${res.status}): ${sbError}`),
        "Failed to update maintenance ticket.",
        { route: "/api/maintenance", orgId }
      );
    }

    await writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "updated",
      resource_type: "maintenance",
      resource_name:
        (typeof body.title === "string" && body.title) ||
        (typeof currentTicket.title === "string" && currentTicket.title) ||
        id,
      resource_id: id,
      metadata: { status: body.status, fields_changed: Object.keys(patch) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update maintenance ticket.", { route: "/api/maintenance", orgId });
  }
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

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/maintenance_tickets?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      {
        method: "DELETE",
        headers: { ...H, Prefer: "return=representation" },
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`maintenance DELETE (${res.status}): ${errText}`),
        "Failed to delete maintenance ticket.",
        { route: "/api/maintenance", orgId }
      );
    }
    const deleted = await res.json().catch(() => []);
    if (!Array.isArray(deleted) || !deleted.length) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "deleted",
      resource_type: "maintenance",
      resource_name: deleted[0]?.title || req.nextUrl.searchParams.get("name") || id,
      resource_id: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete maintenance ticket.", { route: "/api/maintenance", orgId });
  }
}
