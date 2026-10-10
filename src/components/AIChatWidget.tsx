"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Send,
  Loader2,
  Zap,
  Building2,
  ChevronRight,
  Phone,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { COMPANY } from "@/lib/data";
import { trackEvent, getAnalyticsSessionId } from "@/hooks/useAnalytics";

// ─── Property URL map (id → individual property page) ───────────────────────
const PROPERTY_URLS: Record<string, string> = {
  // Canonical IDs — direct links to individual property detail pages
  "city-centre":              "/properties/city-centre",
  "the-executive":            "/properties/the-executive",
  "bristol-cowork":           "/properties/bristol-cowork",
  "centre-point":             "/properties/centre-point-suites",
  "foundation-event":         "/properties/foundation-event-facility",
  "commercial-warehouse":     "/properties/warehouse",
  // Common AI-generated variations (safety net)
  "city-centre-professional-suites": "/properties/city-centre",
  "city-centre-suites":       "/properties/city-centre",
  "executive":                "/properties/the-executive",
  "the-executive-suites":     "/properties/the-executive",
  "bristol-cowork-space":     "/properties/bristol-cowork",
  "cowork":                   "/properties/bristol-cowork",
  "centre-point-suites":      "/properties/centre-point-suites",
  "centerpoint":              "/properties/centre-point-suites",
  "center-point":             "/properties/centre-point-suites",
  "foundation":               "/properties/foundation-event-facility",
  "foundation-event-facility":"/properties/foundation-event-facility",
  "warehouse":                "/properties/warehouse",
  "commercial-warehouse-space":"/properties/warehouse",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage =
  | "greeting"
  | "space_type"
  | "budget"
  | "timeline"
  | "team_size"
  | "name"
  | "phone"
  | "email"
  | "scoring"
  | "result";

interface LeadData {
  spaceType: string;
  budget: string;
  timeline: string;
  teamSize: string;
  name: string;
  phone: string;
  email: string;
}

interface MatchedProperty {
  id: string;
  name: string;
  type: string;
  sqft: string;
  location: string;
  matchReason: string;
}

interface ScoringResult {
  score: number;
  scoreLabel: "Hot Lead" | "Warm Lead" | "Nurture";
  reasoning: string;
  matchedProperties: MatchedProperty[];
}

// ─── Quick-reply option sets ───────────────────────────────────────────────────

const SPACE_OPTIONS = [
  { label: "🏢 Executive Office", value: "Executive Office" },
  { label: "💼 Private Office Suite", value: "Private Office Suite" },
  { label: "☕ CoWork Membership", value: "CoWork Membership" },
  { label: "🏪 Retail Storefront", value: "Retail Storefront" },
  { label: "🏭 Warehouse / Industrial", value: "Warehouse / Industrial" },
];

const BUDGET_OPTIONS = [
  { label: "Under $1,000/mo", value: "800" },
  { label: "$1,000 – $2,000/mo", value: "1500" },
  { label: "$2,000 – $4,000/mo", value: "3000" },
  { label: "$4,000 – $8,000/mo", value: "6000" },
  { label: "$8,000+/mo", value: "10000" },
];

const TIMELINE_OPTIONS = [
  { label: "🔥 ASAP (< 30 days)", value: "ASAP — under 30 days" },
  { label: "1–2 Months", value: "1–2 months" },
  { label: "2–3 Months", value: "2–3 months" },
  { label: "3–6 Months", value: "3–6 months" },
  { label: "Just Exploring", value: "Just exploring options" },
];

const TEAM_OPTIONS = [
  { label: "Solo (just me)", value: "Solo" },
  { label: "2–4 People", value: "2–4 people" },
  { label: "5–10 People", value: "5–10 people" },
  { label: "10–25 People", value: "10–25 people" },
  { label: "25+ People", value: "25+ people" },
];

const stage_questions: Record<Stage, string> = {
  greeting: "",
  space_type: "Great! What type of space are you looking for?",
  budget: "What's your approximate monthly budget?",
  timeline: "When are you looking to move in?",
  team_size: "How many people will be using the space?",
  name: "Almost done! What's your name so we can personalize your results?",
  phone:
    "Best phone number to reach you? (You can skip to provide email instead)",
  email:
    "No problem! What's your email address? We need at least one way to reach you with available spaces.",
  scoring: "",
  result: "",
};

// Score helpers — used internally only (leads dashboard); not shown to users
function scoreColor(score: number) {
  if (score >= 70) return "#4ADE80";
  if (score >= 40) return "#FACC15";
  return "#94A3B8";
}

function scoreLabelColor(label: string) {
  if (label === "Hot Lead") return "text-[#4ADE80] bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.3)]";
  if (label === "Warm Lead") return "text-[#FACC15] bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)]";
  return "text-[#94A3B8] bg-[rgba(148,163,184,0.1)] border-[rgba(148,163,184,0.2)]";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeaseBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("greeting");
  const [lead, setLead] = useState<Partial<LeadData>>({});
  const [inputVal, setInputVal] = useState("");
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [hasNotif, setHasNotif] = useState(true);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [preloadedProperty, setPreloadedProperty] = useState<string | null>(null);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Read UTM params from URL on first mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtmSource(params.get("utm_source") || "");
    setUtmMedium(params.get("utm_medium") || "");
    setUtmCampaign(params.get("utm_campaign") || "");
    // Auto-open on social landing pages — longer delay on mobile so content is visible first
    if (params.get("utm_source") === "facebook" || params.get("utm_source") === "instagram") {
      const isMobile = window.innerWidth < 768;
      const delay = isMobile ? 4000 : 1500;
      setTimeout(() => { setIsOpen(true); setNudgeDismissed(true); setHasNotif(false); }, delay);
    }
  }, []);

  // Scroll: result → top of chat body so score hits first; all other stages → bottom
  useEffect(() => {
    if (stage === "result") {
      // Small delay to let React paint the result before scrolling
      setTimeout(() => {
        chatBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 80);
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [stage, scoring, result]);

  useEffect(() => {
    if (isOpen && stage === "name" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [stage, isOpen]);

  // Listen for property-specific trigger from listing cards
  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent<{ propertyName: string }>).detail?.propertyName;
      if (name) {
        setPreloadedProperty(name);
        setIsOpen(true);
        setStage("greeting");
        setNudgeDismissed(true);
        setHasNotif(false);
      }
    };
    window.addEventListener("open-lease-bot", handler);
    return () => window.removeEventListener("open-lease-bot", handler);
  }, []);

  // ── Advance stage ──────────────────────────────────────────────────────────

  const advance = (value: string) => {
    const next = (nextStage: Stage, key?: keyof LeadData, val?: string) => {
      if (key && val !== undefined) setLead((p) => ({ ...p, [key]: val }));
      setStage(nextStage);
    };

    switch (stage) {
      case "greeting":   return setStage("space_type");
      case "space_type": return next("budget", "spaceType", value);
      case "budget":     return next("timeline", "budget", value);
      case "timeline":   return next("team_size", "timeline", value);
      case "team_size":  return next("name", "teamSize", value);
      case "name":       return next("phone", "name", value);
      case "phone":      return next("email", "phone", value);
      case "email":      return submitLead({ ...lead, email: value });
    }
  };

  // ── Phone number formatter ──────────────────────────────────────────────────
  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleTextSubmit = () => {
    if (!inputVal.trim()) {
      // Phone skipped → go to email stage instead of submitting blank
      if (stage === "phone") { setStage("email"); return; }
      // Email skipped → only submit if phone was already provided
      if (stage === "email" && lead.phone?.trim()) { submitLead({ ...lead, email: "" }); return; }
      // Both blank — don't submit
      return;
    }
    advance(inputVal.trim());
    setInputVal("");
  };

  // ── Client-side fallback scorer (used when API fails) ──────────────────────

  const calcFallbackScore = (lead: Partial<LeadData>): ScoringResult => {
    let score = 0;

    // Budget scoring
    const budget = Number(lead.budget) || 0;
    if (budget >= 2000) score += 25;
    else if (budget >= 1000) score += 15;
    else score += 5;

    // Timeline scoring
    const tl = (lead.timeline || "").toLowerCase();
    if (tl.includes("asap") || tl.includes("under 30") || tl.includes("30")) score += 30;
    else if (tl.includes("1") || tl.includes("2 month")) score += 20;
    else if (tl.includes("2") || tl.includes("3 month")) score += 10;
    else score += 5;

    // Space type fit scoring + property match
    const st = (lead.spaceType || "").toLowerCase();
    let matchedProperties: MatchedProperty[];

    if (st.includes("warehouse") || st.includes("industrial")) {
      score += 10;
      matchedProperties = [{
        id: "commercial-warehouse",
        name: "Commercial Warehouse",
        type: "Warehouse",
        sqft: "2,000–25,000 sqft",
        location: "Bristol Metro Area",
        matchReason: "Loading docks, highway access, and flexible bay sizes match your industrial requirements.",
      }];
    } else if (st.includes("retail")) {
      score += 10;
      matchedProperties = [{
        id: "centre-point",
        name: "Centre Point Suites",
        type: "Retail",
        sqft: "800–5,000 sqft",
        location: "Downtown Bristol, TN/VA",
        matchReason: "High-traffic retail frontage in a prime downtown corridor.",
      }];
    } else if (st.includes("cowork")) {
      score += 15;
      matchedProperties = [{
        id: "bristol-cowork",
        name: "Bristol CoWork",
        type: "CoWork",
        sqft: "Private offices & dedicated desks",
        location: "620 State Street, Bristol TN/VA",
        matchReason: "All-inclusive monthly membership — no long-term lease required.",
      }];
    } else if (st.includes("executive")) {
      score += 20;
      matchedProperties = [{
        id: "the-executive",
        name: "The Executive",
        type: "Office",
        sqft: "500–12,000 sqft",
        location: "Downtown Bristol, TN/VA",
        matchReason: "Private executive suites in a prestigious historic building.",
      }];
    } else {
      score += 20;
      matchedProperties = [{
        id: "city-centre",
        name: "City Centre Professional Suites",
        type: "Office",
        sqft: "1,200–18,000+ sqft",
        location: "Downtown Bristol, TN/VA",
        matchReason: "Premium downtown office space with flexible suite sizes.",
      }];
    }

    // Team size scoring
    const ts = (lead.teamSize || "").toLowerCase();
    if (ts.includes("10") || ts.includes("25")) score += 15;
    else if (ts.includes("5")) score += 15;
    else if (ts.includes("2") || ts.includes("4")) score += 10;
    else score += 5;

    score = Math.min(score, 100);
    const scoreLabel: ScoringResult["scoreLabel"] =
      score >= 70 ? "Hot Lead" : score >= 40 ? "Warm Lead" : "Nurture";

    return {
      score,
      scoreLabel,
      reasoning: `Based on your ${lead.spaceType} requirement with a $${budget}/mo budget and ${lead.timeline} timeline.`,
      matchedProperties,
    };
  };

  // ── Persist lead to localStorage for live dashboard sync ──────────────────

  const saveLiveLeadToStorage = (finalLead: Partial<LeadData>, scored: ScoringResult) => {
    if (typeof window === "undefined") return;
    const lead = {
      id: `live_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name: finalLead.name || "Anonymous",
      email: "",
      phone: finalLead.phone || "",
      spaceType: finalLead.spaceType || "",
      budget: Number(finalLead.budget) || 0,
      timeline: finalLead.timeline || "",
      teamSize: finalLead.teamSize || "",
      score: scored.score,
      scoreLabel: scored.scoreLabel,
      reasoning: scored.reasoning,
      matchedProperties: scored.matchedProperties,
      source: utmSource || "organic",
      medium: utmMedium || "direct",
      campaign: utmCampaign || "",
    };
    try {
      const existing = JSON.parse(localStorage.getItem("vision_live_leads") || "[]");
      existing.unshift(lead);
      localStorage.setItem("vision_live_leads", JSON.stringify(existing.slice(0, 50)));
    } catch { /* ignore */ }
  };

  // ── Score lead via API ──────────────────────────────────────────────────────

  const submitLead = async (finalLead: Partial<LeadData>) => {
    setLead(finalLead);
    setStage("scoring");
    setScoring(true);

    // 15s timeout so it can never hang forever
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/lease-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: finalLead.name || "Anonymous",
          email: finalLead.email || "",
          phone: finalLead.phone || "",
          spaceType: finalLead.spaceType,
          budget: finalLead.budget,
          timeline: finalLead.timeline,
          teamSize: finalLead.teamSize,
          additionalInfo: "",
          utm_source: utmSource || "organic",
          utm_medium: utmMedium || "direct",
          utm_campaign: utmCampaign || "",
          sessionId: getAnalyticsSessionId(),  // Link lead to browsing session
        }),
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (data.lead) {
        saveLiveLeadToStorage(finalLead, data.lead);
        setResult(data.lead);
        setStage("result");
        trackEvent("form_submit", { form: "lease-bot", spaceType: finalLead.spaceType, score: data.lead.score });
      } else {
        throw new Error(data.error || "No result returned");
      }
    } catch {
      clearTimeout(timeout);
      // Graceful fallback — real score calculated from lead data
      const fallback = calcFallbackScore(finalLead);
      saveLiveLeadToStorage(finalLead, fallback);
      setResult(fallback);
      setStage("result");
    } finally {
      setScoring(false);
    }
  };

  const reset = () => {
    setStage("greeting");
    setLead({});
    setInputVal("");
    setResult(null);
    setScoring(false);
  };

  // Auto-show nudge card after 3s — desktop only (mobile: too intrusive)
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile) return;
    const t = setTimeout(() => setShowNudge(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes breathe-glow {
          0%, 100% {
            box-shadow: 0 0 18px 4px rgba(250,204,21,0.35), 0 0 40px 8px rgba(74,222,128,0.2);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 32px 10px rgba(250,204,21,0.55), 0 0 60px 16px rgba(74,222,128,0.3);
            transform: scale(1.06);
          }
        }
        .bot-breathe {
          animation: breathe-glow 2.8s ease-in-out infinite;
        }
        @keyframes nudge-slide-in {
          0%   { opacity: 0; transform: translateX(20px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes nudge-pulse-border {
          0%, 100% { border-color: rgba(250,204,21,0.25); }
          50%       { border-color: rgba(250,204,21,0.55); }
        }
        .nudge-card {
          animation: nudge-slide-in 0.45s cubic-bezier(0.175,0.885,0.32,1.275) forwards,
                     nudge-pulse-border 2.5s ease-in-out 0.5s infinite;
        }
      `}</style>
      {/* ── Chat Window ──────────────────────────────────────────────────── */}
      <div
        id="vision-chat-panel"
        className={`fixed bottom-[16.25rem] right-4 sm:bottom-40 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm transition-all duration-300 ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ maxHeight: "calc(100dvh - 17.25rem)", height: "auto" }}
      >
        <div
          className="glass-strong rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ height: "min(640px, calc(100dvh - 17.25rem))" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#4ADE80]/20 to-[#22C55E]/10 px-4 py-3.5 flex items-center justify-between border-b border-[rgba(74,222,128,0.2)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                <Zap size={18} className="text-black" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">
                  Ask VISION
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] pulse-green" />
                  <span className="text-[11px] text-[#4ADE80]">
                    VISION Space Advisor
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stage !== "greeting" && stage !== "scoring" && stage !== "result" && (
                <button
                  onClick={reset}
                  className="text-[10px] text-gray-500 hover:text-[#4ADE80] transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  restart
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-4 space-y-4" style={{ justifyContent: "flex-start" }}>

            {/* ── Greeting ─────────────────────────────────────────────── */}
            {stage === "greeting" && (
              <div className="space-y-4">
                {preloadedProperty ? (
                  <>
                    <div className="chat-bubble-ai">
                      👋 Hi! I see you&apos;re interested in{" "}
                      <span className="text-[#FACC15] font-bold">{preloadedProperty}</span>.
                      Let&apos;s see if it&apos;s the perfect fit — I&apos;ll ask you a few quick questions and
                      show you the spaces from our portfolio that best match your needs.
                    </div>
                  </>
                ) : (
                  <>
                    {utmSource === "facebook" || utmSource === "instagram" ? (
                      <>
                        <div className="chat-bubble-ai">
                          👋 Hey! Glad you found us on {utmSource === "facebook" ? "Facebook" : "Instagram"}. I&apos;m VISION — Bristol&apos;s commercial space advisor.
                        </div>
                        <div className="chat-bubble-ai">
                          Let me match you with the right space in under 2 minutes — no obligation, just the best properties for your needs.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="chat-bubble-ai">
                          👋 Hi! I&apos;m VISION — your commercial real estate advisor for the Tri-Cities. I&apos;ll match you with the perfect space in under 2 minutes.
                        </div>
                        <div className="chat-bubble-ai">
                          I&apos;ll ask you 5 quick questions, then show you the
                          {" "}<span className="text-[#4ADE80] font-bold">best properties</span>{" "}
                          from our portfolio that fit your needs.
                        </div>
                      </>
                    )}
                  </>
                )}
                <button
                  onClick={() => advance("")}
                  id="lease-bot-start"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {preloadedProperty ? "Check My Fit" : "Find My Space"} <ArrowRight size={15} />
                </button>
                <p className="text-[10px] text-gray-600 text-center">
                  Free · No obligation · Takes ~90 seconds
                </p>
              </div>
            )}

            {/* ── Option stages ────────────────────────────────────────── */}
            {(stage === "space_type" ||
              stage === "budget" ||
              stage === "timeline" ||
              stage === "team_size") && (
              <div className="space-y-3">
                <div className="chat-bubble-ai">{stage_questions[stage]}</div>
                <div className="flex flex-col gap-2">
                  {(stage === "space_type"
                    ? SPACE_OPTIONS
                    : stage === "budget"
                    ? BUDGET_OPTIONS
                    : stage === "timeline"
                    ? TIMELINE_OPTIONS
                    : TEAM_OPTIONS
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => advance(opt.value)}
                      className="w-full text-left px-4 py-2.5 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] text-sm text-white hover:bg-[rgba(74,222,128,0.1)] hover:border-[rgba(74,222,128,0.4)] transition-all flex items-center justify-between group"
                    >
                      <span>{opt.label}</span>
                      <ChevronRight
                        size={14}
                        className="text-gray-600 group-hover:text-[#4ADE80] transition-colors"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Name input ───────────────────────────────────────────── */}
            {stage === "name" && (
              <div className="space-y-3">
                <div className="chat-bubble-ai">{stage_questions.name}</div>
              </div>
            )}

            {/* ── Phone input ──────────────────────────────────────────── */}
            {stage === "phone" && (
              <div className="space-y-3">
                <div className="chat-bubble-ai">
                  Thanks, {lead.name}! {stage_questions.phone}
                </div>
              </div>
            )}

            {/* ── Email input ───────────────────────────────────────────── */}
            {stage === "email" && (
              <div className="space-y-3">
                <div className="chat-bubble-ai">
                  {stage_questions.email}
                </div>
              </div>
            )}

            {/* ── Scoring animation ────────────────────────────────────── */}
            {stage === "scoring" && (
              <div className="space-y-4 py-4">
                <div className="chat-bubble-ai">
                  Analyzing your requirements against our portfolio...
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    "Understanding your space requirements",
                    "Checking move-in availability",
                    "Matching property types",
                    "Preparing your property recommendations",
                  ].map((step, i) => (
                    <div
                      key={step}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.1)]"
                      style={{
                        animation: `fadeIn 0.4s ease ${i * 0.3}s both`,
                      }}
                    >
                      <Loader2
                        size={14}
                        className="text-[#4ADE80] animate-spin flex-shrink-0"
                      />
                      <span className="text-sm text-gray-300">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Result ───────────────────────────────────────────────── */}
            {stage === "result" && result && (
              <div className="space-y-4">
                {/* Match headline */}
                <div className="rounded-2xl border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.06)] px-4 py-4 text-center">
                  <p className="text-lg font-black text-[#4ADE80] mb-1">🎉 We have a match for you!</p>
                  <p className="text-sm text-gray-300">
                    {lead.name ? `${lead.name}, based` : "Based"} on what you&apos;re looking for,
                    here{result.matchedProperties.length === 1 ? "&apos;s the property" : " are the properties"} we recommend from our Downtown Bristol portfolio:
                  </p>
                </div>

                {/* Matched properties */}
                {result.matchedProperties.length > 0 && (
                  <div className="space-y-2">
                    {result.matchedProperties.map((prop) => {
                      const url = PROPERTY_URLS[prop.id];
                      const CardWrapper = url
                        ? ({ children }: { children: React.ReactNode }) => (
                            <Link
                              href={url}
                              className="block rounded-xl border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.04)] p-3 hover:border-[rgba(74,222,128,0.5)] hover:bg-[rgba(74,222,128,0.08)] transition-all group cursor-pointer"
                            >
                              {children}
                            </Link>
                          )
                        : ({ children }: { children: React.ReactNode }) => (
                            <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(74,222,128,0.03)] p-3">
                              {children}
                            </div>
                          );
                      return (
                        <CardWrapper key={prop.id}>
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] flex items-center justify-center flex-shrink-0">
                              <Building2 size={14} className="text-[#4ADE80]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-white leading-tight">
                                  {prop.name}
                                </p>
                                {url && (
                                  <span className="flex items-center gap-1 text-[10px] text-[#4ADE80] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    View <ExternalLink size={9} />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {prop.sqft} · {prop.location}
                              </p>
                              <p className="text-[11px] text-[#4ADE80] mt-1 leading-snug">
                                {prop.matchReason}
                              </p>
                            </div>
                          </div>
                        </CardWrapper>
                      );
                    })}
                  </div>
                )}

                {/* Next steps */}
                <div className="space-y-2 pt-1">
                  <a
                    href={COMPANY.phoneHref}
                    id="lease-bot-call-cta"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Phone size={14} /> Call Vision LLC Now
                  </a>
                  <button
                    onClick={reset}
                    className="w-full py-2.5 rounded-xl border border-[rgba(74,222,128,0.2)] text-sm text-gray-400 hover:text-white hover:border-[rgba(74,222,128,0.4)] transition-all"
                  >
                    Start Over
                  </button>
                </div>

                <p className="text-[10px] text-gray-600 text-center pb-2">
                  Ask VISION · Powered by Gemini
                </p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Text input — for name / phone / email stages */}
          {(stage === "name" || stage === "phone" || stage === "email") && (
            <div className="p-3 border-t border-[rgba(74,222,128,0.15)] flex-shrink-0">
              <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.05)] rounded-xl px-3 py-2 border border-[rgba(74,222,128,0.15)] focus-within:border-[rgba(74,222,128,0.4)] transition-colors">
                <input
                  ref={inputRef}
                  type={stage === "phone" ? "tel" : stage === "email" ? "email" : "text"}
                  value={inputVal}
                  onChange={(e) => {
                    if (stage === "phone") {
                      setInputVal(formatPhone(e.target.value));
                    } else {
                      setInputVal(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleTextSubmit();
                    }
                  }}
                  placeholder={
                    stage === "name"
                      ? "Your name..."
                      : stage === "phone"
                      ? "(___) ___-____"
                      : "your@email.com"
                  }
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                  id={`lease-bot-${stage}-input`}
                />
                <button
                  onClick={handleTextSubmit}
                  id={`lease-bot-${stage}-submit`}
                  className="w-8 h-8 rounded-lg bg-[#4ADE80] flex items-center justify-center hover:bg-[#6EF4A0] transition-colors flex-shrink-0"
                  aria-label="Submit"
                >
                  <Send size={13} className="text-black" />
                </button>
              </div>
              {stage === "phone" && (
                <button
                  onClick={() => setStage("email")}
                  className="w-full mt-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Skip — use email instead →
                </button>
              )}
              {stage === "email" && lead.phone?.trim() && (
                <button
                  onClick={() => submitLead({ ...lead, email: "" })}
                  className="w-full mt-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Skip email — use phone only →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Nudge Card ────────────────────────────────────────────────────── */}
      {showNudge && !nudgeDismissed && !isOpen && (
        <div className="nudge-card fixed bottom-28 sm:bottom-24 right-20 sm:right-24 z-50">
          <div className="relative bg-[#0D1117] border border-[rgba(250,204,21,0.25)] rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-w-[210px]">
            {/* Dismiss */}
            <button
              onClick={() => setNudgeDismissed(true)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#1a1f2e] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-gray-500 hover:text-white transition-colors text-xs leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
            {/* Live dot + label */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse" />
              <span className="text-[10px] font-bold text-[#FACC15] uppercase tracking-wider">Ask VISION</span>
            </div>
            {/* Headline */}
            <p className="text-white text-xs font-semibold leading-snug mb-1.5">
              Find your perfect space in 60 seconds ✨
            </p>
            <p className="text-gray-500 text-[10px] leading-relaxed">
              Chat with me about your real estate needs.
            </p>
            {/* Arrow pointer → toward button */}
            <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0D1117] border-r border-t border-[rgba(250,204,21,0.25)] rotate-45" />
          </div>
        </div>
      )}

      {/* ── Toggle Button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNotif(false);
          setNudgeDismissed(true);
        }}
        id="lease-bot-toggle"
        aria-label="Ask VISION — Vision LLC"
        className={`fixed bottom-[12.25rem] right-4 sm:bottom-24 sm:right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "bg-[#111827] border border-[rgba(74,222,128,0.3)] shadow-lg"
            : "bot-breathe bg-gradient-to-br from-[#FACC15] via-[#4ADE80] to-[#22C55E] hover:scale-110 cursor-pointer"
        }`}
      >
        {isOpen ? (
          <X size={22} className="text-[#4ADE80]" />
        ) : (
          <Zap size={22} className="text-black" />
        )}
        {/* Notification dot */}
        {hasNotif && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-[9px] text-white font-bold">1</span>
          </span>
        )}
      </button>
    </>
  );
}
