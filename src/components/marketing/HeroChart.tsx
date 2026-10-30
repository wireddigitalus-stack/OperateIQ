"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Activity, ArrowDownRight, ArrowUpRight, CheckCircle2, Flag, Sparkles } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Metric = "revenue" | "occupancy" | "noi";
type Range = "3M" | "6M" | "1Y" | "ALL";

interface Pt {
  label: string;
  year: string;
  full: string;
  revenue: number;
  occupancy: number;
  noi: number;
  projected?: boolean;
  low?: number;
  high?: number;
  event?: { title: string; detail: string };
}

// ─── Demo dataset (Nov 2024 → Oct 2026 verified + Nov/Dec 2026 forecast) ────

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const REVENUE = [
  168200, 171500, 169800, 174300, 179900, 183200, 188600, 192100, 196800, 199400, 203900, 207200,
  209800, 213400, 210200, 212900, 214700, 216900, 218500, 232000, 249000, 261500, 274800, 284500,
];
const N_HIST = REVENUE.length;

const EVENTS: Record<number, { title: string; detail: string }> = {
  4: { title: "Cedar Creek Trade acquired", detail: "8 contractor flex bays added to the regional portfolio." },
  19: { title: "Heritage Square Lofts leased", detail: "12 residential lofts absorbed in 14 days via PropOpsIQ lead matching." },
  21: { title: "Annual escalations executed", detail: "18 regional leases auto-escalated · +$5.2k/mo with zero manual work." },
  24: { title: "Regional Clinic LOI closes", detail: "PropOpsIQ forecast · Suite 210 at $6,800/mo (88% confidence)." },
};

function makePoint(i: number, revenue: number): Pt {
  const m = (10 + i) % 12;
  const y = 2024 + Math.floor((10 + i) / 12);
  const occ = 86 + ((revenue - 168200) / (284500 - 168200)) * 10.4;
  return {
    label: SHORT[m],
    year: `'${String(y).slice(2)}`,
    full: `${FULL[m]} ${y}`,
    revenue,
    occupancy: Math.round(occ * 10) / 10,
    noi: Math.round((revenue * 0.8) / 100) * 100,
    event: EVENTS[i],
  };
}

const ALL_POINTS: Pt[] = [
  ...REVENUE.map((r, i) => makePoint(i, r)),
  { ...makePoint(24, 298200), occupancy: 97.2, projected: true, low: 291000, high: 305500 },
  { ...makePoint(25, 312500), occupancy: 98.0, projected: true, low: 298500, high: 326500 },
];

const RANGE_COUNT: Record<Range, number> = { "3M": 3, "6M": 6, "1Y": 12, ALL: 24 };

const kFmt = (v: number) => `$${Math.round(v / 1000)}k`;
const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

const METRICS: Record<Metric, { label: string; c1: string; c2: string; rgb: string; tick: (v: number) => string; full: (v: number) => string }> = {
  revenue: { label: "Revenue", c1: "#38BDF8", c2: "#22D3EE", rgb: "56,189,248", tick: kFmt, full: usd },
  occupancy: { label: "Occupancy", c1: "#2DD4BF", c2: "#5EEAD4", rgb: "45,212,191", tick: (v) => `${v.toFixed(1)}%`, full: (v) => `${v.toFixed(1)}%` },
  noi: { label: "NOI", c1: "#34D399", c2: "#A7F3D0", rgb: "52,211,153", tick: kFmt, full: usd },
};

const ASSETS = [
  { name: "Heritage Square", color: "#3B82F6", share: 0.38 },
  { name: "Oakridge Plaza", color: "#22D3EE", share: 0.30 },
  { name: "Cedar Creek Trade", color: "#F59E0B", share: 0.18 },
  { name: "Pinecrest Residences", color: "#818CF8", share: 0.14 },
];

