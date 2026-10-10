"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { TrendingUp, BarChart3, AlertCircle, RefreshCw } from "lucide-react";

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
  { label: "3 M", key: "3" },
  { label: "6 M", key: "6" },
  { label: "12 M", key: "12" },
];

// ─── SVG Area Chart — pixel-accurate, no text distortion ─────────────────────
interface Series { key: keyof Snapshot; label: string; color: string }

function SVGAreaChart({ data, series }: { data: Snapshot[]; series: Series[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hovered, setHovered] = useState<number | null>(null);

  // Measure real container width so text is never stretched
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width || 600);
    return () => ro.disconnect();
  }, []);

  if (!data.length) return null;

  const H       = 200;          // SVG height px
  const padL    = 56;           // space for Y labels
  const padR    = 12;
  const padT    = 12;
  const padB    = 32;           // space for X labels
  const chartW  = width - padL - padR;
  const chartH  = H - padT - padB;

  const vals   = series.flatMap(s => data.map(d => Number(d[s.key])));
  const minVal = Math.min(...vals) * 0.88;
  const maxVal = Math.max(...vals) * 1.05;
  const range  = maxVal - minVal || 1;

  const px = (i: number) =>
    padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
  const py = (v: number) =>
    padT + (1 - (v - minVal) / range) * chartH;

  const fmtVal  = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  const fmtDate = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  const fmtFull = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // 3 Y-axis ticks
  const yTicks = [0, 0.5, 1].map(t => {
    const v = minVal + t * range;
    return { v, y: py(v), label: fmtVal(v) };
  });

  // Column hit-zone widths
  const colWidth = data.length > 1 ? chartW / (data.length - 1) : chartW;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <svg
        width={width}
        height={H}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          {series.map(s => (
            <linearGradient key={s.key as string} id={`g-${s.key as string}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i}
            x1={padL} x2={width - padR} y1={t.y} y2={t.y}
            stroke="rgba(148,163,184,0.08)" strokeWidth="1"
          />
        ))}

        {/* Y-axis labels — left side, regular text, no distortion */}
        {yTicks.map((t, i) => (
          <text key={i}
            x={padL - 8} y={t.y + 4}
            textAnchor="end"
            fontSize="12" fill="#94A3B8" fontFamily="system-ui,sans-serif" fontWeight="600"
          >
            {t.label}
          </text>
        ))}

        {/* Areas + Lines per series */}
        {series.map(s => {
          const points = data.map((d, i) => ({ x: px(i), y: py(Number(d[s.key])) }));
          const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
          const areaPath = [
            linePath,
            `L ${points[points.length - 1].x},${py(minVal)}`,
            `L ${points[0].x},${py(minVal)}`,
            "Z",
          ].join(" ");
          return (
            <g key={s.key as string}>
              <path d={areaPath} fill={`url(#g-${s.key as string})`} />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {data.map((_, i) => (
                <circle key={i}
                  cx={px(i)} cy={py(Number(data[i][s.key]))} r="3.5"
                  fill={s.color}
                  opacity={hovered === i ? 1 : 0}
                  style={{ transition: "opacity 0.1s" }}
                />
              ))}
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hovered !== null && (
          <line
            x1={px(hovered)} x2={px(hovered)}
            y1={padT} y2={padT + chartH}
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,3"
          />
        )}

        {/* X-axis labels — rendered as proper upright SVG text */}
        {data.map((d, i) => (
          <text key={i}
            x={px(i)} y={H - 6}
            textAnchor="middle"
            fontSize="12" fill="#E2E8F0" fontFamily="system-ui,sans-serif" fontWeight="700"
          >
            {fmtDate(d.snapshot_date)}
          </text>
        ))}

        {/* Invisible hit zones */}
        {data.map((_, i) => {
          const left  = i === 0 ? padL : px(i) - colWidth / 2;
          const right = i === data.length - 1 ? width - padR : px(i) + colWidth / 2;
          return (
            <rect key={i}
              x={left} y={padT} width={right - left} height={chartH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          );
        })}
      </svg>

      {/* Tooltip — HTML so text is always crisp */}
      {hovered !== null && (() => {
        const rawLeft = px(hovered);
        const tipW = 168;
        const clampedLeft = Math.min(Math.max(rawLeft - tipW / 2, 0), width - tipW);
        return (
          <div style={{
            position: "absolute",
            top: 8,
            left: clampedLeft,
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(74,222,128,0.25)",
            borderRadius: 10,
            padding: "10px 14px",
            backdropFilter: "blur(12px)",
            pointerEvents: "none",
            width: tipW,
            zIndex: 10,
          }}>
            <p style={{ color: "#94A3B8", fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {fmtFull(data[hovered].snapshot_date)}
            </p>
            {series.map(s => (
              <div key={s.key as string} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 3 }}>
                <span style={{ color: s.color, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: "#E2E8F0", fontSize: 12, fontWeight: 700 }}>
                  {fmtVal(Number(data[hovered][s.key]))}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
        {series.map(s => (
          <div key={s.key as string} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 3, borderRadius: 2, background: s.color }} />
            <span style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
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
  const recordedRef = useRef(false);

  // Record today's real snapshot from live data (runs once on mount)
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

  // Small delay on first fetch to let the record POST finish
  useEffect(() => {
    const timer = setTimeout(() => fetchSnapshots(range), 600);
    return () => clearTimeout(timer);
  }, [range, fetchSnapshots]);

  const first = snapshots[0];
  const last  = snapshots[snapshots.length - 1];
  const fmt   = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;
  const pct   = (delta: number, base: number) =>
    base ? `${delta >= 0 ? "+" : ""}${((delta / base) * 100).toFixed(1)}%` : "—";

  const SERIES: Series[] = [
    { key: "total_revenue",  label: "Total Revenue",    color: "#4ADE80" },
    { key: "total_expenses", label: "Expenses",   color: "#F87171" },
    { key: "net_income",     label: "Net Income", color: "#22D3EE" },
  ];

  return (
    <div style={{
      background: "rgba(15,23,42,0.6)",
      border: "1px solid rgba(148,163,184,0.12)",
      borderRadius: 20,
      padding: "28px 32px",
      backdropFilter: "blur(20px)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#4ADE80,#22D3EE)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TrendingUp size={18} color="#0F172A" />
          </div>
          <div>
            <h3 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 16, margin: 0 }}>
              P&amp;L History
            </h3>
            <p style={{ color: "#94A3B8", fontSize: 12, margin: 0 }}>Month-over-month portfolio trends · live data</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s",
              border: range === r.key ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(148,163,184,0.15)",
              background: range === r.key ? "rgba(74,222,128,0.12)" : "rgba(148,163,184,0.05)",
              color: range === r.key ? "#4ADE80" : "#94A3B8",
            }}>{r.label}</button>
          ))}
          <button onClick={() => fetchSnapshots(range)} style={{
            padding: "6px 10px", borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.15)",
            background: "rgba(148,163,184,0.05)",
            color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center",
          }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Migration banner */}
      {migrationSql && (
        <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={16} style={{ color: "#FACC15", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ color: "#FACC15", fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>One-time Supabase setup required</p>
              <p style={{ color: "#94A3B8", fontSize: 12, margin: "0 0 10px" }}>
                Run this SQL in Supabase → SQL Editor to enable P&amp;L history tracking:
              </p>
              <pre style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#A7F3D0", overflowX: "auto", margin: 0 }}>
                {migrationSql}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* KPI delta row */}
      {snapshots.length >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Net Income", val: fmt(last?.net_income ?? 0),      delta: (last?.net_income ?? 0)      - (first?.net_income ?? 0),      base: first?.net_income ?? 1 },
            { label: "Total Revenue",    val: fmt(last?.total_revenue ?? 0),   delta: (last?.total_revenue ?? 0)   - (first?.total_revenue ?? 0),   base: first?.total_revenue ?? 1 },
            { label: "Occupancy",  val: `${last?.occupancy_rate?.toFixed(1)}%`, delta: (last?.occupancy_rate ?? 0) - (first?.occupancy_rate ?? 0), base: first?.occupancy_rate ?? 1 },
          ].map(k => (
            <div key={k.label} style={{ background: "rgba(30,41,59,0.5)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(148,163,184,0.1)" }}>
              <p style={{ color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{k.label}</p>
              <p style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 800, margin: "0 0 2px" }}>{k.val}</p>
              <p style={{ color: k.delta >= 0 ? "#4ADE80" : "#F87171", fontSize: 12, fontWeight: 600, margin: 0 }}>
                {k.delta >= 0 ? "▲" : "▼"} {pct(k.delta, k.base)} vs {RANGES.find(r => r.key === range)?.label} ago
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Single snapshot — show current values without delta comparison */}
      {snapshots.length === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Net Income", val: fmt(last?.net_income ?? 0),    color: (last?.net_income ?? 0) >= 0 ? "#4ADE80" : "#F87171" },
            { label: "Total Revenue",    val: fmt(last?.total_revenue ?? 0), color: "#4ADE80" },
            { label: "Occupancy",  val: `${last?.occupancy_rate?.toFixed(1)}%`, color: (last?.occupancy_rate ?? 0) >= 80 ? "#4ADE80" : "#FACC15" },
          ].map(k => (
            <div key={k.label} style={{ background: "rgba(30,41,59,0.5)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(148,163,184,0.1)" }}>
              <p style={{ color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{k.label}</p>
              <p style={{ color: k.color, fontSize: 22, fontWeight: 800, margin: "0 0 2px" }}>{k.val}</p>
              <p style={{ color: "#64748B", fontSize: 12, fontWeight: 600, margin: 0 }}>
                Current snapshot · tracking starts now
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#475569", fontSize: 14 }}>Loading…</span>
        </div>
      ) : snapshots.length < 2 ? (
        <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <BarChart3 size={36} style={{ color: "#334155" }} />
          <p style={{ color: "#94A3B8", fontSize: 14, margin: 0, fontWeight: 600 }}>
            {snapshots.length === 1 ? "First snapshot recorded! Chart will appear once you have 2+ data points." : "No snapshot data yet."}
          </p>
          <p style={{ color: "#64748B", fontSize: 12, margin: 0 }}>
            A new data point is recorded each time you visit this page. Check back tomorrow for trends.
          </p>
        </div>
      ) : (
        <SVGAreaChart data={snapshots} series={SERIES} />
      )}
    </div>
  );
}

