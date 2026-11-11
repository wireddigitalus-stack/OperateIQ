import { NextRequest, NextResponse } from "next/server";
import { requireOrg, sanitizeUpdate, type RequestContext } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parseDateWindow,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

const TODO_COLUMNS = [
  "task",
  "description",
  "assigned_to",
  "due_date",
  "status",
  "priority",
  "is_private",
  "created_by",
] as const;

function pickTodo(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of TODO_COLUMNS) if (k in body) out[k] = body[k];
  return out;
}

function canAccessPrivateTodo(
  row: { is_private?: boolean; created_by?: string | null; assigned_to?: string | null } | null | undefined,
  ctx: RequestContext
): boolean {
  if (!row || !row.is_private) return true;
  if (ctx.role === "owner" || ctx.isSuperAdmin) return true;
  const callerEmail = ctx.user?.email?.trim().toLowerCase() || "";
  const callerName = ctx.user?.name?.trim().toLowerCase() || "";
  const createdBy = String(row.created_by || "").trim().toLowerCase();
  const assignedTo = String(row.assigned_to || "").trim().toLowerCase();
  if (callerEmail && (createdBy === callerEmail || assignedTo === callerEmail)) return true;
  if (callerName && (createdBy === callerName || assignedTo === callerName)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "tasks" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });
    const dw = parseDateWindow(req);

    let url = `${SUPABASE_URL}/rest/v1/todos?org_id=eq.${orgId}&order=created_at.desc`;
    if (dw.from) url += `&created_at=gte.${encodeURIComponent(dw.from)}`;
    if (dw.to) url += `&created_at=lt.${encodeURIComponent(dw.to)}`;

    const res = await fetch(url, {
      headers: {
        ...HEADERS,
        Range: pg.rangeHeader,
        Prefer: "count=exact",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`todos GET (${res.status}): ${errText}`),
        "Failed to load tasks.",
        { route: "/api/todos", orgId }
      );
    }

    const raw = await res.json();
    const rows = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), rows.length);
    const todos = rows.filter((row: { is_private?: boolean; created_by?: string; assigned_to?: string }) =>
      canAccessPrivateTodo(row, g.ctx)
    );

    return NextResponse.json({
      todos,
      pagination: buildPaginationMeta({
        limit: pg.limit,
        offset: pg.offset,
        total,
        returnedCount: rows.length,
      }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load tasks.", { route: "/api/todos", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "tasks" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const todo = pickTodo(parsed.body);

  if (!todo.created_by || String(todo.created_by).trim() === "" || todo.created_by === "Staff") {
    todo.created_by = g.ctx.user?.name || g.ctx.user?.email || "Admin";
  }
  const id = `todo_${crypto.randomUUID()}`;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/todos`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({ ...todo, id, org_id: orgId }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`todos POST (${res.status}): ${errText}`),
        "Failed to create task.",
        { route: "/api/todos", orgId }
      );
    }
    const data = await res.json();
    return NextResponse.json({ success: true, todo: data[0] });
  } catch (err) {
    return apiErrorResponse(err, "Failed to create task.", { route: "/api/todos", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "tasks" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;

  try {
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/todos?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}&select=id,is_private,created_by,assigned_to`,
      { headers: HEADERS, cache: "no-store" }
    );
    const existingRows = existingRes.ok ? await existingRes.json() : [];
    const row = Array.isArray(existingRows) ? existingRows[0] : null;
    if (row && !canAccessPrivateTodo(row, g.ctx)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({ ...pickTodo(sanitizeUpdate(parsed.body)), updated_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`todos PATCH (${res.status}): ${errText}`),
        "Failed to update task.",
        { route: "/api/todos", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update task.", { route: "/api/todos", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "tasks" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/todos?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}&select=id,is_private,created_by,assigned_to`,
      { headers: HEADERS, cache: "no-store" }
    );
    const existingRows = existingRes.ok ? await existingRes.json() : [];
    const row = Array.isArray(existingRows) ? existingRows[0] : null;
    if (row && !canAccessPrivateTodo(row, g.ctx)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "DELETE",
      headers: HEADERS,
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`todos DELETE (${res.status}): ${errText}`),
        "Failed to delete task.",
        { route: "/api/todos", orgId }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete task.", { route: "/api/todos", orgId });
  }
}
