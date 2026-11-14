import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { validateAndResolveCoupon } from "@/lib/coupons";

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await checkRateLimit(`coupon-validate:${ip}`, 40, 5 * 60 * 1000))) {
    return NextResponse.json({ valid: false, error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  const code = req.nextUrl.searchParams.get("code") || "";
  if (!code.trim()) {
    return NextResponse.json({ valid: false });
  }

  const result = await validateAndResolveCoupon(code);
  if (!result.valid || !result.coupon) {
    return NextResponse.json({ valid: false, error: result.error || "Invalid code." });
  }

  return NextResponse.json({
    valid: true,
    code: result.coupon.code,
    plan: result.coupon.plan,
    trialDays: result.coupon.trialDays,
  });
}
