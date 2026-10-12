import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

type Props = { params: Promise<{ id: string }> };

/** Columns a client is allowed to change on a property. */
const EDITABLE = [
  "name", "type", "address", "city", "sqft", "lease_status", "badge", "badge_color",
  "description", "features", "images", "hero_image", "in_banner", "published",
] as const;

export async function PATCH(req: NextRequest, { params }: Props) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE) if (k in body) patch[k] = body[k];

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
    {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) { const err = await res.text(); return NextResponse.json({ error: err }, { status: 500 }); }
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ property: data[0] });
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const { id } = await params;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
    { method: "DELETE", headers: H }
  );
  if (!res.ok) { const err = await res.text(); return NextResponse.json({ error: err }, { status: 500 }); }
  return NextResponse.json({ success: true });
}
