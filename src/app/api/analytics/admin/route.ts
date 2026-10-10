// ══════════════════════════════════════════════════════════════════════════════
// Vision LLC — Analytics Admin API
// Returns aggregated analytics data for the admin dashboard.
// Queries the session_summary view and raw site_analytics table.
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function supabaseQuery(table: string, params: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    console.warn(`[analytics-admin] Query failed for ${table}:`, await res.text());
    return [];
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Number(searchParams.get("days")) || 30, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Run queries in parallel
    const [
      recentEvents,
      pageViews,
      topPages,
    ] = await Promise.all([
      // 1. Recent events count by type
      supabaseQuery(
        "site_analytics",
        `select=event_type,session_id,device_type&created_at=gte.${since}&order=created_at.desc&limit=10000`
      ),
      // 2. Page views for sparkline (last N days)
      supabaseQuery(
        "site_analytics",
        `select=created_at&event_type=eq.page_view&created_at=gte.${since}&order=created_at.asc&limit=10000`
      ),
      // 3. Top pages
      supabaseQuery(
        "site_analytics",
        `select=page_path&event_type=eq.page_view&created_at=gte.${since}&limit=10000`
      ),
    ]);

    // ── Aggregate event counts ────────────────────────────────────────────────
    const eventCounts: Record<string, number> = {};
    for (const row of recentEvents) {
      eventCounts[row.event_type] = (eventCounts[row.event_type] || 0) + 1;
    }

    // ── Daily page views (for chart) ──────────────────────────────────────────
    const dailyViews: Record<string, number> = {};
    for (const row of pageViews) {
      const day = row.created_at?.split("T")[0];
      if (day) dailyViews[day] = (dailyViews[day] || 0) + 1;
    }

    // ── Top pages by view count ───────────────────────────────────────────────
    const pageCounts: Record<string, number> = {};
    for (const row of topPages) {
      pageCounts[row.page_path] = (pageCounts[row.page_path] || 0) + 1;
    }
    const topPagesRanked = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([path, views]) => ({ path, views }));

    // ── Unique sessions ───────────────────────────────────────────────────────
    const uniqueSessions = new Set(recentEvents.map((r: { session_id?: string }) => r.session_id)).size;

    // ── Device breakdown ──────────────────────────────────────────────────────
    const deviceCounts: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
    const seenDeviceSessions = new Set<string>();
    for (const row of recentEvents) {
      if (row.session_id && !seenDeviceSessions.has(row.session_id)) {
        seenDeviceSessions.add(row.session_id);
        const d = row.device_type || "desktop";
        deviceCounts[d] = (deviceCounts[d] || 0) + 1;
      }
    }

    return NextResponse.json({
      period_days: days,
      total_events: recentEvents.length,
      unique_sessions: uniqueSessions,
      event_counts: eventCounts,
      daily_views: dailyViews,
      top_pages: topPagesRanked,
      device_breakdown: deviceCounts,
    });
  } catch (err) {
    console.error("[analytics-admin] Error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
