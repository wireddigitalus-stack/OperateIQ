"use client";
import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  TrendingUp, DollarSign, Users, Building2, Target,
  BarChart3, PieChart, Zap, RefreshCw, AlertTriangle,
  ChevronUp, ChevronDown, Flame, ArrowUpRight, Sparkles, Loader2, Copy, CheckCircle2,
  Cpu, FileText,
} from "lucide-react";
import type { Tenant } from "./TenantsTab";
import SiteTrafficPanel from "./SiteTrafficPanel";
import ReportsTab from "./ReportsTab";
import SalesLeadsBoard from "./SalesLeadsBoard";
import WeeklyReportTab from "./WeeklyReportTab";
import { Calendar } from "lucide-react";

const SystemArchitectureMap = lazy(() => import("./SystemArchitectureMap"));

function ArchitectureSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden bg-[rgba(255,255,255,0.018)]"
      style={{ borderColor: "rgba(167,139,250,0.18)", boxShadow: "0 0 28px rgba(167,139,250,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center shadow-[0_0_14px_rgba(167,139,250,0.3)]">
            <Cpu size={14} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-white uppercase tracking-widest">System Architecture</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Interactive data flow map — how everything connects</p>
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}>
          <ChevronDown size={13} className="text-[#A78BFA]" />
        </div>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1">
          <Suspense fallback={
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 size={16} className="animate-spin text-[#A78BFA]" />
              <span className="text-sm text-gray-500">Loading architecture map…</span>
            </div>
          }>
            <SystemArchitectureMap />
          </Suspense>
        </div>
      )}
    </div>
  );
}

function QBRSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden bg-[rgba(255,255,255,0.018)]"
      style={{ borderColor: "rgba(59,130,246,0.18)", boxShadow: "0 0 28px rgba(59,130,246,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-[0_0_14px_rgba(59,130,246,0.3)]">
            <FileText size={14} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-white uppercase tracking-widest">Quarterly Business Review (QBR)</p>
            <p className="text-[11px] text-gray-500 mt-0.5">AI-generated operations summary, milestones, and strategic action plan</p>
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <ChevronDown size={13} className="text-[#3B82F6]" />
        </div>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1">
          <ReportsTab showHeader={false} />
        </div>
      )}
    </div>
  );
}

function SalesLeadsSection({ currentUserName }: { currentUserName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden bg-[rgba(255,255,255,0.018)]"
      style={{ borderColor: "rgba(250,204,21,0.18)", boxShadow: "0 0 28px rgba(250,204,21,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center shadow-[0_0_14px_rgba(250,204,21,0.3)]">
            <TrendingUp size={14} className="text-black" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-white uppercase tracking-widest">Acquisitions & Sales Board</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Buildings for sale list, buyer interest POCs, and deal progress</p>
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.25)" }}>
          <ChevronDown size={13} className="text-[#FACC15]" />
        </div>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1">
          <SalesLeadsBoard currentUserName={currentUserName} />
        </div>
      )}
    </div>
  );
}

function WeeklyReportSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden bg-[rgba(255,255,255,0.018)]"
      style={{ borderColor: "rgba(34,211,238,0.18)", boxShadow: "0 0 28px rgba(34,211,238,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#22D3EE] to-[#0891B2] flex items-center justify-center shadow-[0_0_14px_rgba(34,211,238,0.3)]">
            <Calendar size={14} className="text-black" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-white uppercase tracking-widest">Weekly Performance Board</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Leasing telemetry, conversion sources, occupancy status, and buyer counts</p>
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.25)" }}>
          <ChevronDown size={13} className="text-[#22D3EE]" />
        </div>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1">
          <WeeklyReportTab />
        </div>
      )}
    </div>
  );
}

// Minimal lead shape needed for analytics
export interface AnalyticsLead {
  timestamp: string;
  scoreLabel: string;
  isWhale: boolean;
  budget: string;
  score: number;
  source: string;
  spaceType: string;
}

