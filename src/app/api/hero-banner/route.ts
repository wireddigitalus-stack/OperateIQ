import { NextRequest, NextResponse } from "next/server";
import { PROPERTIES } from "@/lib/data";

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

const MAIN_IDS = ["city-centre","bristol-cowork","the-executive","centre-point-suites","foundation-event-facility","warehouse"];

/** Returns { value, tableExists } */
async function getRaw(): Promise<{ value: HeroConfig | null; tableExists: boolean }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.hero_config&select=value`, { headers: H, cache: "no-store" });
  if (!res.ok) {
    // Supabase returns 400/404 with code 42P01 when table doesn't exist
    const body = await res.text().catch(() => "");
    const missing = body.includes("42P01") || body.includes("does not exist") || res.status === 404;
    return { value: null, tableExists: !missing };
  }
  const rows = await res.json();
  return { value: rows[0]?.value || null, tableExists: true };
}

/** Auto-create the site_settings table via Supabase Management API if service role key present */
async function ensureTable() {
  // Try via REST SQL endpoint (available with service role key)
  const sql = `CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());`;
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ sql }),
  }).catch(() => null); // Ignore — not all plans expose this
}

async function getOverrides(): Promise<Record<string, string>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/property_image_overrides`, { headers: H, cache: "no-store" });
  if (!res.ok) return {};
  const data = await res.json();
  const map: Record<string, string> = {};
  if (Array.isArray(data)) data.forEach((r: { property_id: string; image_url: string }) => { map[r.property_id] = r.image_url; });
  return map;
}

function resolve(config: HeroConfig, overrides: Record<string, string>) {
  return config.slides
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order)
    .map(s => {
      if (s.type === "property" && s.propertyId) {
        const p = PROPERTIES.find(p => p.id === s.propertyId);
        if (!p) return null;
        const override = overrides[s.propertyId];
        const imgSrc = (override && override.trim()) ? override : p.image;
        return { src: imgSrc, label: s.label || p.name, location: s.location || `${p.city}, TN` };
      }
      if (s.type === "custom" && s.imageUrl) {
        return { src: s.imageUrl, label: s.label || "Banner", location: s.location || "Bristol, TN" };
      }
      return null;
    })
    .filter(Boolean) as { src: string; label: string; location: string }[];
}

function defaultConfig(): HeroConfig {
  return {
    slides: MAIN_IDS.map((id, i) => {
      const p = PROPERTIES.find(pr => pr.id === id)!;
      return { type: "property", propertyId: id, label: p?.name, location: `${p?.city}, TN`, enabled: true, order: i };
    }),
    videoUrl: null, videoEnabled: false,
  };
}

export async function GET() {
  try {
    const [{ value: raw, tableExists }, overrides] = await Promise.all([getRaw(), getOverrides()]);
    const cfg = raw || defaultConfig();
    return NextResponse.json({
      raw: cfg,
      resolved: resolve(cfg, overrides),
      isDefault: !raw,
      tableExists,
    });
  } catch (e) { console.error(e); return NextResponse.json({ raw: null, resolved: null, tableExists: false }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: HeroConfig = {
      slides: body.slides || [],
      videoUrl: body.videoUrl || null,
      videoEnabled: !!body.videoEnabled,
    };

    // Try to save
    let res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key: "hero_config", value: config, updated_at: new Date().toISOString() }),
    });

    // If table doesn't exist, try auto-creating it then retry once
    if (!res.ok) {
      const errBody = await res.text();
      if (errBody.includes("42P01") || errBody.includes("does not exist")) {
        await ensureTable();
        // Retry
        res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings`, {
          method: "POST",
          headers: { ...H, Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({ key: "hero_config", value: config, updated_at: new Date().toISOString() }),
        });
        if (!res.ok) {
          return NextResponse.json({
            error: "TABLE_MISSING",
            message: "The site_settings table doesn't exist yet. Please run the setup SQL in Supabase, then try saving again.",
          }, { status: 422 });
        }
      } else {
        return NextResponse.json({ error: errBody }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Save failed" }, { status: 500 }); }
}
