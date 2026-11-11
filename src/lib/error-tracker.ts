/**
 * Zero-dependency Error Tracker & Alerting (Sentry Envelope + Structured Logs + Email Alerting).
 *
 * - Ships exceptions directly to Sentry's HTTP Envelope endpoint whenever SENTRY_DSN
 *   or NEXT_PUBLIC_SENTRY_DSN is configured (works in Node & Edge without bulky SDK plugins).
 * - Always emits structured JSON logs so Vercel Log Drains / Datadog / Axiom can index them.
 * - Sends rate-limited critical error alert emails to ERROR_ALERT_EMAIL / CONTACT_NOTIFY_TO
 *   so beta issues never go unnoticed even before Sentry is wired up.
 */
import { checkRateLimit } from "@/lib/rateLimit";
import { BRAND } from "@/lib/brand";

function escapeHtml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ErrorContext {
  source?: string;
  route?: string;
  method?: string;
  url?: string;
  orgId?: string | null;
  userEmail?: string | null;
  digest?: string;
  level?: "fatal" | "error" | "warning";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

interface ParsedSentryDsn {
  endpoint: string;
  dsn: string;
  publicKey: string;
  projectId: string;
}

function parseSentryDsn(rawDsn?: string): ParsedSentryDsn | null {
  const dsn = (rawDsn || process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "").trim();
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const parts = u.pathname.split("/").filter(Boolean);
    const projectId = parts[parts.length - 1];
    const pathPrefix = parts.slice(0, -1).join("/");
    if (!publicKey || !projectId) return null;
    const basePath = pathPrefix ? `/${pathPrefix}` : "";
    const endpoint = `${u.protocol}//${u.host}${basePath}/api/${projectId}/envelope/?sentry_key=${encodeURIComponent(publicKey)}&sentry_version=7`;
    return { endpoint, dsn, publicKey, projectId };
  } catch {
    return null;
  }
}

function generateEventId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function parseStackFrames(stack?: string): Array<{ filename: string; function: string; lineno?: number; colno?: number }> {
  if (!stack) return [];
  const lines = stack.split("\n").slice(1, 25);
  const frames: Array<{ filename: string; function: string; lineno?: number; colno?: number }> = [];
  for (const raw of lines) {
    const line = raw.trim();
    const match =
      line.match(/^at\s+(.+?)\s+\((.+):(\d+):(\d+)\)$/) ||
      line.match(/^at\s+(.+):(\d+):(\d+)$/) ||
      line.match(/^([^@]+)@(.+):(\d+):(\d+)$/);
    if (match) {
      if (match.length === 5) {
        frames.push({
          function: match[1] || "<anonymous>",
          filename: match[2],
          lineno: Number(match[3]),
          colno: Number(match[4]),
        });
      } else if (match.length === 4) {
        frames.push({
          function: "<anonymous>",
          filename: match[1],
          lineno: Number(match[2]),
          colno: Number(match[3]),
        });
      }
    }
  }
  // Sentry expects oldest-to-newest frame order
  return frames.reverse();
}

function normalizeError(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      name: err.name || "Error",
      message: err.message || "Unexpected error",
      stack: err.stack,
    };
  }
  if (typeof err === "string") {
    return { name: "Error", message: err };
  }
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    return {
      name: typeof rec.name === "string" ? rec.name : "Error",
      message: typeof rec.message === "string" ? rec.message : JSON.stringify(rec).slice(0, 500),
      stack: typeof rec.stack === "string" ? rec.stack : undefined,
    };
  }
  return { name: "Error", message: String(err ?? "Unknown error") };
}

