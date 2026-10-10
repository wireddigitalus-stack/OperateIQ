// ══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/session?sid=xxx — Returns the full journey for a session
// Used in the admin panel to show "This lead browsed X pages over Y minutes"
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  if (!sid) {
    return NextResponse.json({ error: "sid parameter required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_analytics?session_id=eq.${encodeURIComponent(sid)}&order=created_at.asc&limit=500`,
      {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const events = await res.json();

    // Compute summary
    const pageViews = events.filter((e: { event_type: string }) => e.event_type === "page_view");
    const timeEvents = events.filter((e: { event_type: string }) => e.event_type === "time_on_page");
    const ctaClicks = events.filter((e: { event_type: string }) => e.event_type === "cta_click");
    const propertyClicks = events.filter((e: { event_type: string }) => e.event_type === "property_click");

    const totalTimeMs = timeEvents.reduce((sum: number, e: { duration_ms?: number }) => sum + (e.duration_ms || 0), 0);
    const maxScroll = Math.max(0, ...events.map((e: { event_data?: { scroll_pct?: number } }) => e.event_data?.scroll_pct || 0));
    const pagesVisited = [...new Set(pageViews.map((e: { page_path: string }) => e.page_path))];

    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    return NextResponse.json({
      session_id: sid,
      first_seen: firstEvent?.created_at || null,
      last_seen: lastEvent?.created_at || null,
      total_events: events.length,
      page_views: pageViews.length,
      pages_visited: pagesVisited,
      total_time_ms: totalTimeMs,
      total_time_formatted: formatDuration(totalTimeMs),
      max_scroll_pct: maxScroll,
      cta_clicks: ctaClicks.length,
      property_clicks: propertyClicks.length,
      referrer: firstEvent?.referrer || null,
      utm_source: firstEvent?.utm_source || null,
      utm_medium: firstEvent?.utm_medium || null,
      utm_campaign: firstEvent?.utm_campaign || null,
      device_type: firstEvent?.device_type || null,
      // Full timeline for drill-down
      timeline: events.map((e: { event_type: string; page_path: string; created_at: string; event_data?: Record<string, unknown>; duration_ms?: number }) => ({
        type: e.event_type,
        page: e.page_path,
        time: e.created_at,
        data: e.event_data,
        duration_ms: e.duration_ms,
      })),
    });
  } catch (err) {
    console.error("[session-lookup] Error:", err);
    return NextResponse.json({ error: "Failed to lookup session" }, { status: 500 });
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
