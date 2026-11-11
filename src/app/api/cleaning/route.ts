import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg, type RequestContext } from "@/lib/server-auth";
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const date = req.nextUrl.searchParams.get("date");
  const worker = req.nextUrl.searchParams.get("worker");
  const pg = parsePagination(req, { defaultLimit: 250, maxLimit: 500 });

  let url = `${SUPABASE_URL}/rest/v1/cleaning_assignments?org_id=eq.${orgId}&order=scheduled_date.asc,property.asc,area.asc`;
  if (from && to) {
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: "Invalid from/to date format (expected YYYY-MM-DD)." }, { status: 400 });
    }
    url += `&scheduled_date=gte.${from}&scheduled_date=lte.${to}`;
  } else if (date) {
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: "Invalid date format (expected YYYY-MM-DD)." }, { status: 400 });
    }
    url += `&scheduled_date=eq.${date}`;
  }
  if (worker) url += `&worker_name=eq.${encodeURIComponent(worker)}`;

  try {
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
        new Error(`cleaning GET (${res.status}): ${errText}`),
        "Failed to load cleaning assignments.",
        { route: "/api/cleaning", orgId }
      );
    }
    const assignments = (await res.json()) as unknown[];
    const total = parseContentRangeTotal(res.headers.get("content-range"), assignments.length);

    return NextResponse.json({
      assignments,
      pagination: buildPaginationMeta({
        limit: pg.limit,
        offset: pg.offset,
        total,
        returnedCount: assignments.length,
      }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load cleaning assignments.", { route: "/api/cleaning", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "cleaning" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const rawPhotoUrl = str(body.photoUrl || body.photo_url);
  const assignment: Record<string, unknown> = {
    org_id: orgId,
    worker_name: str(body.workerName),
    property: str(body.property),
    area: str(body.area),
    scheduled_date: str(body.scheduledDate) || new Date().toISOString().split("T")[0],
    start_time: body.startTime || null,
    end_time: body.endTime || null,
    completed_at: null,
    notes: str(body.notes),
    status: "pending",
    created_at: new Date().toISOString(),
    estimated_cost: Number(body.estimatedCost) || 0,
    actual_cost: Number(body.actualCost) || 0,
  };
  if (rawPhotoUrl) {
    assignment.photo_url = rawPhotoUrl;
  }

  try {
    let res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(assignment),
    });

    if (!res.ok && rawPhotoUrl) {
      const firstErr = await res.text();
      if (firstErr.includes("photo_url")) {
        const fallbackAssignment = { ...assignment };
        delete fallbackAssignment.photo_url;
        res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments`, {
          method: "POST",
          headers: { ...H, Prefer: "return=representation" },
          body: JSON.stringify(fallbackAssignment),
        });
      } else {
        return apiErrorResponse(
          new Error(`cleaning POST (${res.status}): ${firstErr}`),
          "Failed to create cleaning assignment.",
          { route: "/api/cleaning", orgId }
        );
      }
    }

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`cleaning POST (${res.status}): ${err}`),
        "Failed to create cleaning assignment.",
        { route: "/api/cleaning", orgId }
      );
    }

    const [saved] = (await res.json()) as Array<{ id: string }>;

    await writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "created",
      resource_type: "cleaning",
      resource_name: `${assignment.property} — ${assignment.area}`,
      resource_id: saved?.id ?? "unknown",
      metadata: { worker: assignment.worker_name, date: assignment.scheduled_date },
    });

    return NextResponse.json({ success: true, assignment: saved ?? assignment });
  } catch (err) {
    return apiErrorResponse(err, "Failed to create cleaning assignment.", { route: "/api/cleaning", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true, requireFeature: "cleaning" });
  if (!g.ok) return g.res;
  if (g.ctx.kind === "staff" && g.ctx.staff?.role !== "cleaning") {
    return NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 });
  }
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) patch.status = body.status;
  if (body.completedAt !== undefined) patch.completed_at = body.completedAt;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.photoUrl !== undefined || body.photo_url !== undefined)
    patch.photo_url = body.photoUrl ?? body.photo_url;
  if (body.completionNotes !== undefined) patch.completion_notes = body.completionNotes;
  if (g.ctx.kind !== "staff") {
    if (body.estimatedCost !== undefined) patch.estimated_cost = Number(body.estimatedCost) || 0;
    if (body.actualCost !== undefined) patch.actual_cost = Number(body.actualCost) || 0;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cleaning_assignments?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      {
        method: "PATCH",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify(patch),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`cleaning PATCH (${res.status}): ${err}`),
        "Failed to update cleaning assignment.",
        { route: "/api/cleaning", orgId }
      );
    }
    const updated = await res.json().catch(() => []);
    if (!Array.isArray(updated) || !updated.length) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    await writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "updated",
      resource_type: "cleaning",
      resource_name: typeof body.resourceName === "string" && body.resourceName ? body.resourceName : id,
      resource_id: id,
      metadata: { status: body.status },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update cleaning assignment.", { route: "/api/cleaning", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "cleaning" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cleaning_assignments?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      {
        method: "DELETE",
        headers: H,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`cleaning DELETE (${res.status}): ${err}`),
        "Failed to delete cleaning assignment.",
        { route: "/api/cleaning", orgId }
      );
    }

    await writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "deleted",
      resource_type: "cleaning",
      resource_name: req.nextUrl.searchParams.get("name") || id,
      resource_id: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete cleaning assignment.", { route: "/api/cleaning", orgId });
  }
}