async function sendToSentry(
  eventId: string,
  normalized: { name: string; message: string; stack?: string },
  ctx: ErrorContext
): Promise<void> {
  const dsnInfo = parseSentryDsn();
  if (!dsnInfo) return;

  const sentAt = new Date().toISOString();
  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sent_at: sentAt,
    dsn: dsnInfo.dsn,
  });

  const frames = parseStackFrames(normalized.stack);
  const eventPayload = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "javascript",
    level: ctx.level || "error",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    server_name: process.env.VERCEL_REGION || "propopsiq",
    transaction: ctx.route || ctx.url || ctx.source || "unknown",
    tags: {
      source: ctx.source || "server",
      ...(ctx.route ? { route: ctx.route } : {}),
      ...(ctx.method ? { method: ctx.method } : {}),
      ...(ctx.orgId ? { org_id: ctx.orgId } : {}),
      ...(ctx.tags || {}),
    },
    extra: {
      ...(ctx.digest ? { digest: ctx.digest } : {}),
      ...(ctx.extra || {}),
    },
    ...(ctx.userEmail || ctx.orgId
      ? {
          user: {
            ...(ctx.userEmail ? { email: ctx.userEmail } : {}),
            ...(ctx.orgId ? { segment: ctx.orgId } : {}),
          },
        }
      : {}),
    ...(ctx.url
      ? {
          request: {
            url: ctx.url,
            method: ctx.method || "GET",
          },
        }
      : {}),
    exception: {
      values: [
        {
          type: normalized.name,
          value: normalized.message,
          ...(frames.length > 0 ? { stacktrace: { frames } } : {}),
        },
      ],
    },
  };

  const itemHeader = JSON.stringify({ type: "event" });
  const body = `${envelopeHeader}\n${itemHeader}\n${JSON.stringify(eventPayload)}\n`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    await fetch(dsnInfo.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  } catch {
    // Never fail caller if Sentry is unreachable
  }
}

async function sendCriticalAlertEmail(
  shortId: string,
  normalized: { name: string; message: string; stack?: string },
  ctx: ErrorContext
): Promise<void> {
  if (ctx.level === "warning") return;
  const alertTo = (process.env.ERROR_ALERT_EMAIL || process.env.CONTACT_NOTIFY_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!alertTo || !resendKey) return;

  // Deduplicate bursts: max 1 email per signature per 15 min, and max 6 total per 15 min
  const sig = `${normalized.name}:${normalized.message.slice(0, 80)}:${ctx.route || ctx.source || ""}`;
  const [sigAllowed, globalAllowed] = await Promise.all([
    checkRateLimit(`err-alert-sig:${sig}`, 1, 15 * 60 * 1000),
    checkRateLimit("err-alert-global", 6, 15 * 60 * 1000),
  ]);
  if (!sigAllowed || !globalAllowed) return;

  const fromAddr =
    process.env.RESEND_FROM_EMAIL?.trim() || `${BRAND.name} Alerts <onboarding@resend.dev>`;
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.55;color:#0f172a">
      <h3 style="margin:0 0 8px;color:#b91c1c">PropOpsIQ Runtime Error (${escapeHtml(shortId)})</h3>
      <p style="margin:0 0 8px">
        <strong>Source:</strong> ${escapeHtml(ctx.source || "server")} ·
        <strong>Route/URL:</strong> ${escapeHtml(ctx.route || ctx.url || "—")} ·
        <strong>Org:</strong> ${escapeHtml(ctx.orgId || "—")} ·
        <strong>User:</strong> ${escapeHtml(ctx.userEmail || "anonymous")}
      </p>
      <p style="margin:0 0 8px"><strong>${escapeHtml(normalized.name)}:</strong> ${escapeHtml(normalized.message)}</p>
      ${
        normalized.stack
          ? `<pre style="background:#f1f5f9;padding:12px;border-radius:8px;overflow-x:auto;font-size:11px">${escapeHtml(
              normalized.stack.slice(0, 2500)
            )}</pre>`
          : ""
      }
    </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [alertTo],
        subject: `[PropOpsIQ Alert · ${shortId}] ${normalized.name}: ${normalized.message.slice(0, 90)}`,
        html,
      }),
    });
  } catch {
    // Never fail caller if Resend is unreachable
  }
}

/**
 * Captures a server-side or forwarded client-side exception, returns a short reference ID (e.g. `err_a1b2c3d4`).
 */
export async function captureServerError(err: unknown, ctx: ErrorContext = {}): Promise<string> {
  const eventId = generateEventId();
  const shortId = `err_${eventId.slice(0, 8)}`;
  const normalized = normalizeError(err);

  console.error(
    JSON.stringify({
      tag: "propopsiq.error",
      errorId: shortId,
      timestamp: new Date().toISOString(),
      level: ctx.level || "error",
      source: ctx.source || "server",
      route: ctx.route,
      method: ctx.method,
      url: ctx.url,
      orgId: ctx.orgId || null,
      userEmail: ctx.userEmail || null,
      digest: ctx.digest,
      name: normalized.name,
      message: normalized.message,
      stack: normalized.stack?.slice(0, 2000),
      extra: ctx.extra,
    })
  );

  await Promise.allSettled([
    sendToSentry(eventId, normalized, ctx),
    sendCriticalAlertEmail(shortId, normalized, ctx),
  ]);

  return shortId;
}
