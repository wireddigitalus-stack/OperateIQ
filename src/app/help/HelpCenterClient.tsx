"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  BookOpen,
  Wrench,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  LifeBuoy,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  ThumbsUp,
  MessageSquarePlus,
  Loader2,
  X,
  Type,
  Layers,
  Zap,
  Printer,
  Activity,
  QrCode,
  Wifi,
  Camera,
  Mic,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import {
  TIPS,
  SECTION_CATEGORIES,
  TAB_LABELS,
  ACCENT_STYLES,
  TECH_SUPPORT_GUIDES,
  QUICK_START_STEPS,
  BASIC_FAQS,
  getTipsForCategory,
  type TabKey,
} from "@/lib/help-data";
import { BRAND } from "@/lib/brand";
import { getCustomerCode } from "@/lib/platform";

type TextScale = "normal" | "large" | "xlarge";
type ActiveSectionTab = "all" | "protips" | "techsupport" | "faq";
type AudienceFilter = "all" | "admin" | "crew";

type DiagnosticResult = {
  id: string;
  label: string;
  status: "pass" | "warn";
  detail: string;
  icon: "wifi" | "storage" | "camera" | "mic";
};

const POPULAR_QUESTIONS = [
  "How do I import my rent roll spreadsheet?",
  "How do maintenance & cleaning crews log in with a 6-digit PIN?",
  "How do I record monthly rent payments?",
  "Why isn't my property showing on my public website?",
  "How do I connect my GoDaddy or Cloudflare domain?",
  "How do I reset my password or use a Magic Link?",
];

function getDeepLinkForTip(categoryKey: TabKey, tipTitle: string): { href: string; label: string } {
  const titleLower = tipTitle.toLowerCase();
  if (titleLower.includes("import") || titleLower.includes("excel")) {
    return { href: "/admin?action=import", label: "Launch AI Document / Excel Import" };
  }
  if (titleLower.includes("rent ledger")) {
    return { href: "/admin?tab=rentledger", label: "Open Monthly Rent Ledger" };
  }
  if (titleLower.includes("task board")) {
    return { href: "/admin?tab=tasks", label: "Open Shared & Private Task Board" };
  }
  if (titleLower.includes("comm board")) {
    return { href: "/admin?tab=conversations", label: "Open Team Comm Board" };
  }
  if (titleLower.includes("maintenance crew portal")) {
    return { href: "/staff/maintenance", label: "Open Maintenance Crew PIN Portal" };
  }
  if (titleLower.includes("cleaning crew portal")) {
    return { href: "/staff/cleaning", label: "Open Cleaning Crew PIN Portal" };
  }
  if (categoryKey === "global") {
    return { href: "/admin", label: "Open Admin Dashboard" };
  }
  return {
    href: `/admin?tab=${categoryKey}`,
    label: `Open ${TAB_LABELS[categoryKey] || "Module"} in Dashboard`,
  };
}

