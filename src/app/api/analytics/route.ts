// ══════════════════════════════════════════════════════════════════════════════
// POST /api/analytics — Receives internal analytics events from the browser
// Stores in Supabase site_analytics table.
// Fire-and-forget: always returns 204 so it never blocks the user experience.
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Simple in-memory rate limiter per session (max 200 events per minute)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(sessionId);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(sessionId, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count++;
  return entry.count > 200;
}

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimiter.entries()) {
      if (now > val.resetAt) rateLimiter.delete(key);
    }
  }, 5 * 60_000);
}

// ── Validation ───────────────────────────────────────────────────────────────

const VALID_EVENTS = new Set([
  "page_view",
  "scroll_depth",
  "time_on_page",
  "cta_click",
  "property_click",
  "form_start",
  "form_submit",
  "chat_open",
  "phone_click",
  "email_click",
]);

function sanitize(val: unknown, maxLen = 500): string {
  return String(val ?? "").trim().slice(0, maxLen);
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Parse body — handle both JSON and sendBeacon (text/plain)
    let body: Record<string, unknown>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // sendBeacon sends as text/plain
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        return new NextResponse(null, { status: 204 });
      }
    }

    const sessionId = sanitize(body.session_id, 100);
    const eventType = sanitize(body.event_type, 50);

    // Basic validation
    if (!sessionId || !eventType) {
      return new NextResponse(null, { status: 204 });
    }

    // Only accept known event types
    if (!VALID_EVENTS.has(eventType)) {
      return new NextResponse(null, { status: 204 });
    }

    // Rate limit
    if (isRateLimited(sessionId)) {
      return new NextResponse(null, { status: 204 });
    }

    // Build the row
    const row = {
      session_id: sessionId,
      event_type: eventType,
      page_path: sanitize(body.page_path || "/", 300),
      page_title: sanitize(body.page_title, 200) || null,
      referrer: sanitize(body.referrer, 500) || null,
      utm_source: sanitize(body.utm_source, 100) || null,
      utm_medium: sanitize(body.utm_medium, 100) || null,
      utm_campaign: sanitize(body.utm_campaign, 200) || null,
      event_data: typeof body.event_data === "object" ? body.event_data : {},
      duration_ms: Math.max(0, Math.min(Number(body.duration_ms) || 0, 3_600_000)), // Cap at 1hr
      device_type: sanitize(body.device_type, 20) || "desktop",
      screen_width: Math.max(0, Math.min(Number(body.screen_width) || 0, 10000)),
    };

    // Insert into Supabase (fire-and-forget — don't await in production)
    fetch(`${SUPABASE_URL}/rest/v1/site_analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    }).catch((err) => {
      console.warn("[analytics] Supabase insert failed:", err?.message);
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.warn("[analytics] Unexpected error:", err);
    return new NextResponse(null, { status: 204 }); // Never error to client
  }
}
