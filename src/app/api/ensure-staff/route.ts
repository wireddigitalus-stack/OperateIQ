import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY         = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = {
  "Content-Type": "application/json",
  "apikey":        KEY,
  "Authorization": `Bearer ${KEY}`,
};

/**
 * POST /api/ensure-staff
 * Body: { name: string, role: "cleaning" | "maintenance" }
 *
 * Looks up allowed_users by name+role (case-insensitive).
 *   • If found  → returns { user, isNew: false }
 *   • If missing → creates with a fresh 6-digit PIN and returns { user, isNew: true, pin }
 *
 * This is called automatically whenever a worker name is saved in the
 * Cleaning or Maintenance job forms so that staff are always provisioned.
 */
export async function POST(req: NextRequest) {
  try {
    if (!KEY) {
      return NextResponse.json({ error: "Server misconfiguration — service role key missing" }, { status: 500 });
    }

    const { name, role } = await req.json();

    if (!name?.trim() || !role) {
      return NextResponse.json({ error: "name and role are required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // 1. Check if this name already exists for this role (case-insensitive)
    const searchUrl = `${SUPABASE_URL}/rest/v1/allowed_users`
      + `?role=eq.${encodeURIComponent(role)}`
      + `&name=ilike.${encodeURIComponent(trimmedName)}`;

    const checkRes = await fetch(searchUrl, { headers: H });
    if (!checkRes.ok) {
      console.error("[ensure-staff] Lookup failed:", await checkRes.text());
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    const existing = await checkRes.json() as Array<{ id: string; name: string; role: string; pin: string; active: boolean }>;

    if (existing.length > 0) {
      // Already exists — return without creating
      return NextResponse.json({ user: existing[0], isNew: false });
    }

    // 2. Generate a random 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Create the staff member
    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/allowed_users`, {
      method: "POST",
      headers: { ...H, "Prefer": "return=representation" },
      body: JSON.stringify({
        name: trimmedName,
        role,
        pin,
        active: true,
        created_at: new Date().toISOString(),
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error("[ensure-staff] Create failed:", err);
      return NextResponse.json({ error: "Failed to create staff member", detail: err }, { status: 500 });
    }

    const [created] = await createRes.json() as Array<{ id: string; name: string; role: string; pin: string }>;

    return NextResponse.json({ user: created, isNew: true, pin });

  } catch (err) {
    console.error("[ensure-staff] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
