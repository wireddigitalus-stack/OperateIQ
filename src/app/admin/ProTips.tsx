"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  X,
  HelpCircle,
  BookOpen,
  Search,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
} from "lucide-react";
import {
  SECTION_CATEGORIES,
  TAB_LABELS,
  ACCENT_STYLES,
  getTipsForCategory,
  type TabKey,
} from "@/lib/help-data";

export type { TabKey };

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProTips({ activeTab, customerCode }: { activeTab: TabKey; customerCode?: string }) {
  const [open, setOpen] = useState(false);
  const [copiedSupportId, setCopiedSupportId] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TabKey>(activeTab);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [pulse, setPulse] = useState(false);
  const [mobileShowArticle, setMobileShowArticle] = useState(false);
  const prevTab = useRef<TabKey>(activeTab);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync selectedCategory when user switches tabs in the dashboard
  useEffect(() => {
    if (prevTab.current !== activeTab) {
      prevTab.current = activeTab;
      setSelectedCategory(activeTab);
      setSelectedIdx(0);
      setMobileShowArticle(false);
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1800);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  // Also reset to current activeTab whenever the modal is freshly opened
  const handleOpen = () => {
    setSelectedCategory(activeTab);
    setSelectedIdx(0);
    setSearchQuery("");
    setMobileShowArticle(false);
    setOpen(true);
  };

  // Allow opening from top header button via custom event
  useEffect(() => {
    const onOpenEvent = () => {
      setSelectedCategory(activeTab);
      setSelectedIdx(0);
      setSearchQuery("");
      setMobileShowArticle(false);
      setOpen(true);
    };
    window.addEventListener("open-help-center", onOpenEvent);
    return () => window.removeEventListener("open-help-center", onOpenEvent);
  }, [activeTab]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Lock background page scroll while the expanded modal overlay is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Build list of tips for selected category (plus global AI tips), or search across all categories
  const displayedTips = useMemo(
    () => getTipsForCategory(selectedCategory, searchQuery, "all"),
    [selectedCategory, searchQuery]
  );

  const safeIdx = Math.min(selectedIdx, Math.max(0, displayedTips.length - 1));
  const current = displayedTips[safeIdx] ?? null;

  const scrollCardToTop = () => {
    overlayRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div translate="no" className="notranslate">
      {/* ── Modern Floating Help & Guide Trigger Button ── */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Open Help & Guide Center"
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 sm:gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl
          bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm
          border border-sky-300/30
          shadow-[0_10px_30px_rgba(37,99,235,0.45),0_0_20px_rgba(56,189,248,0.35)]
          hover:shadow-[0_12px_36px_rgba(37,99,235,0.65),0_0_28px_rgba(56,189,248,0.55)]
          hover:scale-[1.03] active:scale-95 transition-all duration-200 select-none cursor-pointer
          ${pulse ? "ring-4 ring-sky-400/40" : ""}`}
        title="Open Help & Guide Center"
      >
        <HelpCircle size={18} className="text-white flex-shrink-0 sm:w-5 sm:h-5" />
        <span className="tracking-tight">Help &amp; Guide</span>
        {pulse && (
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
        )}
      </button>

      {/* ── Full-Height Expanding Modal Popup (Persistently Mounted, Scrolls via Outer Overlay) ── */}
      <div
        ref={overlayRef}
        aria-hidden={!open}
        onMouseDown={(e) => {
          if (
            e.target === e.currentTarget &&
            e.clientX < e.currentTarget.clientWidth
          ) {
            setOpen(false);
          }
        }}
        className={
          open
            ? "fixed inset-0 z-[200] overflow-y-auto p-3 sm:p-6 md:p-10 flex items-start justify-center"
            : "hidden"
        }
      >
          {/* Full-Viewport Backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          />

          {/* Modal Card — Expands Downward Naturally */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="PropOpsIQ Help and Guide Center"
            className="relative my-auto w-full max-w-5xl h-auto flex flex-col bg-[#0B1120] border border-white/15 rounded-3xl
              shadow-[0_25px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(56,189,248,0.16)] overflow-hidden
              animate-in zoom-in-95 fade-in duration-200"
          >
            {/* ── Top Header Bar ── */}
            <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-3.5 sm:pb-5 border-b border-white/10 bg-gradient-to-r from-sky-500/[0.08] via-indigo-500/[0.05] to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 flex-shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_24px_rgba(56,189,248,0.4)] flex-shrink-0">
                  <BookOpen size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                      Help &amp; Guide Center
                    </h2>
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-sky-500/15 border border-sky-400/30 text-sky-300">
                      {TAB_LABELS[selectedCategory] || "Platform Guide"}
                    </span>
                    {customerCode && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(customerCode).catch(() => {});
                          setCopiedSupportId(true);
                          setTimeout(() => setCopiedSupportId(false), 2000);
                        }}
                        title="Click to copy your Support ID"
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        {copiedSupportId ? "Copied!" : `Support ID: ${customerCode}`}
                      </button>
                    )}
                  </div>
                  <p className="text-xs sm:text-base text-slate-300 mt-0.5 sm:mt-1 hidden sm:block">
                    Step-by-step guides and best practices for your workspace
                  </p>
                </div>
              </div>

              {/* Search + Full Tech Support Link + Close */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedIdx(0);
                      setMobileShowArticle(false);
                    }}
                    placeholder="Search all help topics..."
                    className="w-full pl-9 pr-8 py-2 sm:py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:bg-white/[0.09] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedIdx(0);
                        setMobileShowArticle(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <Link
                  href={`/help?category=${selectedCategory}`}
                  target="_blank"
                  className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-xs font-bold text-sky-200 hover:text-white transition-all shrink-0"
                  title="Open full Help & Tech Support Page in a new tab"
                >
                  <LifeBuoy size={15} className="text-sky-400" />
                  <span>Full Support Page</span>
                  <ExternalLink size={12} />
                </Link>

                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close Help Center"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Responsive Category Grid (No Horizontal Scrollbar) ── */}
            {!searchQuery && (
              <div className="px-4 sm:px-8 py-2.5 sm:py-3.5 border-b border-white/10 bg-[#080D1A]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 sm:gap-2">
                  {SECTION_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive =
                      selectedCategory === cat.key ||
                      (cat.key === "marketing-blog" && selectedCategory.startsWith("marketing")) ||
                      (cat.key === "content-properties" && selectedCategory.startsWith("content"));
                    return (
                      <button
                        key={cat.key}
                        onClick={() => {
                          setSelectedCategory(cat.key);
                          setSelectedIdx(0);
                          setMobileShowArticle(false);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-left ${
                          isActive
                            ? "bg-gradient-to-r from-sky-500/25 to-indigo-500/20 border border-sky-400/60 text-white shadow-[0_0_16px_rgba(56,189,248,0.22)]"
                            : "bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.07] hover:border-white/20"
                        }`}
                      >
                        <Icon
                          size={15}
                          className={`flex-shrink-0 ${isActive ? "text-sky-400" : "text-slate-400"}`}
                        />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Main Split Body: Full Natural Height (Left Topic List + Right Guide Content) ── */}
            <div className="flex flex-col md:flex-row items-stretch">
              {/* Left Sidebar: Full-Height Topic List */}
              <div className={`${mobileShowArticle ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-white/10 bg-[#090E1C] flex-col md:flex-shrink-0`}>
                <div className="px-5 pt-3.5 pb-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400 truncate">
                    {searchQuery
                      ? `Search Results (${displayedTips.length})`
                      : `${TAB_LABELS[selectedCategory] || "Section"} (${displayedTips.length})`}
                  </span>
                </div>

                {/* Expanded Topic List (No Inner Scroll Window) */}
                <div className="p-3 sm:p-4 space-y-1.5">
                  {displayedTips.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-base font-bold text-slate-300">No matching guides found</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Try a different keyword or clear the search filter.
                      </p>
                    </div>
                  ) : (
                    displayedTips.map((tip, i) => {
                      const Icon = tip.icon;
                      const accent = ACCENT_STYLES[tip.accent || "blue"];
                      const isSelected = safeIdx === i;
                      return (
                        <button
                          key={`${tip.title}-${i}`}
                          data-tip-idx={i}
                          onClick={() => {
                            setSelectedIdx(i);
                            setMobileShowArticle(true);
                            scrollCardToTop();
                          }}
                          className={`w-full text-left p-3.5 rounded-2xl flex items-start gap-3.5 transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-gradient-to-r from-sky-500/20 to-indigo-500/10 border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.12)]"
                              : "bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/10"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${accent.badgeBg} ${accent.badgeBorder}`}
                          >
                            <Icon size={20} className={accent.iconText} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm sm:text-base font-bold leading-snug ${
                                isSelected ? "text-white" : "text-slate-100"
                              }`}
                            >
                              {tip.title}
                            </p>
                            <p className="text-xs text-slate-300 mt-1 truncate">
                              {tip.categoryLabel}
                            </p>
                          </div>
                          <ChevronRight
                            size={18}
                            className={`flex-shrink-0 mt-2 transition-transform ${
                              isSelected ? "text-sky-400 translate-x-0.5" : "text-slate-600"
                            }`}
                          />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Content Pane: Full Natural Height (No Inner Scroll Window) */}
              <div className={`${mobileShowArticle ? "flex" : "hidden md:flex"} flex-1 flex-col justify-between p-4 sm:p-8 md:p-10 bg-[#0B1120]`}>
                {current ? (
                  <div key={`${current.title}-${safeIdx}`} className="animate-in fade-in duration-200">
                    {/* Back to Topics button on mobile */}
                    <div className="md:hidden -mx-4 px-4 pb-3 mb-4 border-b border-white/10">
                      <button
                        onClick={() => {
                          setMobileShowArticle(false);
                          scrollCardToTop();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/35 text-xs font-bold text-sky-300 hover:text-white transition-colors"
                      >
                        <ChevronLeft size={14} />
                        ← Back to Topics
                      </button>
                    </div>
                    {/* Interactive Segmented Topic Stepper Graphic */}
                    {displayedTips.length > 1 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                          <span className="uppercase tracking-wider text-sky-400">
                            Guide {safeIdx + 1} of {displayedTips.length}
                          </span>
                          <span>Click any bar to jump</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {displayedTips.map((t, idx) => {
                            const isCurrent = idx === safeIdx;
                            const isPast = idx < safeIdx;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedIdx(idx)}
                                title={t.title}
                                aria-label={`Jump to guide ${idx + 1}: ${t.title}`}
                                className={`h-2 flex-1 rounded-full transition-all cursor-pointer ${
                                  isCurrent
                                    ? "bg-gradient-to-r from-sky-400 to-indigo-400 shadow-[0_0_12px_rgba(56,189,248,0.6)] scale-y-125"
                                    : isPast
                                    ? "bg-sky-500/45 hover:bg-sky-400/70"
                                    : "bg-white/10 hover:bg-white/25"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Category Pill + Icon Header */}
                    {(() => {
                      const Icon = current.icon;
                      const accent = ACCENT_STYLES[current.accent || "blue"];
                      return (
                        <div className="flex items-start gap-4 sm:gap-5 mb-6">
                          <div
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-lg ${accent.badgeBg} ${accent.badgeBorder}`}
                          >
                            <Icon size={30} className={accent.iconText} />
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border mb-2 ${accent.pillBg} ${accent.pillText}`}
                            >
                              {current.categoryLabel}
                            </span>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                              {current.title}
                            </h3>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Main Legible Body Text */}
                    <div className="bg-white/[0.04] border border-white/15 rounded-2xl p-5 sm:p-6 mb-6">
                      <p className="text-base sm:text-lg text-white leading-relaxed">
                        {current.body}
                      </p>
                    </div>

                    {/* Key Takeaways / Highlights Box */}
                    {current.highlights && current.highlights.length > 0 && (
                      <div className="bg-sky-500/[0.06] border border-sky-400/25 rounded-2xl p-5 sm:p-6">
                        <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-300 mb-3.5 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-sky-400" />
                          Key Takeaways &amp; Quick Tips
                        </p>
                        <ul className="space-y-2.5">
                          {current.highlights.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-3 text-sm sm:text-base text-slate-100 leading-relaxed"
                            >
                              <span className="w-2 h-2 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Bottom Navigation Controls */}
                <div className="flex items-center justify-between gap-4 mt-8 pt-5 border-t border-white/10">
                  <button
                    onClick={() => {
                      setSelectedIdx((i) => Math.max(0, i - 1));
                      scrollCardToTop();
                    }}
                    disabled={safeIdx === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-sm font-bold text-slate-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                    Previous Topic
                  </button>

                  <span className="text-sm font-bold text-slate-300">
                    Topic {displayedTips.length > 0 ? safeIdx + 1 : 0} of {displayedTips.length}
                  </span>

                  <button
                    onClick={() => {
                      setSelectedIdx((i) => Math.min(displayedTips.length - 1, i + 1));
                      scrollCardToTop();
                    }}
                    disabled={safeIdx >= displayedTips.length - 1}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sm font-bold text-sky-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    Next Topic
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Modal Footer ── */}
            <div className="px-6 sm:px-8 py-4 bg-[#070B14] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300">
                <span>
                  Press <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-xs">Esc</kbd> to close
                </span>
                <span className="hidden sm:inline text-slate-600">·</span>
                <Link
                  href={`/help?category=${selectedCategory}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 font-bold text-sky-300 hover:text-white underline underline-offset-4"
                >
                  <span>Open Full Help &amp; Tech Support Center</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold hover:opacity-95 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
