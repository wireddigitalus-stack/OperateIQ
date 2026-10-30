import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrg, requireOrgAdmin } from "@/lib/server-auth";
import { getPlan } from "@/lib/plans";

/**
 * Team & crew management — always scoped to the caller's organization.
 *  GET    any org member / crew session (PINs only for org admins with include_pins=true)
 *  POST   org admins: add an admin (by email) or crew member (PIN)
 *  PATCH  org admins
 *  DELETE org admins
 *
 * Crew PINs are globally unique among active staff, because PIN login has no
 * org selector — a duplicate PIN would sign a worker into the wrong company.
 */

const STAFF_ROLES = ["maintenance", "cleaning"];
const ALLOWED_ROLES = ["admin", "manager", "maintenance", "cleaning"];
const EDITABLE = ["name", "email", "role", "active", "pin"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripPin = (u: any) => { const { pin: _pin, ...rest } = u; return rest; };

async function pinTaken(pin: string, exceptId?: string): Promise<boolean> {
  let q = supabaseAdmin.from("allowed_users").select("id").eq("pin", pin).eq("active", true);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q.limit(1);
  return !!data?.length;
}

import { randomInt } from "crypto";

async function generateUniquePin(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const pin = randomInt(100000, 1000000).toString();
    if (!(await pinTaken(pin))) return pin;
  }
  throw new Error("Could not generate a unique PIN");
}

/** Remove org membership for an admin email (when the admin is removed/deactivated). */
async function revokeMembership(orgId: string, email: string) {
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const u = data?.users?.find((x) => (x.email || "").toLowerCase() === email.toLowerCase());
    if (u) await supabaseAdmin.from("memberships").delete().eq("org_id", orgId).eq("user_id", u.id).neq("role", "owner");
  } catch { /* best effort */ }
}

