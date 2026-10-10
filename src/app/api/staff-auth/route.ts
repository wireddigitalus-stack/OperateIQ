import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  "Content-Type": "application/json",
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
};

// POST — authenticate staff by 6-digit PIN
export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "A valid 6-digit PIN is required." }, { status: 400 });
    }

    // Look up active user with this PIN (maintenance or cleaning only)
    const url = `${SUPABASE_URL}/rest/v1/allowed_users?pin=eq.${encodeURIComponent(pin)}&active=eq.true&role=in.(maintenance,cleaning)&select=id,name,role`;
    const res = await fetch(url, { headers: H });

    if (!res.ok) {
      return NextResponse.json({ error: "Auth service unavailable." }, { status: 500 });
    }

    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
    }

    const user = users[0];
    return NextResponse.json({
      success: true,
      name: user.name,
      role: user.role,
      id: user.id,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
