import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const envCheck = validateEnv();

  let dbStatus: "ok" | "unreachable" | "unconfigured" = "unconfigured";
  if (supabaseAdmin && envCheck.ok) {
    try {
      const pingPromise = supabaseAdmin
        .from("organizations")
        .select("id", { head: true, count: "exact" });

      const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ error: { message: "Database health check timed out" } }), 4000)
      );

      const result = await Promise.race([pingPromise, timeoutPromise]);
      dbStatus = result.error ? "unreachable" : "ok";
    } catch {
      dbStatus = "unreachable";
    }
  }

  const healthy = envCheck.ok && dbStatus === "ok";
  const latencyMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      env: envCheck.ok ? "ok" : "missing_required",
      db: dbStatus,
      ...(envCheck.ok
        ? {}
        : {
            missingRequired: envCheck.missingRequired,
            invalidVars: envCheck.invalidVars,
          }),
      integrations: envCheck.configuredIntegrations,
      latencyMs,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "0.1.0",
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
