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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Verified actor identity for audit logs (never trust client-sent actor fields). */
function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || (ctx.staff ? `staff:${ctx.staff.uid}` : "unknown"),
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

// GET — admin Cleaning tab and the PIN-based cleaning crew portal (staff cookie).
export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "cleaning" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "cleaning") {
    return NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const from   = req.nextUrl.searchParams.get("from");
  const to     = req.nextUrl.searchParams.get("to");
  const date   = req.nextUrl.searchParams.get("date");
  const worker = req.nextUrl.searchParams.get("worker");

  let url = `${SUPABASE_URL}/rest/v1/cleaning_assignments?org_id=eq.${orgId}&order=scheduled_date.asc,property.asc,area.asc`;
  if (from && to) {
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) return NextResponse.json({ assignments: [] });
    url += `&scheduled_date=gte.${from}&scheduled_date=lte.${to}`;
  } else if (date) {
    if (!DATE_RE.test(date)) return NextResponse.json({ assignments: [] });
    url += `&scheduled_date=eq.${date}`;
  }
  if (worker) url += `&worker_name=eq.${encodeURIComponent(worker)}`;

  const res = await fetch(url, { headers: H, cache: "no-store" });
  if (!res.ok) {
    console.error("[cleaning GET] Supabase error:", await res.text());
    return NextResponse.json({ assignments: [] });
  }
  return NextResponse.json({ assignments: await res.json() });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "cleaning" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const body = await req.json();

  // Do NOT send `id` — let Supabase generate a UUID via DEFAULT gen_random_uuid()
  const rawPhotoUrl = (body.photoUrl || body.photo_url || "").trim();
  const assignment: Record<string, unknown> = {
    org_id:         orgId,
    worker_name:    body.workerName?.trim()  || "",
    property:       body.property?.trim()    || "",
    area:           body.area?.trim()        || "",
    scheduled_date: body.scheduledDate       || new Date().toISOString().split("T")[0],
    start_time:     body.startTime           || null,
    end_time:       body.endTime             || null,
    completed_at:   null,
    notes:          body.notes?.trim()       || "",
    status:         "pending",
    created_at:     new Date().toISOString(),
    estimated_cost: Number(body.estimatedCost) || 0,
    actual_cost:    Number(body.actualCost)    || 0,
  };
  if (rawPhotoUrl) {
    assignment.photo_url = rawPhotoUrl;
  }

  let res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments`, {
    method: "POST",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(assignment),
  });

  if (!res.ok && rawPhotoUrl) {
    const firstErr = await res.text();
    if (firstErr.includes("photo_url")) {
      const { photo_url: _omitted, ...fallbackAssignment } = assignment;
      res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments`, {
        method: "POST",
        headers: { ...H, "Prefer": "return=representation" },
        body: JSON.stringify(fallbackAssignment),
      });
    } else {
      console.error("[cleaning POST] Supabase insert failed:", firstErr);
      return NextResponse.json({ error: "Insert failed", detail: firstErr }, { status: 500 });
    }
  }

  if (!res.ok) {
    const err = await res.text();
    console.error("[cleaning POST] Supabase insert failed:", err);
    return NextResponse.json({ error: "Insert failed", detail: err }, { status: 500 });
  }

  const [saved] = await res.json() as Array<{ id: string }>;

  await writeActivityLog({
    ...actorOf(g.ctx),
    org_id:        orgId,
    action:        "created",
    resource_type: "cleaning",
    resource_name: `${assignment.property} — ${assignment.area}`,
    resource_id:   saved?.id ?? "unknown",
    metadata: { worker: assignment.worker_name, date: assignment.scheduled_date },
  });

  return NextResponse.json({ success: true, assignment: saved ?? assignment });
}

// PATCH — admin Cleaning tab and the cleaning crew portal (mark complete).
export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "cleaning" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "cleaning") {
    return NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.status           !== undefined) patch.status            = body.status;
  if (body.completedAt      !== undefined) patch.completed_at      = body.completedAt;
  if (body.notes            !== undefined) patch.notes             = body.notes;
  if (body.photoUrl !== undefined || body.photo_url !== undefined) patch.photo_url = body.photoUrl ?? body.photo_url;
  if (body.completionNotes  !== undefined) patch.completion_notes  = body.completionNotes;
  if (g.ctx.kind !== "staff") {
    if (body.estimatedCost !== undefined) patch.estimated_cost = Number(body.estimatedCost) || 0;
    if (body.actualCost    !== undefined) patch.actual_cost    = Number(body.actualCost) || 0;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
    method: "PATCH",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[cleaning PATCH] Supabase update failed:", err);
    return NextResponse.json({ error: "Update failed", detail: err }, { status: 500 });
  }
  const updated = await res.json().catch(() => []);
  if (!Array.isArray(updated) || !updated.length) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await writeActivityLog({
    ...actorOf(g.ctx),
    org_id:        orgId,
    action:        "updated",
    resource_type: "cleaning",
    resource_name: body.resourceName || id,
    resource_id:   id,
    metadata: { status: body.status },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "cleaning" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
    method: "DELETE", headers: H,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[cleaning DELETE] Supabase delete failed:", err);
    // Still try to log even if delete had issues
  }

  await writeActivityLog({
    ...actorOf(g.ctx),
    org_id:        orgId,
    action:        "deleted",
    resource_type: "cleaning",
    resource_name: req.nextUrl.searchParams.get("name")       || id,
    resource_id:   id,
  });

  return NextResponse.json({ success: true });
}
