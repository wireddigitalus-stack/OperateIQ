import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const H = {
  "apikey":        SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type":  "application/json",
};

// GET /api/activity-log?limit=50&resource_type=tenant
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 2000) : 50;
  const type  = req.nextUrl.searchParams.get("resource_type");

  let url = `${SUPABASE_URL}/rest/v1/activity_log?org_id=eq.${orgId}&order=created_at.desc&limit=${limit}`;
  if (type) url += `&resource_type=eq.${encodeURIComponent(type)}`;

  const res = await fetch(url, { headers: H, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    // Surface migration hint if the table doesn't exist yet
    if (text.includes("relation") && text.includes("does not exist")) {
      return NextResponse.json({
        logs: [],
        migrationSql: `
CREATE TABLE IF NOT EXISTS activity_log (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_email   TEXT NOT NULL DEFAULT 'unknown',
  actor_name    TEXT NOT NULL DEFAULT 'Admin',
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_name TEXT DEFAULT '',
  resource_id   TEXT DEFAULT '',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
`.trim(),
      });
    }
    return NextResponse.json({ logs: [] });
  }

  const logs = await res.json();
  return NextResponse.json({ logs }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}

// POST /api/activity-log  — write a single audit entry from the client side
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user, staff } = g.ctx;

  try {
    const body = await req.json();
    const { actor_email, actor_name, action, resource_type, resource_name, resource_id, metadata } = body;

    if (!action || !resource_type) {
      return NextResponse.json({ error: "action and resource_type required" }, { status: 400 });
    }

    // Actor identity comes from the verified session, never from the body.
    const email = user?.email || (staff ? `staff:${staff.uid}` : actor_email) || "unknown";
    const name  = user?.name || staff?.name || actor_name || email.split("@")[0] || "Staff";

    const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_log`, {
      method: "POST",
      headers: { ...H, "Prefer": "return=minimal" },
      body: JSON.stringify({
        org_id:        orgId,
        actor_email:   email,
        actor_name:    name,
        action:        String(action),
        resource_type: String(resource_type),
        resource_name: resource_name || "",
        resource_id:   resource_id   || "",
        metadata:      metadata && typeof metadata === "object" ? metadata : {},
        created_at:    new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[activity-log POST]", err);
      return NextResponse.json({ error: "log write failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[activity-log POST] unexpected:", err);
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}

// DELETE /api/activity-log?id=<uuid>  — remove a single log entry (admins only)
export async function DELETE(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/activity_log?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
      { method: "DELETE", headers: { ...H, "Prefer": "return=minimal" } }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[activity-log DELETE]", err);
      return NextResponse.json({ error: "delete failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[activity-log DELETE] unexpected:", err);
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}
