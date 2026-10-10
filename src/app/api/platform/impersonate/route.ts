import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { IMPERSONATE_COOKIE } from "@/lib/platform";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await req.json();
    const cookieStore = await cookies();

    if (!orgId) {
      cookieStore.delete(IMPERSONATE_COOKIE);
      return NextResponse.json({ success: true, impersonatingOrgId: null });
    }

    cookieStore.set(IMPERSONATE_COOKIE, orgId, {
      path: "/",
      httpOnly: false, // Accessible to client-side components to show impersonation banner
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ success: true, impersonatingOrgId: orgId });
  } catch (error) {
    console.error("[platform/impersonate] error:", error);
    return NextResponse.json({ error: "Failed to update impersonation session" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
  return NextResponse.json({ success: true });
}
