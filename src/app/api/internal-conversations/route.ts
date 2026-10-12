import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

  const res = await fetch(`${SUPABASE_URL}/rest/v1/internal_conversations?org_id=eq.${orgId}&order=created_at.asc`, {
    headers: HEADERS,
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ messages: [] });
  const messages = await res.json();
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  const { message, author_name, author_email } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/internal_conversations`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify({
      org_id: orgId,
      message,
      author_name: author_name || user?.name || "",
      // Email identity comes from the verified session when available.
      author_email: user?.email || author_email || "",
    }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  const data = await res.json();
  return NextResponse.json({ success: true, message: data[0] });
}
