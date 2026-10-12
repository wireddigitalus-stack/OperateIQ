import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgAdmin } from "@/lib/server-auth";

/**
 * POST /api/ensure-staff   (org admins only, scoped to their org)
 * Body: { name: string, role: "cleaning" | "maintenance" }
 *
 * Looks up the org's crew member by name+role (case-insensitive).
 *   • If found   → { user (no PIN), isNew: false }
 *   • If missing → creates with a fresh, globally-unique 6-digit PIN → { user, isNew: true, pin }
 */
export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const { name, role } = await req.json();
    if (!name?.trim() || !["cleaning", "maintenance"].includes(role)) {
      return NextResponse.json({ error: "name and a valid role are required" }, { status: 400 });
    }
    const trimmedName = String(name).trim();

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("allowed_users")
      .select("id,name,role,active")
      .eq("org_id", orgId)
      .eq("role", role)
      .ilike("name", trimmedName)
      .limit(1);
    if (lookupErr) return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    if (existing && existing.length) return NextResponse.json({ user: existing[0], isNew: false });

    let pin = "";
    for (let i = 0; i < 20; i++) {
      const candidate = Math.floor(100000 + Math.random() * 900000).toString();
      const { data: clash } = await supabaseAdmin.from("allowed_users").select("id").eq("pin", candidate).eq("active", true).limit(1);
      if (!clash?.length) { pin = candidate; break; }
    }
    if (!pin) return NextResponse.json({ error: "Could not generate a unique PIN" }, { status: 500 });

    const { data: created, error } = await supabaseAdmin
      .from("allowed_users")
      .insert({
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        org_id: orgId,
        name: trimmedName,
        role,
        pin,
        active: true,
      })
      .select("id,name,role,pin")
      .single();
    if (error) {
      console.error("[ensure-staff] Create failed:", error.message);
      return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
    }
    return NextResponse.json({ user: created, isNew: true, pin });
  } catch (err) {
    console.error("[ensure-staff] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
