import { NextRequest, NextResponse } from "next/server";
import { PROPERTIES } from "@/lib/data";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

/**
 * Lightweight endpoint returning property id/name/city/image for admin pickers.
 * Returns the signed-in org's properties. `?demo=1` returns the static demo
 * portfolio (used only by the public demo experience).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("demo") === "1") {
    const list = PROPERTIES.map(p => ({
      id: p.id,
      name: p.name,
      city: p.city,
      image: p.image,
    }));
    return NextResponse.json(list);
  }

  const g = await requireOrg(req, { allowStaff: true });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?select=id,name,city,hero_image,images&org_id=eq.${orgId}&order=name.asc`,
    { headers: H, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json([]);
  const rows = (await res.json()) as { id: string; name: string; city: string | null; hero_image: string | null; images: unknown }[];
  const list = (Array.isArray(rows) ? rows : []).map(p => ({
    id: p.id,
    name: p.name,
    city: p.city || "",
    image: p.hero_image || (Array.isArray(p.images) && typeof p.images[0] === "string" ? (p.images[0] as string) : ""),
  }));
  return NextResponse.json(list);
}
