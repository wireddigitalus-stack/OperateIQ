import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import { getPublicOrgSlug, resolveOrgIdBySlug } from "@/lib/public-org";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  "Content-Type": "application/json",
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

// ── GET — fetch content overrides ────────────────────────────────────────────
//  • Public: `?org_slug=<org>` → that org's overrides (cached 60s).
//  • Authenticated: the caller's org (no cache).
export async function GET(req: NextRequest) {
  try {
    let orgId: string | null = null;
    let isPublic = false;
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

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_content?select=section,key,value&org_id=eq.${orgId}&order=section,key`,
      isPublic ? { headers, next: { revalidate: 60 } } : { headers, cache: "no-store" }
    );
    if (!res.ok) {
      // Table may not exist yet — return empty
      return NextResponse.json({ items: [] });
    }
    const rows = await res.json();
    return NextResponse.json({ items: rows });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

// ── PUT — upsert a content override (admin only) ────────────────────────────
export async function PUT(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const body = await req.json();
    const { section, key, value } = body;

    if (!section || !key) {
      return NextResponse.json({ error: "section and key are required" }, { status: 400 });
    }

    // Upsert using the (org_id, section, key) unique constraint
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_content?on_conflict=org_id,section,key`,
      {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          org_id: orgId,
          section,
          key,
          value: typeof value === "string" ? value : JSON.stringify(value),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[site-content] Upsert failed:", err);
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }

    const saved = await res.json();
    return NextResponse.json({ success: true, item: saved[0] });
  } catch (err) {
    console.error("[site-content] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// ── DELETE — remove a content override (reverts to default) ─────────────────
export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");
    const key = searchParams.get("key");

    if (!section || !key) {
      return NextResponse.json({ error: "section and key are required" }, { status: 400 });
    }

    await fetch(
      `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=eq.${encodeURIComponent(section)}&key=eq.${encodeURIComponent(key)}`,
      { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[site-content] Delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
