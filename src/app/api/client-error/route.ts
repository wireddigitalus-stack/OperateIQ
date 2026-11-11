import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { getRequestContext } from "@/lib/server-auth";
import { captureServerError } from "@/lib/error-tracker";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!(await checkRateLimit(`client-error:${ip}`, 20, 5 * 60 * 1000))) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const name = String(body.name || "ClientError").slice(0, 120);
    const message = String(body.message || "Unhandled client exception").slice(0, 1000);
    const stack = typeof body.stack === "string" ? body.stack.slice(0, 4000) : undefined;
    const digest = typeof body.digest === "string" ? body.digest.slice(0, 120) : undefined;
    const url = typeof body.url === "string" ? body.url.slice(0, 500) : undefined;
    const boundary = typeof body.boundary === "string" ? body.boundary.slice(0, 80) : "error-boundary";

    let orgId: string | null = null;
    let userEmail: string | null = null;
    try {
      const ctx = await getRequestContext(req);
      orgId = ctx?.org?.id || null;
      userEmail = ctx?.user?.email || null;
    } catch {
      /* anonymous visitor crash is still recorded */
    }

    const synthetic = new Error(message);
    synthetic.name = name;
    if (stack) synthetic.stack = stack;

    const errorId = await captureServerError(synthetic, {
      source: `client:${boundary}`,
      url,
      digest,
      orgId,
      userEmail,
      level: boundary === "global-error" ? "fatal" : "error",
      extra: {
        userAgent: req.headers.get("user-agent")?.slice(0, 250) || "",
      },
    });

    return NextResponse.json({ ok: true, errorId });
  } catch (err) {
    console.error("[client-error] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
