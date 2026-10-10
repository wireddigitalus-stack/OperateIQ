"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Globe, Eye, Clock, Monitor, Smartphone, Tablet,
  MousePointerClick, TrendingUp, RefreshCw, Activity,
  ArrowUpRight, Loader2, ChevronRight, MapPin, Route,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsData {
  period_days: number;
  total_events: number;
  unique_sessions: number;
  event_counts: Record<string, number>;
  daily_views: Record<string, number>;
  top_pages: { path: string; views: number }[];
  device_breakdown: { mobile: number; tablet: number; desktop: number };
}

interface SessionJourney {
  session_id: string;
  first_seen: string;
  last_seen: string;
  total_events: number;
  page_views: number;
  pages_visited: string[];
  total_time_formatted: string;
  max_scroll_pct: number;
  cta_clicks: number;
  property_clicks: number;
  device_type: string;
  utm_source: string | null;
  timeline: { type: string; page: string; time: string; data?: Record<string, unknown>; duration_ms?: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function friendlyPage(path: string): string {
  if (path === "/") return "Home";
  return path
    .replace(/^\//, "")
    .replace(/-/g, " ")
    .replace(/\//g, " › ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function friendlyEvent(type: string): { label: string; color: string; icon: React.ElementType } {
  const map: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    page_view:      { label: "Page View",     color: "#60A5FA", icon: Eye },
    scroll_depth:   { label: "Scroll",        color: "#A78BFA", icon: TrendingUp },
    time_on_page:   { label: "Time on Page",  color: "#4ADE80", icon: Clock },
    cta_click:      { label: "CTA Click",     color: "#FBBF24", icon: MousePointerClick },
    property_click: { label: "Property Click", color: "#F97316", icon: MapPin },
    form_start:     { label: "Form Start",    color: "#F472B6", icon: ArrowUpRight },
    form_submit:    { label: "Form Submit",   color: "#EF4444", icon: ArrowUpRight },
  };
  return map[type] || { label: type, color: "#94A3B8", icon: Activity };
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function TrafficStat({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl p-4 relative overflow-hidden border bg-[rgba(255,255,255,0.025)]"
      style={{ borderColor: `${color}28`, boxShadow: `0 0 22px ${color}12` }}>
      <div className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${color}0C 0%, transparent 62%)` }} />
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-[0.10] pointer-events-none" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between gap-2 mb-2 relative">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}28, ${color}10)`, border: `1px solid ${color}40` }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-black text-white tabular-nums leading-none relative">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1 relative">{sub}</p>}
    </div>
  );
}

// ─── Mini Sparkline (CSS-only bar chart) ─────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-10">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all duration-500"
          style={{ height: `${Math.max(2, (v / max) * 40)}px`, backgroundColor: color, opacity: 0.7 }} />
      ))}
    </div>
  );
}

// ─── Device Donut (CSS ring) ─────────────────────────────────────────────────

