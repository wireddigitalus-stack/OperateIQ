import { NextRequest, NextResponse } from "next/server";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";
import { getPlan } from "@/lib/plans";
import { isSampleProperty, SAMPLE_PROP_BADGE } from "@/lib/sample-data";
import { deletePropertyCascade } from "@/lib/property-delete";

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

  // Block setting badge to SAMPLE DEMO to evade plan property limits
  if (
    typeof patch.badge === "string" &&
    patch.badge.trim().toUpperCase() === SAMPLE_PROP_BADGE.toUpperCase()
  ) {
    delete patch.badge;
  }

  // If publishing or converting a sample property into a real property, enforce plan limit
  if (!g.ctx.isSuperAdmin) {
    const curRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}&select=id,badge,published&limit=1`,
      { headers: H, cache: "no-store" }
    );
    const curRows = curRes.ok ? await curRes.json() : [];
    const current = Array.isArray(curRows) ? curRows[0] : null;
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (isSampleProperty(current) && (patch.published === true || ("badge" in patch && patch.badge !== SAMPLE_PROP_BADGE))) {
      const limit = getPlan(g.ctx.org.tier).limits.properties;
      if (limit !== null) {
        const countRes = await fetch(
          `${SUPABASE_URL}/rest/v1/properties?select=id,badge&org_id=eq.${orgId}&limit=1000`,
          { headers: H, cache: "no-store" }
        );
        const existing = countRes.ok ? await countRes.json() : [];
        const realCount = Array.isArray(existing)
          ? existing.filter((p) => !isSampleProperty(p)).length
          : 0;
        if (realCount >= limit) {
          return NextResponse.json(
            {
              error: "You have reached the maximum number of properties for your current plan. Upgrade in Settings → Billing.",
              code: "LIMIT_REACHED",
            },
            { status: 403 }
          );
        }
      }
      if (patch.published === true) {
        return NextResponse.json(
          { error: "Sample demo properties cannot be published to your live website. Add a real property instead." },
          { status: 400 }
        );
      }
    }
  }

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
  const includeTenants = new URL(req.url).searchParams.get("include_tenants") === "1";

  try {
    const result = await deletePropertyCascade(orgId, id, { includeTenants });
    return NextResponse.json({
      success: true,
      propertyName: result.propertyName,
      tenantsDeleted: result.tenantsDeleted,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete property.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
