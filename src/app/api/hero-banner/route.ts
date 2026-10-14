import { NextRequest, NextResponse } from "next/server";
import { PROPERTIES } from "@/lib/data";
import { profileForOrg } from "@/lib/org-ai-profile";
import { DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform-org";
import { requireOrg, type OrgSummary } from "@/lib/server-auth";
import { getPublicOrgSlug, resolveOrgIdBySlug } from "@/lib/public-org";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

interface SlideConfig {
  type: "property" | "custom";
  propertyId?: string;
  imageUrl?: string;
  label?: string;
  location?: string;
  enabled: boolean;
  order: number;
}
interface HeroConfig { slides: SlideConfig[]; videoUrl: string | null; videoEnabled: boolean; }

interface DbPropertyRow {
  id: string;
  name?: string;
  city?: string;
  hero_image?: string | null;
  image?: string | null;
  images?: string[] | null;
}

/** Returns { value, tableExists } */
async function getRaw(orgId: string): Promise<{ value: HeroConfig | null; tableExists: boolean }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?org_id=eq.${orgId}&key=eq.hero_config&select=value`, { headers: H, cache: "no-store" });
  if (!res.ok) {
    // Supabase returns 400/404 with code 42P01 when table doesn't exist
    const body = await res.text().catch(() => "");
    const missing = body.includes("42P01") || body.includes("does not exist") || res.status === 404;
    return { value: null, tableExists: !missing };
  }
  const rows = await res.json();
  return { value: rows[0]?.value || null, tableExists: true };
}

async function getOverrides(orgId: string): Promise<Record<string, string>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/property_image_overrides?org_id=eq.${orgId}`, { headers: H, cache: "no-store" });
  if (!res.ok) return {};
  const data = await res.json();
  const map: Record<string, string> = {};
  if (Array.isArray(data)) data.forEach((r: { property_id: string; image_url: string }) => { map[r.property_id] = r.image_url; });
  return map;
}

async function getOrgProperties(orgId: string): Promise<DbPropertyRow[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?org_id=eq.${orgId}&select=*`, { headers: H, cache: "no-store" });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function resolve(
  config: HeroConfig,
  overrides: Record<string, string>,
  orgId: string,
  dbProps: DbPropertyRow[],
  defaultLocation: string
) {
  const isDemo = orgId === DEFAULT_PLATFORM_ORG_ID;
  return config.slides
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order)
    .map(s => {
      if (s.type === "property" && s.propertyId) {
        const dbMatch = dbProps.find(p => String(p.id) === s.propertyId);
        const staticMatch = isDemo ? PROPERTIES.find(p => p.id === s.propertyId) : undefined;
        const p = dbMatch || staticMatch;
        if (!p) return null;
        const override = overrides[s.propertyId];
        const fallbackImg =
          (dbMatch && (dbMatch.hero_image || dbMatch.image || (Array.isArray(dbMatch.images) && dbMatch.images[0]))) ||
          (staticMatch && staticMatch.image) ||
          "";
        const imgSrc = (override && override.trim()) ? override : fallbackImg;
        if (!imgSrc) return null;
        return {
          src: imgSrc,
          label: s.label || p.name || "Property",
          location: s.location || p.city || defaultLocation,
        };
      }
      if (s.type === "custom" && s.imageUrl) {
        return { src: s.imageUrl, label: s.label || "Banner", location: s.location || defaultLocation };
      }
      return null;
    })
    .filter(Boolean) as { src: string; label: string; location: string }[];
}

function defaultConfig(orgId: string, dbProps: DbPropertyRow[], defaultLocation: string): HeroConfig {
  const isDemo = orgId === DEFAULT_PLATFORM_ORG_ID;
  const sourceProps = dbProps.length > 0
    ? dbProps.map(p => ({ id: String(p.id), name: p.name || "Property", city: p.city || defaultLocation }))
    : isDemo
      ? PROPERTIES.map(p => ({ id: p.id, name: p.name, city: p.city }))
      : [];
  return {
    slides: sourceProps.map((p, i) => ({
      type: "property",
      propertyId: p.id,
      label: p.name,
      location: p.city || defaultLocation,
      enabled: true,
      order: i,
    })),
    videoUrl: null,
    videoEnabled: false,
  };
}

/**
 * GET /api/hero-banner
 *  • Public: `?org_slug=<org>` → that org's hero config.
 *  • Authenticated: the caller's org.
 */
export async function GET(req: NextRequest) {
  try {
    let orgId: string | null;
    let callerOrg: OrgSummary | null = null;
    const publicSlug = getPublicOrgSlug(req);
    if (publicSlug) {
      orgId = await resolveOrgIdBySlug(publicSlug);
      if (!orgId) return NextResponse.json({ error: "Unknown organization" }, { status: 404 });
      try {
        const [orgRes, profRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/organizations?id=eq.${orgId}&select=id,name,brand_name`, { headers: H, cache: "no-store" }),
          fetch(`${SUPABASE_URL}/rest/v1/site_settings?org_id=eq.${orgId}&key=eq.org_profile&select=value`, { headers: H, cache: "no-store" }),
        ]);
        const orgRows = orgRes.ok ? await orgRes.json() : [];
        const profRows = profRes.ok ? await profRes.json() : [];
        const orgRow = Array.isArray(orgRows) ? orgRows[0] : null;
        const profVal = (Array.isArray(profRows) && profRows[0]?.value ? profRows[0].value : {}) as Record<string, unknown>;
        if (orgRow) {
          callerOrg = {
            ...orgRow,
            city: typeof profVal.city === "string" ? profVal.city : null,
            state: typeof profVal.state === "string" ? profVal.state : null,
          } as OrgSummary;
        }
      } catch {
        /* ignore */
      }
    } else {
      const g = await requireOrg(req);
      if (!g.ok) return g.res;
      orgId = g.ctx.orgId;
      callerOrg = g.ctx.org;
    }
    const customCity = [callerOrg?.city, callerOrg?.state].filter(Boolean).join(", ").trim();
    const defaultLocation = customCity || (orgId === DEFAULT_PLATFORM_ORG_ID ? profileForOrg(callerOrg).location : "");
    const [{ value: raw, tableExists }, overrides, dbProps] = await Promise.all([
      getRaw(orgId),
      getOverrides(orgId),
      getOrgProperties(orgId),
    ]);
    const cfg = raw || defaultConfig(orgId, dbProps, defaultLocation);
    return NextResponse.json({
      raw: cfg,
      resolved: resolve(cfg, overrides, orgId, dbProps, defaultLocation),
      isDefault: !raw,
      tableExists,
    });
  } catch (e) { console.error(e); return NextResponse.json({ raw: null, resolved: null, tableExists: false }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const body = await req.json();
    const config: HeroConfig = {
      slides: Array.isArray(body.slides) ? body.slides : [],
      videoUrl: body.videoUrl || null,
      videoEnabled: !!body.videoEnabled,
    };

    // Upsert on the (org_id, key) primary key
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?on_conflict=org_id,key`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ org_id: orgId, key: "hero_config", value: config, updated_at: new Date().toISOString() }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      if (errBody.includes("42P01") || errBody.includes("does not exist")) {
        return NextResponse.json({
          error: "TABLE_MISSING",
          message: "The site_settings table doesn't exist yet. Please run the setup SQL in Supabase, then try saving again.",
        }, { status: 422 });
      }
      return NextResponse.json({ error: errBody }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Save failed" }, { status: 500 }); }
}
