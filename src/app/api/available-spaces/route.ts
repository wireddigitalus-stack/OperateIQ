import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const HEADERS = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// GET /api/available-spaces — fetch all rows
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/available_spaces?order=created_at.desc`,
    { headers: HEADERS, cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text();
    // Table may not exist yet — return empty gracefully and flag migration
    if (text.includes("does not exist") || text.includes("relation")) {
      return NextResponse.json({ spaces: [], needsMigration: true, sql: MIGRATION_SQL });
    }
    console.error("available-spaces GET error:", text);
    return NextResponse.json({ spaces: [] });
  }
  const spaces = await res.json();
  return NextResponse.json({ spaces }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}

// POST /api/available-spaces — insert/update a space
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, name, monthlyRent, sqft, nnnFee, nnFee, utilityFee } = body;
    if (!propertyId || !name) {
      return NextResponse.json({ error: "propertyId and name required" }, { status: 400 });
    }

    const row = {
      property_id: propertyId,
      name: name.trim(),
      monthly_rent: Number(monthlyRent) || 0,
      sqft: (sqft as string)?.trim() || "",
      nnn_fee: Number(nnnFee) || 0,
      nn_fee: Number(nnFee) || 0,
      utility_fee: Number(utilityFee) || 0,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/available_spaces`, {
      method: "POST",
      headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });

    const text = await res.text();

    if (!res.ok) {
      if (text.includes("does not exist") || text.includes("relation")) {
        return NextResponse.json({ error: "migration_required", sql: MIGRATION_SQL }, { status: 503 });
      }
      console.error("available-spaces POST error:", text);
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("available-spaces POST catch:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// DELETE /api/available-spaces?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/available_spaces?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: HEADERS }
  );

  if (!res.ok) {
    console.error("available-spaces DELETE error:", await res.text());
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

const MIGRATION_SQL = `
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS available_spaces (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  monthly_rent  NUMERIC(10,2) DEFAULT 0,
  sqft          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE available_spaces ENABLE ROW LEVEL SECURITY;

-- Add new fee columns if they don't exist yet
ALTER TABLE available_spaces ADD COLUMN IF NOT EXISTS nnn_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE available_spaces ADD COLUMN IF NOT EXISTS nn_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE available_spaces ADD COLUMN IF NOT EXISTS utility_fee NUMERIC(10,2) DEFAULT 0;
`.trim();
