"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { TrendingUp, BarChart3, AlertCircle, RefreshCw } from "lucide-react";
import { DashboardCard, DashboardCardHeader } from "@/components/admin/DashboardCard";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Snapshot {
  id: string;
  snapshot_date: string;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  occupancy_rate: number;
  total_tenants: number;
  open_tickets: number;
}

type RangeKey = "3" | "6" | "12";

const RANGES: { label: string; key: RangeKey }[] = [
  { label: "3M", key: "3" },
  { label: "6M", key: "6" },
  { label: "12M", key: "12" },
];

interface Series {
  key: keyof Snapshot;
  label: string;
  color: string;
  strokeWidth?: number;
}

/**
 * Builds a smooth Catmull-Rom -> Cubic Bezier SVG path so trends read as calm,
 * organic curves rather than jagged zig-zags.
 */
function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    const midX = (points[0].x + points[1].x) / 2;
    return `M ${points[0].x},${points[0].y} C ${midX},${points[0].y} ${midX},${points[1].y} ${points[1].x},${points[1].y}`;
  }

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  const tension = 0.22;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

// ─── SVG Area Chart ──────────────────────────────────────────────────────────
function SVGAreaChart({
  data,
  series,
  focusedKey,
  onToggleFocus,
}: {
  data: Snapshot[];
  series: Series[];
  focusedKey: keyof Snapshot | null;
  onToggleFocus: (key: keyof Snapshot) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width || 640);
    return () => ro.disconnect();
  }, []);

  if (!data.length) return null;

  const H = 228;
  const padL = 56;
  const padR = 16;
  const padT = 18;
  const padB = 34;
  const chartW = Math.max(200, width - padL - padR);
  const chartH = H - padT - padB;

  const activeSeries = focusedKey ? series.filter((s) => s.key === focusedKey) : series;
  const vals = activeSeries.flatMap((s) => data.map((d) => Number(d[s.key])));
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const minVal = rawMin >= 0 ? Math.max(0, rawMin * 0.85) : rawMin * 1.1;
  const maxVal = rawMax * 1.08 || 100;
  const range = maxVal - minVal || 1;

  const px = (i: number) =>
    padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
  const py = (v: number) =>
    padT + (1 - (v - minVal) / range) * chartH;

  const fmtVal = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    return `${sign}$${Math.round(abs).toLocaleString()}`;
  };
  const fmtExact = (n: number) => {
    const sign = n < 0 ? "-" : "";
    return `${sign}$${Math.round(Math.abs(n)).toLocaleString()}`;
  };
  const fmtDate = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  const fmtFull = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const yTicks = [0, 0.33, 0.66, 1].map((t) => {
    const v = minVal + t * range;
    return { v, y: py(v), label: fmtVal(v) };
  });

  const colWidth = data.length > 1 ? chartW / (data.length - 1) : chartW;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={width}
        height={H}
        className="block overflow-visible select-none"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key as string} id={`pnl-g-${s.key as string}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="65%" stopColor={s.color} stopOpacity="0.06" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id="pnl-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Subtle dotted reference grid lines */}
        {yTicks.map((t, i) => (
          <line
            key={i}
            x1={padL}
            x2={width - padR}
            y1={t.y}
            y2={t.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            strokeDasharray={i === 0 ? undefined : "3,5"}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text
            key={i}
            x={padL - 10}
            y={t.y + 4}
            textAnchor="end"
            fontSize="12"
            fill="#94A3B8"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="600"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {t.label}
          </text>
        ))}

        {/* Smooth areas + luminous curves */}
        {series.map((s) => {
          const isDimmed = focusedKey !== null && focusedKey !== s.key;
          const points = data.map((d, i) => ({ x: px(i), y: py(Number(d[s.key])) }));
          const linePath = buildSmoothPath(points);
          const baselineY = py(minVal);
          const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${baselineY.toFixed(1)} L ${points[0].x.toFixed(1)},${baselineY.toFixed(1)} Z`;

          return (
            <g
              key={s.key as string}
              style={{
                opacity: isDimmed ? 0.14 : 1,
                transition: "opacity 220ms ease",
              }}
            >
              <path d={areaPath} fill={`url(#pnl-g-${s.key as string})`} />
              <path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth={focusedKey === s.key ? 3 : s.strokeWidth ?? 2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                filter={!isDimmed && (focusedKey === s.key || s.key === "net_income") ? "url(#pnl-glow)" : undefined}
              />
              {data.map((_, i) => {
                const cx = px(i);
                const cy = py(Number(data[i][s.key]));
                const isActive = hovered === i;
                return (
                  <g key={i} style={{ opacity: isActive ? 1 : 0, transition: "opacity 120ms ease" }}>
                    <circle cx={cx} cy={cy} r="7" fill={s.color} opacity="0.22" />
                    <circle cx={cx} cy={cy} r="4" fill="#0B101D" stroke={s.color} strokeWidth="2.2" />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hovered !== null && (
          <line
            x1={px(hovered)}
            x2={px(hovered)}
            y1={padT}
            y2={padT + chartH}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (data.length > 6 && i % 2 !== 0 && i !== data.length - 1) return null;
          const isHovered = hovered === i;
          return (
            <text
              key={i}
              x={px(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="12"
              fill={isHovered ? "#F8FAFC" : "#94A3B8"}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight={isHovered ? "700" : "600"}
            >
              {fmtDate(d.snapshot_date)}
            </text>
          );
        })}

        {/* Hit zones */}
        {data.map((_, i) => {
          const left = i === 0 ? padL : px(i) - colWidth / 2;
          const right = i === data.length - 1 ? width - padR : px(i) + colWidth / 2;
          return (
            <rect
              key={i}
              x={left}
              y={padT}
              width={Math.max(1, right - left)}
              height={chartH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHovered(i)}
              onClick={() => setHovered(i)}
            />
          );
        })}
      </svg>

      {/* Frosted Glass Tooltip */}
      {hovered !== null && (() => {
        const rawLeft = px(hovered);
        const tipW = 196;
        const clampedLeft = Math.min(Math.max(rawLeft - tipW / 2, 0), Math.max(0, width - tipW));
        return (
          <div
            className="absolute top-2 pointer-events-none z-10 rounded-xl border border-white/15 bg-[#0B101D]/95 backdrop-blur-md px-3.5 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
            style={{ left: clampedLeft, width: tipW }}
          >
            <p className="text-xs font-bold text-slate-300 mb-2">
              {fmtFull(data[hovered].snapshot_date)}
            </p>
            <div className="space-y-1.5">
              {series.map((s) => (
                <div key={s.key as string} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {fmtExact(Number(data[hovered][s.key]))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Interactive Series Spotlight Pills (ADHD focus aid) */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        {series.map((s) => {
          const isFocused = focusedKey === s.key;
          const isDimmed = focusedKey !== null && !isFocused;
          return (
            <button
              key={s.key as string}
              type="button"
              onClick={() => onToggleFocus(s.key)}
              title={isFocused ? "Show all curves" : `Focus on ${s.label} only`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                isFocused
                  ? "bg-white/10 border-white/25 text-white shadow-sm"
                  : isDimmed
                  ? "bg-white/[0.02] border-white/[0.05] text-slate-500 hover:text-slate-300"
                  : "bg-white/[0.03] border-white/[0.08] text-slate-300 hover:border-white/20 hover:text-white"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: s.color, opacity: isDimmed ? 0.35 : 1 }}
              />
              <span>{s.label}</span>
            </button>
          );
        })}
        {focusedKey && (
          <button
            type="button"
            onClick={() => onToggleFocus(focusedKey)}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 px-2 py-1 cursor-pointer"
          >
            Show all
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfolioHistoryChart() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [migrationSql, setMigrationSql] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("6");
  const [focusedKey, setFocusedKey] = useState<keyof Snapshot | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    fetch("/api/portfolio-snapshot/record", { method: "POST" }).catch(() => {});
  }, []);

  const fetchSnapshots = useCallback(async (months: RangeKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio-snapshot?months=${months}`, { cache: "no-store" });
      const data = await res.json();
      if (data.migrationSql) {
        setMigrationSql(data.migrationSql);
        setSnapshots([]);
      } else if (Array.isArray(data.snapshots)) {
        setSnapshots(data.snapshots);
      } else {
        setSnapshots([]);
      }
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchSnapshots(range), 600);
    return () => clearTimeout(timer);
  }, [range, fetchSnapshots]);

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const fmt = (n: number) =>
    Math.abs(n) >= 1000
      ? `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1000).toFixed(1)}k`
      : `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString()}`;
  const pct = (delta: number, base: number) =>
    base ? `${delta >= 0 ? "+" : ""}${((delta / Math.abs(base)) * 100).toFixed(1)}%` : "—";

  const netMarginPct =
    last && last.total_revenue > 0
      ? Math.round((last.net_income / last.total_revenue) * 100)
      : null;

  const SERIES: Series[] = [
    { key: "total_revenue", label: "Total Revenue", color: "#4ADE80", strokeWidth: 2.2 },
    { key: "total_expenses", label: "Expenses", color: "#FB7185", strokeWidth: 2 },
    { key: "net_income", label: "Net Income", color: "#38BDF8", strokeWidth: 2.8 },
  ];

  const handleToggleFocus = (key: keyof Snapshot) => {
    setFocusedKey((prev) => (prev === key ? null : key));
  };

  return (
    <DashboardCard>
      <DashboardCardHeader
        icon={<TrendingUp size={17} className="text-sky-300" />}
        iconGradient="linear-gradient(135deg, rgba(74,222,128,0.22), rgba(56,189,248,0.24))"
        title="P&L History"
        subtitle={
          netMarginPct !== null
            ? `Monthly portfolio trends · Net margin ${netMarginPct}%`
            : "Monthly portfolio trends · Live data"
        }
        actions={
          <div className="flex items-center gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  range === r.key
                    ? "bg-sky-500/15 border-sky-400/45 text-sky-300"
                    : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20"
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => fetchSnapshots(range)}
              title="Refresh P&L snapshots"
              className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        }
      />

      <div className="p-5 sm:p-6">
        {migrationSql && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 mb-5 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-300 mb-1">One-time Supabase setup required</p>
              <p className="text-xs text-slate-300 mb-2">
                Run this SQL in Supabase → SQL Editor to enable P&amp;L history tracking:
              </p>
              <pre className="bg-black/40 rounded-lg p-3 text-[11px] text-emerald-300 overflow-x-auto">
                {migrationSql}
              </pre>
            </div>
          </div>
        )}

        {/* Calm, Sentence-Case KPI Cards (with shape + label + tabular-nums) */}
        {snapshots.length >= 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              {
                label: "Net Income",
                val: fmt(last?.net_income ?? 0),
                delta: (last?.net_income ?? 0) - (first?.net_income ?? 0),
                base: first?.net_income ?? 1,
                accent: "#38BDF8",
              },
              {
                label: "Total Revenue",
                val: fmt(last?.total_revenue ?? 0),
                delta: (last?.total_revenue ?? 0) - (first?.total_revenue ?? 0),
                base: first?.total_revenue ?? 1,
                accent: "#4ADE80",
              },
              {
                label: "Occupancy Rate",
                val: `${last?.occupancy_rate?.toFixed(1)}%`,
                delta: (last?.occupancy_rate ?? 0) - (first?.occupancy_rate ?? 0),
                base: first?.occupancy_rate ?? 1,
                accent: "#A78BFA",
              },
            ].map((k) => {
              const up = k.delta >= 0;
              return (
                <div
                  key={k.label}
                  className="rounded-xl bg-white/[0.025] border border-white/[0.07] px-4 py-3.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-300">{k.label}</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: k.accent }}
                    />
                  </div>
                  <p className="text-2xl font-extrabold text-white tabular-nums tracking-tight">
                    {k.val}
                  </p>
                  <p
                    className={`text-xs font-semibold mt-1 tabular-nums ${
                      up ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {up ? "▲ Up" : "▼ Down"} {pct(k.delta, k.base)} vs {RANGES.find((r) => r.key === range)?.label} ago
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {snapshots.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              {
                label: "Net Income",
                val: fmt(last?.net_income ?? 0),
                color: (last?.net_income ?? 0) >= 0 ? "text-sky-300" : "text-rose-400",
              },
              {
                label: "Total Revenue",
                val: fmt(last?.total_revenue ?? 0),
                color: "text-emerald-400",
              },
              {
                label: "Occupancy Rate",
                val: `${last?.occupancy_rate?.toFixed(1)}%`,
                color: (last?.occupancy_rate ?? 0) >= 80 ? "text-emerald-400" : "text-amber-300",
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-xl bg-white/[0.025] border border-white/[0.07] px-4 py-3.5"
              >
                <p className="text-xs font-semibold text-slate-300 mb-1">{k.label}</p>
                <p className={`text-2xl font-extrabold tabular-nums tracking-tight ${k.color}`}>
                  {k.val}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  First snapshot recorded · trend starts next visit
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart Area */}
        {loading ? (
          <div className="h-[228px] flex items-center justify-center">
            <span className="text-sm text-slate-400">Loading P&amp;L history…</span>
          </div>
        ) : snapshots.length < 2 ? (
          <div className="h-[228px] flex flex-col items-center justify-center gap-2.5 text-center px-4">
            <BarChart3 size={34} className="text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">
              {snapshots.length === 1
                ? "First snapshot recorded! Your trend curve appears once 2+ data points exist."
                : "No snapshot data yet."}
            </p>
            <p className="text-xs text-slate-400 max-w-md">
              A new snapshot is recorded automatically when you visit your dashboard. Click any legend pill above the chart once trends appear to spotlight a single metric.
            </p>
          </div>
        ) : (
          <SVGAreaChart
            data={snapshots}
            series={SERIES}
            focusedKey={focusedKey}
            onToggleFocus={handleToggleFocus}
          />
        )}
      </div>
    </DashboardCard>
  );
}
