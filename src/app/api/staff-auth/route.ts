import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { encodeStaffSession, readStaffSession, STAFF_COOKIE } from "@/lib/staff-session";
import { maskIp } from "@/lib/security-shield";
import { DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform";

/**
 * POST /api/staff-auth  { pin }   → crew PIN login
 * Issues a signed httpOnly `oiq_staff` session cookie bound to the worker's org.
 * DELETE /api/staff-auth           → crew logout
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`staff-auth:${ip}`, 6, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many failed PIN attempts. Locked by OpsIQ Shield for 10 minutes." },
        { status: 429 }
      );
    }

    const { pin } = await req.json();
    if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "A valid 6-digit PIN is required." }, { status: 400 });
    }

    const { data: users, error } = await supabaseAdmin
      .from("allowed_users")
      .select("id,name,role,org_id")
      .eq("pin", pin)
      .eq("active", true)
      .in("role", ["maintenance", "cleaning"])
      .limit(2);

    if (error) return NextResponse.json({ error: "Auth service unavailable." }, { status: 500 });
    if (!users || users.length === 0) {
      // Constant-time anti-cracker jitter (120–240ms) + audit log entry
      await new Promise((r) => setTimeout(r, 120 + Math.floor(Math.random() * 120)));
      try {
        await supabaseAdmin.from("activity_log").insert({
          org_id: DEFAULT_PLATFORM_ORG_ID,
          actor_email: `crew-pin@${maskIp(ip)}`,
          actor_name: "Failed Crew PIN Attempt",
          action: "admin_blocked",
          resource_type: "session",
          resource_name: "Staff Mobile Portal",
          resource_id: "staff-pin",
          metadata: {
            reason: "Invalid 6-digit crew PIN attempt",
            ip: maskIp(ip),
            device: /mobile|iphone|android/i.test(req.headers.get("user-agent") || "") ? "mobile" : "desktop",
          },
        });
      } catch {
        /* ignore log error */
      }
      return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
    }
    if (users.length > 1) {
      // Legacy duplicate PIN across orgs — refuse rather than guess the company.
      return NextResponse.json({ error: "This PIN must be reset by your manager." }, { status: 409 });
    }

    const user = users[0];
    const { value, maxAge } = encodeStaffSession({
      uid: user.id,
      orgId: user.org_id,
      role: user.role as "maintenance" | "cleaning",
      name: user.name || "",
    });

    const res = NextResponse.json({ success: true, name: user.name, role: user.role, id: user.id });
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
