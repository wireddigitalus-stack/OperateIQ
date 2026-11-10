import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { encodeStaffSession, readStaffSession, STAFF_COOKIE } from "@/lib/staff-session";
import { maskIp } from "@/lib/security-shield";

/**
 * POST /api/staff-auth  { org, pin }   → crew PIN login
 *   `org` is the company code (organization slug). PINs are only unique within
 *   an organization, so the lookup is always scoped to that org — a PIN alone
 *   never identifies a company.
 * Issues a signed httpOnly `oiq_staff` session cookie bound to the worker's org.
 * DELETE /api/staff-auth           → crew logout
 */
const GENERIC_FAIL = "Invalid company code or PIN.";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!(await checkRateLimit(`staff-auth:ip:${ip}`, 8, 10 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait 10 minutes and try again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const orgCode = typeof body.org === "string" ? body.org.trim().toLowerCase() : "";

    if (!orgCode) {
      return NextResponse.json({ error: "Your company code is required. Ask your manager for your portal link." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "A valid 6-digit PIN is required." }, { status: 400 });
    }

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("slug", orgCode)
      .maybeSingle();

    // Per-company throttle too, so distributed guessing against one org is capped.
    if (org && !(await checkRateLimit(`staff-auth:org:${org.id}`, 30, 10 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Too many attempts for this company. Please wait 10 minutes and try again." },
        { status: 429 }
      );
    }

    const { data: users, error } = org
      ? await supabaseAdmin
          .from("allowed_users")
          .select("id,name,role,org_id")
          .eq("org_id", org.id)
          .eq("pin", pin)
          .eq("active", true)
          .in("role", ["maintenance", "cleaning"])
          .limit(2)
      : { data: [], error: null };

    if (error) return NextResponse.json({ error: "Auth service unavailable." }, { status: 500 });

    if (!org || !users || users.length !== 1) {
      await new Promise((r) => setTimeout(r, 150 + Math.floor(Math.random() * 150)));
      if (org) {
        try {
          await supabaseAdmin.from("activity_log").insert({
            org_id: org.id,
            actor_email: `crew-pin@${maskIp(ip)}`,
            actor_name: "Failed Crew PIN Attempt",
            action: "admin_blocked",
            resource_type: "session",
            resource_name: "Staff Mobile Portal",
            resource_id: "staff-pin",
            metadata: {
              reason: "Invalid crew PIN attempt",
              ip: maskIp(ip),
              device: /mobile|iphone|android/i.test(req.headers.get("user-agent") || "") ? "mobile" : "desktop",
            },
          });
        } catch {
          /* ignore log error */
        }
      }
      return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 });
    }

    const user = users[0];
    const { value, maxAge } = encodeStaffSession({
      uid: user.id,
      orgId: user.org_id,
      role: user.role as "maintenance" | "cleaning",
      name: user.name || "",
    });

    const res = NextResponse.json({ success: true, name: user.name, role: user.role, id: user.id, orgName: org.name });
    res.cookies.set(STAFF_COOKIE, value, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

/** GET → is there a valid crew session? */
export async function GET() {
  const s = await readStaffSession();
  return NextResponse.json(s ? { authenticated: true, name: s.name, role: s.role } : { authenticated: false });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(STAFF_COOKIE);
  return res;
}