/** Parse freeform budget text into a number for analytics math */
function parseBudget(val: string | number | undefined | null): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const s = val.replace(/[$,]/g, "").trim();
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) return Math.round((parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2);
  const numMatch = s.match(/^(\d+(?:\.\d+)?)\+?$/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number, compact = false): string {
  if (compact && n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (compact && n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 100);
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Space type normalisation & colours ──────────────────────────────────────

const SPACE_PALETTE: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  "Office":    { color: "#60A5FA", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.35)",  emoji: "🏢" },
  "CoWork":    { color: "#A78BFA", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)", emoji: "💻" },
  "Retail":    { color: "#FBBF24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.35)",  emoji: "🏪" },
  "Warehouse": { color: "#F97316", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.35)",  emoji: "🏭" },
  "Event":     { color: "#F472B6", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.35)", emoji: "🎭" },
  "Mixed-Use": { color: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.35)",  emoji: "🏬" },
  "Other":     { color: "#94A3B8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", emoji: "📦" },
};

function normalizeSpaceType(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("cowork") || s.includes("desk") || s.includes("membership") || s.includes("shared")) return "CoWork";
  if (s.includes("retail") || s.includes("storefront") || s.includes("shop") || s.includes("store")) return "Retail";
  if (s.includes("warehouse") || s.includes("industrial") || s.includes("storage") || s.includes("dock")) return "Warehouse";
  if (s.includes("event") || s.includes("venue") || s.includes("hall")) return "Event";
  if (s.includes("mixed") || s.includes("multi") || s.includes("flex")) return "Mixed-Use";
  if (s.includes("office") || s.includes("suite") || s.includes("executive") || s.includes("private") || s.includes("professional")) return "Office";
  return "Other";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "#4ADE80", icon: Icon }:
  { label: string; value: string; sub?: string; color?: string; icon: React.ElementType }) {
  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden border bg-[rgba(255,255,255,0.025)]"
      style={{ borderColor: `${color}28`, boxShadow: `0 0 22px ${color}12` }}
    >
      {/* Ambient radial warmth — top-left origin, like ambient light behind frosted glass */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${color}0C 0%, transparent 62%)` }} />
      {/* Corner accent glow (existing) */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-[0.10] pointer-events-none" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between gap-2 mb-2 relative">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${color}28, ${color}10)`,
            border: `1px solid ${color}40`,
            boxShadow: `0 0 10px ${color}18`,
          }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none relative">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1 relative">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  const width = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-300 truncate max-w-[60%]">{label}</span>
        <div className="text-right">
          <span className="text-xs font-bold tabular-nums" style={{ color }}>{fmtMoney(value, true)}</span>
          {sub && <span className="text-[10px] text-gray-400 ml-1">{sub}</span>}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Lead Health & Market Demand Dashboard ────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "1yr" | "all";
const PERIOD_MS: Record<Period, number> = {
  "7d":  7  * 86400000,
  "30d": 30 * 86400000,
  "90d": 90 * 86400000,
  "1yr": 365 * 86400000,
  "all": Infinity,
};