export default function HelpCenterClient() {
  // Reading size comfort state (persisted in localStorage)
  const [textScale, setTextScale] = useState<TextScale>("large");
  const [activeView, setActiveView] = useState<ActiveSectionTab>("all");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");

  // Search & AI Assistant states
  const [searchQuery, setSearchQuery] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    question: string;
    answer: string;
    relatedGuides: { title: string; categoryLabel: string; categoryKey?: TabKey; supportId?: string }[];
  } | null>(null);

  // ProTips Explorer states
  const [selectedCategory, setSelectedCategory] = useState<TabKey>("leads");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, "yes" | "more">>({});

  // Tech Support expanded guide & live diagnostics state
  const [expandedSupportId, setExpandedSupportId] = useState<string | null>("login-access");
  const [supportCategoryFilter, setSupportCategoryFilter] = useState<string>("All");
  const [runningDiag, setRunningDiag] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticResult[] | null>(null);

  // Printable Crew PIN Poster Modal state
  const [showCrewPosterModal, setShowCrewPosterModal] = useState(false);
  const [originUrl, setOriginUrl] = useState(`https://${BRAND.domain}`);

  // Customer Support Code state (from active authenticated org session)
  const [customerCode, setCustomerCode] = useState<string | null>(null);
  const [copiedCustomerCode, setCopiedCustomerCode] = useState(false);

  // Direct Support Ticket Form state (connected to Master Admin /platform Support Area)
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportCompany, setSupportCompany] = useState("");
  const [supportCodeInput, setSupportCodeInput] = useState("");
  const [supportCategory, setSupportCategory] = useState("Login & Access");
  const [supportPriority, setSupportPriority] = useState<"Normal" | "High" | "Urgent">("Normal");
  const [supportMessage, setSupportMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState<{ id: string; code: string } | null>(null);
  const [ticketError, setTicketError] = useState("");

  // FAQ states
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>({
    "faq-import": true,
    "faq-crew-login": true,
  });
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>("All");

  const explorerRef = useRef<HTMLDivElement>(null);
  const techSupportRef = useRef<HTMLDivElement>(null);

  // Read URL params on mount for deep-linking (?category=tenants&topic=2 or ?q=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOriginUrl(window.location.origin);

    const savedScale = window.localStorage.getItem("oiq-help-text-scale") as TextScale | null;
    if (savedScale === "normal" || savedScale === "large" || savedScale === "xlarge") {
      setTextScale(savedScale);
    }

    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category") as TabKey | null;
    const topic = params.get("topic");
    const q = params.get("q");
    const view = params.get("view") as ActiveSectionTab | null;

    if (cat && TIPS[cat]) {
      setSelectedCategory(cat);
    }
    if (topic && !Number.isNaN(Number(topic))) {
      setSelectedIdx(Math.max(0, Number(topic)));
    }
    if (q) {
      setSearchQuery(q);
    }
    if (view && ["all", "protips", "techsupport", "faq"].includes(view)) {
      setActiveView(view);
    }

    fetch("/api/platform/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const activeOrg = data?.activeOrg;
        if (activeOrg?.customer_code) {
          setCustomerCode(activeOrg.customer_code);
          setSupportCodeInput(activeOrg.customer_code);
        } else if (activeOrg?.id) {
          const derived = getCustomerCode(activeOrg.id);
          setCustomerCode(derived);
          setSupportCodeInput(derived);
        }
        if (activeOrg?.name) {
          setSupportCompany(activeOrg.name);
        }
        if (data?.user?.email) {
          setSupportEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmitSupportTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) {
      setTicketError("Please enter your name, email, and a brief description of what you need help with.");
      return;
    }
    setSubmittingTicket(true);
    setTicketError("");
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supportName.trim(),
          email: supportEmail.trim(),
          phone: supportPhone.trim(),
          company: supportCompany.trim(),
          customerCode: (supportCodeInput || customerCode || "").trim(),
          category: supportCategory,
          priority: supportPriority,
          message: supportMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit support ticket");
      setTicketSubmitted({
        id: data.ticket?.id || "support_ticket",
        code: data.ticket?.customer_code || customerCode || "OIQ-HELP",
      });
      setSupportMessage("");
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : "Could not send support ticket.");
    } finally {
      setSubmittingTicket(false);
    }
  }

  function handleCopyCustomerCode() {
    if (!customerCode || typeof navigator === "undefined") return;
    navigator.clipboard.writeText(customerCode);
    setCopiedCustomerCode(true);
    setTimeout(() => setCopiedCustomerCode(false), 2000);
  }

  const handleScaleChange = (scale: TextScale) => {
    setTextScale(scale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("oiq-help-text-scale", scale);
    }
  };

  // Typography scale classes for maximum legibility
  const bodySizeClass =
    textScale === "xlarge"
      ? "text-xl sm:text-2xl leading-relaxed"
      : textScale === "large"
      ? "text-lg sm:text-xl leading-relaxed"
      : "text-base sm:text-lg leading-relaxed";

  const subBodySizeClass =
    textScale === "xlarge"
      ? "text-lg sm:text-xl leading-relaxed"
      : textScale === "large"
      ? "text-base sm:text-lg leading-relaxed"
      : "text-sm sm:text-base leading-relaxed";

  const cardTitleSizeClass =
    textScale === "xlarge"
      ? "text-2xl sm:text-3xl font-extrabold"
      : textScale === "large"
      ? "text-xl sm:text-2xl font-extrabold"
      : "text-lg sm:text-xl font-bold";

  // Filtered ProTips
  const displayedTips = useMemo(
    () => getTipsForCategory(selectedCategory, searchQuery, audienceFilter),
    [selectedCategory, searchQuery, audienceFilter]
  );

  const safeIdx = Math.min(selectedIdx, Math.max(0, displayedTips.length - 1));
  const currentTip = displayedTips[safeIdx] ?? null;

  // Filtered Tech Support Guides
  const filteredSupportGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TECH_SUPPORT_GUIDES.filter((g) => {
      if (supportCategoryFilter !== "All" && g.category !== supportCategoryFilter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.symptom.toLowerCase().includes(q) ||
        g.solutionSummary.toLowerCase().includes(q) ||
        g.steps.some((s) => s.toLowerCase().includes(q)) ||
        g.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, supportCategoryFilter]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BASIC_FAQS.filter((f) => {
      if (faqCategoryFilter !== "All" && f.category !== faqCategoryFilter) return false;
      if (!q) return true;
      return (
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, faqCategoryFilter]);

  // Total knowledge count
  const totalTipsCount = useMemo(() => {
    const unique = new Set<string>();
    (Object.keys(TIPS) as TabKey[]).forEach((k) => {
      for (const t of TIPS[k] || []) unique.add(t.title);
    });
    return unique.size;
  }, []);

  // Ask AI Support handler
  async function handleAskAi(customQuestion?: string) {
    const q = (customQuestion ?? aiQuestion ?? searchQuery).trim();
    if (!q || aiLoading) return;
    setAiQuestion(q);
    setAiLoading(true);
    try {
      const res = await fetch("/api/help-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, customerCode: customerCode || undefined }),
      });
      const data = await res.json();
      setAiResult({
        question: q,
        answer:
          data.answer ||
          "Please browse our step-by-step ProTips and Tech Support guides below.",
        relatedGuides: Array.isArray(data.relatedGuides) ? data.relatedGuides : [],
      });
    } catch {
      setAiResult({
        question: q,
        answer:
          "We couldn't reach the AI assistant right now, but all ProTips and Tech Support guides below are available offline.",
        relatedGuides: [],
      });
    } finally {
      setAiLoading(false);
    }
  }

  // 1-Click Live Browser & Cloud Diagnostics
  async function runSystemDiagnostics() {
    setRunningDiag(true);
    const results: DiagnosticResult[] = [];

    // 1. Cloud & API Connectivity
    const t0 = performance.now();
    try {
      const res = await fetch("/api/platform/session", { cache: "no-store" });
      const ms = Math.max(12, Math.round(performance.now() - t0));
      results.push({
        id: "cloud",
        label: "Cloud & Database API",
        status: res.ok ? "pass" : "warn",
        detail: res.ok
          ? `Connected (${ms}ms response time) — Real-time sync active`
          : `Status ${res.status} — Try refreshing your browser tab`,
        icon: "wifi",
      });
    } catch {
      results.push({
        id: "cloud",
        label: "Cloud & Database API",
        status: "warn",
        detail: "Offline or blocked by firewall — Check internet connection",
        icon: "wifi",
      });
    }

    // 2. Local Storage & Session Cookies
    try {
      window.localStorage.setItem("oiq_diag_test", "ok");
      window.localStorage.removeItem("oiq_diag_test");
      const cookieOk = navigator.cookieEnabled;
      results.push({
        id: "storage",
        label: "Login & Crew PIN Storage",
        status: cookieOk ? "pass" : "warn",
        detail: cookieOk
          ? "Cookies & Local Storage enabled — Ready for Admin & 6-Digit PIN login"
          : "Cookies disabled — Enable cookies in browser settings to stay signed in",
        icon: "storage",
      });
    } catch {
      results.push({
        id: "storage",
        label: "Login & Crew PIN Storage",
        status: "warn",
        detail: "Private browsing is blocking storage — Exit incognito mode if login resets",
        icon: "storage",
      });
    }

    // 3. Camera & Photo Upload Readiness
    const hasMedia =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof FileReader !== "undefined";
    results.push({
      id: "camera",
      label: "Photo Upload & AI Document Intake",
      status: hasMedia ? "pass" : "warn",
      detail: hasMedia
        ? "Camera & File Upload supported — Ready for work order photos & Excel/PDF intake"
        : "Limited media support — Use Chrome or Safari for camera photo uploads",
      icon: "camera",
    });

    // 4. Voice Dictation Support
    const hasSpeech =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    results.push({
      id: "mic",
      label: "Voice-to-Text Dictation",
      status: hasSpeech ? "pass" : "warn",
      detail: hasSpeech
        ? "Voice microphone supported — Tap any mic icon to dictate notes"
        : "Voice dictation works best in Chrome, Edge, or Safari",
      icon: "mic",
    });

    setDiagResults(results);
    setRunningDiag(false);
  }

  function handleCopyGuideLink() {
    if (typeof window === "undefined" || !currentTip) return;
    const url = new URL(window.location.href);
    url.searchParams.set("category", currentTip.categoryKey || selectedCategory);
    url.searchParams.set("topic", String(safeIdx));
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function jumpToCategory(catKey: TabKey, topicTitle?: string) {
    setSearchQuery("");
    setSelectedCategory(catKey);
    if (topicTitle) {
      const list = getTipsForCategory(catKey, "", "all");
      const foundIdx = list.findIndex((t) => t.title === topicTitle);
      setSelectedIdx(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setSelectedIdx(0);
    }
    if (activeView === "techsupport" || activeView === "faq") {
      setActiveView("all");
    }
    setTimeout(() => {
      explorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function jumpToSupportGuide(supportId: string) {
    setSearchQuery("");
    setSupportCategoryFilter("All");
    setExpandedSupportId(supportId);
    if (activeView === "protips" || activeView === "faq") {
      setActiveView("all");
    }
    setTimeout(() => {
      techSupportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  return (
    <div className="oiq-page min-h-screen pb-24">
      {/* ── HERO SECTION WITH SEARCH, AI INSTANT ANSWERS & TEXT SIZE CONTROL ── */}
      <section className="oiq-glow pt-28 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="mx-auto max-w-6xl">
          {/* Top Status & Reading Comfort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>All {BRAND.name} Systems Operational · 24/7 Self-Service &amp; AI Support</span>
              </div>

              {customerCode && (
                <button
                  type="button"
                  onClick={handleCopyCustomerCode}
                  title="Click to copy your Customer Support Code"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 text-sm font-bold transition-all cursor-pointer shadow-sm"
                >
                  <span>Your Customer Support Code:</span>
                  <code className="px-2 py-0.5 rounded-md bg-[#070B16] border border-sky-400/30 font-mono font-black text-sky-300 tracking-wider">
                    {customerCode}
                  </code>
                  {copiedCustomerCode ? (
                    <span className="inline-flex items-center gap-1 text-emerald-300 text-xs font-extrabold">
                      <Check size={14} /> Copied
                    </span>
                  ) : (
                    <Copy size={14} className="text-sky-400" />
                  )}
                </button>
              )}
            </div>

            {/* Legibility / Text Size Comfort Toggle */}
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#0D1428]/90 border border-white/15 shadow-lg"
              role="group"
              aria-label="Adjust text size for reading comfort"
            >
              <Type size={16} className="text-sky-400 ml-1" />
              <span className="text-xs sm:text-sm font-bold text-slate-200 mr-1">
                Text Size:
              </span>
              {(
                [
                  { id: "normal", label: "A", title: "Standard text size" },
                  { id: "large", label: "A+", title: "Large high-legibility text (Default)" },
                  { id: "xlarge", label: "A++", title: "Extra-large text size" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleScaleChange(opt.id)}
                  title={opt.title}
                  className={`px-3 py-1 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                    textScale === opt.id
                      ? "bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hero Title & Subtitle */}
          <div className="max-w-4xl">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              Help Center &amp;{" "}
              <span className="oiq-grad-text">Tech Support</span>
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-200 leading-relaxed max-w-3xl">
              Clear, step-by-step answers for property owners, leasing managers, and field crews — powered by{" "}
              <strong className="text-white">{totalTipsCount}+ built-in ProTips guides</strong>, interactive troubleshooting, and{" "}
              <strong className="text-sky-300">Ask {BRAND.assistant}</strong>.
            </p>
          </div>

          {/* Unified Search + Ask AI Support Box */}
          <div className="mt-8 bg-[#0D152B]/90 border-2 border-sky-400/35 rounded-3xl p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(56,189,248,0.14)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAi(searchQuery);
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search
                  size={22}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedIdx(0);
                  }}
                  placeholder="Type a question or keyword (e.g. 'import rent roll', 'crew PIN', 'custom domain')..."
                  aria-label="Search all help guides or ask a support question"
                  className="w-full pl-12 pr-11 py-4 rounded-2xl bg-[#070B16] border border-white/15 text-base sm:text-lg text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedIdx(0);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    title="Clear search"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={aiLoading || !searchQuery.trim()}
                className="oiq-btn !px-6 !py-4 !rounded-2xl text-base sm:text-lg font-extrabold shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Finding Answer…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Ask AI Support</span>
                  </>
                )}
              </button>
            </form>

            {/* Popular 1-Click Questions */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-400 mr-1">
                Quick Answers:
              </span>
              {POPULAR_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setSearchQuery(q);
                    handleAskAi(q);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-sky-500/15 border border-white/10 hover:border-sky-400/40 text-sm sm:text-base font-medium text-slate-200 hover:text-white transition-all cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Instant AI Support Response Card */}
            {aiResult && (
              <div className="mt-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-[#090F20] border border-sky-400/40 shadow-lg animate-in fade-in duration-200">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                        {BRAND.assistant} Instant Tech Support Answer
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-white">
                        &ldquo;{aiResult.question}&rdquo;
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setAiResult(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                    title="Dismiss answer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={`${bodySizeClass} text-slate-100 whitespace-pre-wrap bg-[#070B16]/80 border border-white/10 rounded-xl p-4 sm:p-5`}>
                  {aiResult.answer}
                </div>

                {aiResult.relatedGuides.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Jump to Related Step-by-Step Guides:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.relatedGuides.map((g, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (g.supportId) jumpToSupportGuide(g.supportId);
                            else if (g.categoryKey) jumpToCategory(g.categoryKey, g.title);
                          }}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sm font-bold text-sky-200 hover:text-white transition-all cursor-pointer"
                        >
                          <BookOpen size={15} />
                          <span>{g.title}</span>
                          <span className="text-xs text-sky-400">({g.categoryLabel})</span>
                          <ArrowRight size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 4-WAY SECTION NAVIGATION BAR ── */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "all", label: "All Help & Support", icon: Layers },
                  { id: "protips", label: `ProTips Guides (${totalTipsCount})`, icon: BookOpen },
                  { id: "techsupport", label: `Tech Support & Fixes (${TECH_SUPPORT_GUIDES.length})`, icon: Wrench },
                  { id: "faq", label: `Basic Questions FAQ (${BASIC_FAQS.length})`, icon: HelpCircle },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl text-sm sm:text-base font-extrabold transition-all cursor-pointer border ${
                      active
                        ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-sky-300/40 shadow-[0_8px_25px_rgba(37,99,235,0.4)]"
                        : "bg-[#0E162B] border-white/10 text-slate-200 hover:text-white hover:border-sky-400/40"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Portal Shortcuts + Printable Crew Poster */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowCrewPosterModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-sm font-bold text-emerald-200 hover:text-white transition-all cursor-pointer"
              >
                <QrCode size={15} className="text-emerald-400" />
                <span>Print Crew PIN Poster</span>
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-sm font-bold text-white transition-all"
              >
                <span>Admin Dashboard</span>
                <ExternalLink size={14} className="text-sky-400" />
              </Link>
              <Link
                href="/staff/maintenance"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-sm font-bold text-amber-200 transition-all"
              >
                <Smartphone size={15} className="text-amber-400" />
                <span>Maintenance PIN Portal</span>
              </Link>
              <Link
                href="/staff/cleaning"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-sm font-bold text-cyan-200 transition-all"
              >
                <Smartphone size={15} className="text-cyan-400" />
                <span>Cleaning PIN Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN BODY CONTAINER ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 space-y-16">
        {/* ── 1. NEW USER 3-STEP QUICK START (Visible in 'all' when not searching) ── */}
        {activeView === "all" && !searchQuery && (
          <section aria-labelledby="quickstart-heading">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Zap size={16} />
                  New to {BRAND.name}?
                </span>
                <h2 id="quickstart-heading" className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Get Up &amp; Running in 3 Simple Steps
                </h2>
              </div>
              <Link
                href="/signup"
                className="text-sm sm:text-base font-bold text-sky-300 hover:text-white inline-flex items-center gap-1.5"
              >
                <span>Need an account? Start a 14-day free trial</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {QUICK_START_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="oiq-card p-6 sm:p-7 flex flex-col justify-between border border-white/15 hover:border-sky-400/40 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                        {item.step}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 px-2.5 py-1 rounded-lg">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className={`${cardTitleSizeClass} text-white mb-3 leading-snug`}>
                      {item.title}
                    </h3>
                    <p className={`${subBodySizeClass} text-slate-200`}>
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => jumpToCategory(item.tabKey)}
                    className="mt-6 inline-flex items-center gap-2 text-sm sm:text-base font-bold text-sky-300 hover:text-white cursor-pointer group"
                  >
                    <span>Read {TAB_LABELS[item.tabKey]} Guides</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 2. STORED PRO-TIPS & PLATFORM GUIDE EXPLORER ── */}
        {(activeView === "all" || activeView === "protips") && (
          <section ref={explorerRef} aria-labelledby="protips-heading" className="scroll-mt-24">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                  <BookOpen size={16} />
                  Official {BRAND.name} ProTips Library
                </span>
                <h2 id="protips-heading" className="text-2xl sm:text-4xl font-black text-white mt-1">
                  Step-by-Step Platform Guides
                </h2>
                <p className="text-base sm:text-lg text-slate-300 mt-1">
                  Select any workspace module below to read plain-English instructions and best practices.
                </p>
              </div>

              {/* Audience Role Filter */}
              <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0B1224] border border-white/15 self-start">
                {(
                  [
                    { id: "all", label: "All Roles" },
                    { id: "admin", label: "Owners & Admins" },
                    { id: "crew", label: "Field Crew (PIN)" },
                  ] as const
                ).map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      setAudienceFilter(role.id);
                      setSelectedIdx(0);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                      audienceFilter === role.id
                        ? "bg-sky-500/25 border border-sky-400/50 text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 12 Category Pills Grid */}
            {!searchQuery && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-6">
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
                      }}
                      className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer text-left border ${
                        isActive
                          ? "bg-gradient-to-r from-sky-500/25 to-indigo-500/20 border-sky-400/70 text-white shadow-[0_0_20px_rgba(56,189,248,0.22)]"
                          : "bg-[#0D1428]/90 border-white/10 text-slate-200 hover:text-white hover:bg-white/[0.06] hover:border-white/25"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={`shrink-0 ${isActive ? "text-sky-400" : "text-slate-400"}`}
                      />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Split Explorer Container */}
            <div className="rounded-3xl bg-[#0B1120] border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.65)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* Left Column: Guide Topic List */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#090E1C] flex flex-col">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-400">
                    {searchQuery
                      ? `Matching Guides (${displayedTips.length})`
                      : `${TAB_LABELS[selectedCategory] || "Module"} (${displayedTips.length} Guides)`}
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs font-bold text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                <div className="p-3 sm:p-4 space-y-2 max-h-[560px] overflow-y-auto">
                  {displayedTips.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-lg font-bold text-white">No matching ProTips found</p>
                      <p className="text-sm sm:text-base text-slate-300 mt-1">
                        Try clearing your search or switching the role filter above.
                      </p>
                    </div>
                  ) : (
                    displayedTips.map((tip, idx) => {
                      const Icon = tip.icon;
                      const accent = ACCENT_STYLES[tip.accent || "blue"];
                      const isSelected = idx === safeIdx;
                      return (
                        <button
                          key={`${tip.title}-${idx}`}
                          onClick={() => setSelectedIdx(idx)}
                          className={`w-full text-left p-4 rounded-2xl flex items-start gap-3.5 transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-gradient-to-r from-sky-500/20 to-indigo-500/15 border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.14)]"
                              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/15"
                          }`}
                        >
                          <div
                            className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${accent.badgeBg} ${accent.badgeBorder}`}
                          >
                            <Icon size={22} className={accent.iconText} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-base sm:text-lg font-bold leading-snug ${
                                isSelected ? "text-white" : "text-slate-100"
                              }`}
                            >
                              {tip.title}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1 truncate">
                              {tip.categoryLabel}
                            </p>
                          </div>
                          <ChevronRight
                            size={20}
                            className={`shrink-0 mt-2 transition-transform ${
                              isSelected ? "text-sky-400 translate-x-0.5" : "text-slate-500"
                            }`}
                          />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Active ProTip Guide Reader */}
              <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between bg-[#0B1120]">
                {currentTip ? (
                  <div>
                    {/* Progress Stepper + Share / Print Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                      <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-400">
                        Guide {safeIdx + 1} of {displayedTips.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyGuideLink}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs sm:text-sm font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
                          title="Copy direct link to this guide"
                        >
                          {copiedLink ? (
                            <>
                              <Check size={15} className="text-emerald-400" />
                              <span className="text-emerald-300">Link Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={15} />
                              <span>Share Guide</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs sm:text-sm font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
                          title="Print this guide"
                        >
                          <Printer size={15} />
                          <span className="hidden sm:inline">Print</span>
                        </button>
                      </div>
                    </div>

                    {/* Segmented Bar */}
                    {displayedTips.length > 1 && (
                      <div className="flex items-center gap-1.5 mb-7">
                        {displayedTips.map((t, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedIdx(idx)}
                            title={t.title}
                            aria-label={`Jump to guide ${idx + 1}: ${t.title}`}
                            className={`h-2.5 flex-1 rounded-full transition-all cursor-pointer ${
                              idx === safeIdx
                                ? "bg-gradient-to-r from-sky-400 to-indigo-400 shadow-[0_0_12px_rgba(56,189,248,0.6)]"
                                : idx < safeIdx
                                ? "bg-sky-500/45 hover:bg-sky-400/70"
                                : "bg-white/10 hover:bg-white/25"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Guide Header */}
                    {(() => {
                      const Icon = currentTip.icon;
                      const accent = ACCENT_STYLES[currentTip.accent || "blue"];
                      return (
                        <div className="flex items-start gap-4 sm:gap-5 mb-6">
                          <div
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${accent.badgeBg} ${accent.badgeBorder}`}
                          >
                            <Icon size={30} className={accent.iconText} />
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold border mb-2 ${accent.pillBg} ${accent.pillText}`}
                            >
                              {currentTip.categoryLabel}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                              {currentTip.title}
                            </h3>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Main Legible Body Box */}
                    <div className="bg-white/[0.04] border border-white/15 rounded-2xl p-5 sm:p-7 mb-6">
                      <p className={`${bodySizeClass} text-white font-normal`}>
                        {currentTip.body}
                      </p>
                    </div>

                    {/* Key Takeaways / Highlights */}
                    {currentTip.highlights && currentTip.highlights.length > 0 && (
                      <div className="bg-sky-500/[0.08] border border-sky-400/25 rounded-2xl p-5 sm:p-7 mb-6">
                        <p className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-sky-300 mb-4 flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-sky-400 shrink-0" />
                          <span>Key Takeaways &amp; Pro Tips</span>
                        </p>
                        <ul className="space-y-3">
                          {currentTip.highlights.map((item, i) => (
                            <li
                              key={i}
                              className={`flex items-start gap-3.5 ${subBodySizeClass} text-slate-100`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 mt-2.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Direct Deep-Link Action Strip */}
                    {(() => {
                      const deepLink = getDeepLinkForTip(
                        currentTip.categoryKey || selectedCategory,
                        currentTip.title
                      );
                      const isCrewTip =
                        currentTip.title.toLowerCase().includes("crew") ||
                        currentTip.title.toLowerCase().includes("pin");
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-400/30 mb-6">
                          <div className="flex items-center gap-2.5">
                            <Zap size={18} className="text-sky-400 shrink-0" />
                            <span className="text-sm sm:text-base font-bold text-white">
                              Ready to use this feature?
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {isCrewTip && (
                              <button
                                onClick={() => setShowCrewPosterModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-xs sm:text-sm font-bold text-emerald-200 hover:text-white transition-all cursor-pointer"
                              >
                                <QrCode size={15} />
                                <span>Print Crew PIN Poster</span>
                              </button>
                            )}
                            <Link
                              href={deepLink.href}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs sm:text-sm font-extrabold transition-all shadow-md"
                            >
                              <span>{deepLink.label}</span>
                              <ArrowRight size={15} />
                            </Link>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Was this guide helpful? */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10">
                      <span className="text-sm sm:text-base font-semibold text-slate-300">
                        Did this guide answer your question?
                      </span>
                      {helpfulVotes[currentTip.title] ? (
                        <span className="text-sm sm:text-base font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 size={16} />
                          {helpfulVotes[currentTip.title] === "yes"
                            ? "Thanks for your feedback!"
                            : "Got it — ask AI Support above or contact our team below!"}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setHelpfulVotes((prev) => ({ ...prev, [currentTip.title]: "yes" }))
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-xs sm:text-sm font-bold text-emerald-200 cursor-pointer"
                          >
                            <ThumbsUp size={14} />
                            <span>Yes, super clear</span>
                          </button>
                          <button
                            onClick={() =>
                              setHelpfulVotes((prev) => ({ ...prev, [currentTip.title]: "more" }))
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs sm:text-sm font-bold text-slate-200 cursor-pointer"
                          >
                            <MessageSquarePlus size={14} />
                            <span>I still need help</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Previous / Next Footer */}
                <div className="flex items-center justify-between gap-4 mt-8 pt-5 border-t border-white/10">
                  <button
                    onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                    disabled={safeIdx === 0}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-sm sm:text-base font-bold text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                    <span>Previous Guide</span>
                  </button>

                  <span className="text-sm font-bold text-slate-300">
                    {displayedTips.length > 0 ? `${safeIdx + 1} / ${displayedTips.length}` : "0 / 0"}
                  </span>

                  <button
                    onClick={() =>
                      setSelectedIdx((i) => Math.min(displayedTips.length - 1, i + 1))
                    }
                    disabled={safeIdx >= displayedTips.length - 1}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sm sm:text-base font-bold text-sky-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <span>Next Guide</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── 3. INTERACTIVE TECH SUPPORT & TROUBLESHOOTING CENTER ── */}
        {(activeView === "all" || activeView === "techsupport") && (
          <section ref={techSupportRef} aria-labelledby="techsupport-heading" className="scroll-mt-24">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Wrench size={16} />
                  Interactive Tech Support &amp; Diagnostics
                </span>
                <h2 id="techsupport-heading" className="text-2xl sm:text-4xl font-black text-white mt-1">
                  Quick Fixes for Common Technical Issues
                </h2>
                <p className="text-base sm:text-lg text-slate-300 mt-1">
                  Run a 1-click browser check or click any issue below for step-by-step resolution instructions.
                </p>
              </div>

              {/* Support Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "All",
                  "Account & Login",
                  "Crew Mobile Portals",
                  "AI & Data Import",
                  "Domains & Website",
                  "Billing & Plans",
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSupportCategoryFilter(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                      supportCategoryFilter === cat
                        ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                        : "bg-[#0D1428] border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 1-CLICK LIVE DEVICE & BROWSER TECH CHECK BAR ── */}
            <div className="mb-6 rounded-3xl bg-gradient-to-r from-[#0D162C] via-[#0F1B36] to-[#0D162C] border border-sky-400/35 p-5 sm:p-7 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-400 shrink-0">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      1-Click Device &amp; Browser Readiness Check
                    </h3>
                    <p className="text-sm sm:text-base text-slate-200">
                      Verify your internet connection, login cookies, camera upload support, and voice dictation in 1 second.
                    </p>
                  </div>
                </div>

                <button
                  onClick={runSystemDiagnostics}
                  disabled={runningDiag}
                  className="oiq-btn !px-5 !py-3 !rounded-2xl text-sm sm:text-base font-extrabold shrink-0 cursor-pointer"
                >
                  {runningDiag ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Checking Device…</span>
                    </>
                  ) : (
                    <>
                      <Activity size={18} />
                      <span>{diagResults ? "Re-Run Tech Check" : "Run Live Tech Check"}</span>
                    </>
                  )}
                </button>
              </div>

              {diagResults && (
                <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-in fade-in duration-200">
                  {diagResults.map((r) => {
                    const DiagIcon =
                      r.icon === "wifi"
                        ? Wifi
                        : r.icon === "storage"
                        ? HardDrive
                        : r.icon === "camera"
                        ? Camera
                        : Mic;
                    const isPass = r.status === "pass";
                    return (
                      <div
                        key={r.id}
                        className={`p-4 rounded-2xl border ${
                          isPass
                            ? "bg-emerald-500/[0.08] border-emerald-400/35"
                            : "bg-amber-500/[0.08] border-amber-400/35"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <DiagIcon
                              size={18}
                              className={isPass ? "text-emerald-400" : "text-amber-400"}
                            />
                            <span className="text-sm sm:text-base font-extrabold text-white">
                              {r.label}
                            </span>
                          </div>
                          {isPass ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase">
                              <CheckCircle2 size={12} /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase">
                              <AlertTriangle size={12} /> Note
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {r.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredSupportGuides.map((guide) => {
                const Icon = guide.icon;
                const accent = ACCENT_STYLES[guide.accent];
                const isExpanded = expandedSupportId === guide.id;

                return (
                  <div
                    key={guide.id}
                    className={`rounded-3xl border transition-all overflow-hidden ${
                      isExpanded
                        ? "bg-[#0C1428] border-sky-400/50 shadow-[0_16px_50px_rgba(0,0,0,0.5)]"
                        : "bg-[#0B1120]/90 border-white/12 hover:border-white/25"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedSupportId(isExpanded ? null : guide.id)
                      }
                      aria-expanded={isExpanded}
                      className="w-full p-5 sm:p-7 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center shrink-0 ${accent.badgeBg} ${accent.badgeBorder}`}
                        >
                          <Icon size={26} className={accent.iconText} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${accent.pillBg} ${accent.pillText}`}
                            >
                              {guide.category}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-300">
                              Symptom: {guide.symptom}
                            </span>
                          </div>
                          <h3 className={`${cardTitleSizeClass} text-white leading-snug`}>
                            {guide.title}
                          </h3>
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-200 shrink-0">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 sm:px-7 pb-6 sm:pb-8 pt-2 border-t border-white/10 space-y-5 animate-in fade-in duration-150">
                        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10">
                          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-400 mb-1">
                            Quick Diagnosis
                          </p>
                          <p className={`${bodySizeClass} text-white font-medium`}>
                            {guide.solutionSummary}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-200 mb-3">
                            Step-by-Step Fix:
                          </p>
                          <ol className="space-y-3">
                            {guide.steps.map((step, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#080D1A] border border-white/10"
                              >
                                <span className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                                  {index + 1}
                                </span>
                                <span className={`${subBodySizeClass} text-slate-100`}>
                                  {step}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {guide.proTip && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-1" />
                              <p className={`${subBodySizeClass} text-emerald-100`}>
                                <strong className="text-white">Pro Tip:</strong> {guide.proTip}
                              </p>
                            </div>
                            {guide.id === "crew-pin-portal" && (
                              <button
                                onClick={() => setShowCrewPosterModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm hover:bg-emerald-400 transition-colors cursor-pointer"
                              >
                                <QrCode size={16} />
                                <span>Print Crew PIN Poster</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 4. BASIC QUESTIONS & FAQ ACCORDION ── */}
        {(activeView === "all" || activeView === "faq") && (
          <section aria-labelledby="faq-heading" className="scroll-mt-24">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <HelpCircle size={16} />
                  Plain-English Answers
                </span>
                <h2 id="faq-heading" className="text-2xl sm:text-4xl font-black text-white mt-1">
                  Frequently Asked Basic Questions
                </h2>
                <p className="text-base sm:text-lg text-slate-300 mt-1">
                  Everything you need to know about daily operations, crew portals, security, and plans.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  "All",
                  "Getting Started",
                  "Daily Operations",
                  "Crew Portals",
                  "Billing & Security",
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFaqCategoryFilter(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                      faqCategoryFilter === cat
                        ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                        : "bg-[#0D1428] border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3.5">
              {filteredFaqs.map((faq) => {
                const isOpen = !!openFaqIds[faq.id];
                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl border transition-all ${
                      isOpen
                        ? "bg-[#0D152C] border-sky-400/45 shadow-lg"
                        : "bg-[#0B1120]/90 border-white/12 hover:border-white/25"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setOpenFaqIds((prev) => ({ ...prev, [faq.id]: !prev[faq.id] }))
                      }
                      aria-expanded={isOpen}
                      className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div>
                        <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-sky-400 mb-1">
                          {faq.category}
                        </span>
                        <h3 className={`${cardTitleSizeClass} text-white leading-snug`}>
                          {faq.question}
                        </h3>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-200 shrink-0">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-white/10">
                        <p className={`${bodySizeClass} text-slate-100`}>
                          {faq.answer}
                        </p>
                        {faq.relatedTab && (
                          <button
                            onClick={() => jumpToCategory(faq.relatedTab!)}
                            className="mt-4 inline-flex items-center gap-2 text-sm sm:text-base font-bold text-sky-300 hover:text-white cursor-pointer"
                          >
                            <BookOpen size={16} />
                            <span>View all {TAB_LABELS[faq.relatedTab]} ProTips</span>
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 5. DIRECT HUMAN TECH SUPPORT ESCALATION BANNER ── */}
        <section
          aria-labelledby="contact-support-heading"
          className="rounded-3xl bg-gradient-to-r from-[#0E1834] via-[#111C3D] to-[#0D152C] border border-sky-400/35 p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs sm:text-sm font-extrabold uppercase tracking-wider mb-3">
                <LifeBuoy size={16} />
                <span>Priority Human Support</span>
              </div>
              <h2 id="contact-support-heading" className="text-2xl sm:text-3xl font-black text-white">
                Still Need a Hand With Your Workspace?
              </h2>
              <p className="mt-2 text-base sm:text-lg text-slate-200 leading-relaxed">
                Our onboarding and technical support team helps with custom rent roll imports, domain DNS setup, and account questions — with responses within one business day.
              </p>
              {customerCode && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleCopyCustomerCode}
                    title="Click to copy your Customer Support Code"
                    className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-100 text-sm sm:text-base font-bold transition-all cursor-pointer"
                  >
                    <span>Your Customer Support Code:</span>
                    <code className="px-2.5 py-0.5 rounded-lg bg-[#070B16] border border-sky-400/35 font-mono font-black text-sky-300 tracking-wider">
                      {customerCode}
                    </code>
                    {copiedCustomerCode ? (
                      <span className="inline-flex items-center gap-1 text-emerald-300 text-xs sm:text-sm font-extrabold">
                        <Check size={15} /> Copied!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sky-300 text-xs sm:text-sm font-semibold">
                        <Copy size={14} /> Copy for Support
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowSupportForm((prev) => !prev);
                  setTicketSubmitted(null);
                }}
                className="oiq-btn !px-6 !py-4 !rounded-2xl text-base sm:text-lg font-extrabold text-center cursor-pointer"
              >
                <MessageSquarePlus size={18} />
                <span>{showSupportForm ? "Hide Support Ticket Form" : "Open a Support Ticket"}</span>
                <ArrowRight size={18} />
              </button>
              <Link
                href="/admin"
                className="oiq-btn-ghost !px-6 !py-4 !rounded-2xl text-base sm:text-lg font-bold text-center"
              >
                <span>Go to Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Direct Support Ticket Drawer (Synced to Master Admin /platform Support Area) */}
          {showSupportForm && (
            <div className="mt-8 pt-8 border-t border-sky-400/25">
              {ticketSubmitted ? (
                <div className="p-6 sm:p-8 rounded-2xl bg-emerald-950/40 border border-emerald-400/45 text-center space-y-3">
                  <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Support Ticket Sent to PropOpsIQ Master Support!
                  </h3>
                  <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto">
                    Your request has been logged directly in our Master Support Queue under Support Code{" "}
                    <code className="px-2 py-0.5 rounded bg-black/50 border border-emerald-400/40 font-mono font-black text-emerald-300">
                      {ticketSubmitted.code}
                    </code>
                    . Our team will review your workspace and respond shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTicketSubmitted(null)}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all cursor-pointer"
                  >
                    Submit Another Support Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitSupportTicket} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      <LifeBuoy size={18} className="text-sky-400" />
                      <span>Submit a Direct Support Ticket</span>
                    </h3>
                    <span className="text-xs text-sky-300 font-semibold">
                      Connected directly to PropOpsIQ Master Admin Support Console
                    </span>
                  </div>

                  {ticketError && (
                    <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs sm:text-sm text-rose-200">
                      {ticketError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={supportName}
                        onChange={(e) => setSupportName(e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B16] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B16] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Company / Portfolio
                      </label>
                      <input
                        type="text"
                        value={supportCompany}
                        onChange={(e) => setSupportCompany(e.target.value)}
                        placeholder="Acme Properties LLC"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B16] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-300 mb-1.5">
                        Customer Code (OIQ-XXXX)
                      </label>
                      <input
                        type="text"
                        value={supportCodeInput}
                        onChange={(e) => setSupportCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. OIQ-7F4K"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B16] border border-sky-400/40 font-mono text-sm font-bold text-sky-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Issue Category
                      </label>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B16] border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400"
                      >
                        <option value="Login & Access">Login &amp; Account Access</option>
                        <option value="Rent Roll & Excel Import">Rent Roll &amp; Excel Import</option>
                        <option value="Crew 6-Digit PIN Portal">Crew 6-Digit PIN Portal</option>
                        <option value="Custom Domain & DNS">Custom Domain &amp; DNS</option>
                        <option value="Billing & Subscription">Billing &amp; Subscription Plan</option>
                        <option value="Bug / Technical Issue">Bug / Technical Issue</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Urgency / Priority
                      </label>
                      <select
                        value={supportPriority}
                        onChange={(e) => setSupportPriority(e.target.value as "Normal" | "High" | "Urgent")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B16] border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400"
                      >
                        <option value="Normal">Normal — General Question</option>
                        <option value="High">High — Needs Prompt Help</option>
                        <option value="Urgent">Urgent — Blocking Operations</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={supportPhone}
                        onChange={(e) => setSupportPhone(e.target.value)}
                        placeholder="(555) 000-0000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B16] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      How can we help? *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe what you're seeing or what you'd like help setting up…"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B16] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSupportForm(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-bold text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingTicket}
                      className="oiq-btn !px-6 !py-2.5 !rounded-xl text-sm font-extrabold cursor-pointer disabled:opacity-50"
                    >
                      {submittingTicket ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Sending to Support…</span>
                        </>
                      ) : (
                        <>
                          <span>Send Support Ticket</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── PRINTABLE CREW QR & PIN ONBOARDING POSTER MODAL ── */}
      {showCrewPosterModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowCrewPosterModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Printable Field Crew PIN Onboarding Poster"
            className="relative w-full max-w-4xl max-h-[92dvh] overflow-y-auto rounded-3xl bg-[#0B1120] border border-white/20 p-6 sm:p-10 shadow-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  Breakroom &amp; Field Onboarding Sheet
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                  Mobile Crew Portal &amp; 6-Digit PIN Guide
                </h2>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => window.print()}
                  className="oiq-btn !px-5 !py-2.5 !rounded-xl text-sm font-extrabold cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Print Sheet</span>
                </button>
                <button
                  onClick={() => setShowCrewPosterModal(false)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
              {/* Maintenance Crew Card */}
              <div className="rounded-2xl bg-[#0F172A] border-2 border-amber-400/40 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                      Maintenance Technicians
                    </span>
                    <Wrench size={22} className="text-amber-400" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                    Maintenance Crew Portal
                  </h3>
                  <p className="text-base text-slate-200 leading-relaxed mb-4">
                    View assigned work orders, log HVAC filter changes, complete building inspections, and upload repair photos.
                  </p>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 font-mono text-sm sm:text-base text-amber-300 break-all mb-4">
                    {originUrl}/staff/maintenance
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  {/* Dynamic QR Code via standard SVG/API */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      `${originUrl}/staff/maintenance`
                    )}`}
                    alt="QR Code for Maintenance Crew Portal"
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-xl bg-white p-1.5 shrink-0"
                  />
                  <div className="text-sm text-slate-200 space-y-1">
                    <p className="font-bold text-white">Scan with phone camera:</p>
                    <p>1. Open camera &amp; tap link</p>
                    <p>2. Enter your 6-digit PIN</p>
                    <p>3. Tap &ldquo;Add to Home Screen&rdquo;</p>
                  </div>
                </div>
              </div>

              {/* Cleaning Crew Card */}
              <div className="rounded-2xl bg-[#0F172A] border-2 border-cyan-400/40 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-extrabold uppercase tracking-wider">
                      Cleaning &amp; Turnover Crew
                    </span>
                    <Smartphone size={22} className="text-cyan-400" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                    Cleaning Crew Portal
                  </h3>
                  <p className="text-base text-slate-200 leading-relaxed mb-4">
                    Check daily building schedules, complete room-by-room cleaning checklists, and upload verification photos.
                  </p>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 font-mono text-sm sm:text-base text-cyan-300 break-all mb-4">
                    {originUrl}/staff/cleaning
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      `${originUrl}/staff/cleaning`
                    )}`}
                    alt="QR Code for Cleaning Crew Portal"
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-xl bg-white p-1.5 shrink-0"
                  />
                  <div className="text-sm text-slate-200 space-y-1">
                    <p className="font-bold text-white">Scan with phone camera:</p>
                    <p>1. Open camera &amp; tap link</p>
                    <p>2. Enter your 6-digit PIN</p>
                    <p>3. Tap &ldquo;Add to Home Screen&rdquo;</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm sm:text-base text-slate-200">
                <strong className="text-white">Where do managers find or reset a 6-digit PIN?</strong>{" "}
                Open <strong className="text-sky-300">Admin Dashboard → Settings → Team Members, Roles &amp; Crew PINs</strong>.
              </div>
              <Link
                href="/admin?tab=settings"
                className="px-4 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-extrabold text-sm shrink-0 hover:bg-sky-400 transition-colors"
              >
                Manage Crew PINs →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
