import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const HEADERS = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// GET /api/lead-comments?lead_id=xxx
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const leadId = req.nextUrl.searchParams.get("lead_id");
  if (!leadId) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/lead_comments?org_id=eq.${orgId}&lead_id=eq.${encodeURIComponent(leadId)}&order=timestamp.asc`,
    { headers: HEADERS }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("lead_comments GET error:", err);
    return NextResponse.json({ comments: [] });
  }

  const comments = await res.json();
  return NextResponse.json({ comments });
}

// POST /api/lead-comments
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const { lead_id, author, body } = await req.json();
    if (!lead_id || !author?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "lead_id, author, and body are required" }, { status: 400 });
    }

    // Make sure the lead belongs to the caller's org before attaching a comment (check leads first, then sales_leads).
    const encodedLeadId = encodeURIComponent(String(lead_id));
    const leadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=id&id=eq.${encodedLeadId}&org_id=eq.${orgId}&limit=1`,
      { headers: HEADERS }
    );
    const leadRows = leadRes.ok ? await leadRes.json() : [];
    let foundLead = Array.isArray(leadRows) && leadRows.length > 0;

    if (!foundLead) {
      const salesLeadRes = await fetch(
        `${SUPABASE_URL}/rest/v1/sales_leads?select=id&id=eq.${encodedLeadId}&org_id=eq.${orgId}&limit=1`,
        { headers: HEADERS }
      );
      const salesLeadRows = salesLeadRes.ok ? await salesLeadRes.json() : [];
      foundLead = Array.isArray(salesLeadRows) && salesLeadRows.length > 0;
    }

    if (!foundLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      org_id: orgId,
      lead_id: String(lead_id),
      author: author.trim(),
      body: body.trim(),
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/lead_comments`, {
      method: "POST",
      headers: { ...HEADERS, "Prefer": "return=representation" },
      body: JSON.stringify(comment),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("lead_comments POST error:", err);
      return NextResponse.json({ error: "Failed to save comment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment });
  } catch (err) {
    console.error("lead-comments error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
