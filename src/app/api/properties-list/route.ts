import { NextRequest, NextResponse } from "next/server";
import { PROPERTIES } from "@/lib/data";
import { requireOrg } from "@/lib/server-auth";
import { apiErrorResponse, parseContentRangeTotal, parsePagination } from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("demo") === "1") {
    const list = PROPERTIES.map((p) => ({
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

  try {
    const pg = parsePagination(req, { defaultLimit: 250, maxLimit: 500 });
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?select=id,name,city,hero_image,images&org_id=eq.${orgId}&order=name.asc`,
      {
        headers: { ...H, Range: pg.rangeHeader, Prefer: "count=exact" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`properties-list GET (${res.status}): ${errText}`),
        "Failed to load property list.",
        { route: "/api/properties-list", orgId }
      );
    }
    const rows = (await res.json()) as {
      id: string;
      name: string;
      city: string | null;
      hero_image: string | null;
      images: unknown;
    }[];
    const safeRows = Array.isArray(rows) ? rows : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), safeRows.length);
    const list = safeRows.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city || "",
      image:
        p.hero_image ||
        (Array.isArray(p.images) && typeof p.images[0] === "string" ? (p.images[0] as string) : ""),
    }));

    return NextResponse.json(list, {
      headers: {
        "X-Total-Count": String(total),
        "X-Pagination-Limit": String(pg.limit),
        "X-Pagination-Offset": String(pg.offset),
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load property list.", { route: "/api/properties-list", orgId });
  }
}
