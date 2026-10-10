"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radar, RefreshCw, Loader2, ExternalLink,
  Flame, ThermometerSun, Snowflake, HelpCircle,
  Sparkles, Globe, ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntelItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  score: "hot" | "warm" | "cold" | "unknown";
  reason: string;
}

interface IntelResponse {
  items: IntelItem[];
  fetchedAt: string;
  totalScanned: number;
  totalRelevant: number;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SCORE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string; border: string }> = {
  hot: {
    icon: <Flame size={12} />,
    label: "Hot Lead",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.3)",
  },
  warm: {
    icon: <ThermometerSun size={12} />,
    label: "Warm Signal",
    color: "#FACC15",
    bg: "rgba(250,204,21,0.08)",
    border: "rgba(250,204,21,0.25)",
  },
  cold: {
    icon: <Snowflake size={12} />,
    label: "Low Relevance",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.06)",
    border: "rgba(96,165,250,0.2)",
  },
  unknown: {
    icon: <HelpCircle size={12} />,
    label: "Unscored",
    color: "#6B7280",
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
  },
};

const FILTER_OPTS = [
  { key: "all",  label: "All Signals" },
  { key: "hot",  label: "🔥 Hot" },
  { key: "warm", label: "🟡 Warm" },
  { key: "cold", label: "❄️ Cold" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketIntel() {
  const [data, setData] = useState<IntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const fetchIntel = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/market-intel");
      if (!res.ok) throw new Error("Failed to fetch");
      const d: IntelResponse = await res.json();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load market intel");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  const filtered = data?.items?.filter(i => filter === "all" || i.score === filter) || [];
  const hotCount = data?.items?.filter(i => i.score === "hot").length || 0;
  const warmCount = data?.items?.filter(i => i.score === "warm").length || 0;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#F97316] flex items-center justify-center shadow-lg shadow-[rgba(239,68,68,0.2)]">
              <Radar size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Market Intel Radar
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-[#EF4444] to-[#F97316] text-white opacity-80">BETA</span>
              </h2>
              <p className="text-[11px] text-gray-500">AI-scanned relocation signals • Updates on demand</p>
            </div>
          </div>
          <button
            onClick={fetchIntel}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Scanning…" : "Scan Now"}
          </button>
        </div>

        {/* Stats row */}
        {data && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Sources Scanned", value: String(data.totalScanned), color: "#94A3B8" },
              { label: "Relevant Signals", value: String(data.totalRelevant), color: "#4ADE80" },
              { label: "Hot Leads", value: String(hotCount), color: hotCount > 0 ? "#EF4444" : "#4B5563" },
              { label: "Warm Signals", value: String(warmCount), color: warmCount > 0 ? "#FACC15" : "#4B5563" },
            ].map(s => (
              <div key={s.label} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3">
                <p className="text-[10px] text-gray-600 mb-0.5">{s.label}</p>
                <p className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* How it works — collapsed info */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-3">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Sparkles size={11} className="text-[#4ADE80] flex-shrink-0" />
            <span>
              Scans <strong className="text-gray-400">Google News</strong>,{" "}
              <strong className="text-gray-400">BusinessWire</strong>, and{" "}
              <strong className="text-gray-400">PR Newswire</strong> for companies
              expanding, relocating, or opening offices — then <strong className="text-gray-400">Gemini AI</strong>{" "}
              scores each signal for relevance to Vision LLC.
            </span>
          </div>
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#F97316] flex items-center justify-center animate-pulse">
              <Radar size={28} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#4ADE80] flex items-center justify-center">
              <Loader2 size={11} className="text-black animate-spin" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-bold">Scanning news feeds…</p>
          <p className="text-[11px] text-gray-700">Fetching from 7+ sources • AI scoring in progress</p>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !loading && (
        <div className="rounded-2xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)] p-5 text-center">
          <p className="text-sm text-red-400 font-bold mb-2">⚠️ Failed to scan</p>
          <p className="text-xs text-gray-500">{error}</p>
          <button onClick={fetchIntel} className="mt-3 text-xs text-[#4ADE80] hover:underline">Try Again</button>
        </div>
      )}

      {/* ── Results ── */}
      {data && !loading && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_OPTS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === f.key
                    ? "bg-[rgba(255,255,255,0.08)] text-white border border-[rgba(255,255,255,0.15)]"
                    : "text-gray-600 hover:text-gray-300 border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="text-[10px] text-gray-700 ml-auto">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Items */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-3">📡</span>
              <p className="text-gray-500 font-bold">No signals found for this filter</p>
              <p className="text-xs text-gray-600 mt-1">Try broadening to &ldquo;All Signals&rdquo; or click Scan Now to refresh.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item, idx) => {
                const cfg = SCORE_CONFIG[item.score] || SCORE_CONFIG.unknown;
                const isExpanded = expandedIdx === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border overflow-hidden transition-all"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                  >
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      {/* Score badge */}
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex-shrink-0 border"
                        style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1.5">
                          <Globe size={9} />
                          {item.source}
                          {item.pubDate && (
                            <>
                              {" · "}
                              {new Date(item.pubDate).toLocaleDateString("en-US", {
                                month: "short", day: "numeric",
                              })}
                            </>
                          )}
                        </p>
                      </div>

                      <ChevronDown
                        size={14}
                        className={`text-gray-600 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t" style={{ borderColor: cfg.border }}>
                        {/* AI Reason */}
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[rgba(0,0,0,0.2)] p-3">
                          <Sparkles size={12} className="text-[#4ADE80] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">AI Analysis</p>
                            <p className="text-xs text-gray-300">{item.reason || "No analysis available."}</p>
                          </div>
                        </div>

                        {/* Action row */}
                        <div className="flex items-center gap-2 mt-3">
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors"
                            >
                              <ExternalLink size={11} /> Read Article
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-2 pb-4">
            <p className="text-[10px] text-gray-700">
              Last scan: {new Date(data.fetchedAt).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
              {" · "}Phase 2 — Google Alerts + RSS + AI Scoring
              {" · "}
              <span className="text-gray-600">
                Upgrade to Phase 3 for job posting monitoring + SEC filing analysis
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
