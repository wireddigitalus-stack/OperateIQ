import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  "Content-Type": "application/json",
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
};

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("lead_id");
  let url = `${SUPABASE_URL}/rest/v1/call_logs?order=created_at.desc`;
  if (leadId) url += `&lead_id=eq.${encodeURIComponent(leadId)}`;

  const res = await fetch(url, { headers: H });
  if (!res.ok) return NextResponse.json({ logs: [] });
  const logs = await res.json();
  return NextResponse.json({ logs: Array.isArray(logs) ? logs : [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lead_id, lead_name, called_by, notes, outcome, follow_up_date } = body;

  if (!lead_id || !outcome) {
    return NextResponse.json({ error: "lead_id and outcome required" }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({
      lead_id,
      lead_name: lead_name || "",
      called_by: called_by || "Staff",
      notes: notes || "",
      outcome,
      follow_up_date: follow_up_date || null,
    }),
  });

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  const data = await res.json();
  return NextResponse.json({ success: true, log: Array.isArray(data) ? data[0] : data });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await fetch(`${SUPABASE_URL}/rest/v1/call_logs?id=eq.${id}`, { method: "DELETE", headers: H });
  return NextResponse.json({ success: true });
}