export async function GET(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true });
  if (!g.ok) return g.res;
  const { orgId, kind, role: callerRole } = g.ctx;

  if (kind === "staff") {
    const roleFilter = req.nextUrl.searchParams.get("role");
    let sq = supabaseAdmin
      .from("allowed_users")
      .select("id,name,role,active")
      .eq("org_id", orgId)
      .in("role", STAFF_ROLES)
      .order("created_at", { ascending: true });
    if (roleFilter && STAFF_ROLES.includes(roleFilter)) {
      sq = sq.eq("role", roleFilter);
    }
    const { data, error } = await sq;
    if (error) return NextResponse.json({ users: [], allowed: false });
    return NextResponse.json({
      users: (data || []).map((u: { id: string; name: string; role: string; active: boolean }) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        active: u.active,
      })),
    });
  }

  const role = req.nextUrl.searchParams.get("role");
  const email = req.nextUrl.searchParams.get("email");
  const wantPins = req.nextUrl.searchParams.get("include_pins") === "true";
  const isAdmin = kind === "user" && ["owner", "admin", "manager", "platform"].includes(callerRole);

  let q = supabaseAdmin.from("allowed_users").select("*").eq("org_id", orgId).order("created_at", { ascending: true });
  if (role === "admin") {
    q = q.in("role", ["owner", "admin", "manager"]);
  } else if (role) {
    q = q.eq("role", role);
  }
  if (email) q = q.eq("email", email.toLowerCase());
  const { data, error } = await q;
  if (error) return NextResponse.json({ users: [], allowed: false });

  const rows = data || [];
  const users = wantPins && isAdmin ? rows : rows.map(stripPin);

  if (email) {
    const allowed = users.some((u: { email: string; active: boolean }) => u.email?.toLowerCase() === email.toLowerCase() && u.active !== false);
    return NextResponse.json({ users, allowed });
  }
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const { email, name, role, pin } = await req.json();
  if (!role || !ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: "valid role is required" }, { status: 400 });
  if ((role === "admin" || role === "manager") && !email) return NextResponse.json({ error: "email required for admin" }, { status: 400 });

  const userLimit = getPlan(g.ctx.org.tier).limits.users;
  if (userLimit !== null && !g.ctx.isSuperAdmin) {
    const { count } = await supabaseAdmin
      .from("allowed_users")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("active", true);
    if ((count ?? 0) >= userLimit) {
      return NextResponse.json(
        {
          error: "You have reached the team member limit for your current plan. Upgrade in Settings → Billing.",
          code: "LIMIT_REACHED",
        },
        { status: 403 }
      );
    }
  }

  const payload: Record<string, unknown> = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: String(name || "").trim(),
    role,
    active: true,
    org_id: orgId,
  };
  if (email) payload.email = String(email).toLowerCase().trim();

  let issuedPin: string | undefined;
  if (STAFF_ROLES.includes(role)) {
    if (pin) {
      if (!/^\d{6}$/.test(String(pin))) return NextResponse.json({ error: "PIN must be 6 digits" }, { status: 400 });
      if (await pinTaken(String(pin))) return NextResponse.json({ error: "That PIN is already in use. Choose another." }, { status: 409 });
      issuedPin = String(pin);
    } else {
      issuedPin = await generateUniquePin();
    }
    payload.pin = issuedPin;
  }

  const { error } = await supabaseAdmin.from("allowed_users").insert(payload);
  if (error) {
    const dup = error.code === "23505";
    return NextResponse.json({ error: dup ? "That user already exists in your organization." : error.message }, { status: dup ? 409 : 500 });
  }
  return NextResponse.json({ success: true, pin: issuedPin });
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  for (const k of EDITABLE) if (body[k] !== undefined) updates[k] = body[k];
  if (updates.role !== undefined && !ALLOWED_ROLES.includes(String(updates.role))) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  if (updates.email) updates.email = String(updates.email).toLowerCase().trim();
  if (updates.pin !== undefined) {
    if (!/^\d{6}$/.test(String(updates.pin))) return NextResponse.json({ error: "PIN must be 6 digits" }, { status: 400 });
    if (await pinTaken(String(updates.pin), id)) return NextResponse.json({ error: "That PIN is already in use. Choose another." }, { status: 409 });
  }

  const { data: before } = await supabaseAdmin.from("allowed_users").select("email,role,pin,active").eq("id", id).eq("org_id", orgId).maybeSingle();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (updates.active === true) {
    const effectivePin = updates.pin !== undefined ? String(updates.pin) : before.pin ? String(before.pin) : null;
    if (effectivePin && (await pinTaken(effectivePin, id))) {
      return NextResponse.json({ error: "That PIN is already in use by another active staff member. Choose another PIN first." }, { status: 409 });
    }
    if (before.active === false) {
      const userLimit = getPlan(g.ctx.org.tier).limits.users;
      if (userLimit !== null && !g.ctx.isSuperAdmin) {
        const { count } = await supabaseAdmin
          .from("allowed_users")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("active", true);
        if ((count ?? 0) >= userLimit) {
          return NextResponse.json(
            {
              error: "You have reached the team member limit for your current plan. Upgrade in Settings → Billing.",
              code: "LIMIT_REACHED",
            },
            { status: 403 }
          );
        }
      }
    }
  }

  const { error } = await supabaseAdmin.from("allowed_users").update(updates).eq("id", id).eq("org_id", orgId);
  if (error) return NextResponse.json({ error: "update failed" }, { status: 500 });

  if (updates.active === false && before.email && ["admin", "manager"].includes(before.role)) {
    await revokeMembership(orgId, before.email);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: row } = await supabaseAdmin.from("allowed_users").select("email,role").eq("id", id).eq("org_id", orgId).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.email && user && row.email.toLowerCase() === user.email) {
    return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
  }

  await supabaseAdmin.from("allowed_users").delete().eq("id", id).eq("org_id", orgId);
  if (row.email && ["admin", "manager"].includes(row.role)) await revokeMembership(orgId, row.email);
  return NextResponse.json({ success: true });
}