function DeviceBreakdown({ data }: { data: { mobile: number; tablet: number; desktop: number } }) {
  const total = data.mobile + data.tablet + data.desktop || 1;
  const items = [
    { label: "Desktop", value: data.desktop, color: "#60A5FA", icon: Monitor },
    { label: "Mobile", value: data.mobile, color: "#4ADE80", icon: Smartphone },
    { label: "Tablet", value: data.tablet, color: "#FBBF24", icon: Tablet },
  ];
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <item.icon size={12} style={{ color: item.color }} className="flex-shrink-0" />
          <span className="text-xs text-gray-400 w-14 flex-shrink-0">{item.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.round((item.value / total) * 100)}%`, backgroundColor: item.color, opacity: 0.75 }} />
          </div>
          <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color: item.color }}>
            {Math.round((item.value / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Session Journey Drawer ──────────────────────────────────────────────────

function SessionDrawer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [journey, setJourney] = useState<SessionJourney | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/analytics/session?sid=${encodeURIComponent(sessionId)}`);
        if (res.ok) setJourney(await res.json());
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#0A0F1A] border-l border-[rgba(255,255,255,0.08)] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0A0F1A]/95 backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)] px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Route size={14} className="text-[#60A5FA]" />
            <p className="text-xs font-black text-white uppercase tracking-widest">Session Journey</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={18} className="animate-spin text-[#60A5FA]" />
          </div>
        ) : !journey ? (
          <p className="text-sm text-gray-600 text-center py-20">No session data found</p>
        ) : (
          <div className="p-5 space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3 text-center">
                <p className="text-lg font-black text-white">{journey.page_views}</p>
                <p className="text-[10px] text-gray-500">Pages</p>
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3 text-center">
                <p className="text-lg font-black text-[#4ADE80]">{journey.total_time_formatted}</p>
                <p className="text-[10px] text-gray-500">Duration</p>
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3 text-center">
                <p className="text-lg font-black text-[#FBBF24]">{journey.max_scroll_pct}%</p>
                <p className="text-[10px] text-gray-500">Max Scroll</p>
              </div>
            </div>

            {/* Pages visited */}
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Pages Visited</p>
              <div className="flex flex-wrap gap-1.5">
                {journey.pages_visited.map(p => (
                  <span key={p} className="text-[11px] px-2 py-1 rounded-lg bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA]">
                    {friendlyPage(p)}
                  </span>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Event Timeline</p>
              <div className="relative pl-4 border-l border-[rgba(255,255,255,0.06)] space-y-3">
                {journey.timeline.slice(0, 50).map((evt, i) => {
                  const info = friendlyEvent(evt.type);
                  return (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2"
                        style={{ borderColor: info.color, backgroundColor: `${info.color}30` }} />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold" style={{ color: info.color }}>{info.label}</span>
                        <span className="text-[10px] text-gray-400">{friendlyPage(evt.page)}</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {new Date(evt.time).toLocaleTimeString()}
                        {evt.duration_ms ? ` · ${Math.round(evt.duration_ms / 1000)}s` : ""}
                        {evt.data?.scroll_pct ? ` · ${evt.data.scroll_pct}% scroll` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

type Period = "7" | "14" | "30" | "90";

export default function SiteTrafficPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30");
  const [drawerSid, setDrawerSid] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/admin?days=${period}`);
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.03)] p-8 flex items-center justify-center gap-3">
        <Loader2 size={16} className="animate-spin text-[#60A5FA]" />
        <span className="text-sm text-gray-500">Loading site traffic…</span>
      </div>
    );
  }

  if (!data || data.total_events === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.03)] p-8 text-center">
        <Globe size={28} className="text-[#60A5FA] opacity-40 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No traffic data yet — analytics will appear once visitors start browsing your site.</p>
      </div>
    );
  }

  const ec = data.event_counts;
  const dailyArr = Object.values(data.daily_views);
  const avgDaily = dailyArr.length > 0 ? Math.round(dailyArr.reduce((a, b) => a + b, 0) / dailyArr.length) : 0;

  return (
    <>
      <div className="rounded-2xl border overflow-hidden bg-[rgba(255,255,255,0.018)]"
        style={{ borderColor: "rgba(96,165,250,0.18)", boxShadow: "0 0 28px rgba(96,165,250,0.07)" }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center shadow-[0_0_14px_rgba(96,165,250,0.3)]">
              <Globe size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest">Site Traffic Intelligence</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {data.unique_sessions.toLocaleString()} unique sessions · {(ec.page_view || 0).toLocaleString()} page views
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-[rgba(255,255,255,0.04)] rounded-xl p-1">
              {(["7", "14", "30", "90"] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    period === p
                      ? "bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white shadow-sm"
                      : "text-gray-500 hover:text-white"
                  }`}>
                  {p}d
                </button>
              ))}
            </div>
            <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-500 hover:text-white transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">

          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <TrafficStat label="Page Views" value={(ec.page_view || 0).toLocaleString()} sub={`~${avgDaily}/day avg`} color="#60A5FA" icon={Eye} />
            <TrafficStat label="Sessions" value={data.unique_sessions.toLocaleString()} sub={`${Number(period)}d window`} color="#4ADE80" icon={Activity} />
            <TrafficStat label="CTA Clicks" value={(ec.cta_click || 0).toLocaleString()} sub="buttons & CTAs" color="#FBBF24" icon={MousePointerClick} />
            <TrafficStat label="Form Submits" value={(ec.form_submit || 0).toLocaleString()} sub="contact + lease-bot" color="#EF4444" icon={ArrowUpRight} />
          </div>

          {/* Daily Views Sparkline */}
          {dailyArr.length > 1 && (
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <TrendingUp size={10} /> Daily Page Views
              </p>
              <Sparkline data={dailyArr} color="#60A5FA" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400 font-medium">{Object.keys(data.daily_views)[0]}</span>
                <span className="text-[10px] text-gray-400 font-medium">{Object.keys(data.daily_views).slice(-1)[0]}</span>
              </div>
            </div>
          )}

          {/* Two-col: Top Pages + Devices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Top Pages */}
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Eye size={10} /> Top Pages
              </p>
              <div className="space-y-2">
                {data.top_pages.slice(0, 8).map((pg, i) => {
                  const maxViews = data.top_pages[0]?.views || 1;
                  return (
                    <div key={pg.path} className="group">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-gray-400 w-4 flex-shrink-0">#{i + 1}</span>
                        <span className="text-xs text-gray-300 truncate flex-1">{friendlyPage(pg.path)}</span>
                        <span className="text-xs font-bold text-[#60A5FA] tabular-nums flex-shrink-0">{pg.views}</span>
                      </div>
                      <div className="h-1 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden ml-6">
                        <div className="h-full rounded-full bg-[#60A5FA] transition-all duration-700"
                          style={{ width: `${Math.round((pg.views / maxViews) * 100)}%`, opacity: 0.6 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Device Breakdown */}
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Monitor size={10} /> Device Breakdown
              </p>
              <DeviceBreakdown data={data.device_breakdown} />

              {/* Scroll depth summary */}
              {(ec.scroll_depth || 0) > 0 && (
                <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Engagement Signals</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Scroll Events</span>
                      <span className="font-bold text-[#A78BFA]">{(ec.scroll_depth || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Property Clicks</span>
                      <span className="font-bold text-[#F97316]">{(ec.property_click || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Form Starts</span>
                      <span className="font-bold text-[#F472B6]">{(ec.form_start || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session Journey Drawer */}
      {drawerSid && <SessionDrawer sessionId={drawerSid} onClose={() => setDrawerSid(null)} />}
    </>
  );
}
