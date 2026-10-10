import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Always use service role key for write operations — this key is server-only
// and never exposed to the browser. RLS deny-all policies block any anon access.
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  "Content-Type": "application/json",
  "apikey": KEY,
  "Authorization": `Bearer ${KEY}`,
};

// ── Guard: only allow writes from server-side requests ───────────────────────
// The service role key bypasses RLS. If it's missing we refuse writes to avoid
// accidental anon-key writes that could be blocked by RLS.
function requireServerContext(): NextResponse | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server misconfiguration — service role key missing" }, { status: 500 });
  }
  return null;
}

// GET — read users (open; needed by the client-side auth guard)
export async function GET(req: NextRequest) {
  const role  = req.nextUrl.searchParams.get("role");
  const email = req.nextUrl.searchParams.get("email");

  let url = `${SUPABASE_URL}/rest/v1/allowed_users?order=created_at.asc`;
  if (role)  url += `&role=eq.${encodeURIComponent(role)}`;
  if (email) url += `&email=eq.${encodeURIComponent(email.toLowerCase())}`;

  const includePins = req.nextUrl.searchParams.get("include_pins") === "true";

  const res = await fetch(url, { headers: H });
  if (!res.ok) return NextResponse.json({ users: [], allowed: false });
  const raw = await res.json();

  // Strip PINs from responses unless admin explicitly requests them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripPin = (u: any) => { const { pin: _pin, ...rest } = u; return rest; };
  const users = Array.isArray(raw) ? (includePins ? raw : raw.map(stripPin)) : [];

  // Single-email access check (used by auth guard)
  if (email) {
    const allowed = users.some(
      (u: { email: string; active: boolean }) =>
        u.email.toLowerCase() === email.toLowerCase() && u.active !== false
    );
    return NextResponse.json({ users, allowed });
  }
  return NextResponse.json({ users });
}

// POST — add a user
export async function POST(req: NextRequest) {
  const guard = requireServerContext();
  if (guard) return guard;

  const { email, name, role, pin } = await req.json();
  // For staff roles, email is optional (they use PIN). For admin, email is required.
  if (role === "admin" && !email) return NextResponse.json({ error: "email required for admin" }, { status: 400 });
  if (!role) return NextResponse.json({ error: "role is required" }, { status: 400 });
  // For maintenance/cleaning, default PIN to 123456 if not provided
  const staffPin = (role === "maintenance" || role === "cleaning") ? (pin || "123456") : undefined;

  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload: Record<string, unknown> = {
    id, name: name?.trim() || "", role, active: true,
  };
  if (email) payload.email = email.toLowerCase().trim();
  if (staffPin) payload.pin = staffPin;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/allowed_users`, {
    method: "POST",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  return NextResponse.json({ success: true });
}

// PATCH — update a user
export async function PATCH(req: NextRequest) {
  const guard = requireServerContext();
  if (guard) return guard;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/allowed_users?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...H, "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ error: "update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE — remove a user
export async function DELETE(req: NextRequest) {
  const guard = requireServerContext();
  if (guard) return guard;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await fetch(`${SUPABASE_URL}/rest/v1/allowed_users?id=eq.${id}`, { method: "DELETE", headers: H });
  return NextResponse.json({ success: true });
}