function LeadHealthDashboard({ leads }: { leads: AnalyticsLead[] }) {
  const [period, setPeriod] = useState<Period>("90d");
  const now = Date.now();

  // Filter by period
  const filtered = period === "all"
    ? leads
    : leads.filter(l => now - new Date(l.timestamp).getTime() <= PERIOD_MS[period]);

  // ── Space-type demand ──────────────────────────────────────────────────────
  const byType: Record<string, { count: number; budget: number; scores: number[]; raw: string[] }> = {};
  filtered.forEach(l => {
    const key = normalizeSpaceType(l.spaceType);
    if (!byType[key]) byType[key] = { count: 0, budget: 0, scores: [], raw: [] };
    byType[key].count++;
    byType[key].budget += parseBudget(l.budget);
    byType[key].scores.push(l.score);
    byType[key].raw.push(l.spaceType);
  });
  const typeList = Object.entries(byType)
    .sort((a, b) => b[1].count - a[1].count);
  const maxCount = Math.max(...typeList.map(([, v]) => v.count), 1);
  const totalLeads = filtered.length || 1;

  // ── Lead age health buckets ────────────────────────────────────────────────
  const buckets = [
    { label: "New",     days: [0,7],   color: "#4ADE80", emoji: "✅" },
    { label: "Fresh",   days: [7,30],  color: "#A3E635", emoji: "🌿" },
    { label: "Aging",   days: [30,60], color: "#FACC15", emoji: "⚡" },
    { label: "Warm",    days: [60,90], color: "#F97316", emoji: "🔥" },
    { label: "Cold",    days: [90,999],color: "#60A5FA", emoji: "❄️" },
  ];
  const ageCounts = buckets.map(b => ({
    ...b,
    count: leads.filter(l => {
      const d = (now - new Date(l.timestamp).getTime()) / 86400000;
      return d >= b.days[0] && d < b.days[1];
    }).length,
  }));
  const maxAge = Math.max(...ageCounts.map(b => b.count), 1);

  // ── 6-Month trend ─────────────────────────────────────────────────────────
  const trendMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (5 - i));
    return { label: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), month: d.getMonth() };
  });
  const topTypes = typeList.slice(0, 4).map(([t]) => t);
  const trendData = trendMonths.map(({ month, year }) => {
    const monthLeads = leads.filter(l => {
      const d = new Date(l.timestamp);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const byT: Record<string, number> = {};
    monthLeads.forEach(l => {
      const k = normalizeSpaceType(l.spaceType);
      byT[k] = (byT[k] || 0) + 1;
    });
    return { month, year, total: monthLeads.length, byType: byT };
  });
  const trendMax = Math.max(...trendData.map(m => m.total), 1);

  return (
    <div className="rounded-2xl border overflow-hidden mb-6 bg-[rgba(255,255,255,0.018)]"
      style={{ borderColor: "rgba(251,191,36,0.18)", boxShadow: "0 0 28px rgba(251,191,36,0.07)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FBBF24] to-[#F97316] flex items-center justify-center shadow-[0_0_14px_rgba(251,191,36,0.3)]">
            <BarChart3 size={14} className="text-black" />
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest">Market Demand Intelligence</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{filtered.length} leads captured · what the market is asking for</p>
          </div>
        </div>
        {/* Period filter */}
        <div className="flex flex-wrap gap-1 bg-[rgba(255,255,255,0.04)] rounded-xl p-1 self-start sm:self-auto">
          {(["7d","30d","90d","1yr","all"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all capitalize ${
                period === p
                  ? "bg-gradient-to-r from-[#FBBF24] to-[#F97316] text-black shadow-sm"
                  : "text-gray-500 hover:text-white"
              }`}>
              {p === "all" ? "All Time" : p}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-6">

        {/* ── Space Type Demand Bars ─────────────────────────────────── */}
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-600 italic text-center py-8">No lead data for this period yet</p>
        ) : (
          <>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <PieChart size={10} /> Space Type Demand Breakdown
              </p>
              <div className="space-y-3">
                {typeList.map(([type, data], i) => {
                  const palette = SPACE_PALETTE[type] || SPACE_PALETTE["Other"];
                  const sharePct = Math.round((data.count / totalLeads) * 100);
                  const barPct   = Math.round((data.count / maxCount) * 100);
                  const avgScore = data.scores.length ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0;
                  const avgBudget = data.count ? Math.round(data.budget / data.count) : 0;
                  return (
                    <div key={type} className="group">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-sm">{palette.emoji}</span>
                        {/* Rank */}
                        <span className="text-[10px] font-black text-gray-400 w-4 text-center flex-shrink-0">#{i+1}</span>
                        <span className="text-sm font-bold text-white flex-shrink-0">{type}</span>
                        <span className="text-[11px] font-black ml-auto flex-shrink-0" style={{ color: palette.color }}>{sharePct}%</span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">{data.count} lead{data.count !== 1 ? "s" : ""}</span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0 hidden sm:block">Avg ${avgBudget.toLocaleString()}/mo</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-lg font-bold flex-shrink-0 hidden sm:block"
                          style={{ color: palette.color, backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
                          Score {avgScore}
                        </span>
                      </div>
                      {/* Bar */}
                      <div className="h-2.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                          style={{ width: `${barPct}%`, backgroundColor: palette.color }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-20" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Lead Age Health ──────────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap size={10} /> Lead Age Health — All Captured Leads
              </p>
              {/* Segmented health bar */}
              <div className="flex h-4 rounded-full overflow-hidden gap-px mb-3">
                {ageCounts.map(b => (
                  <div key={b.label} title={`${b.label}: ${b.count} leads`}
                    style={{ flex: b.count || 0.1, backgroundColor: b.color, opacity: b.count > 0 ? 0.85 : 0.1 }}
                    className="transition-all duration-700" />
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {ageCounts.map(b => (
                  <div key={b.label} className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                      <span className="text-gray-500">{b.emoji} {b.label}</span>
                    </div>
                    <span className="font-black" style={{ color: b.color }}>{b.count}</span>
                    <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden w-12">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((b.count / maxAge) * 100)}%`, backgroundColor: b.color, opacity: 0.6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 6-Month Trend ────────────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <TrendingUp size={10} /> 6-Month Demand Trend
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {trendData.map(({ month, year, total, byType: bt }) => (
                  <div key={`${month}-${year}`} className="flex flex-col items-center gap-1.5 group relative">
                    {/* Hover tooltip card */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 w-36 bg-[#0A0F1A] border border-[rgba(255,255,255,0.12)] rounded-xl p-3 shadow-2xl pointer-events-none">
                      <p className="text-[11px] font-black text-white mb-1.5">{MONTH_NAMES[month]} {year}</p>
                      <p className="text-[11px] text-gray-300 mb-2">{total} total lead{total !== 1 ? "s" : ""}</p>
                      <div className="space-y-1">
                        {topTypes.map(t => {
                          const count = bt[t] || 0;
                          if (count === 0) return null;
                          const p = SPACE_PALETTE[t] || SPACE_PALETTE["Other"];
                          return (
                            <div key={t} className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: p.color }} />
                                {t}
                              </span>
                              <span className="text-[10px] font-bold" style={{ color: p.color }}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Stacked bar */}
                    <div className="w-full flex flex-col-reverse rounded-lg overflow-hidden h-16 bg-[rgba(255,255,255,0.04)] cursor-pointer group-hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                      {topTypes.map(t => {
                        const count = bt[t] || 0;
                        const h = total > 0 ? Math.max(count > 0 ? 4 : 0, Math.round((count / trendMax) * 64)) : 0;
                        const p = SPACE_PALETTE[t] || SPACE_PALETTE["Other"];
                        return (
                          <div key={t} style={{ height: h, backgroundColor: p.color, opacity: 0.8 }}
                            className="flex-shrink-0 transition-all duration-700" />
                        );
                      })}
                    </div>
                    {/* Total count */}
                    <span className="text-[10px] font-bold text-white">{total}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{MONTH_NAMES[month]}</span>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3">
                {topTypes.map(t => {
                  const p = SPACE_PALETTE[t] || SPACE_PALETTE["Other"];
                  return (
                    <div key={t} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
                      {p.emoji} {t}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 12-Month Revenue Forecast ───────────────────────────────────────────────

function RevenueForecast({ tenants }: { tenants: Tenant[] }) {
  const activeTenants = tenants.filter(t => t.status === "active");
  const now = new Date();

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { label: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), date: d };
  });

  // For each month, calculate expected MRR
  const monthlyRevenue = months.map(({ date }) => {
    let mrr = 0;
    activeTenants.forEach(t => {
      // Skip if lease has ended before this month
      if (t.leaseEnd) {
        const end = new Date(t.leaseEnd);
        if (end < date) return;
      }
      // Apply escalation if it falls on/before this month
      let rent = t.monthlyRent;
      if (t.escalationDate && t.escalationPct > 0) {
        const escDate = new Date(t.escalationDate);
        if (escDate <= date) {
          rent = rent * (1 + t.escalationPct / 100);
        }
      }
      mrr += rent;
    });
    return Math.round(mrr);
  });

  const maxMRR = Math.max(...monthlyRevenue, 1);
  const baselineMRR = monthlyRevenue[0];
  const finalMRR = monthlyRevenue[monthlyRevenue.length - 1];
  const growth = baselineMRR > 0 ? ((finalMRR - baselineMRR) / baselineMRR) * 100 : 0;

  // Detect months with lease expirations or escalations
  const eventMonths = new Set<number>();
  activeTenants.forEach(t => {
    if (t.leaseEnd) {
      const d = new Date(t.leaseEnd);
      months.forEach((m, i) => {
        if (d.getFullYear() === m.year && d.getMonth() === m.month) eventMonths.add(i);
      });
    }
    if (t.escalationDate) {
      const d = new Date(t.escalationDate);
      months.forEach((m, i) => {
        if (d.getFullYear() === m.year && d.getMonth() === m.month) eventMonths.add(i);
      });
    }
  });

  return (
    <div className="rounded-2xl p-4 sm:p-5 mb-6 border bg-[rgba(255,255,255,0.02)]"
      style={{ borderColor: "rgba(74,222,128,0.18)", boxShadow: "0 0 28px rgba(74,222,128,0.07)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-[#4ADE80]" />
          <p className="text-xs font-black text-white uppercase tracking-widest">12-Month Revenue Forecast</p>
        </div>
        {growth !== 0 && (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${growth > 0 ? "text-[#4ADE80] bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)]" : "text-red-400 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)]"}`}>
            {growth > 0 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {Math.abs(growth).toFixed(1)}% over 12mo
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mb-4">Projections include scheduled rent escalations and lease expirations</p>

      {activeTenants.length === 0 ? (
        <p className="text-sm text-gray-600 italic text-center py-6">Add tenants to see revenue forecast</p>
      ) : (
        <>
          {/* Bar chart */}
          <div className="flex items-end gap-1 h-24 mb-2">
            {monthlyRevenue.map((mrr, i) => {
              const h = maxMRR === 0 ? 0 : Math.max(4, Math.round((mrr / maxMRR) * 96));
              const hasEvent = eventMonths.has(i);
              const isDropping = i > 0 && mrr < monthlyRevenue[i - 1];
              const color = isDropping ? "#F97316" : "#4ADE80";
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap bg-[#0A0F1A] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1 text-[10px] text-white shadow-xl">
                    {months[i].label} {months[i].year}<br />{fmtMoney(mrr)}
                    {hasEvent && <><br /><span className="text-[#FACC15]">⚡ Event</span></>}
                  </div>
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{ height: `${h}px`, backgroundColor: color, opacity: hasEvent ? 1 : 0.7 }}
                  />
                  {hasEvent && <div className="w-1 h-1 rounded-full bg-[#FACC15] mt-0.5" />}
                </div>
              );
            })}
          </div>
          {/* X-axis labels */}
          <div className="flex gap-1">
            {months.map((m, i) => (
              <div key={i} className="flex-1 text-center">
                <span className={`text-[10px] text-gray-400 font-medium ${i % 2 !== 0 ? 'hidden sm:inline' : ''}`}>{m.label}</span>
              </div>
            ))}
          </div>
          {/* Summary */}
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
            <div>
              <p className="text-[10px] text-gray-400">Today MRR</p>
              <p className="text-sm font-black text-white">{fmtMoney(baselineMRR)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">12mo MRR</p>
              <p className="text-sm font-black" style={{ color: finalMRR >= baselineMRR ? "#4ADE80" : "#F97316" }}>{fmtMoney(finalMRR)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">12mo ARR</p>
              <p className="text-sm font-black text-white">{fmtMoney(monthlyRevenue.reduce((a, b) => a + b, 0))}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main AnalyticsTab ────────────────────────────────────────────────────────

export default function AnalyticsTab({ leads }: { leads: AnalyticsLead[] }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState("");
  const [briefCopied, setBriefCopied] = useState(false);
  const [briefCollapsed, setBriefCollapsed] = useState(true);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (Array.isArray(data.tenants)) setTenants(data.tenants.map((r: Record<string, unknown>) => ({
        id: r.id as string, name: r.name as string,
        contactName: (r.contact_name as string) || "",
        email: (r.email as string) || "",
        phone: (r.phone as string) || "",
        building: (r.building as string) || "",
        unit: (r.unit as string) || "",
        rep: (r.rep as string) || "",
        monthlyRent: Number(r.monthly_rent) || 0,
        mouseOver: false,
        leaseStart: (r.lease_start as string) || null,
        leaseEnd: (r.lease_end as string) || null,
        renewalDate: (r.renewal_date as string) || null,
        escalationPct: Number(r.escalation_pct) || 0,
        escalationDate: (r.escalation_date as string) || null,
        status: (r.status as "active" | "pending" | "expired") || "active",
        notes: (r.notes as string) || "",
        sourceLeadId: (r.source_lead_id as string) || "",
        createdAt: (r.created_at as string) || "",
      })));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  // ── Generate AI Market Brief ───────────────────────────────────────────────

  async function generateBrief() {
    setBriefCollapsed(false);
    setBriefLoading(true); setBriefError(""); setBrief("");
    try {
      // Compute quick space breakdown from all leads
      const bySpace: Record<string, number> = {};
      leads.forEach(l => { bySpace[l.spaceType] = (bySpace[l.spaceType] || 0) + 1; });
      const totalL = leads.length || 1;
      const spaceBreakdown = Object.entries(bySpace)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count, pct: Math.round((count / totalL) * 100) }));
      const topSpace = spaceBreakdown[0]?.type ?? "N/A";

      // 6-month trend
      const now = Date.now();
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const leadsByMonth = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now); d.setMonth(d.getMonth() - (5 - i));
        const count = leads.filter(l => {
          const ld = new Date(l.timestamp);
          return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear();
        }).length;
        return { label: monthNames[d.getMonth()], count };
      });

      const hotL  = leads.filter(l => l.scoreLabel === "Verified Lead" || l.scoreLabel === "Hot Lead");
      const whaleL = leads.filter(l => l.isWhale);
      const activeL = leads.filter(l => (now - new Date(l.timestamp).getTime()) < 90 * 86400000);
      const avgBudget = activeL.length ? Math.round(activeL.reduce((s, l) => s + parseBudget(l.budget), 0) / activeL.length) : 0;
      const pipeline  = activeL.reduce((s, l) => s + parseBudget(l.budget), 0);
      const activeTenantCount = tenants.filter(t => t.status === "active").length;
      const baselineMRR = tenants.filter(t => t.status === "active").reduce((s, t) => s + t.monthlyRent, 0);

      const res = await fetch("/api/generate-market-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalLeads: leads.length,
          hotLeads: hotL.length,
          whalLeads: whaleL.length,
          avgBudget,
          pipeline,
          topSpace,
          activeTenants: activeTenantCount,
          baselineMRR,
          finalMRR: baselineMRR, // simplified — no projection needed for brief
          leadsByMonth,
          spaceBreakdown,
          period: "90 days",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Generation failed.");
      setBrief(d.brief || "");
    } catch (e: unknown) {
      setBriefError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBriefLoading(false);
    }
  }

  // ── Tenant metrics ───────────────────────────────────────────────────────
  const activeTenants = tenants.filter(t => t.status === "active");
  const totalMRR = activeTenants.reduce((s, t) => s + t.monthlyRent, 0);
  const totalARR = totalMRR * 12;
  const renewalRisk = activeTenants.filter(t => {
    const d = t.renewalDate || t.leaseEnd;
    if (!d) return false;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    return days <= 90 && days >= 0;
  });
  const renewalRiskMRR = renewalRisk.reduce((s, t) => s + t.monthlyRent, 0);

  // Building breakdown
  const byBuilding = activeTenants.reduce((acc, t) => {
    const key = t.building || "Unassigned";
    if (!acc[key]) acc[key] = { count: 0, mrr: 0 };
    acc[key].count++;
    acc[key].mrr += t.monthlyRent;
    return acc;
  }, {} as Record<string, { count: number; mrr: number }>);
  const buildingList = Object.entries(byBuilding).sort((a, b) => b[1].mrr - a[1].mrr);
  const maxBuildingMRR = Math.max(...buildingList.map(([, v]) => v.mrr), 1);

  // Rep leaderboard (from tenants)
  const byRep = activeTenants.reduce((acc, t) => {
    const key = t.rep || "Unassigned";
    if (!acc[key]) acc[key] = { count: 0, mrr: 0 };
    acc[key].count++;
    acc[key].mrr += t.monthlyRent;
    return acc;
  }, {} as Record<string, { count: number; mrr: number }>);
  const repList = Object.entries(byRep).sort((a, b) => b[1].mrr - a[1].mrr);

  // ── Lead metrics ────────────────────────────────────────────────────────
  const activeLeads = leads.filter(l => {
    const hrs = (Date.now() - new Date(l.timestamp).getTime()) / 36e5;
    return hrs < 24 * 90; // within 90 days
  });
  const hotLeads = activeLeads.filter(l => l.scoreLabel === "Verified Lead" || l.scoreLabel === "Hot Lead");
  const warmLeads = activeLeads.filter(l => l.scoreLabel === "MQL" || l.scoreLabel === "Warm Lead");
  const nurtureLeads = activeLeads.filter(l => l.scoreLabel === "Prospect Lead" || l.scoreLabel === "Nurture");
  const hotPipeline = hotLeads.reduce((s, l) => s + parseBudget(l.budget), 0);
  const warmPipeline = warmLeads.reduce((s, l) => s + parseBudget(l.budget), 0);
  const nurturePipeline = nurtureLeads.reduce((s, l) => s + parseBudget(l.budget), 0);
  const totalPipeline = activeLeads.reduce((s, l) => s + parseBudget(l.budget), 0);
  const whaleLeads = activeLeads.filter(l => l.isWhale);
  const avgScore = activeLeads.length ? Math.round(activeLeads.reduce((s, l) => s + l.score, 0) / activeLeads.length) : 0;

  // Lead source breakdown
  const bySrc = activeLeads.reduce<Record<string, number>>((acc, l) => {
    const key = l.source === "qr" ? "QR Scan" : l.source === "facebook" ? "Facebook" : l.source === "instagram" ? "Instagram" : l.source === "google" ? "Google" : "Organic";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const srcList = Object.entries(bySrc).sort((a, b) => b[1] - a[1]);
  const maxSrc = Math.max(...srcList.map(([, v]) => v), 1);

  // Space type breakdown
  const bySpace = activeLeads.reduce<Record<string, number>>((acc, l) => {
    acc[l.spaceType] = (acc[l.spaceType] || 0) + 1;
    return acc;
  }, {});
  const spaceList = Object.entries(bySpace).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const convertedCount = tenants.filter(t => !!t.sourceLeadId).length;
  const convRate = (activeLeads.length + convertedCount) > 0
    ? pct(convertedCount, activeLeads.length + convertedCount)
    : 0;

  if (loading) {
    return (
      <div className="mt-6 flex items-center justify-center py-24">
        <RefreshCw size={18} className="animate-spin text-[#4ADE80]" />
        <span className="ml-2 text-sm text-gray-500">Loading analytics…</span>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]">
            <BarChart3 size={14} />
          </div>
          <div>
            <p className="text-xs font-black text-sky-400 uppercase tracking-widest">Analytics</p>
            <p className="text-[11px] text-gray-500">{activeTenants.length} tenants · {activeLeads.length} active leads</p>
          </div>
        </div>
        <button onClick={fetchTenants} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/12 text-sky-400 text-xs hover:border-white/20 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Portfolio ARR" value={fmtMoney(totalARR, true)} sub={`${fmtMoney(totalMRR, true)}/mo from ${activeTenants.length} tenants`} icon={Building2} color="#4ADE80" />
        <StatCard label="Verified Pipeline" value={fmtMoney(hotPipeline, true)} sub={`${hotLeads.length} verified lead${hotLeads.length !== 1 ? "s" : ""}`} icon={Flame} color="#EF4444" />
        <StatCard label="Conversion Rate" value={`${convRate}%`} sub={`${convertedCount} lead${convertedCount !== 1 ? "s" : ""} → lease${convertedCount !== 1 ? "s" : ""}`} icon={Target} color="#60A5FA" />
      <StatCard label="Avg Lead Score" value={`${avgScore}`} sub={`${whaleLeads.length} whale${whaleLeads.length !== 1 ? "s" : ""} detected`} icon={TrendingUp} color="#FACC15" />
      </div>

      {/* ── Quarterly Business Review (QBR) ────────────────────────── */}
      <QBRSection />

      {/* ── Weekly Performance Board ─────────────────────────────── */}
      <WeeklyReportSection />

      {/* ── Acquisitions & Sales Board ───────────────────────────── */}
      <SalesLeadsSection currentUserName="Staff" />

      {/* ── System Architecture Map ────────────────────────────────── */}
      <ArchitectureSection />

      {/* ── AI Market Brief ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/12 bg-white/[0.02] shadow-[0_0_24px_rgba(56,189,248,0.06)]">
        <div 
          onClick={() => setBriefCollapsed(c => !c)}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_14px_rgba(59,130,246,0.35)]">
              <Sparkles size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-white uppercase tracking-widest">AI Market Brief</p>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform duration-300 ${briefCollapsed ? "" : "rotate-180"}`} style={{ background: "rgba(255,255,255,0.06)" }}>
                  <ChevronDown size={11} className="text-gray-400" />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Gemini analyzes your live lead &amp; tenant data and writes a strategic brief</p>
            </div>
          </div>
          <div 
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto"
          >
            {brief && (
              <button
                onClick={() => { navigator.clipboard.writeText(brief).catch(() => {}); setBriefCopied(true); setTimeout(() => setBriefCopied(false), 2000); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors"
              >
                {briefCopied ? <><CheckCircle2 size={10} className="text-[#4ADE80]" /> Copied!</> : <><Copy size={10} /> Copy</>}
              </button>
            )}
            <button
              onClick={generateBrief}
              disabled={briefLoading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-[11px] shadow-[0_0_14px_rgba(59,130,246,0.35)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {briefLoading
                ? <><Loader2 size={12} className="animate-spin" /> Analyzing…</>
                : <><Sparkles size={12} /> {brief ? "Regenerate" : "Generate Brief"}</>
              }
            </button>
          </div>
        </div>

        {!briefCollapsed && (
          <div className="px-4 sm:px-5 py-4 border-t border-white/[0.08]">
            {briefError && (
              <p className="text-sm text-red-400 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-xl px-4 py-3 mb-3">{briefError}</p>
            )}

            {brief ? (
              <div className="text-sm text-gray-300 leading-relaxed space-y-2">
                {brief.split("\n").map((line, i) => {
                  const boldSection = line.match(/^\*\*(.*)\*\*$/);
                  if (boldSection) return <p key={i} className="text-xs font-black text-[#4ADE80] uppercase tracking-widest mt-4 first:mt-0">{boldSection[1]}</p>;
                  if (line.startsWith("\u2022 ") || line.startsWith("- ")) return <p key={i} className="flex gap-2"><span className="text-[#4ADE80] flex-shrink-0">›</span><span>{line.slice(2)}</span></p>;
                  if (line.trim() === "") return null;
                  return <p key={i}>{line}</p>;
                })}
              </div>
            ) : !briefLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.15)] flex items-center justify-center">
                  <Sparkles size={20} className="text-[#4ADE80] opacity-50" />
                </div>
                <p className="text-sm text-gray-600">Click <span className="text-[#4ADE80] font-bold">Generate Brief</span> to get an AI analysis<br />of your current lead pipeline and market position.</p>
              </div>
            )}

            {briefLoading && (
              <div className="flex items-center justify-center py-10 gap-3">
                <Loader2 size={18} className="animate-spin text-[#4ADE80]" />
                <p className="text-sm text-gray-500">Gemini is analyzing your data…</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Site Traffic Intelligence (Internal Analytics) ───────── */}
      <SiteTrafficPanel />

      {/* ── Market Demand Intelligence ──────────────────────────────── */}
      <LeadHealthDashboard leads={leads} />

      {/* ── Revenue Forecast ───────────────────────────────────────── */}
      <RevenueForecast tenants={tenants} />

      {/* ── Lead Pipeline Funnel ────────────────────────────────────── */}
      <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-[#FACC15]" />
            <p className="text-xs font-black text-white uppercase tracking-widest">Lead Pipeline</p>
          </div>
          {activeLeads.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500">Total Pipeline:</span>
              <span className="text-sm font-black text-[#4ADE80]">{fmtMoney(totalPipeline, true)}/mo</span>
            </div>
          )}
        </div>

        {activeLeads.length === 0 ? (
          <p className="text-sm text-gray-600 italic">No lead data yet</p>
        ) : (
          <>
            {/* Segmented Pipeline Bar */}
            {totalPipeline > 0 && (
              <div className="w-full h-3 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden flex mb-5">
                {hotPipeline > 0 && (
                  <div style={{ width: `${pct(hotPipeline, totalPipeline)}%` }} className="h-full bg-[#EF4444] transition-all" title={`Verified Leads: ${fmtMoney(hotPipeline, true)}/mo`} />
                )}
                {warmPipeline > 0 && (
                  <div style={{ width: `${pct(warmPipeline, totalPipeline)}%` }} className="h-full bg-[#FACC15] transition-all" title={`MQLs: ${fmtMoney(warmPipeline, true)}/mo`} />
                )}
                {nurturePipeline > 0 && (
                  <div style={{ width: `${pct(nurturePipeline, totalPipeline)}%` }} className="h-full bg-[#94A3B8] transition-all" title={`Prospect Leads: ${fmtMoney(nurturePipeline, true)}/mo`} />
                )}
              </div>
            )}

            {/* Stage Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Verified Leads */}
              <div className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span className="text-xs font-black text-gray-200 uppercase tracking-wider">Verified Leads</span>
                  </div>
                  <p className="text-xl font-black text-white">{fmtMoney(hotPipeline, true)}<span className="text-xs text-gray-500 font-normal">/mo</span></p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)] text-[11px] text-gray-500">
                  <span>Volume: {hotLeads.length} lead{hotLeads.length !== 1 ? "s" : ""}</span>
                  <span>{pct(hotPipeline, totalPipeline)}% of pipeline</span>
                </div>
              </div>

              {/* MQLs */}
              <div className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15]" />
                    <span className="text-xs font-black text-gray-200 uppercase tracking-wider">MQLs</span>
                  </div>
                  <p className="text-xl font-black text-white">{fmtMoney(warmPipeline, true)}<span className="text-xs text-gray-500 font-normal">/mo</span></p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)] text-[11px] text-gray-500">
                  <span>Volume: {warmLeads.length} lead{warmLeads.length !== 1 ? "s" : ""}</span>
                  <span>{pct(warmPipeline, totalPipeline)}% of pipeline</span>
                </div>
              </div>

              {/* Prospect Leads */}
              <div className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
                    <span className="text-xs font-black text-gray-200 uppercase tracking-wider">Prospect Leads</span>
                  </div>
                  <p className="text-xl font-black text-white">{fmtMoney(nurturePipeline, true)}<span className="text-xs text-gray-500 font-normal">/mo</span></p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)] text-[11px] text-gray-500">
                  <span>Volume: {nurtureLeads.length} lead{nurtureLeads.length !== 1 ? "s" : ""}</span>
                  <span>{pct(nurturePipeline, totalPipeline)}% of pipeline</span>
                </div>
              </div>
            </div>

            {/* Renewal Risk Alert */}
            {renewalRisk.length > 0 && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(239,68,68,0.07)] border border-[rgba(239,68,68,0.18)]">
                <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">
                  <span className="font-black">{fmtMoney(renewalRiskMRR, true)}/mo</span> at renewal risk ({renewalRisk.length} tenant{renewalRisk.length !== 1 ? "s" : ""} ≤ 90d)
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Two-col grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Revenue by Building */}
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={13} className="text-[#60A5FA]" />
            <p className="text-xs font-black text-white uppercase tracking-widest">Revenue by Property</p>
          </div>
          {buildingList.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No tenant data yet</p>
          ) : buildingList.map(([building, { count, mrr }]) => (
            <BarRow key={building} label={building} value={mrr} max={maxBuildingMRR} color="#60A5FA" sub={`${count} tenant${count !== 1 ? "s" : ""}`} />
          ))}
          {buildingList.length > 0 && (
            <div className="border-t border-[rgba(255,255,255,0.05)] pt-3 mt-3 flex justify-between">
              <span className="text-[11px] text-gray-500">Portfolio total</span>
              <span className="text-sm font-black text-[#60A5FA]">{fmtMoney(totalMRR, true)}/mo</span>
            </div>
          )}
        </div>

        {/* Right side: Rep Leaderboard, Lead Sources, Space Demand stacked */}
        <div className="space-y-6">
          {/* Rep Leaderboard */}
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={13} className="text-[#C4B5FD]" />
              <p className="text-xs font-black text-white uppercase tracking-widest">Rep Leaderboard</p>
              <span className="text-[10px] text-gray-400 ml-1">(by revenue closed)</span>
            </div>
            {repList.length === 0 ? (
              <p className="text-sm text-gray-600 italic">Assign reps to tenants to see leaderboard</p>
            ) : repList.map(([rep, { count, mrr }], idx) => (
              <div key={rep} className="flex items-center gap-3 mb-2.5">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ backgroundColor: idx === 0 ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.05)", color: idx === 0 ? "#FACC15" : "#6B7280" }}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-200 truncate">{rep} <span className="text-[10px] text-gray-500 font-normal">({count} lease{count !== 1 ? "s" : ""})</span></span>
                    <span className="text-xs font-bold text-[#C4B5FD] ml-2 flex-shrink-0">{fmtMoney(mrr, true)}/mo</span>
                  </div>
                  <div className="h-1 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct(mrr, repList[0][1].mrr)}%`, backgroundColor: "#C4B5FD", opacity: 0.7 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Source breakdown */}
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight size={13} className="text-[#F472B6]" />
              <p className="text-xs font-black text-white uppercase tracking-widest">Lead Sources</p>
            </div>
            {srcList.length === 0 ? (
              <p className="text-sm text-gray-600 italic">No lead data yet</p>
            ) : srcList.map(([src, count]) => (
              <div key={src} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 w-20 flex-shrink-0">{src}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                  <div className="h-full rounded-full bg-[#F472B6]" style={{ width: `${pct(count, maxSrc)}%`, opacity: 0.75 }} />
                </div>
                <span className="text-xs font-bold text-[#F472B6] w-6 text-right">{count}</span>
              </div>
            ))}
          </div>

          {/* Space type demand */}
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={13} className="text-[#F97316]" />
              <p className="text-xs font-black text-white uppercase tracking-widest">Space Demand</p>
            </div>
            {spaceList.length === 0 ? (
              <p className="text-sm text-gray-600 italic">No lead data yet</p>
            ) : spaceList.map(([space, count]) => (
              <div key={space} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 truncate flex-1">{space}</span>
                <span className="text-xs font-bold text-[#F97316]">{count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
