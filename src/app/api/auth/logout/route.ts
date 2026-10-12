import { NextResponse } from "next/server";
import { ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE } from "@/lib/platform";
import { STAFF_COOKIE } from "@/lib/staff-session";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server-auth";

/** Clears every OperateIQ session/tenancy cookie (including httpOnly ones). */
export async function POST() {
  const res = NextResponse.json({ success: true });
  for (const name of [ACTIVE_ORG_COOKIE, IMPERSONATE_COOKIE, STAFF_COOKIE, ACCESS_TOKEN_COOKIE]) {
    res.cookies.delete(name);
  }
  return res;
}
