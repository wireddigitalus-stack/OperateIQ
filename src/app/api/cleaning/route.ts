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
  const from   = req.nextUrl.searchParams.get("from");
  const to     = req.nextUrl.searchParams.get("to");
  const date   = req.nextUrl.searchParams.get("date");
  const worker = req.nextUrl.searchParams.get("worker");

  let url = `${SUPABASE_URL}/rest/v1/cleaning_assignments?order=scheduled_date.asc,property.asc,area.asc`;
  if (from && to) {
    url += `&scheduled_date=gte.${from}&scheduled_date=lte.${to}`;
  } else if (date) {
    url += `&scheduled_date=eq.${date}`;
  }
  if (worker) url += `&worker_name=eq.${encodeURIComponent(worker)}`;

  const res = await fetch(url, { headers: H });
  if (!res.ok) {
    console.error("[cleaning GET] Supabase error:", await res.text());
    return NextResponse.json({ assignments: [] });
  }
  return NextResponse.json({ assignments: await res.json() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Do NOT send `id` — let Supabase generate a UUID via DEFAULT gen_random_uuid()
  const assignment = {
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

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments`, {
    method: "POST",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(assignment),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[cleaning POST] Supabase insert failed:", err);
    return NextResponse.json({ error: "Insert failed", detail: err }, { status: 500 });
  }

  const [saved] = await res.json() as Array<{ id: string }>;

  await writeActivityLog({
    actor_email:   body.actorEmail  || "unknown",
    actor_name:    body.actorName   || "Staff",
    action:        "created",
    resource_type: "cleaning",
    resource_name: `${assignment.property} — ${assignment.area}`,
    resource_id:   saved?.id ?? "unknown",
    metadata: { worker: assignment.worker_name, date: assignment.scheduled_date },
  });

  return NextResponse.json({ success: true, assignment: saved ?? assignment });
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.status           !== undefined) patch.status            = body.status;
  if (body.completedAt      !== undefined) patch.completed_at      = body.completedAt;
  if (body.notes            !== undefined) patch.notes             = body.notes;
  if (body.photoUrl         !== undefined) patch.photo_url         = body.photoUrl;
  if (body.completionNotes  !== undefined) patch.completion_notes  = body.completionNotes;
  if (body.estimatedCost    !== undefined) patch.estimated_cost    = Number(body.estimatedCost) || 0;
  if (body.actualCost       !== undefined) patch.actual_cost       = Number(body.actualCost) || 0;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[cleaning PATCH] Supabase update failed:", err);
    return NextResponse.json({ error: "Update failed", detail: err }, { status: 500 });
  }

  await writeActivityLog({
    actor_email:   body.actorEmail || "unknown",
    actor_name:    body.actorName  || "Staff",
    action:        "updated",
    resource_type: "cleaning",
    resource_name: body.resourceName || id,
    resource_id:   id,
    metadata: { status: body.status },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cleaning_assignments?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE", headers: H,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[cleaning DELETE] Supabase delete failed:", err);
    // Still try to log even if delete had issues
  }

  await writeActivityLog({
    actor_email:   req.nextUrl.searchParams.get("actorEmail") || "unknown",
    actor_name:    req.nextUrl.searchParams.get("actorName")  || "Staff",
    action:        "deleted",
    resource_type: "cleaning",
    resource_name: req.nextUrl.searchParams.get("name")       || id,
    resource_id:   id,
  });

  return NextResponse.json({ success: true });
}
