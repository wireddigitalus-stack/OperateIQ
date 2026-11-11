import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import { getPublicOrgSlug, PUBLIC_SITE_SECTIONS, resolveOrgIdBySlug } from "@/lib/public-org";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  "Content-Type": "application/json",
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

export async function GET(req: NextRequest) {
  let orgId: string | null = null;
  let isPublic = false;

  try {
    const publicSlug = getPublicOrgSlug(req);
    if (publicSlug) {
      orgId = await resolveOrgIdBySlug(publicSlug);
      isPublic = true;
      if (!orgId) return NextResponse.json({ items: [] });
    } else {
      const g = await requireOrg(req);
      if (!g.ok) return g.res;
      orgId = g.ctx.orgId;
    }

    const pg = parsePagination(req, { defaultLimit: 500, maxLimit: 1000 });
    const reqHeaders = { ...headers, Range: pg.rangeHeader, Prefer: "count=exact" };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_content?select=section,key,value&org_id=eq.${orgId}&order=section,key`,
      isPublic ? { headers: reqHeaders, next: { revalidate: 60 } } : { headers: reqHeaders, cache: "no-store" }
    );
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`site_content GET (${res.status}): ${errText}`),
        "Failed to load site settings.",
        { route: "/api/site-content", orgId }
      );
    }
    const raw = await res.json();
    const allRows = Array.isArray(raw) ? raw : [];
    const rows = isPublic
      ? allRows.filter((r: { section?: string }) =>
          PUBLIC_SITE_SECTIONS.has(String(r?.section || "").toLowerCase())
        )
      : allRows;
    const total = isPublic
      ? rows.length
      : parseContentRangeTotal(res.headers.get("content-range"), rows.length);

    return NextResponse.json({
      items: rows,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: rows.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load site settings.", { route: "/api/site-content", orgId });
  }
}

export async function PUT(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const { section, key, value } = parsed.body;

  if (!section || !key) {
    return NextResponse.json({ error: "section and key are required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_content?on_conflict=org_id,section,key`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        org_id: orgId,
        section,
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return apiErrorResponse(
        new Error(`site_content PUT (${res.status}): ${err}`),
        "Failed to save content setting.",
        { route: "/api/site-content", orgId }
      );
    }

    const saved = await res.json();
    return NextResponse.json({ success: true, item: saved[0] });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save content setting.", { route: "/api/site-content", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");
  const key = searchParams.get("key");

  if (!section || !key) {
    return NextResponse.json({ error: "section and key are required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=eq.${encodeURIComponent(section)}&key=eq.${encodeURIComponent(key)}`,
      { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } }
    );
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`site_content DELETE (${res.status}): ${errText}`),
        "Failed to reset content setting.",
        { route: "/api/site-content", orgId }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to reset content setting.", { route: "/api/site-content", orgId });
  }
}
