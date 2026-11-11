import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parseDateWindow,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 200, maxLimit: 500 });
    const dw = parseDateWindow(req);

    let url = `${SUPABASE_URL}/rest/v1/internal_conversations?org_id=eq.${orgId}&order=created_at.desc`;
    if (dw.from) url += `&created_at=gte.${encodeURIComponent(dw.from)}`;
    if (dw.to) url += `&created_at=lt.${encodeURIComponent(dw.to)}`;

    const res = await fetch(url, {
      headers: { ...HEADERS, Range: pg.rangeHeader, Prefer: "count=exact" },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`internal_conversations GET (${res.status}): ${errText}`),
        "Failed to load team messages.",
        { route: "/api/internal-conversations", orgId }
      );
    }
    const raw = await res.json();
    const rows = Array.isArray(raw) ? raw : [];
    const total = parseContentRangeTotal(res.headers.get("content-range"), rows.length);
    // Return messages in chronological order while ensuring the latest window is fetched
    const messages = [...rows].reverse();

    return NextResponse.json({
      messages,
      pagination: buildPaginationMeta({ limit: pg.limit, offset: pg.offset, total, returnedCount: rows.length }),
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load team messages.", { route: "/api/internal-conversations", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const { message, author_name, author_email } = parsed.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/internal_conversations`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({
        org_id: orgId,
        message: message.trim().slice(0, 4000),
        author_name: (typeof author_name === "string" && author_name.trim()) || user?.name || "",
        author_email: user?.email || (typeof author_email === "string" ? author_email.trim() : ""),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`internal_conversations POST (${res.status}): ${errText}`),
        "Failed to send message.",
        { route: "/api/internal-conversations", orgId }
      );
    }
    const data = await res.json();
    return NextResponse.json({ success: true, message: data[0] });
  } catch (err) {
    return apiErrorResponse(err, "Failed to send message.", { route: "/api/internal-conversations", orgId });
  }
}
