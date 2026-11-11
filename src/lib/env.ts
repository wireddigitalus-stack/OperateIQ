/**
 * Environment variable validation & capability inventory.
 * Never exposes secret values — safe to inspect from server routes like /api/health.
 */

export interface EnvValidationResult {
  ok: boolean;
  missingRequired: string[];
  invalidVars: string[];
  configuredIntegrations: string[];
  missingOptional: string[];
}

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const OPTIONAL_INTEGRATIONS: Array<{ label: string; vars: string[]; mode?: "all" | "any" }> = [
  { label: "gemini_ai", vars: ["GEMINI_API_KEY"] },
  { label: "resend_email", vars: ["RESEND_API_KEY"] },
  { label: "stripe_billing", vars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"], mode: "all" },
  { label: "sentry_error_tracking", vars: ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"], mode: "any" },
  { label: "turnstile_bot_shield", vars: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"], mode: "all" },
  { label: "upstash_redis_ratelimit", vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"], mode: "all" },
];

let hasLoggedBootCheck = false;

export function validateEnv(opts?: { logOnce?: boolean; throwOnMissing?: boolean }): EnvValidationResult {
  const missingRequired: string[] = [];
  const invalidVars: string[] = [];

  for (const key of REQUIRED_VARS) {
    const val = (process.env[key] || "").trim();
    if (!val) {
      missingRequired.push(key);
    }
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        invalidVars.push("NEXT_PUBLIC_SUPABASE_URL");
      }
    } catch {
      invalidVars.push("NEXT_PUBLIC_SUPABASE_URL");
    }
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (siteUrl) {
    try {
      new URL(siteUrl);
    } catch {
      invalidVars.push("NEXT_PUBLIC_SITE_URL");
    }
  }

  const configuredIntegrations: string[] = [];
  const missingOptional: string[] = [];

  for (const item of OPTIONAL_INTEGRATIONS) {
    const mode = item.mode || "all";
    const present =
      mode === "any"
        ? item.vars.some((v) => Boolean((process.env[v] || "").trim()))
        : item.vars.every((v) => Boolean((process.env[v] || "").trim()));
    if (present) {
      configuredIntegrations.push(item.label);
    } else {
      missingOptional.push(item.label);
    }
  }

  const ok = missingRequired.length === 0 && invalidVars.length === 0;

  if (opts?.logOnce && !hasLoggedBootCheck) {
    hasLoggedBootCheck = true;
    if (!ok) {
      console.error(
        "[env] CRITICAL configuration gaps detected:",
        JSON.stringify({ missingRequired, invalidVars })
      );
    } else {
      console.info(
        "[env] PropOpsIQ environment verified:",
        JSON.stringify({ configuredIntegrations, missingOptional })
      );
    }
  }

  if (!ok && opts?.throwOnMissing) {
    throw new Error(
      `Missing or invalid required environment variables: ${[...missingRequired, ...invalidVars].join(", ")}`
    );
  }

  return {
    ok,
    missingRequired,
    invalidVars,
    configuredIntegrations,
    missingOptional,
  };
}