const PAYMENTS = [
  { tenant: "Heritage Cafe & Bakery", asset: "Heritage Square", amount: 2400 },
  { tenant: "Oakridge Dental Clinic", asset: "Oakridge Plaza", amount: 6800 },
  { tenant: "Mountain Creek HVAC", asset: "Cedar Creek Trade", amount: 3450 },
  { tenant: "Apartment 14-B", asset: "Pinecrest Residences", amount: 1450 },
];

const valueOf = (p: Pt, m: Metric) => (m === "occupancy" ? p.occupancy : m === "noi" ? p.noi : p.revenue);

function bandOf(p: Pt, m: Metric): [number, number] {
  const v = valueOf(p, m);
  if (!p.projected || p.low == null || p.high == null) return [v, v];
  const lo = (p.revenue - p.low) / p.revenue;
  const hi = (p.high - p.revenue) / p.revenue;
  if (m === "occupancy") return [v - lo * 10, Math.min(100, v + hi * 10)];
  return [v * (1 - lo), v * (1 + hi)];
}

function sharesAt(i: number) {
  const raw = ASSETS.map((a, k) => a.share + 0.012 * Math.sin(i * 0.9 + k * 1.7));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / sum);
}

// ─── Monotone cubic (Fritsch–Carlson) — never overshoots the data ───────────

function tangents(xs: number[], ys: number[]) {
  const n = xs.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1);
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return m;
}

function pathD(xs: number[], ys: number[], m: number[], cmd: "M" | "L" = "M") {
  let d = `${cmd} ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    d += ` C ${xs[i] + dx / 3} ${ys[i] + (m[i] * dx) / 3}, ${xs[i + 1] - dx / 3} ${ys[i + 1] - (m[i + 1] * dx) / 3}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  return d;
}

function evalAt(xs: number[], ys: number[], m: number[], x: number) {
  let i = 0;
  while (i < xs.length - 2 && x > xs[i + 1]) i++;
  const dx = xs[i + 1] - xs[i] || 1;
  const t = Math.min(1, Math.max(0, (x - xs[i]) / dx));
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * dx * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * dx * m[i + 1];
}

