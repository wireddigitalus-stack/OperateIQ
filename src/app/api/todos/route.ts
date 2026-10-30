import { NextRequest, NextResponse } from "next/server";
import { requireOrg, sanitizeUpdate, type RequestContext } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

const TODO_COLUMNS = ["task", "description", "assigned_to", "due_date", "status", "priority", "is_private", "created_by"] as const;

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

  const res = await fetch(`${SUPABASE_URL}/rest/v1/todos?org_id=eq.${orgId}&order=created_at.desc`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ todos: [] });
  const raw = await res.json();
  const rows = Array.isArray(raw) ? raw : [];
  const todos = rows.filter((row: { is_private?: boolean; created_by?: string; assigned_to?: string }) =>
    canAccessPrivateTodo(row, g.ctx)
  );
  return NextResponse.json({ todos });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "tasks" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const body = (await req.json()) as Record<string, unknown>;
  const todo = pickTodo(body);
  if (!todo.created_by || String(todo.created_by).trim() === "" || todo.created_by === "Staff") {
    todo.created_by = g.ctx.user?.name || g.ctx.user?.email || "Admin";
  }
  const id = `todo_${crypto.randomUUID()}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/todos`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({ ...todo, id, org_id: orgId }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  const data = await res.json();
  return NextResponse.json({ success: true, todo: data[0] });
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "tasks" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  const body = (await req.json()) as Record<string, unknown>;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

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
    body: JSON.stringify({ ...pickTodo(sanitizeUpdate(body)), updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "tasks" });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

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
  if (!res.ok) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
