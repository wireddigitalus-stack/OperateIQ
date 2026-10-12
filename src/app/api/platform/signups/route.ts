import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        signups: [
          {
            id: "sample_signup_1",
            submitted_at: new Date().toISOString(),
            name: "Sarah Jenkins",
            email: "sarah@blueridgeproperties.com",
            company: "Blue Ridge Properties LLC",
            phone: "(423) 555-0144",
            interest: "14-Day Free Trial (PRO)",
            city: "Commercial & Residential",
            message: "Trial Signup Intake:\n- Plan: pro\n- Units: 25 - 50 Units\n- Portfolio: Commercial & Mixed-Use",
            org_id: null,
          },
        ],
      });
    }

    const { data: signups, error } = await supabaseAdmin
      .from("contact_submissions")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("[platform/signups] contact_submissions fetch warning:", error.message);
      return NextResponse.json({ signups: [] });
    }

    return NextResponse.json({ signups: signups || [] });
  } catch (error) {
    console.error("[platform/signups] error:", error);
    return NextResponse.json({ error: "Failed to load platform signups" }, { status: 500 });
  }
}
