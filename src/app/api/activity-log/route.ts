import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parseDateWindow,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const H = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 50, maxLimit: 500 });
    const dw = parseDateWindow(req);
    const type = req.nextUrl.searchParams.get("resource_type");

    let url = `${SUPABASE_URL}/rest/v1/activity_log?org_id=eq.${orgId}&order=created_at.desc`;
    if (type) url += `&resource_type=eq.${encodeURIComponent(type)}`;
    if (dw.from) url += `&created_at=gte.${encodeURIComponent(dw.from)}`;
    if (dw.to) url += `&created_at=lt.${encodeURIComponent(dw.to)}`;

    const res = await fetch(url, {
      headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return apiErrorResponse(
        new Error(`activity_log GET (${res.status}): ${text}`),
        "Failed to load activity log.",
        { route: "/api/activity-log", orgId }
      );
    }

    const raw = await res.json();
    const logs = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), logs.length);

    return NextResponse.json(
      {
        logs,
        pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: logs.length }),
      },
      { headers: { "Cache-Control": "no-store, no-cache" } }
    );
  } catch (err) {
    return apiErrorResponse(err, "Failed to load activity log.", { route: "/api/activity-log", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user, staff } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const { actor_email, actor_name, action, resource_type, resource_name, resource_id, metadata } = parsed.body;

  if (!action || !resource_type) {
    return NextResponse.json({ error: "action and resource_type required" }, { status: 400 });
  }

  const fallbackEmail = typeof actor_email === "string" ? actor_email : "unknown";
  const fallbackName = typeof actor_name === "string" ? actor_name : "";
  const email = user?.email || (staff ? `staff:${staff.uid}` : fallbackEmail) || "unknown";
  const name = user?.name || staff?.name || fallbackName || email.split("@")[0] || "Staff";

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_log`, {
      method: "POST",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({
        org_id: orgId,
        actor_email: email,
        actor_name: name,
        action: String(action),
        resource_type: String(resource_type),
        resource_name: resource_name || "",
        resource_id: resource_id || "",
        metadata: metadata && typeof metadata === "object" ? metadata : {},
        created_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`activity_log POST (${res.status}): ${err}`),
        "Failed to write audit log.",
        { route: "/api/activity-log", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to write audit log.", { route: "/api/activity-log", orgId });
  }
}

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
      { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } }
    );

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`activity_log DELETE (${res.status}): ${err}`),
        "Failed to delete audit entry.",
        { route: "/api/activity-log", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete audit entry.", { route: "/api/activity-log", orgId });
  }
}