// Smoothly tween an array of numbers (used to morph the curve between metrics)
function useTween(target: number[], reduce: boolean) {
  const [cur, setCur] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current;
    if (reduce || from.length !== target.length) { ref.current = target; setCur(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 650);
      const e = 1 - Math.pow(1 - t, 3);
      const next = from.map((f, i) => f + (target[i] - f) * e);
      ref.current = next;
      setCur(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return cur.length === target.length ? cur : target;
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

/** Count-up number that animates once when scrolled into view. */
export function CountUp({ to, prefix = "", suffix = "", decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setV(to); return; }
    const c = animate(0, to, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, to, reduce]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

function Segmented<T extends string>({ id, value, options, onChange }: { id: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="relative flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${value === o.value ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
        >
          {value === o.value && (
            <motion.span
              layoutId={id}
              className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/20 shadow-[0_0_14px_rgba(56,189,248,0.25)]"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main chart ──────────────────────────────────────────────────────────────

export default function HeroChart() {
  const uid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { once: true, margin: "-60px" });
  const reduce = !!useReducedMotion();

  const [metric, setMetric] = useState<Metric>("revenue");
  const [range, setRange] = useState<Range>("6M");
  const [w, setW] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [openEvent, setOpenEvent] = useState<number | null>(null);
  const [hoverAsset, setHoverAsset] = useState<number | null>(null);
  const [toast, setToast] = useState<((typeof PAYMENTS)[number] & { id: number }) | null>(null);

  // Measure real pixel width → SVG renders 1:1 (no stretching, round dots)
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(Math.round(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cfg = METRICS[metric];
  const isMobile = w > 0 && w < 640;
  const H = isMobile ? 220 : 280;
  const PAD_L = 6;
  const PAD_R = isMobile ? 48 : 60;
  const PAD_T = 36;
  const PAD_B = 12;
  const plotW = Math.max(1, w - PAD_L - PAD_R);
  const plotH = H - PAD_T - PAD_B;
  const bottom = PAD_T + plotH;

  const data = useMemo(() => {
    const c = RANGE_COUNT[range];
    return [...ALL_POINTS.slice(N_HIST - c, N_HIST), ...ALL_POINTS.slice(N_HIST)];
  }, [range]);
  const n = data.length;
  const todayIdx = n - 3;
  const nActual = n - 2;

  const geo = useMemo(() => {
    const values = data.map((p) => valueOf(p, metric));
    const bands = data.slice(todayIdx).map((p) => bandOf(p, metric));
    const all = [...values, ...bands.flat()];
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    const span = hi - lo || 1;
    lo -= span * 0.14;
    hi += span * 0.08;
    const xs = data.map((_, i) => PAD_L + (i / (n - 1)) * plotW);
    const yOf = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * plotH;
    const target = [...values.map(yOf), ...bands.map((b) => yOf(b[1])), ...bands.map((b) => yOf(b[0]))];
    return { xs, lo, hi, target };
  }, [data, metric, plotW, plotH, n, todayIdx]);

  const cur = useTween(geo.target, reduce);
  const { xs, lo, hi } = geo;
  const k = n - todayIdx;
  const ys = cur.slice(0, n);
  const upper = cur.slice(n, n + k);
  const lower = cur.slice(n + k);
  const vOf = (y: number) => lo + (1 - (y - PAD_T) / plotH) * (hi - lo);

  // Paths
  const ax = xs.slice(0, nActual), ay = ys.slice(0, nActual);
  const fx = xs.slice(todayIdx), fy = ys.slice(todayIdx);
  const mA = tangents(ax, ay);
  const mF = tangents(fx, fy);
  const actualD = pathD(ax, ay, mA);
  const areaD = `${actualD} L ${ax[ax.length - 1]} ${bottom} L ${ax[0]} ${bottom} Z`;
  const forecastD = pathD(fx, fy, mF);
  const rfx = [...fx].reverse();
  const rlow = [...lower].reverse();
  const coneD = `${pathD(fx, upper, tangents(fx, upper))} ${pathD(rfx, rlow, tangents(rfx, rlow), "L")} Z`;

  // Scrub state
  const todayX = xs[todayIdx];
  const scrubbing = hoverX !== null;
  const scrubX = Math.min(xs[n - 1], Math.max(xs[0], hoverX ?? todayX));
  const scrubY = scrubX <= todayX ? evalAt(ax, ay, mA, scrubX) : evalAt(fx, fy, mF, scrubX);
  const scrubVal = vOf(scrubY);
  const nearest = Math.min(n - 1, Math.max(0, Math.round((scrubX - xs[0]) / (plotW / (n - 1)))));
  const active = data[nearest];
  const prev = nearest > 0 ? data[nearest - 1] : null;
  const diff = prev ? valueOf(active, metric) - valueOf(prev, metric) : 0;
  const pct = prev ? (diff / valueOf(prev, metric)) * 100 : 0;
  const deltaLabel = metric === "occupancy" ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} pts` : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  const shares = sharesAt(N_HIST - RANGE_COUNT[range] + nearest);

  // Rolling headline number (springs toward scrubbed value; counts up on reveal)
  const spring = useSpring(0, { stiffness: 170, damping: 26, mass: 0.6 });
  const [shown, setShown] = useState(0);
  useMotionValueEvent(spring, "change", (v) => setShown(v));
  const lastMetric = useRef(metric);
  useEffect(() => {
    if (!inView) return;
    if (reduce || lastMetric.current !== metric) {
      spring.jump(scrubVal);
      setShown(scrubVal);
      lastMetric.current = metric;
      return;
    }
    spring.set(scrubVal);
  }, [scrubVal, inView, metric, reduce, spring]);

  // Subtle live "payment received" toasts
  useEffect(() => {
    if (!inView) return;
    let i = 0;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      setToast({ ...PAYMENTS[i % PAYMENTS.length], id: Date.now() });
      i++;
      clearTimeout(hide);
      hide = setTimeout(() => setToast(null), 3800);
    };
    const first = setTimeout(fire, 2600);
    const iv = setInterval(fire, 7000);
    return () => { clearTimeout(first); clearInterval(iv); clearTimeout(hide); };
  }, [inView]);

  const step = Math.max(1, Math.ceil(n / (isMobile ? 4 : 9)));
  const showLabel = (i: number) =>
    i === todayIdx || (data[i].projected ? n <= 8 || i === n - 1 : i % step === 0 && i <= todayIdx - step);
  const labelText = (i: number) =>
    (range === "1Y" || range === "ALL") && (data[i].label === "Jan" || i === 0) ? `${data[i].label} ${data[i].year}` : data[i].label;

  const gridFracs = [0, 1 / 3, 2 / 3, 1];
  const pointerX = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHoverX(e.clientX - r.left);
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Portfolio Performance</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-purple-400/30 text-purple-200">
              <Sparkles size={11} /> PropOpsIQ Forecast
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Verified collections through October · Q4 projected from signed escalations &amp; weighted pipeline
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            id={`${uid}-metric`}
            value={metric}
            onChange={setMetric}
            options={[{ value: "revenue", label: "Revenue" }, { value: "occupancy", label: "Occupancy" }, { value: "noi", label: "NOI" }]}
          />
          <Segmented
            id={`${uid}-range`}
            value={range}
            onChange={(r) => { setRange(r); setHoverX(null); }}
            options={(["3M", "6M", "1Y", "ALL"] as Range[]).map((r) => ({ value: r, label: r }))}
          />
        </div>
      </div>

      {/* Chart chamber */}
      <div className="relative rounded-3xl border border-white/12 bg-gradient-to-b from-white/[0.045] via-black/20 to-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_40px_rgba(56,189,248,0.06)] overflow-hidden">
        {/* Ambient light, tinted by metric */}
        <div className="pointer-events-none absolute -top-20 left-1/4 w-[60%] h-56 rounded-full blur-3xl opacity-70" style={{ background: `radial-gradient(closest-side, rgba(${cfg.rgb},0.22), transparent)` }} />
        <div className="pointer-events-none absolute bottom-0 right-0 w-1/2 h-40 rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(168,85,247,0.14), transparent)" }} />

        {/* HUD */}
        <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 sm:px-6 pt-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>{cfg.label}</span>
              <span className="text-slate-600">·</span>
              <span className="normal-case tracking-normal text-slate-300">{active.full}</span>
              {active.projected ? (
                <span className="normal-case tracking-normal px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-400/30">AI forecast</span>
              ) : (
                <span className="normal-case tracking-normal inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-400/25">
                  <CheckCircle2 size={10} /> Verified
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-[32px] sm:text-[42px] leading-none font-semibold text-white tabular-nums tracking-tight">{cfg.full(shown)}</span>
              {prev && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md ${diff >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"}`}>
                  {diff >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {deltaLabel}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400 truncate">
              {active.event?.title ?? (active.projected ? "Projected from signed escalations + weighted pipeline" : "Verified rent roll · auto-reconciled nightly")}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.9)]" />
              <span className="text-slate-400">Occupancy</span>
              <span className="font-semibold text-white tabular-nums">{active.occupancy.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <ArrowUpRight size={13} className="text-emerald-400" />
              <span className="text-slate-400">vs budget</span>
              <span className="font-semibold text-emerald-400">+14.2%</span>
            </div>
          </div>
        </div>

        {/* Plot */}
        <div ref={plotRef} className="relative mt-3 mx-2 sm:mx-3" style={{ height: H }}>
          {w > 0 && (
            <>
              <svg width={w} height={H} className="absolute inset-0 overflow-visible">
                <defs>
                  <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cfg.c1} stopOpacity="0.36" style={{ transition: "stop-color .6s" }} />
                    <stop offset="50%" stopColor="#6366F1" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={`${uid}-line`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="60%" stopColor={cfg.c1} style={{ transition: "stop-color .6s" }} />
                    <stop offset="100%" stopColor={cfg.c2} style={{ transition: "stop-color .6s" }} />
                  </linearGradient>
                  <linearGradient id={`${uid}-cone`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0.26" />
                  </linearGradient>
                  <filter id={`${uid}-glow`} filterUnits="userSpaceOnUse" x="0" y="0" width={w} height={H}>
                    <feGaussianBlur stdDeviation="5" />
                  </filter>
                  <clipPath id={`${uid}-reveal`}>
                    <motion.rect
                      key={range}
                      x="0"
                      y="0"
                      height={H}
                      initial={{ width: 0 }}
                      animate={{ width: inView ? w + 40 : 0 }}
                      transition={{ duration: reduce ? 0 : 1.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </clipPath>
                  <clipPath id={`${uid}-scrub`}>
                    <rect x="0" y="0" width={Math.max(0, scrubX)} height={H} />
                  </clipPath>
                </defs>

                {/* Grid */}
                {gridFracs.map((f) => {
                  const y = PAD_T + f * plotH;
                  return (
                    <line key={f} x1={PAD_L} x2={w - PAD_R + 6} y1={y} y2={y} stroke={f === 1 ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"} strokeDasharray={f === 1 ? undefined : "2 6"} />
                  );
                })}

                <g clipPath={`url(#${uid}-reveal)`}>
                  <path d={areaD} fill={`url(#${uid}-area)`} />
                  <path d={coneD} fill={`url(#${uid}-cone)`} />
                  <path d={forecastD} fill="none" stroke="#C084FC" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" opacity="0.9" />
                  {/* Glow halo */}
                  <path d={actualD} fill="none" stroke={cfg.c1} strokeWidth="7" opacity="0.45" filter={`url(#${uid}-glow)`} />
                  {/* Dimmed base (visible to the right of the cursor) */}
                  <path d={actualD} fill="none" stroke={`url(#${uid}-line)`} strokeWidth="2.5" strokeLinecap="round" opacity="0.28" />
                  {/* Bright line up to the cursor */}
                  <g clipPath={`url(#${uid}-scrub)`}>
                    <path d={actualD} fill="none" stroke={`url(#${uid}-line)`} strokeWidth="2.75" strokeLinecap="round" />
                    <path d={actualD} fill="none" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" opacity="0.65" />
                  </g>
                </g>

                {/* Today divider */}
                <line x1={todayX} x2={todayX} y1={PAD_T - 8} y2={bottom} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" />
                {/* Scrub guide */}
                {scrubbing && <line x1={scrubX} x2={scrubX} y1={PAD_T - 8} y2={bottom} stroke={`rgba(${cfg.rgb},0.5)`} strokeWidth="1" />}
              </svg>

              {/* Y-axis labels (HTML = always crisp) */}
              <motion.div
                key={metric + range}
                className="absolute inset-y-0 right-0 pointer-events-none"
                style={{ width: PAD_R }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {gridFracs.map((f) => (
                  <span key={f} className="absolute right-0 -translate-y-1/2 text-[10px] font-medium tabular-nums text-slate-500" style={{ top: PAD_T + f * plotH }}>
                    {cfg.tick(lo + (1 - f) * (hi - lo))}
                  </span>
                ))}
              </motion.div>

              {/* Scrub surface */}
              <div
                className="absolute inset-0 z-10 cursor-crosshair"
                style={{ touchAction: "pan-y" }}
                onPointerMove={pointerX}
                onPointerDown={pointerX}
                onPointerLeave={() => setHoverX(null)}
              />

              {/* Overlays revealed after the line draws in */}
              <motion.div
                className="absolute inset-0 z-20 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: inView ? 1 : 0 }}
                transition={{ delay: reduce ? 0 : 1.1, duration: 0.5 }}
              >
                {/* TODAY pill */}
                <div
                  className="absolute -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-sky-300 bg-[#0B1224]/90 border border-sky-400/30 shadow-[0_0_12px_rgba(56,189,248,0.25)] whitespace-nowrap"
                  style={{ left: todayX, top: 4 }}
                >
                  TODAY · {data[todayIdx].label.toUpperCase()}
                </div>

                {/* Live pulse on the latest point */}
                {toast && !reduce && (
                  <motion.span
                    key={toast.id}
                    className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2"
                    style={{ left: todayX, top: ys[todayIdx], borderColor: cfg.c1 }}
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 2.8, opacity: 0 }}
                    transition={{ duration: 1.3, ease: "easeOut" }}
                  />
                )}

                {/* Scrub dot */}
                <div
                  className="absolute w-[34px] h-[34px] -ml-[17px] -mt-[17px] rounded-full"
                  style={{ left: scrubX, top: scrubY, background: `radial-gradient(circle, rgba(${scrubX > todayX ? "168,85,247" : cfg.rgb},0.35), transparent 70%)` }}
                />
                <div
                  className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-white"
                  style={{ left: scrubX, top: scrubY, boxShadow: `0 0 0 3px ${scrubX > todayX ? "#A855F7" : cfg.c1}, 0 0 18px 3px rgba(${cfg.rgb},0.7)` }}
                />

                {/* Event pins */}
                {data.map((p, i) =>
                  p.event ? (
                    <div
                      key={i}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                      style={{ left: xs[i], top: ys[i] - 24 }}
                      onPointerEnter={() => { setOpenEvent(i); setHoverX(xs[i]); }}
                      onPointerLeave={() => setOpenEvent(null)}
                    >
                      <button
                        type="button"
                        onClick={() => { setOpenEvent(openEvent === i ? null : i); setHoverX(xs[i]); }}
                        className={`relative grid place-items-center w-5 h-5 rounded-full bg-[#0B1224] border shadow-[0_0_12px_rgba(0,0,0,0.6)] ${p.projected ? "border-purple-400/60" : "border-amber-300/50"}`}
                      >
                        <Flag size={10} className={p.projected ? "text-purple-300" : "text-amber-300"} />
                        <span className="absolute left-1/2 top-full h-2 w-px bg-white/25" />
                      </button>
                      <AnimatePresence>
                        {openEvent === i && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.18 }}
                            className="absolute bottom-full mb-2 w-56 rounded-2xl border border-white/15 bg-[#0B1224]/90 backdrop-blur-xl p-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                            style={xs[i] < 130 ? { left: 0 } : xs[i] > w - 130 ? { right: 0 } : { left: "50%", x: "-50%" }}
                          >
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${p.projected ? "text-purple-300" : "text-amber-300"}`}>
                              {p.full}{p.projected ? " · Forecast" : ""}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-white">{p.event.title}</div>
                            <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{p.event.detail}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : null
                )}

                {/* Floating glass tooltip */}
                {scrubbing && openEvent === null && (
                  <div
                    className="absolute min-w-[150px] rounded-2xl border border-white/15 bg-[#0B1224]/85 backdrop-blur-xl px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                    style={{
                      left: w < 420 ? Math.min(Math.max(scrubX - 80, 8), Math.max(w - 190, 8)) : scrubX,
                      top: Math.max(4, Math.min(H - 92, scrubY - 44)),
                      transform: w < 420 ? "none" : scrubX > w - 200 ? "translateX(calc(-100% - 18px))" : "translateX(18px)",
                    }}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      {active.full}{active.projected ? " · Forecast" : ""}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-white tabular-nums">{cfg.full(scrubVal)}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 whitespace-nowrap">
                      <span>Occ. <b className="text-slate-200 font-semibold">{active.occupancy.toFixed(1)}%</b></span>
                      {prev && <span className={diff >= 0 ? "text-emerald-400" : "text-rose-400"}>{deltaLabel} MoM</span>}
                    </div>
                    {active.projected && (
                      <div className="mt-1 text-[10px] text-purple-300 whitespace-nowrap">
                        Range {cfg.tick(bandOf(active, metric)[0])} – {cfg.tick(bandOf(active, metric)[1])}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Payment toast */}
              <div className="absolute left-3 top-1 z-30 pointer-events-none">
                <AnimatePresence>
                  {toast && (
                    <motion.div
                      key={toast.id}
                      initial={{ opacity: 0, y: -10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="flex items-center gap-2.5 rounded-2xl border border-white/12 bg-[#0B1224]/85 backdrop-blur-xl pl-1.5 pr-3 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                    >
                      <span className="grid place-items-center w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/30">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                      </span>
                      <div className="leading-tight">
                        <div className="text-[11px] font-semibold text-white whitespace-nowrap">
                          Payment received <span className="text-emerald-400 tabular-nums">+{usd(toast.amount)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 whitespace-nowrap">{toast.tenant} · {toast.asset}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* X-axis (HTML, tap to pin a month) */}
        <div className="relative mx-2 sm:mx-3 h-8">
          {w > 0 &&
            data.map((p, i) =>
              showLabel(i) ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHoverX(xs[i])}
                  className={`absolute top-1.5 -translate-x-1/2 px-1.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    i === nearest ? "text-white bg-white/10" : p.projected ? "text-purple-300/80 hover:text-purple-200" : "text-slate-500 hover:text-slate-300"
                  }`}
                  style={{ left: xs[i] }}
                >
                  {labelText(i)}
                </button>
              ) : null
            )}
        </div>

        {/* Revenue mix by asset */}
        <div className="relative border-t border-white/[0.07] px-5 sm:px-6 py-4">
          <div className="flex items-center justify-between text-[11px] mb-2.5">
            <span className="font-semibold uppercase tracking-wider text-slate-400">Revenue mix · {active.full}</span>
            <span className="text-slate-400 tabular-nums">{usd(active.revenue)}</span>
          </div>
          <div className="flex h-2 w-full gap-[3px]">
            {ASSETS.map((a, idx) => (
              <motion.div
                key={a.name}
                className="h-full rounded-full cursor-pointer"
                style={{ background: a.color, boxShadow: `0 0 10px ${a.color}66` }}
                initial={false}
                animate={{ width: `${shares[idx] * 100}%`, opacity: hoverAsset === null || hoverAsset === idx ? 1 : 0.25 }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
                onMouseEnter={() => setHoverAsset(idx)}
                onMouseLeave={() => setHoverAsset(null)}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-2">
            {ASSETS.map((a, idx) => (
              <div
                key={a.name}
                onMouseEnter={() => setHoverAsset(idx)}
                onMouseLeave={() => setHoverAsset(null)}
                className={`flex items-center gap-2 text-[11px] cursor-default transition-opacity ${hoverAsset === null || hoverAsset === idx ? "opacity-100" : "opacity-40"}`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                <span className="text-slate-300 truncate">{a.name}</span>
                <span className="ml-auto tabular-nums text-white font-semibold">${((active.revenue * shares[idx]) / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-5 sm:px-6 py-3 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full" style={{ background: `linear-gradient(90deg, #818CF8, ${cfg.c1})` }} />
              Verified actuals
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-purple-400" />
              PropOpsIQ forecast
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-purple-500/25" />
              Confidence range
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px]">
            <Activity size={12} className="text-emerald-400" />
            Drag across the chart to explore
          </span>
        </div>
      </div>
    </div>
  );
}
