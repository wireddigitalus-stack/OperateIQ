"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import TenantsTab, { rowToTenant, type Tenant } from "./TenantsTab";
import PropDetailsTab from "./PropDetailsTab";
import AnalyticsTab, { type AnalyticsLead } from "./AnalyticsTab";
import MaintenanceTab from "./MaintenanceTab";
import CleaningTab from "./CleaningTab";
import RentLedgerTab from "./RentLedgerTab";
import SecurityDepositLedgerTab from "./SecurityDepositLedgerTab";
import MarketingTab from "./MarketingTab";
import ContentTab from "./ContentTab";
import ConversationTab from "./ConversationTab";
import TasksTab from "./TasksTab";
import ProTips from "./ProTips";
import CallLogModal, { type CallLog, outcomeColor, outcomeLabel } from "./CallLogModal";
import PrintButton from "./PrintButton";
import ActivityFeedPanel from "./ActivityFeedPanel";
import SettingsTab, { SocialLinksCard } from "./SettingsTab";
import IntakeStagingModal from "./IntakeStagingModal";
import MicButton from "@/components/MicButton";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { signOutEverywhere } from "@/lib/sign-out";
import * as XLSX from "xlsx";
import {
  Zap, RefreshCw, Phone, Clock, Building2, TrendingUp,
  Users, Filter, AlertCircle, DollarSign, Calendar,
  Settings, Plus, Trash2, Save, CheckCircle2, Loader2,
  Bell, Mail, Shield, X, Radio,
  Sparkles, Brain, Send, ChevronRight, ChevronDown, Archive, MessageSquare, BarChart3, Wrench,
  ArrowRight, CheckSquare, Lock, AlertTriangle, Key, KeyRound, Download, FileSpreadsheet,
  Search, Pencil, FileText, Flame, Landmark, Globe, ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchedProperty {
  id: string; name: string; type: string;
  sqft: string; location: string; matchReason: string;
}

/** Parse freeform budget text into a number for analytics.
 *  "400-500" → 450, "400–500" → 450, "2000+" → 2000, "$1,500" → 1500, "TBD" → 0 */
function parseBudget(val: string | number | undefined | null): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const s = val.replace(/[$,]/g, "").trim();
  // Range: "400-500" or "400–500"
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) return Math.round((parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2);
  // Number with optional +: "2000+" or "2000"
  const numMatch = s.match(/^(\d+(?:\.\d+)?)\+?$/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 0;
}

interface Lead {
  id: string; timestamp: string; name: string; email: string;
  phone: string; spaceType: string; budget: string; timeline: string;
  teamSize: string; score: number;
  scoreLabel: "Verified Lead" | "MQL" | "Prospect Lead" | "Potential Spam";
  reasoning: string; matchedProperties: MatchedProperty[];
  isWhale?: boolean;
  whaleTier?: "gold" | "silver" | null;
  whaleKeywords?: string[];
  source?: string;
  medium?: string;
  campaign?: string;
  additionalInfo?: string;
  archivedAt?: string | null;
  followUpDate?: string | null;
  createdByEmployee?: string;
  assignedEmployee?: string;
  progress?: string;
}

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "maintenance" | "cleaning";
  active: boolean;
  pin?: string;
  created_at?: string;
}




// ─── Tooltip ─────────────────────────────────────────────────────────────────
// Hover on desktop · long-press on mobile · zero external deps

function Tooltip({ text, children, wide }: { text: string; children: React.ReactNode; wide?: boolean }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => setVisible(true);
  const hide = () => { setVisible(false); if (timerRef.current) clearTimeout(timerRef.current); };
  const startLong = () => { timerRef.current = setTimeout(() => setVisible(true), 500); };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={show} onMouseLeave={hide}
      onTouchStart={startLong} onTouchEnd={hide} onTouchCancel={hide}
    >
      {children}
      {visible && (
        <span
          className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[999] ${wide ? "w-56" : "w-44"} text-center`}
          role="tooltip"
        >
          <span className="block px-3 py-2 rounded-xl text-xs leading-snug font-medium text-gray-200 bg-[rgba(10,16,26,0.97)] border border-[rgba(255,255,255,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
            {text}
          </span>
          {/* Caret */}
          <span className="block w-2 h-2 mx-auto -mt-1 rotate-45 bg-[rgba(10,16,26,0.97)] border-r border-b border-[rgba(255,255,255,0.1)]" />
        </span>
      )}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return "#EF4444";   // red — hot
  if (score >= 50) return "#F97316";   // orange — warm
  return "#38BDF8";                     // ice blue — nurture/cold
}
function scoreBadge(label: string) {
  if (label === "Verified Lead") return "bg-[rgba(239,68,68,0.12)] text-[#EF4444] border-[rgba(239,68,68,0.35)]";
  if (label === "MQL") return "bg-[rgba(249,115,22,0.12)] text-[#F97316] border-[rgba(249,115,22,0.35)]";
  if (label === "Potential Spam") return "bg-[rgba(239,68,68,0.2)] text-[#EF4444] border-[rgba(239,68,68,0.5)] font-black animate-pulse";
  return "bg-[rgba(56,189,248,0.1)] text-[#38BDF8] border-[rgba(56,189,248,0.25)]";
}
function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}
function isUrgent(lead: Lead) {
  const hrs = (Date.now() - new Date(lead.timestamp).getTime()) / 36e5;
  return lead.scoreLabel === "Verified Lead" && hrs < 24;
}
function nameToSlug(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/);
  return parts.find(p => p.length > 2) ?? parts[0];
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Score Decay ──────────────────────────────────────────────────────
// Leads cool down over time if not contacted. The original AI score is
// preserved — only the displayed "effective" score decays.
const SCORE_FLOOR = 25;

function getDecayedScore(
  originalScore: number,
  lead: { id: string; timestamp: string },
  callLogs: import("./CallLogModal").CallLog[]
): number {
  const daysSince = daysSinceContact(lead, callLogs);
  let decay = 0;
  if (daysSince <= 3) decay = 0;
  else if (daysSince <= 7) decay = (daysSince - 3) * 2;
  else if (daysSince <= 14) decay = (4 * 2) + (daysSince - 7) * 3;
  else decay = (4 * 2) + (7 * 3) + (daysSince - 14) * 4;
  return Math.max(SCORE_FLOOR, Math.round(originalScore - decay));
}

function getDecayedLabel(decayedScore: number, lead?: Lead): "Verified Lead" | "MQL" | "Prospect Lead" | "Potential Spam" {
  if (lead?.scoreLabel === "Potential Spam") return "Potential Spam";
  if (decayedScore >= 75) return "Verified Lead";
  if (decayedScore >= 50) return "MQL";
  return "Prospect Lead";
}

// ── Lead Aging ───────────────────────────────────────────────────────

const MAX_AGE_DAYS = 180;
const COLD_DAYS    = 60;   // days without contact before lead goes cold

function daysOld(ts: string): number {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 864e5);
}
function daysRemaining(ts: string): number {
  return Math.max(0, MAX_AGE_DAYS - daysOld(ts));
}
function isArchived(lead: { timestamp: string; archivedAt?: string | null }): boolean {
  return !!lead.archivedAt || daysOld(lead.timestamp) >= MAX_AGE_DAYS;
}
// Note: callLogs passed in at call site — no closure needed
function daysSinceContact(lead: { id: string; timestamp: string }, callLogs: import("./CallLogModal").CallLog[]): number {
  const logsForLead = callLogs.filter(l => l.lead_id === lead.id);
  const lastDate = logsForLead.length > 0
    ? new Date(logsForLead[0].created_at)   // already sorted desc
    : new Date(lead.timestamp);
  return Math.floor((Date.now() - lastDate.getTime()) / 864e5);
}
function isCold(lead: { id: string; timestamp: string; archivedAt?: string | null }, callLogs: import("./CallLogModal").CallLog[]): boolean {
  return daysSinceContact(lead, callLogs) >= COLD_DAYS && !isArchived(lead);
}
function ageBarColor(days: number): string {
  if (days < 90) return "#4ADE80";   // green — fresh
  if (days < 140) return "#FACC15";  // yellow — warming
  if (days < 165) return "#FB923C";  // orange — expiring
  return "#EF4444";                  // red — critical
}
function ageBarPct(days: number): number {
  return Math.min(100, (days / MAX_AGE_DAYS) * 100);
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_LEADS: Lead[] = [
  { id: "demo_1", timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), name: "Sarah Mitchell", email: "", phone: "555-555-0192", spaceType: "Executive Office", budget: "3000", timeline: "ASAP — under 30 days", teamSize: "2–4 people", score: 91, scoreLabel: "Verified Lead", reasoning: "Strong budget, urgent timeline, and professional office need align perfectly with Sample Office Building availability.", matchedProperties: [{ id: "sample-office", name: "Sample Office Building", type: "Office", sqft: "1,200–3,000 sqft", location: "Anytown, ST", matchReason: "Premium finishes, immediate availability, fits 2-4 team." }] },
  { id: "demo_2", timestamp: new Date(Date.now() - 1000 * 60 * 34).toISOString(), name: "Mark Delaney", email: "", phone: "", spaceType: "Flex Workspace", budget: "800", timeline: "1–2 months", teamSize: "Solo", score: 58, scoreLabel: "MQL", reasoning: "Solo operator with moderate budget — a small suite at Sample Office Building is an excellent fit. Nurture toward a longer lease.", matchedProperties: [{ id: "sample-office", name: "Sample Office Building", type: "Office", sqft: "150–400 sqft", location: "123 Main Street, Anytown, ST", matchReason: "Small private suite with flexible terms, perfect for solo professional." }] },
  { id: "demo_3", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), name: "Dr. James Patel", email: "", phone: "555-555-0847", spaceType: "Private Office Suite", budget: "6000", timeline: "ASAP — under 30 days", teamSize: "5–10 people", score: 96, scoreLabel: "Verified Lead", reasoning: "Very high budget, urgent timeline, established team — priority contact for today.", matchedProperties: [{ id: "sample-office", name: "Sample Office Building", type: "Office", sqft: "2,000–6,000 sqft", location: "Anytown, ST", matchReason: "Prestige building, fits team of 5-10, premium positioning." }, { id: "sample-office-2", name: "Sample Office Building — Floor 3", type: "Office", sqft: "3,000–8,000 sqft", location: "Anytown, ST", matchReason: "Larger footprint option with flexible configuration." }], isWhale: true, whaleTier: "gold", whaleKeywords: [] },
  { id: "demo_4", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), name: "Blake Thornton", email: "", phone: "", spaceType: "Retail Storefront", budget: "1500", timeline: "3–6 months", teamSize: "2–4 people", score: 42, scoreLabel: "MQL", reasoning: "Retail need with longer timeline. Good candidate for a Main Street storefront. Follow up in 60 days.", matchedProperties: [{ id: "sample-retail", name: "Sample Retail Center", type: "Retail", sqft: "800–2,000 sqft", location: "Anytown, ST", matchReason: "High foot traffic retail units at budget-friendly rates." }] },
];



// ─── Ask OpsIQ Modal ──────────────────────────────────────────────────────────

const QUICK_QUERIES = [
  "Who should I call first today?",
  "Summarise the verified leads",
  "What's the total pipeline value?",
  "Which leads need follow-up this week?",
  "Compare our MQLs by budget",
];

function AskOpsIQModal({ leads, onClose }: { leads: Lead[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const ask = async (q?: string) => {
    const question = q || query.trim();
    if (!question) return;
    setQuery(question);
    setLoading(true);
    setAsked(true);
    setResponse("");
    try {
      // Strip heavy fields before sending — keep payload lean
      const leanLeads = leads.map(l => ({
        name: l.name, spaceType: l.spaceType, budget: l.budget,
        score: l.score, scoreLabel: l.scoreLabel, timeline: l.timeline,
        teamSize: l.teamSize, timestamp: l.timestamp, phone: l.phone,
        isWhale: l.isWhale, whaleKeywords: l.whaleKeywords,
      }));
      const res = await fetch("/api/ask-opsiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, leads: leanLeads }),
      });
      const data = await res.json();
      setResponse(data.response || data.error || "No response received.");
    } catch (err) {
      setResponse(`Connection error — ${err instanceof Error ? err.message : "please try again"}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto">
      <div className="bg-[#0A0F1A] border border-white/15 rounded-2xl w-full max-w-xl shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_35px_rgba(56,189,248,0.12)] overflow-hidden max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/[0.08] via-indigo-500/[0.04] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_18px_rgba(59,130,246,0.35)] text-white">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm">Ask OpsIQ</p>
              <p className="text-xs text-[#4ADE80]">Lead Intelligence · {leads.length} leads in context</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick queries */}
          {!asked && (
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Quick questions</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUERIES.map(q => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/25 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all"
                  >
                    {q} <ChevronRight size={10} className="text-gray-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Response area */}
          {asked && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 min-h-[80px] shadow-[0_0_15px_rgba(56,189,248,0.06)]">
              <p className="text-xs text-[#4ADE80] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={10} /> Ask OpsIQ Analysis
              </p>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin text-[#4ADE80]" />
                  Analysing {leads.length} leads…
                </div>
              ) : (
                <p className="text-sm text-gray-200 leading-relaxed">{response}</p>
              )}
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 focus-within:border-blue-400/60 focus-within:shadow-[0_0_12px_rgba(56,189,248,0.2)] transition-all">
              <textarea
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
                placeholder="Ask anything about your leads…"
                rows={2}
                className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none"
              />
            </div>
            <button
              onClick={() => ask()}
              disabled={!query.trim() || loading}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_16px_rgba(59,130,246,0.35)] hover:opacity-90 disabled:opacity-40 transition-all flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
          {asked && (
            <button
              onClick={() => { setAsked(false); setQuery(""); setResponse(""); }}
              className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors text-center"
            >
              ← Ask another question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Daily Brief Card ──────────────────────────────────────────────────────────

function DailyBriefCard({ leads, onBadgeClick, onLeadClick, currentUserName, callLogs }: {
  leads: Lead[];
  onBadgeClick: (filter: string) => void;
  onLeadClick: (id: string) => void;
  currentUserName?: string;
  callLogs: any[];
}) {
  const [briefText, setBriefText] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const hot = leads.filter(l => l.scoreLabel === "Verified Lead").length;
  const warm = leads.filter(l => l.scoreLabel === "MQL").length;
  const nurture = leads.filter(l => l.scoreLabel === "Prospect Lead").length;
  const whales = leads.filter(l => l.isWhale).length;
  const newToday = leads.filter(l => {
    const hrs = (Date.now() - new Date(l.timestamp).getTime()) / 36e5;
    return hrs < 24;
  }).length;
  const pipeline = leads.filter(l => l.scoreLabel === "Verified Lead").reduce((a, l) => a + parseBudget(l.budget), 0);
  const topLead = [...leads].sort((a, b) => (parseBudget(b.budget) * b.score) - (parseBudget(a.budget) * a.score))[0];

  const generateBrief = async () => {
    setBriefLoading(true);
    try {
      const leanLeads = leads.map(l => ({
        name: l.name, spaceType: l.spaceType, budget: l.budget,
        score: l.score, scoreLabel: l.scoreLabel, timeline: l.timeline,
        teamSize: l.teamSize, timestamp: l.timestamp, phone: l.phone,
        isWhale: l.isWhale, whaleKeywords: l.whaleKeywords,
      }));
      const res = await fetch("/api/ask-opsiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `OPERATEIQ DAILY BRIEF — max 2 short sentences, facts only, no greetings or headers:
1. Name the top 2 leads by revenue potential (highest budget × score). For each: name, budget/month, timeline.
2. Hot pipeline total per month. Mention whale count only if above 0.
Use real names and numbers. Be punchy.`,
          leads: leanLeads,
        }),
      });
      const data = await res.json();
      setBriefText(data.response || data.error || "");
    } catch {
      setBriefText("Unable to generate brief — check your connection.");
    } finally {
      setBriefLoading(false);
    }
  };

  useEffect(() => { if (leads.length) generateBrief(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = [
    { label: "Verified", value: hot,      emoji: "🔥", color: "#EF4444", filter: "Verified Lead"  },
    { label: "MQL",      value: warm,     emoji: "⚡", color: "#F97316", filter: "MQL"           },
    { label: "Prospect",  value: nurture,  emoji: "●",  color: "#38BDF8", filter: "Prospect Lead"  },
    { label: "New Today",value: newToday, emoji: "⚠️", color: "#FACC15", filter: "New Today" },
    { label: "Whales",   value: whales,   emoji: "🐳", color: "#FACC15", filter: "Whale"     },
  ];

  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.04] via-blue-500/[0.03] to-transparent p-3 sm:p-5 mb-6 relative overflow-hidden shadow-[0_0_28px_rgba(56,189,248,0.10)]">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-blue-500 opacity-[0.06] blur-3xl pointer-events-none" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_14px_rgba(59,130,246,0.35)] flex-shrink-0 text-white">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-sky-400 uppercase tracking-widest">Daily Brief</p>
            <p className="text-xs text-gray-500">{today}</p>
          </div>
        </div>
        <button
          onClick={generateBrief}
          disabled={briefLoading}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-sky-400 transition-colors disabled:opacity-40"
          title="Regenerate brief"
        >
          <RefreshCw size={10} className={briefLoading ? "animate-spin" : ""} />
          {briefLoading ? "Updating…" : "Refresh"}
        </button>
      </div>

      {/* Stats chips — clickable, filter + scroll to leads */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => onBadgeClick(s.filter)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/25 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all cursor-pointer group"
            title={`Filter: ${s.label}`}
          >
            <span className="text-xs sm:text-sm">{s.emoji}</span>
            <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-gray-200 transition-colors">{s.label}</span>
            <span className="text-xs sm:text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
          </button>
        ))}
        <button
          onClick={() => onBadgeClick("Verified Lead")}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/[0.04] border border-white/15 hover:border-white/30 hover:shadow-[0_0_14px_rgba(56,189,248,0.2)] transition-all cursor-pointer group"
          title="Filter: Verified Pipeline"
        >
          <DollarSign size={12} className="text-[#4ADE80]" />
          <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Verified Pipeline</span>
          <span className="text-xs sm:text-sm font-black text-[#4ADE80] tabular-nums">${pipeline.toLocaleString()}/mo</span>
        </button>
      </div>

      {/* AI Brief text */}
      <div className="border-t border-white/[0.08] pt-3">
        {briefLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 size={12} className="animate-spin text-[#4ADE80]" />
            Generating brief…
          </div>
        ) : briefText ? (
          <p className="text-sm text-gray-300 leading-relaxed">
            {/* Scan for lead names and make them clickable */}
            {(() => {
              const sorted = [...leads].sort((a, b) => b.name.length - a.name.length);
              let parts: (string | React.ReactNode)[] = [briefText];
              sorted.forEach(lead => {
                const next: (string | React.ReactNode)[] = [];
                parts.forEach((part, pi) => {
                  if (typeof part !== "string") { next.push(part); return; }
                  const chunks = part.split(lead.name);
                  chunks.forEach((chunk, ci) => {
                    next.push(chunk);
                    if (ci < chunks.length - 1) next.push(
                      <button key={`${lead.id}-${pi}-${ci}`} onClick={() => onLeadClick(lead.id)}
                        className="text-[#4ADE80] font-bold underline underline-offset-2 hover:text-white transition-colors cursor-pointer"
                      >{lead.name}</button>
                    );
                  });
                });
                parts = next;
              });
              return parts;
            })()}
          </p>
        ) : topLead ? (
          <p className="text-sm text-gray-500 italic">Top priority: {topLead.name} — {topLead.spaceType} at ${parseBudget(topLead.budget).toLocaleString()}/mo</p>
        ) : null}
        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
          <Sparkles size={9} /> Powered by Ask OpsIQ
        </p>
      </div>

      {/* 📞 Personal Follow-up checklist */}
      {(() => {
        if (!currentUserName) return null;
        const todayStr = new Date().toISOString().split("T")[0];
        const myFollowUps = leads.filter(l => {
          if (!l.assignedEmployee) return false;
          if (l.assignedEmployee.toLowerCase() !== currentUserName.toLowerCase()) return false;
          if (!l.followUpDate) return false;
          return l.followUpDate <= todayStr;
        });
        if (myFollowUps.length === 0) return null;
        return (
          <div className="mt-4 pt-4 border-t border-[rgba(74,222,128,0.15)]">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <span>📞</span> My Follow-up List ({myFollowUps.length})
            </p>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {myFollowUps.map(l => (
                <div key={l.id} className="flex items-center justify-between text-xs bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-sky-400/30 hover:shadow-[0_0_10px_rgba(56,189,248,0.1)] rounded-lg px-2.5 py-1.5 transition-all">
                  <div className="flex flex-col min-w-0">
                    <button onClick={() => onLeadClick(l.id)} className="font-bold text-gray-300 hover:text-white transition-colors truncate max-w-[180px] text-left">
                      {l.name}
                    </button>
                    {l.assignedEmployee && (
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        👤 {l.assignedEmployee}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-red-400 font-bold bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] px-1.5 py-0.5 rounded">
                      Due {l.followUpDate}
                    </span>
                    <button
                      onClick={async () => {
                        await fetch("/api/admin-lead", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: l.id, followUpDate: null }),
                        });
                        window.location.reload();
                      }}
                      className="text-[10px] text-gray-500 hover:text-white font-bold transition-all px-1.5 py-0.5 border border-[rgba(255,255,255,0.08)] rounded hover:border-[rgba(255,255,255,0.2)]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Lead Comments Component ───────────────────────────────────────────

interface LeadComment {
  id: string; lead_id: string; author: string; body: string; timestamp: string;
}

function LeadComments({ leadId, currentUserName }: { leadId: string; currentUserName?: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [loadingCmts, setLoadingCmts] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [authorName, setAuthorName] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("oiq_commenter") ?? "" : ""
  );
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync Google user name when auth resolves
  useEffect(() => { if (currentUserName) setAuthorName(currentUserName); }, [currentUserName]);

  const loadComments = async () => {
    setLoadingCmts(true);
    try {
      const res = await fetch(`/api/lead-comments?lead_id=${encodeURIComponent(leadId)}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch { /* keep existing */ }
    finally { setLoadingCmts(false); }
  };

  useEffect(() => { if (open) loadComments(); }, [open]); // eslint-disable-line

  const postComment = async () => {
    if (!newBody.trim() || !authorName.trim()) return;
    setPosting(true);
    try {
      await fetch("/api/lead-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, author: authorName.trim(), body: newBody.trim() }),
      });
      localStorage.setItem("oiq_commenter", authorName.trim());
      setNewBody("");
      await loadComments();
    } finally { setPosting(false); }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
          open || comments.length > 0
            ? "text-[#4ADE80] drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]"
            : "text-gray-500 hover:text-[#4ADE80]"
        }`}
      >
        <MessageSquare size={14} className={comments.length > 0 ? "fill-[rgba(74,222,128,0.15)]" : ""} />
        Activity {comments.length > 0 ? `(${comments.length})` : ""}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {/* Comment list */}
          {loadingCmts ? (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Loader2 size={11} className="animate-spin" /> Loading activity…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-700 italic">No activity yet — be the first to add a note.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/25 flex items-center justify-center text-[9px] font-black text-sky-400 flex-shrink-0">
                  {c.author.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-300">{c.author}</span>
                    <span className="text-xs text-gray-600">{timeAgo(c.timestamp)}</span>
                  </div>
                  <p className="text-[12px] text-gray-400 leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))
          )}

          {/* New comment input */}
          <div className="mt-3 space-y-2">
            <input
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-700 transition-colors"
            />
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                placeholder="Add a note… (Enter to post)"
                rows={2}
                spellCheck={true}
                className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-700 transition-colors resize-none"
              />
              <button
                onClick={postComment}
                disabled={posting || !newBody.trim() || !authorName.trim()}
                className="flex-shrink-0 flex items-center justify-center w-9 h-auto rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400/30 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)] hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Lead Panel ───────────────────────────────────────────────────

const SPACE_TYPES = ["Office", "Executive Suite", "CoWork / Flex", "Retail Storefront", "Warehouse / Industrial", "Event Space", "Restaurant", "Other", "Not sure yet"] as const;
const TIMELINES = ["ASAP — under 30 days", "30–60 days", "60–90 days", "3–6 months", "Exploring options"] as const;
const TEAM_SIZES = ["Solo", "2–4 people", "5–10 people", "10+ people"] as const;

function formatPhoneAdmin(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (!digits.length) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function derivedLabel(score: number): "Verified Lead" | "MQL" | "Prospect Lead" {
  if (score >= 70) return "Verified Lead";
  if (score >= 40) return "MQL";
  return "Prospect Lead";
}

const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-600 transition-all";
const LABEL = "block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1";

function AddLeadPanel({ onLeadAdded, currentUserName, currentUserEmail }: { onLeadAdded: (lead: Lead) => void; currentUserName?: string; currentUserEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [scoreMode, setScoreMode] = useState<"ai" | "manual">("ai");
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftTime, setDraftTime] = useState("");

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    spaceType: "Office" as typeof SPACE_TYPES[number],
    budget: "",
    timeline: "ASAP — under 30 days" as typeof TIMELINES[number],
    teamSize: "Solo" as typeof TEAM_SIZES[number],
    notes: "",
    manualScore: 70,
    followUpDate: "",
    createdByEmployee: "",
  });

  const LEAD_DRAFT_KEY = "oiq_draft_lead_new";

  const clearLocalDraft = () => { try { localStorage.removeItem(LEAD_DRAFT_KEY); } catch { /* ignore */ } };

  // On open: check for a stored draft
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(LEAD_DRAFT_KEY);
      if (raw) {
        const { data, savedAt } = JSON.parse(raw);
        if (data && savedAt) {
          const mins = Math.round((Date.now() - new Date(savedAt).getTime()) / 60000);
          setDraftTime(mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`);
          setShowDraftRestore(true);
        }
      }
    } catch { /* ignore */ }
  }, [open]);

  // Auto-save to localStorage on every form change (only when open)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(LEAD_DRAFT_KEY, JSON.stringify({ data: { form, scoreMode }, savedAt: new Date().toISOString() })); } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(t);
  }, [form, scoreMode, open]);

  // Automatically pre-fill the employee field with current logged-in user when open
  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        createdByEmployee: f.createdByEmployee || currentUserName || currentUserEmail?.split("@")[0] || "Staff"
      }));
    }
  }, [open, currentUserName, currentUserEmail]);

  function reset() {
    setForm({
      name: "", phone: "", email: "",
      spaceType: "Office", budget: "",
      timeline: "ASAP — under 30 days", teamSize: "Solo",
      notes: "", manualScore: 70,
      followUpDate: "",
      createdByEmployee: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
    });
    setScoreMode("ai");
    setError("");
    setSuccess(false);
  }

  const label = derivedLabel(form.manualScore);
  const labelColor = label === "Verified Lead" ? "#4ADE80" : label === "MQL" ? "#FACC15" : "#94A3B8";

  async function submit() {
    if (!form.name.trim() || !form.budget) { setError("Name and budget are required."); return; }
    if (form.spaceType === "Other" && !form.notes.trim()) { setError("Notes are required when space type is 'Other'."); return; }
    setSubmitting(true); setError("");
    try {
      if (scoreMode === "ai") {
        const res = await fetch("/api/lease-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(), email: form.email.trim(), phone: form.phone,
            spaceType: form.spaceType, budget: form.budget,
            timeline: form.timeline, teamSize: form.teamSize,
            additionalInfo: form.notes, utm_source: "manual", utm_medium: "admin", utm_campaign: "",
            actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
            actorEmail: currentUserEmail || "",
            followUpDate: form.followUpDate || null,
            createdByEmployee: form.createdByEmployee.trim() || "Staff",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.lead) { setError(data.error || "AI scoring failed."); return; }
        onLeadAdded(data.lead);
      } else {
        const res = await fetch("/api/admin-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(), email: form.email.trim(), phone: form.phone,
            spaceType: form.spaceType, budget: form.budget,
            timeline: form.timeline, teamSize: form.teamSize,
            additionalInfo: form.notes,
            score: form.manualScore, scoreLabel: label,
            reasoning: "Manually entered and scored by admin.",
            actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
            actorEmail: currentUserEmail || "",
            followUpDate: form.followUpDate || null,
            createdByEmployee: form.createdByEmployee.trim() || "Staff",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.lead) { setError(data.error || "Save failed."); return; }
        onLeadAdded(data.lead);
      }
      clearLocalDraft();
      setSuccess(true);
      reset();
      setTimeout(() => { setSuccess(false); setOpen(false); }, 1800);
    } catch (e) {
      setError(`Network error — ${e instanceof Error ? e.message : "please try again"}.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDraft() {
    setSavingDraft(true); setError("");
    try {
      const draftName = form.name.trim() || `Draft Lead — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      const res = await fetch("/api/admin-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName, email: form.email.trim(), phone: form.phone,
          spaceType: form.spaceType, budget: form.budget || "0",
          timeline: form.timeline, teamSize: form.teamSize,
          additionalInfo: form.notes,
          score: 0, scoreLabel: "Draft",
          reasoning: "Draft — incomplete lead entry. Finish and score before contacting.",
          actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
          actorEmail: currentUserEmail || "",
          followUpDate: form.followUpDate || null,
          createdByEmployee: form.createdByEmployee.trim() || "Staff",
          source: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.lead) { setError(data.error || "Draft save failed."); return; }
      clearLocalDraft();
      onLeadAdded(data.lead);
      setSuccess(true);
      reset();
      setTimeout(() => { setSuccess(false); setOpen(false); }, 1400);
    } catch (e) {
      setError(`Draft save failed — ${e instanceof Error ? e.message : "please try again"}.`);
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <div className="mb-6">
      {/* Toggle button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) reset(); }}
        id="add-lead-toggle"
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
          open
            ? "bg-white/[0.08] border-white/30 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]"
            : "bg-white/[0.03] border-white/10 text-gray-300 hover:text-white hover:border-white/25 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)]"
        }`}
      >
        <Plus size={15} />
        Add Lead
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Collapsible form */}
      {open && (
        <div className="mt-3 rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.03] via-blue-500/[0.02] to-transparent p-5 shadow-[0_16px_50px_rgba(0,0,0,0.6),0_0_24px_rgba(56,189,248,0.08)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black text-white">New Lead Entry</p>
            <button onClick={() => { clearLocalDraft(); setOpen(false); reset(); }} className="text-gray-600 hover:text-white transition-colors"><X size={15} /></button>
          </div>

          {/* Draft restore banner */}
          {showDraftRestore && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 mb-4 rounded-xl bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.35)]">
              <p className="text-xs text-[#A78BFA] font-bold">📝 You have an unsaved draft from {draftTime} — restore it?</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => {
                  try {
                    const raw = localStorage.getItem("oiq_draft_lead_new");
                    if (raw) {
                      const { data } = JSON.parse(raw);
                      if (data?.form) setForm(data.form);
                      if (data?.scoreMode) setScoreMode(data.scoreMode);
                    }
                  } catch { /* ignore */ }
                  setShowDraftRestore(false);
                }} className="px-3 py-1 rounded-lg bg-[#A78BFA] text-black text-xs font-black hover:opacity-90 transition-opacity">Restore</button>
                <button onClick={() => { clearLocalDraft(); setShowDraftRestore(false); }} className="px-3 py-1 rounded-lg border border-[rgba(255,255,255,0.1)] text-gray-500 text-xs hover:text-white transition-colors">Discard</button>
              </div>
            </div>
          )}

          {/* Grid of fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Full Name *</label>
              <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane Smith" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: formatPhoneAdmin(e.target.value) })} placeholder="(555) ___-____" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Space Type</label>
              <select value={form.spaceType} onChange={e => setForm({ ...form, spaceType: e.target.value as typeof SPACE_TYPES[number] })} className={FIELD}>
                {SPACE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Budget ($/mo) *</label>
              <input type="text" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="e.g. 2500 or 400–500" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Move-in Timeline</label>
              <select value={form.timeline} onChange={e => setForm({ ...form, timeline: e.target.value as typeof TIMELINES[number] })} className={FIELD}>
                {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Team Size</label>
              <select value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value as typeof TEAM_SIZES[number] })} className={FIELD}>
                {TEAM_SIZES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Notes {form.spaceType === "Other" && <span className="text-red-400 font-bold">*</span>}</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={form.spaceType === "Other" ? "Required for 'Other' space type..." : "Any context, source, referral..."} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Follow-up Date</label>
              <input type="date" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} className={FIELD} style={{ colorScheme: "dark" }} />
            </div>
            <div>
              <label className={LABEL}>Entered By (Employee)</label>
              <input value={form.createdByEmployee} onChange={e => setForm({ ...form, createdByEmployee: e.target.value })} placeholder="Employee Name" className={FIELD} />
            </div>
          </div>

          {/* Score mode toggle */}
          <div className="mb-4">
            <p className={LABEL}>Scoring Method</p>
            <div className="flex gap-2 mb-3">
              {(["ai", "manual"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setScoreMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    scoreMode === m
                      ? "bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.4)] text-[#4ADE80]"
                      : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {m === "ai" ? <><Brain size={11} /> AI Score It</> : <><CheckCircle2 size={11} /> Set Manually</>}
                </button>
              ))}
            </div>

            {scoreMode === "manual" && (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range" min={0} max={100}
                    value={form.manualScore}
                    onChange={e => setForm({ ...form, manualScore: Number(e.target.value) })}
                    className="w-full accent-[#4ADE80]"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                    <span>0</span><span>50</span><span>100</span>
                  </div>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-2xl font-black tabular-nums" style={{ color: labelColor }}>{form.manualScore}</p>
                  <p className="text-xs font-bold" style={{ color: labelColor }}>{label}</p>
                </div>
              </div>
            )}
          </div>

          {/* Error / Success */}
          {error && <p className="text-xs text-red-400 mb-3 flex items-center gap-1.5"><AlertCircle size={12} />{error}</p>}
          {success && <p className="text-xs text-[#4ADE80] mb-3 flex items-center gap-1.5"><CheckCircle2 size={12} />Lead saved successfully!</p>}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={submit}
              disabled={submitting || savingDraft || !form.name.trim() || !form.budget || (form.spaceType === "Other" && !form.notes.trim())}
              id="save-lead-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_0_16px_rgba(59,130,246,0.35)]"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : scoreMode === "ai" ? <><Brain size={14} /> Score with AI</> : <><Save size={14} /> Save Lead</>}
            </button>
            <button
              onClick={saveDraft}
              disabled={submitting || savingDraft}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[rgba(167,139,250,0.4)] text-[#A78BFA] bg-[rgba(167,139,250,0.08)] text-sm font-bold hover:bg-[rgba(167,139,250,0.15)] transition-colors disabled:opacity-50"
            >
              {savingDraft ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><span className="text-base leading-none">📝</span> Save Draft</>}
            </button>
            <button onClick={() => { clearLocalDraft(); setOpen(false); reset(); }} className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-sm hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EditLeadModalProps {
  lead: Lead;
  onClose: () => void;
  onSave: (updated: Lead) => void;
  currentUser?: string;
  currentUserEmail?: string;
}

function EditLeadModal({ lead, onClose, onSave, currentUser, currentUserEmail }: EditLeadModalProps) {
  const [form, setForm] = useState({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    spaceType: lead.spaceType,
    budget: String(lead.budget || ""),
    timeline: lead.timeline,
    teamSize: lead.teamSize,
    notes: lead.additionalInfo || "",
    progress: lead.progress || "0-25%",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name.trim() || !form.budget) { setError("Name and budget are required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin-lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          spaceType: form.spaceType,
          budget: form.budget,
          timeline: form.timeline,
          teamSize: form.teamSize,
          additionalInfo: form.notes,
          progress: form.progress,
          actorName: currentUser || "Staff",
          actorEmail: currentUserEmail || "",
          leadName: lead.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed.");
      } else {
        const updated: Lead = {
          ...lead,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          spaceType: form.spaceType,
          budget: form.budget,
          timeline: form.timeline,
          teamSize: form.teamSize,
          additionalInfo: form.notes,
          progress: form.progress,
        };
        onSave(updated);
        onClose();
      }
    } catch (e) {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const LABEL = "text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1";
  const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-700 transition-all";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto">
      <div className="bg-[#0A0F1A] border border-white/15 rounded-2xl w-full max-w-xl shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_35px_rgba(56,189,248,0.12)] overflow-hidden max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/[0.08] via-indigo-500/[0.04] to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_18px_rgba(59,130,246,0.35)] text-white">
              <Pencil size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">Edit Lead Info</h2>
              <p className="text-[10px] text-gray-500">Edit contact details and metrics</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <p className="text-xs text-red-400 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-xl px-4 py-2.5">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Full Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: formatPhoneAdmin(e.target.value) })} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Space Type</label>
              <select value={form.spaceType} onChange={e => setForm({ ...form, spaceType: e.target.value })} className={FIELD} style={{ background: "#0A0F1A" }}>
                {SPACE_TYPES.map(t => <option key={t} value={t} style={{ background: "#0A0F1A" }}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Budget ($/mo) *</label>
              <input type="text" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="e.g. 2500 or 400–500" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Move-in Timeline</label>
              <select value={form.timeline} onChange={e => setForm({ ...form, timeline: e.target.value })} className={FIELD} style={{ background: "#0A0F1A" }}>
                {TIMELINES.map(t => <option key={t} value={t} style={{ background: "#0A0F1A" }}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Team Size</label>
              <select value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value })} className={FIELD} style={{ background: "#0A0F1A" }}>
                {TEAM_SIZES.map(t => <option key={t} value={t} style={{ background: "#0A0F1A" }}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Progress</label>
              <select value={form.progress} onChange={e => setForm({ ...form, progress: e.target.value })} className={FIELD} style={{ background: "#0A0F1A" }}>
                {["0-25%", "25-50%", "50-75%", "75-100%"].map(p => <option key={p} value={p} style={{ background: "#0A0F1A" }}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Notes / Additional Info</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className={FIELD + " resize-none"} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)] flex-shrink-0">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-gray-500 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity shadow-[0_0_14px_rgba(59,130,246,0.3)]">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Array<{name: string; email: string; avatar?: string}>>([]);
  const briefKeyRef = useRef(0);
  const [briefKey, setBriefKey] = useState(0);
  const searchParams = useSearchParams();
  const VALID_TABS = ["leads", "tenants", "propdetails", "analytics", "maintenance", "cleaning", "archived", "marketing", "content", "settings", "teamboard"] as const;
  const [rentLedgerOpen, setRentLedgerOpen] = useState(false);
  const [secDepLedgerOpen, setSecDepLedgerOpen] = useState(false);
  type TabKey = typeof VALID_TABS[number];
  const rawTabParam = searchParams.get("tab");
  const parsedTab = (rawTabParam === "conversations" || rawTabParam === "tasks") ? "teamboard" : rawTabParam;
  const initialTab = (VALID_TABS.includes(parsedTab as any) ? parsedTab : "leads") as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [previousTab, setPreviousTab] = useState<TabKey>("leads");

  // Keep URL in sync when tab changes — use replace so the back button isn't polluted
  const switchTab = (tab: TabKey) => {
    if (tab === "settings" && activeTab === "settings") {
      setActiveTab(previousTab);
      router.replace(`/admin?tab=${previousTab}`, { scroll: false });
      return;
    }
    if (activeTab !== "settings") {
      setPreviousTab(activeTab);
    }
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  };
  const [marketingSubTab, setMarketingSubTab] = useState("blog");
  const [contentSubView, setContentSubView] = useState("content-properties");
  const [teamBoardSubTab, setTeamBoardSubTab] = useState<"chat" | "tasks">("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // Always start at the very top — prevents browser scroll-restoration from
  // loading the dashboard mid-page and hiding the tab nav under the site nav
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, []);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<"All" | "Verified Lead" | "MQL" | "Prospect Lead" | "Potential Spam" | "Whale" | "New Today">("All");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newLeadToast, setNewLeadToast] = useState<Lead | null>(null);
  const [mentionAlert, setMentionAlert] = useState<{ message: string; author: string } | null>(null);

  const handleNewMention = useCallback((msg: string, author: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.error("Audio chirp error:", e);
    }
    setMentionAlert({ message: msg, author });
  }, []);
  const [recentLiveIds, setRecentLiveIds] = useState<Set<string>>(new Set());
  const [showAskOpsIQ, setShowAskOpsIQ] = useState(false);
  const [callListOpen, setCallListOpen] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [activeCallLog, setActiveCallLog] = useState<{ leadId: string; leadName: string; phone: string } | null>(null);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [coldPipelineOpen, setColdPipelineOpen] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState("");
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [prepopulatedTenant, setPrepopulatedTenant] = useState<Partial<Tenant> | null>(null);
  const [activeOrg, setActiveOrg] = useState<{ id: string; name: string; slug: string; tier: string } | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Rescheduling follow-up date states ──
  const [reschedulingLeadId, setReschedulingLeadId] = useState<string | null>(null);
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [rescheduleComment, setRescheduleComment] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [followUpAlertsDismissed, setFollowUpAlertsDismissed] = useState(false);
  const [followUpAlertsExpanded, setFollowUpAlertsExpanded] = useState(false);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSaveFollowUp = async (lead: Lead) => {
    if (!newFollowUpDate || !rescheduleComment.trim()) return;
    setRescheduling(true);
    setRescheduleError("");
    try {
      const res = await fetch("/api/admin-lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          followUpDate: newFollowUpDate || null,
          comment: rescheduleComment.trim(),
          actorName: currentUser?.name || "Staff",
          actorEmail: currentUser?.email || "",
          leadName: lead.name,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update follow-up date");
      }
      // Update local leads state
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, followUpDate: newFollowUpDate || null } : l));
      setReschedulingLeadId(null);
      setRescheduleComment("");
    } catch (err) {
      setRescheduleError("Reschedule failed. Please try again.");
    } finally {
      setRescheduling(false);
    }
  };

  // ── Global Lease Renewal Alerts ──
  interface LeaseAlert {
    tenant: Tenant;
    days: number;
    urgency: "expired" | "urgent" | "soon" | "watch" | "early";
  }
  const [leaseAlerts, setLeaseAlerts] = useState<LeaseAlert[]>([]);
  const [leaseAlertsDismissed, setLeaseAlertsDismissed] = useState(false);
  const [leaseAlertsExpanded, setLeaseAlertsExpanded] = useState(false);
  const [adminStaff, setAdminStaff] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/allowed-users?role=admin")
      .then(res => res.json())
      .then(d => {
        if (Array.isArray(d.users)) {
          setAdminStaff(d.users.map((u: any) => u.name));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/tenants", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data.tenants)) return;
        const tenants = data.tenants.map(rowToTenant);
        const active = tenants.filter((t: Tenant) => t.status === "active");
        const alerts: LeaseAlert[] = [];
        active.forEach((t: Tenant) => {
          const dateStr = t.renewalDate || t.leaseEnd;
          if (!dateStr) return;
          const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
          const threshold = t.leaseAlertDays ?? 90;
          if (days > threshold) return;
          let urgency: LeaseAlert["urgency"] = "early";
          if (days <= 0)  urgency = "expired";
          else if (days <= 30) urgency = "urgent";
          else if (days <= 60) urgency = "soon";
          else if (days <= 90) urgency = "watch";
          alerts.push({ tenant: t, days, urgency });
        });
        alerts.sort((a, b) => a.days - b.days);
        setLeaseAlerts(alerts);
      })
      .catch(() => {});
  }, []);

  // ── Delete a single lead ──
  const deleteLead = async (id: string) => {
    const lead = leads.find(l => l.id === id);
    try {
      const res = await fetch("/api/lease-bot", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== id));
        seenIdsRef.current.delete(id);
        // Audit log
        fetch("/api/activity-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_email:   currentUser?.email   || "unknown",
            actor_name:    currentUser?.name || currentUser?.email?.split("@")[0] || "Staff",
            action:        "deleted",
            resource_type: "lead",
            resource_name: lead?.name || id,
            resource_id:   id,
            metadata:      { score: lead?.score, score_label: lead?.scoreLabel },
          }),
        }).catch(() => {});
      }
    } catch { /* silent */ }
    setDeletingLeadId(null);
  };

  // ── Delete ALL leads ──
  const deleteAllLeads = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch("/api/lease-bot", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setLeads([]);
        seenIdsRef.current.clear();
      }
    } catch { /* silent */ }
    setDeletingAll(false);
    setDeleteAllConfirm("");
  };

  const archiveLead = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    try {
      const res = await fetch("/api/admin-lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          archive: true,
          actorName: currentUser?.name || "Staff",
          actorEmail: currentUser?.email || "",
          leadName: lead?.name || leadId,
        }),
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, archivedAt: new Date().toISOString() } : l));
      }
    } catch { /* silent */ }
    setArchiveConfirmId(null);
  };

  const updateLeadProgress = async (leadId: string, progress: string) => {
    const lead = leads.find(l => l.id === leadId);
    try {
      const res = await fetch("/api/admin-lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          progress,
          actorName: currentUser?.name || "Staff",
          actorEmail: currentUser?.email || "",
          leadName: lead?.name || leadId,
        }),
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, progress } : l));
      }
    } catch { /* ignore */ }
  };

  // Fetch call logs on mount
  useEffect(() => {
    fetch("/api/call-logs")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.logs)) setCallLogs(d.logs); })
      .catch(() => {});
  }, []);

  // Auth check — the server decides: verified session → membership → active org.
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("oiq_demo_auth");
      localStorage.removeItem("oiq_demo_auth");
    }

    supabaseBrowser.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) {
        router.replace("/admin/login");
        return;
      }
      const email = data.user.email.toLowerCase();

      let session: {
        authenticated?: boolean;
        isSuperAdmin?: boolean;
        activeOrg?: typeof activeOrg;
        impersonatingOrg?: typeof activeOrg;
        user?: { name?: string };
      } = {};
      try {
        session = await fetch("/api/platform/session", { cache: "no-store" }).then((r) => r.json());
      } catch { /* handled below */ }

      if (!session.authenticated) {
        router.replace("/admin/login");
        return;
      }

      const org = session.impersonatingOrg || session.activeOrg || null;
      if (!org) {
        // Signed in, but not a member of any organization.
        if (session.isSuperAdmin) {
          router.replace("/platform");
          return;
        }
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }
      setActiveOrg(org);

      const resolvedName = session.user?.name || data.user.user_metadata?.full_name || email.split("@")[0] || "Team";
      setCurrentUser({
        name: resolvedName,
        email,
        avatar: data.user.user_metadata?.avatar_url,
      });
      try { localStorage.setItem("oiq_commenter", resolvedName); } catch { /**/ }

      // ── Log this login to activity_log (server stamps org + actor) ──────
      try {
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        fetch("/api/activity-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "admin_login",
            resource_type: "auth",
            resource_name: resolvedName,
            actor_name: resolvedName,
            actor_email: email,
            metadata: { device: isMobile ? "mobile" : "desktop" },
          }),
        }).catch(() => {});
      } catch { /**/ }

      setAuthChecking(false);
    });

    // Session expiry / sign-out in another tab → back to login.
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/admin/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Clear stale localStorage on mount — Supabase is now source of truth
  useEffect(() => {
    try { localStorage.removeItem("oiq_live_leads"); } catch { /* ignore */ }
  }, []);

  // Supabase Realtime Presence — show who else is online
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabaseBrowser.channel("admin_presence", {
      config: { presence: { key: currentUser.email } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string; email: string; avatar?: string }>();
        setOnlineUsers(Object.values(state).flat());
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: currentUser.name, email: currentUser.email, avatar: currentUser.avatar });
        }
      });
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [currentUser]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const orgParam = activeOrg?.id ? `?org_id=${encodeURIComponent(activeOrg.id)}` : "";
      const res = await fetch(`/api/lease-bot${orgParam}`);
      const data = await res.json();
      if (data.leads && Array.isArray(data.leads)) {
        const fetched: Lead[] = data.leads;
        fetched.forEach(l => seenIdsRef.current.add(l.id));
        setLeads(fetched);
        // Bump briefKey once after the first real fetch so the brief regenerates with live data
        if (briefKeyRef.current === 0 && fetched.some(l => !l.id.startsWith("demo_"))) {
          briefKeyRef.current = 1;
          setBriefKey(1);
        }
      }
    } catch { /* keep existing state on error */ }
    finally { setLoading(false); setLastRefresh(new Date()); }
  };

  // ── localStorage live-lead poller (4s interval) ────────────────────────────
  const pollLocalStorage = useCallback(() => {
    try {
      const stored: Lead[] = JSON.parse(localStorage.getItem("oiq_live_leads") || "[]");
      if (!stored.length) return;

      const brandNew = stored.filter(l => !seenIdsRef.current.has(l.id));
      if (!brandNew.length) return;

      // Mark all as seen
      brandNew.forEach(l => seenIdsRef.current.add(l.id));
      setRecentLiveIds(prev => { const s = new Set(prev); brandNew.forEach(l => s.add(l.id)); return s; });

      // Merge into leads list (new ones at top, before demo leads)
      setLeads(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const toAdd = brandNew.filter(l => !existingIds.has(l.id));
        return toAdd.length ? [...toAdd, ...prev] : prev;
      });

      // Show toast for the most recent new lead
      const latest = brandNew[0];
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setNewLeadToast(latest);
      toastTimerRef.current = setTimeout(() => setNewLeadToast(null), 5000);
      setLastRefresh(new Date());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLeads();
    const apiInterval = setInterval(fetchLeads, 30000);
    const lsInterval = setInterval(pollLocalStorage, 4000);
    // Also run once on mount in case chatbot already fired
    pollLocalStorage();
    return () => { clearInterval(apiInterval); clearInterval(lsInterval); };
  }, [activeOrg?.id, pollLocalStorage]);

  // Remove NEW badge after 60s
  useEffect(() => {
    if (!recentLiveIds.size) return;
    const t = setTimeout(() => setRecentLiveIds(new Set()), 60000);
    return () => clearTimeout(t);
  }, [recentLiveIds]);

  // ── Lead Segmentation ──────────────────────────────────────────────────
  const allNonArchived = leads.filter(l => !isArchived(l));
  const coldLeads      = allNonArchived.filter(l => isCold(l, callLogs));
  const coldSet        = new Set(coldLeads.map(l => l.id));
  const activeLeads    = allNonArchived.filter(l => !coldSet.has(l.id));
  const archivedLeads  = leads.filter(l => isArchived(l));
  // Temperature priority based on DECAYED score: Hot (0) > Warm (1) > Nurture (2), then highest decayed score first, then newest
  const decayedRank = (l: Lead) => {
    const dLabel = getDecayedLabel(getDecayedScore(l.score, l, callLogs), l);
    if (dLabel === "Potential Spam") return 3;
    return dLabel === "Verified Lead" ? 0 : dLabel === "MQL" ? 1 : 2;
  };
  const sortedActive = [...activeLeads].sort((a, b) => {
    const r = decayedRank(a) - decayedRank(b);
    if (r !== 0) return r;
    const dA = getDecayedScore(a.score, a, callLogs);
    const dB = getDecayedScore(b.score, b, callLogs);
    if (dB !== dA) return dB - dA; // highest decayed score first
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const nonSpamActive = sortedActive.filter(l => l.scoreLabel !== "Potential Spam");

  const filtered = (
    filter === "All"            ? nonSpamActive :
    filter === "Whale"          ? nonSpamActive.filter(l => l.isWhale) :
    filter === "New Today"       ? nonSpamActive.filter(l => (Date.now() - new Date(l.timestamp).getTime()) < 864e5) :
    filter === "Potential Spam"  ? sortedActive.filter(l => l.scoreLabel === "Potential Spam") :
    nonSpamActive.filter(l => getDecayedLabel(getDecayedScore(l.score, l, callLogs), l) === filter)
  ).filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.name || "").toLowerCase().includes(q) ||
      (l.email || "").toLowerCase().includes(q) ||
      (l.phone || "").toLowerCase().includes(q) ||
      (l.additionalInfo || "").toLowerCase().includes(q) ||
      (l.spaceType || "").toLowerCase().includes(q) ||
      (l.assignedEmployee || "").toLowerCase().includes(q)
    );
  });
  const hotLeads = activeLeads.filter(l => getDecayedLabel(getDecayedScore(l.score, l, callLogs), l) === "Verified Lead");
  const warmCount = activeLeads.filter(l => getDecayedLabel(getDecayedScore(l.score, l, callLogs), l) === "MQL").length;
  const urgentLeads = activeLeads.filter(isUrgent);
  const whaleLeads = activeLeads.filter(l => l.isWhale);
  const avgScore = Math.round(activeLeads.reduce((a, l) => a + getDecayedScore(l.score, l, callLogs), 0) / (activeLeads.length || 1));
  const hotMonthlyPipeline = hotLeads.reduce((a, l) => a + parseBudget(l.budget), 0);
  const totalMonthlyPipeline = activeLeads.reduce((a, l) => a + parseBudget(l.budget), 0);
  const annualProjection = hotMonthlyPipeline * 12;
  // Call list sorted by revenue potential: budget × (decayedScore/100) — highest $/mo first
  const callList = [...activeLeads].filter(l => l.phone && l.scoreLabel !== "Potential Spam").sort((a, b) => (parseBudget(b.budget) * getDecayedScore(b.score, b, callLogs)) - (parseBudget(a.budget) * getDecayedScore(a.score, a, callLogs)));

  // Access denied screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center mx-auto mb-5">
            <Shield size={24} className="text-red-400" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            This account isn&apos;t linked to an OperateIQ workspace yet.
            <br />Ask your company&apos;s admin to add your email, or start a free trial.
          </p>
          <button
            onClick={async () => {
              await signOutEverywhere();
              router.replace("/admin/login");
            }}
            className="px-5 py-2.5 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-red-400 text-sm font-bold hover:bg-[rgba(239,68,68,0.18)] transition-colors"
          >
            Sign out and try another account
          </button>
        </div>
      </div>
    );
  }

  // ── Reusable Lease Renewal Alert Banner ──────────────────────────────────────
  const renderLeaseAlerts = () => {
    if (leaseAlerts.length === 0 || leaseAlertsDismissed) return null;
    const hasUrgent = leaseAlerts.some(a => a.urgency === "expired" || a.urgency === "urgent");
    const hasSoon = leaseAlerts.some(a => a.urgency === "soon");
    const accentColor = hasUrgent ? "#EF4444" : hasSoon ? "#F97316" : "#FACC15";
    const expiredCount = leaseAlerts.filter(a => a.urgency === "expired").length;
    const urgentCount = leaseAlerts.filter(a => a.urgency === "urgent").length;
    const soonCount = leaseAlerts.filter(a => a.urgency === "soon").length;
    return (
      <>
        <style>{`
          @keyframes leaseAlertPulse {
            0%, 100% { box-shadow: 0 0 8px ${accentColor}30, inset 0 0 0 1px ${accentColor}50; }
            50%      { box-shadow: 0 0 22px ${accentColor}50, inset 0 0 0 1px ${accentColor}80; }
          }
        `}</style>
        <div
          className="mb-4 rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            border: `1.5px solid ${accentColor}55`,
            background: `linear-gradient(135deg, ${accentColor}0D, ${accentColor}05)`,
            animation: leaseAlertsExpanded ? "none" : "leaseAlertPulse 2s ease-in-out infinite",
          }}>
          <button
            onClick={() => setLeaseAlertsExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer group transition-colors hover:bg-[rgba(255,255,255,0.03)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35` }}>
                <AlertCircle size={16} style={{ color: accentColor }} />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: accentColor, opacity: 0.5 }} />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor }}>
                  Lease Renewal Alerts
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black" style={{ background: `${accentColor}18`, color: accentColor }}>
                    {leaseAlerts.length}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {expiredCount > 0 && <span className="text-red-400 font-bold">{expiredCount} overdue (pending renewal)</span>}
                  {expiredCount > 0 && (urgentCount > 0 || soonCount > 0) && <span> · </span>}
                  {urgentCount > 0 && <span className="text-red-400 font-bold">{urgentCount} urgent</span>}
                  {urgentCount > 0 && soonCount > 0 && <span> · </span>}
                  {soonCount > 0 && <span className="text-orange-400 font-bold">{soonCount} soon</span>}
                  {expiredCount === 0 && urgentCount === 0 && soonCount === 0 && <span>Upcoming renewals need attention</span>}
                  <span className="text-gray-600"> — click to {leaseAlertsExpanded ? "collapse" : "review"}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: leaseAlertsExpanded ? "rgba(255,255,255,0.04)" : `${accentColor}15`,
                  color: leaseAlertsExpanded ? "#6B7280" : accentColor,
                  border: `1px solid ${leaseAlertsExpanded ? "rgba(255,255,255,0.08)" : accentColor + "30"}`,
                }}>
                {leaseAlertsExpanded ? "Collapse" : "Review Alerts ▾"}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setLeaseAlertsDismissed(true); }}
                className="text-gray-600 hover:text-white transition-colors p-1"
                title="Dismiss alerts"
              >
                <X size={14} />
              </button>
            </div>
          </button>
          {leaseAlertsExpanded && (
            <div className="px-4 pb-3 pt-2 border-t border-[rgba(255,255,255,0.06)]" style={{ animation: "slideDown 0.25s ease-out" }}>
              <style>{`@keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }`}</style>
              <div className="flex flex-col gap-2 mt-1">
                {leaseAlerts.map(({ tenant, days, urgency }) => {
                  const colorMap = {
                    expired: { text: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
                    urgent:  { text: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
                    soon:    { text: "#F97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
                    watch:   { text: "#FACC15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)" },
                    early:   { text: "#60A5FA", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)" },
                  };
                  const c = colorMap[urgency];
                  const label = days <= 0 ? "Pending Renewal · Overdue" : days <= 30 ? `${days}d URGENT` : days <= 60 ? `${days}d SOON` : days <= 90 ? `${days}d WATCH` : `${days}d`;
                  
                  const formatDate = (dateStr: string | null) => {
                    if (!dateStr) return "N/A";
                    return new Date(dateStr).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    });
                  };

                  return (
                    <button
                      key={tenant.id}
                      onClick={() => { switchTab("tenants"); setTimeout(() => document.getElementById(`tenant-card-${tenant.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 400); }}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-all hover:bg-[rgba(255,255,255,0.03)] hover:scale-[1.002]"
                      style={{ background: "rgba(255,255,255,0.01)", borderColor: c.border }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse" style={{ backgroundColor: c.text }} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-white">{tenant.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                              {label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-bold text-gray-400">Location:</span> {tenant.building || "Unassigned"}{tenant.unit ? ` · ${tenant.unit}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end text-xs text-gray-500 gap-1 sm:text-right flex-shrink-0">
                        <p>
                          <span className="font-bold text-gray-400">Expiration:</span> <span className="text-gray-300 font-semibold">{formatDate(tenant.leaseEnd)}</span>
                        </p>
                        {tenant.renewalDate && (
                          <p>
                            <span className="font-bold text-gray-400">Auto Renew Date:</span> <span className="text-gray-300 font-semibold">{formatDate(tenant.renewalDate)}</span>
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  // ── Overdue Follow-ups Alert Banner ──────────────────────────────────────────
  const renderFollowUpAlerts = () => {
    const todayStr = getTodayDateString();
    const overdueLeads = activeLeads.filter(l => l.followUpDate && l.followUpDate < todayStr);
    if (overdueLeads.length === 0 || followUpAlertsDismissed) return null;

    const accentColor = "#EF4444";

    return (
      <div
        className="mb-4 rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          border: `1.5px solid ${accentColor}55`,
          background: `linear-gradient(135deg, ${accentColor}0D, ${accentColor}05)`,
        }}
      >
        <button
          onClick={() => setFollowUpAlertsExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer group transition-colors hover:bg-[rgba(255,255,255,0.03)]"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35` }}>
              <Clock size={16} style={{ color: accentColor }} />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: accentColor, opacity: 0.5 }} />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor }}>
                Overdue Follow-Up Alerts
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black" style={{ background: `${accentColor}18`, color: accentColor }}>
                  {overdueLeads.length}
                </span>
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                <span className="text-red-400 font-bold">{overdueLeads.length} lead{overdueLeads.length > 1 ? "s have" : " has"} missed the follow-up date!</span>
                <span className="text-gray-600"> — click to {followUpAlertsExpanded ? "collapse" : "review"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: followUpAlertsExpanded ? "rgba(255,255,255,0.04)" : `${accentColor}15`,
                color: followUpAlertsExpanded ? "#6B7280" : accentColor,
                border: `1px solid ${followUpAlertsExpanded ? "rgba(255,255,255,0.08)" : accentColor + "30"}`,
              }}>
              {followUpAlertsExpanded ? "Collapse" : "Review Overdue ▾"}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setFollowUpAlertsDismissed(true); }}
              className="text-gray-600 hover:text-white transition-colors p-1"
              title="Dismiss alerts"
            >
              <X size={14} />
            </button>
          </div>
        </button>
        {followUpAlertsExpanded && (
          <div className="px-4 pb-3 pt-1 border-t border-[rgba(255,255,255,0.06)]" style={{ animation: "slideDown 0.25s ease-out" }}>
            <div className="flex flex-wrap gap-2">
              {overdueLeads.map(lead => {
                const parts = lead.followUpDate ? lead.followUpDate.split("-") : [];
                const formattedDate = parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : lead.followUpDate;
                return (
                  <button
                    key={lead.id}
                    onClick={() => {
                      const el = document.getElementById(`lead-card-${lead.id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                        el.style.transition = "box-shadow 0.3s";
                        el.style.boxShadow = "0 0 0 2px #EF4444, 0 0 24px rgba(239,68,68,0.35)";
                        setTimeout(() => { el.style.boxShadow = ""; }, 1800);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-red-400 font-semibold"
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-400 animate-pulse" />
                    <span className="text-white font-semibold">{lead.name}</span>
                    {lead.assignedEmployee && (
                      <span className="text-[10px] bg-red-400/20 text-red-300 px-1 py-0.5 rounded font-black uppercase">
                        {lead.assignedEmployee}
                      </span>
                    )}
                    <span className="text-red-400/80 font-normal">due {formattedDate}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Auth loading screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-[0_0_24px_rgba(59,130,246,0.35)] animate-pulse">
            <Zap size={20} className="text-white" />
          </div>
          <p className="text-xs text-gray-600">Loading OperateIQ…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dash min-h-screen bg-[#080C14] text-white">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-16">

        {/* ─ New Lead Toast ──────────────────────────────────────────────── */}
        {newLeadToast && (
          <div
            className="fixed top-24 right-4 z-50 max-w-xs w-full"
            style={{ animation: "slideInRight 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both" }}
          >
            <style>{`
              @keyframes slideInRight {
                from { opacity: 0; transform: translateX(120%); }
                to   { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div className="bg-[#0D1117] border border-white/15 rounded-2xl p-4 shadow-[0_8px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(56,189,248,0.18)] flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(59,130,246,0.35)] text-white">
                <Radio size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-black text-sky-400 uppercase tracking-wider">New Lead</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                </div>
                <p className="text-sm font-bold text-white truncate">{newLeadToast.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {newLeadToast.spaceType} · <span style={{ color: scoreColor(newLeadToast.score) }}>{newLeadToast.score}/100</span> · {newLeadToast.scoreLabel}
                </p>
              </div>
              <button onClick={() => setNewLeadToast(null)} className="text-gray-600 hover:text-white transition-colors flex-shrink-0 mt-0.5">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─ Mention Alert Notification ──────────────────────────────────── */}
        {mentionAlert && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce">
            <div
              onClick={() => {
                setMentionAlert(null);
                switchTab("teamboard");
                setTeamBoardSubTab("chat");
              }}
              className="glass border border-white/20 bg-slate-950/95 rounded-2xl p-4 shadow-[0_0_30px_rgba(56,189,248,0.2)] flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-all"
            >
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-black text-sky-400 uppercase tracking-wider">💬 New Mention on Team Board</p>
                <p className="text-sm font-bold text-white truncate mt-1">
                  <span className="text-gray-400 font-semibold">{mentionAlert.author}: </span>
                  {mentionAlert.message}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMentionAlert(null);
                }}
                className="p-1 rounded-lg text-gray-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/operateiq-icon.svg" alt="OperateIQ" className="w-10 h-10 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)] object-cover" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-white font-black text-xl tracking-tight truncate">
                  {activeOrg && activeOrg.id !== "00000000-0000-0000-0000-000000000001" ? activeOrg.name : "OperateIQ"}
                </h1>
                <span className="flex items-center gap-1.5 text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-400/25 px-2 py-0.5 rounded-lg flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase -mt-0.5 hidden sm:block truncate">
                {activeOrg && activeOrg.id !== "00000000-0000-0000-0000-000000000001"
                  ? "Operations & Property Intelligence Dashboard"
                  : "Property Intelligence Platform"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="text-xs text-gray-600 hidden sm:block">Last refresh: {lastRefresh.toLocaleTimeString()}</span>

            {/* Online presence avatars */}
            {onlineUsers.length > 0 && (
              <div className="hidden sm:flex items-center gap-1" title={onlineUsers.map(u => u.name).join(", ") + " online"}>
                {[...new Map(onlineUsers.map(u => [u.email, u])).values()].map(u => (
                  <div key={u.email} className="relative" title={`${u.name} — online now`}>
                    {u.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full border border-white/20" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/25 flex items-center justify-center text-[9px] font-black text-sky-400">
                        {u.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#4ADE80] border border-[#080C14] animate-pulse" />
                  </div>
                ))}
                {onlineUsers.length > 1 && (
                  <span className="text-xs text-gray-600 ml-1">{onlineUsers.length} online</span>
                )}
              </div>
            )}

            {/* Activity Feed bell */}
            <button
              onClick={() => setShowActivityFeed(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA] text-xs font-bold hover:bg-[rgba(96,165,250,0.14)] transition-colors"
              title="Activity Log"
            >
              <Bell size={13} />
              <span className="hidden sm:inline">Activity</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" />
            </button>

            <button
              onClick={() => setShowAskOpsIQ(true)}
              className="btn-ask-opsiq px-3 sm:px-4 py-2"
              title="Ask OpsIQ"
            >
              <Brain size={13} />
              <span className="hidden sm:inline">Ask OpsIQ</span>
            </button>

            <button
              onClick={() => setShowIntakeModal(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600/30 to-cyan-600/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 hover:border-cyan-300 transition-all shadow-[0_0_12px_rgba(6,182,212,0.18)] cursor-pointer"
              title="Import Buildings & Tenants (Excel / Docs / Photos)"
            >
              <Sparkles size={13} className="text-cyan-400" />
              <span className="hidden sm:inline">Import Docs / Excel</span>
            </button>
            {activeTab === "leads" && (
              <button
                onClick={fetchLeads}
                disabled={loading}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.04] border border-white/12 text-sky-400 text-xs hover:border-white/20 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] transition-colors disabled:opacity-50"
                title="Refresh leads"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            {/* User avatar + sign-out */}
            {currentUser && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentUser.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-7 h-7 rounded-full border border-white/20 flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/30 flex items-center justify-center text-xs font-black text-sky-400 flex-shrink-0">
                    {currentUser.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={async () => {
                    await signOutEverywhere();
                    router.replace("/admin/login");
                  }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Ask OpsIQ Modal */}
        {showAskOpsIQ && (
          <AskOpsIQModal leads={leads} onClose={() => setShowAskOpsIQ(false)} />
        )}

        {/* AI Multi-Tenant & Building Intake Modal */}
        {showIntakeModal && (
          <IntakeStagingModal
            isOpen={showIntakeModal}
            onClose={() => setShowIntakeModal(false)}
            onViewTenants={() => switchTab("tenants")}
            onViewBuildings={() => switchTab("propdetails")}
            currentOrgName={activeOrg?.name || "Your Portfolio"}
          />
        )}

        {/* ─ CALL LOG MODAL ──────────────────────────────────────────────────── */}
        {activeCallLog && (
          <CallLogModal
            leadId={activeCallLog.leadId}
            leadName={activeCallLog.leadName}
            phone={activeCallLog.phone}
            existingLogs={callLogs.filter(l => l.lead_id === activeCallLog.leadId)}
            currentUser={currentUser?.name || currentUser?.email?.split("@")[0] || "Staff"}
            onSave={log => setCallLogs(prev => [log, ...prev.filter(l => l.id !== log.id)])}
            onDelete={id => setCallLogs(prev => prev.filter(l => l.id !== id))}
            onClose={() => setActiveCallLog(null)}
          />
        )}

        {/* Edit Lead Modal */}
        {editingLead && (
          <EditLeadModal
            lead={editingLead}
            onClose={() => setEditingLead(null)}
            onSave={updated => {
              setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
            }}
            currentUser={currentUser?.name}
            currentUserEmail={currentUser?.email}
          />
        )}

        {/* ═══ Premium Dashboard Navigation ═══════════════════════════════════ */}

        {/* Mobile/Tablet: Horizontal compact pill nav */}
        <div className="sm:hidden bg-[#080C14] -mx-4 px-4 mb-6">
          <div className="scrollbar-none flex items-center gap-1 overflow-x-auto py-2 pr-6" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
            <style>{`.scrollbar-none::-webkit-scrollbar { display: none; }`}</style>
            {([
              { key: "leads",       label: `Leads (${activeLeads.length})`, icon: TrendingUp, color: "#38BDF8" },
              { key: "tenants",     label: "Tenants",     icon: Building2, color: "#60A5FA" },
              { key: "propdetails", label: "Prop Details", icon: BarChart3, color: "#A78BFA" },
              { key: "maintenance", label: "Maint.",       icon: Wrench, color: "#F97316" },
              { key: "cleaning",    label: "Cleaning",    icon: Sparkles, color: "#A78BFA" },
              { key: "analytics",   label: "Analytics",   icon: BarChart3, color: "#22D3EE" },
              { key: "marketing",   label: "Marketing",   icon: FileText, color: "#E1306C" },
              { key: "content",     label: "Content",     icon: Pencil, color: "#FACC15" },
              { key: "teamboard",   label: "Team Board",  icon: Users, color: "#60A5FA" },
              { key: "archived",    label: `Archive (${archivedLeads.length})`, icon: Archive, color: "#9CA3AF" },
            ] as const).map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                  activeTab === key
                    ? "text-white shadow-lg"
                    : "text-gray-500 hover:text-gray-300 bg-transparent hover:bg-[rgba(255,255,255,0.04)]"
                }`}
                style={activeTab === key ? {
                  background: `linear-gradient(135deg, ${color}22, ${color}11)`,
                  border: `1px solid ${color}44`,
                  boxShadow: `0 0 20px ${color}15`,
                  color,
                } : { border: "1px solid transparent" }}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop/Tablet: Premium two-row grid nav */}
        <div className="hidden sm:block bg-[#080C14] -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-5 mb-6">
          <div className="grid grid-cols-5 gap-2">
            {([
              { key: "leads",       label: "Leads",       count: activeLeads.length, icon: TrendingUp, color: "#38BDF8",  desc: "Inquiries" },
              { key: "tenants",     label: "Tenants",     icon: Building2, color: "#60A5FA", desc: "Active leases" },
              { key: "propdetails", label: "Prop Details", icon: BarChart3, color: "#A78BFA", desc: "Occupancy & stats" },
              { key: "maintenance", label: "Maintenance", icon: Wrench,    color: "#F97316", desc: "Work orders" },
              { key: "cleaning",    label: "Cleaning",    icon: Sparkles,  color: "#A78BFA", desc: "Schedules" },
              { key: "analytics",   label: "Analytics",   icon: BarChart3, color: "#22D3EE", desc: "Traffic & KPIs" },
              { key: "marketing",   label: "Marketing",   icon: FileText,  color: "#E1306C", desc: "Promo tools" },
              { key: "content",     label: "Content",     icon: Pencil,    color: "#FACC15", desc: "Site editor" },
              { key: "teamboard",   label: "Team Board",  icon: Users,      color: "#60A5FA", desc: "Comm & Tasks" },
              { key: "archived",    label: "Archived",    count: archivedLeads.length, icon: Archive,   color: "#9CA3AF", desc: "Closed leads" },
            ] as const).map(({ key, label, icon: Icon, color, desc, ...rest }) => {
              const isActive = activeTab === key;
              const count = (rest as Record<string, unknown>).count as number | undefined;
              return (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  className={`group relative flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all duration-200 border ${
                    isActive
                      ? "bg-[rgba(255,255,255,0.07)]"
                      : "bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.18)]"
                  }`}
                  style={isActive ? {
                    borderColor: `${color}55`,
                    boxShadow: `0 0 24px ${color}15, inset 0 0 0 0.5px ${color}20`,
                  } : {}}
                >
                  {/* Bottom active bar */}
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full"
                      style={{ background: color, boxShadow: `0 0 10px ${color}90` }}
                    />
                  )}
                  {/* Icon badge */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      isActive ? "shadow-lg" : "opacity-60 group-hover:opacity-90"
                    }`}
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${color}30, ${color}12)`,
                      border: `1px solid ${color}50`,
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <Icon size={14} style={isActive ? { color } : { color: "#9CA3AF" }} />
                  </div>
                  {/* Label + desc */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold truncate transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>
                        {label}
                      </span>
                      {count !== undefined && count > 0 && (
                        <span
                          className="text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none flex-shrink-0"
                          style={isActive ? {
                            background: `${color}20`,
                            color,
                            border: `1px solid ${color}40`,
                          } : {
                            background: "rgba(255,255,255,0.06)",
                            color: "#9CA3AF",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] leading-tight truncate block transition-colors ${isActive ? "text-gray-400" : "text-gray-600 group-hover:text-gray-500"}`}>
                      {desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Personalized greeting — global */}
        {currentUser && (() => {
          const hour = new Date().getHours();
          const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
          const isCompanyEntity = /\b(llc|inc|corp|co\.|ltd)\b/i.test(currentUser.name);
          const displayName = isCompanyEntity ? currentUser.name : currentUser.name.split(" ")[0];
          return (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.03)] rounded-2xl p-4">
              <div className="flex items-center gap-3">
                {currentUser.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border-2 border-white/20 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border-2 border-blue-500/30 flex items-center justify-center text-sm font-black text-sky-400 flex-shrink-0">
                    {currentUser.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">{greeting}, {displayName} 👋</h2>
                  <p className="text-[11px] sm:text-xs text-gray-500">Here&apos;s your portfolio snapshot for today.</p>
                </div>
              </div>

              {/* Lower-profile Settings button */}
              <button
                onClick={() => switchTab("settings")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all duration-200 ${
                  activeTab === "settings"
                    ? "bg-white/[0.08] border-white/20 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.18)]"
                    : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white hover:border-[rgba(255,255,255,0.15)]"
                }`}
              >
                <Settings size={13} className={activeTab === "settings" ? "text-sky-400" : "text-gray-400"} />
                Settings
              </button>
            </div>
          );
        })()}

        {/* Active Customer Workspace Welcome & Onboarding Banner */}
        {activeOrg && activeOrg.id !== "00000000-0000-0000-0000-000000000001" && (
          <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-[#0B1426] to-sky-950/70 border border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                    {activeOrg.tier} Tier Active
                  </span>
                  <span className="text-xs text-slate-400 font-medium">14-Day Free Evaluation Period</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  Welcome to {activeOrg.name}
                </h2>
                <p className="text-sm sm:text-base lg:text-lg text-slate-200 max-w-2xl leading-relaxed">
                  Your dedicated property operations workspace is active. Use the quick-start buttons below to add your buildings, import your tenant rent roll, or set up maintenance workflows.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowIntakeModal(true)}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm sm:text-base font-black transition-all border border-cyan-300/50 flex items-center gap-2 shadow-[0_0_24px_rgba(6,182,212,0.4)] cursor-pointer"
                >
                  <Sparkles size={18} className="text-cyan-100 animate-pulse" />
                  <span>Import Buildings &amp; Tenants</span>
                </button>
                <button
                  onClick={() => setActiveTab("propdetails")}
                  className="px-4 sm:px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm sm:text-base font-bold transition-all border border-white/20 flex items-center gap-2 shadow-sm"
                >
                  <Building2 size={18} className="text-cyan-400" />
                  <span>Add First Building</span>
                </button>
                <button
                  onClick={() => setShowIntakeModal(true)}
                  className="px-4 sm:px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm sm:text-base font-bold transition-all border border-white/20 flex items-center gap-2 shadow-sm"
                >
                  <Users size={18} className="text-emerald-400" />
                  <span>Tenant Rent Roll</span>
                </button>
                <button
                  onClick={() => setActiveTab("maintenance")}
                  className="px-4 sm:px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm sm:text-base font-bold transition-all border border-white/20 flex items-center gap-2 shadow-sm"
                >
                  <Wrench size={18} className="text-amber-400" />
                  <span>Setup Maintenance</span>
                </button>
                <button
                  onClick={() => switchTab("content")}
                  className="px-4 sm:px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm sm:text-base font-bold transition-all border border-white/20 flex items-center gap-2 shadow-sm"
                >
                  <Pencil size={18} className="text-amber-300" />
                  <span>Site Builder</span>
                </button>
                <a
                  href={
                    (activeOrg as any)?.custom_domain
                      ? `https://${(activeOrg as any).custom_domain}`
                      : `/site/${activeOrg.slug}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 sm:px-5 py-3 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-sm sm:text-base font-bold transition-all border border-sky-400/40 flex items-center gap-2 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                  title={`Open live public website for ${activeOrg.name}`}
                >
                  <Globe size={18} className="text-sky-400" />
                  <span>View Public Site</span>
                  <ExternalLink size={14} className="opacity-75" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ─ LEADS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "leads" && (
          <>
            {renderLeaseAlerts()}
            {renderFollowUpAlerts()}

            {/* Daily Brief — first thing a CEO sees */}
            <DailyBriefCard
              key={briefKey}
              leads={activeLeads}
              currentUserName={currentUser?.name}
              callLogs={callLogs}
              onBadgeClick={(f) => {
                setFilter(f as typeof filter);
                setTimeout(() => {
                  document.getElementById("leads-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
              onLeadClick={(id) => {
                setFilter("All");
                setTimeout(() => {
                  const el = document.getElementById(`lead-card-${id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.style.transition = "box-shadow 0.3s";
                    el.style.boxShadow = "0 0 0 2px #4ADE80, 0 0 24px rgba(74,222,128,0.35)";
                    setTimeout(() => { el.style.boxShadow = ""; }, 1800);
                  }
                }, 80);
              }}
            />

            {/* Pipeline Banner */}
            <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-white/[0.04] via-blue-500/[0.03] to-transparent p-4 sm:p-6 mb-6 shadow-[0_0_24px_rgba(56,189,248,0.08)]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.15)]"><DollarSign size={18} className="text-[#4ADE80]" /></div>
                  <span className="text-xs sm:text-sm font-bold text-sky-400 uppercase tracking-widest">Active Pipeline</span>
                </div>
                <div className="flex flex-wrap gap-4 sm:gap-8">
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Hot Lead Monthly Value</p>
                    <p className="text-xl sm:text-3xl font-black text-white tabular-nums">${hotMonthlyPipeline.toLocaleString()}<span className="text-sm sm:text-base text-gray-500 font-normal">/mo</span></p>
                  </div>
                  <div className="w-px bg-[rgba(255,255,255,0.06)] hidden sm:block" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Projected Annual Revenue</p>
                    <p className="text-xl sm:text-3xl font-black text-[#4ADE80] tabular-nums">${annualProjection.toLocaleString()}<span className="text-sm sm:text-base text-[#4ADE80]/60 font-normal">/yr</span></p>
                  </div>
                  <div className="w-px bg-[rgba(255,255,255,0.06)] hidden sm:block" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Total Pipeline (All Leads)</p>
                    <p className="text-xl sm:text-3xl font-black text-gray-300 tabular-nums">${totalMonthlyPipeline.toLocaleString()}<span className="text-sm sm:text-base text-gray-600 font-normal">/mo</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Urgent Strip */}
            {urgentLeads.length > 0 && (
              <div className="rounded-2xl border border-[rgba(250,204,21,0.25)] bg-[rgba(250,204,21,0.04)] p-3 sm:p-4 mb-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertCircle size={16} className="text-[#FACC15] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#FACC15] font-bold text-xs sm:text-sm mb-2">⚡ {urgentLeads.length} lead{urgentLeads.length > 1 ? "s" : ""} need contact TODAY</p>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {urgentLeads.map(lead => (
                        <div key={lead.id} className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)]">
                          <span className="text-xs sm:text-sm font-semibold text-white">{lead.name}</span>
                          <span className="text-[10px] sm:text-xs text-[#FACC15]">${lead.budget.toLocaleString()}/mo</span>
                          <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:inline">· {timeAgo(lead.timestamp)}</span>
                          {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-[10px] sm:text-xs text-[#4ADE80] font-bold hover:underline"><Phone size={10} /> Call</a>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
              {[
                { label: "Current / Total Leads", value: `${allNonArchived.length} / ${leads.length}`, icon: Users, color: "#60A5FA" },
                { label: "Verified Leads 🔥", value: hotLeads.length, icon: TrendingUp, color: "#4ADE80" },
                { label: "MQLs ⚡", value: warmCount, icon: Zap, color: "#FACC15" },
                { label: "Whale Alerts 🐳", value: whaleLeads.length, icon: Building2, color: "#FACC15" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass rounded-2xl p-3 sm:p-4 border border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2"><Icon size={13} style={{ color }} /><span className="text-[10px] sm:text-xs text-gray-500">{label}</span></div>
                  <p className="text-xl sm:text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Call List — collapsible */}
            {callList.length > 0 && (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] mb-8 overflow-hidden">
                {/* Toggle header */}
                <button
                  onClick={() => setCallListOpen(o => !o)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[rgba(255,255,255,0.03)] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.15)]">
                    <Phone size={13} className="text-sky-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-white uppercase tracking-widest">Priority Call List</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/15 text-sky-400 font-bold shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                        {callList.length} lead{callList.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {callListOpen ? "▲ Tap to collapse" : "▼ Tap to expand · sorted by score × budget"}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-transform duration-200 ${callListOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Body */}
                {callListOpen && (
                  <div className="px-5 pb-5 space-y-2 border-t border-[rgba(255,255,255,0.04)] pt-4">
                    {callList.map((lead, i) => {
                      const logsForLead = callLogs.filter(l => l.lead_id === lead.id);
                      const lastLog = logsForLead[0];
                      const followUpDue = lastLog?.follow_up_date && new Date(lastLog.follow_up_date) < new Date() && lastLog.outcome !== "answered";
                      const dScore = getDecayedScore(lead.score, lead, callLogs);
                      const dLabel = getDecayedLabel(dScore, lead);
                      return (
                        <div key={lead.id} className="rounded-xl bg-white/[0.015] border border-white/[0.08] hover:border-white/25 hover:shadow-[0_0_16px_rgba(56,189,248,0.12)] transition-all overflow-hidden">
                          <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3">
                            <span className="text-xs font-black w-4 text-center flex-shrink-0" style={{ color: scoreColor(dScore) }}>#{i + 1}</span>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-black" style={{ backgroundColor: `${scoreColor(dScore)}12`, color: scoreColor(dScore) }}>
                              {dScore}{dScore < lead.score && <span className="text-[8px] ml-0.5">↓</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-white truncate">{lead.name}</p>
                                {!lead.phone && !lead.email && (
                                  <span className="text-[10px] font-black text-yellow-400 bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.35)] px-1.5 py-0.5 rounded-md flex-shrink-0 animate-pulse">⚠ No Contact Info</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                                <span className="truncate max-w-[90px] sm:max-w-none">{lead.spaceType}</span>
                                <span className="text-[#4ADE80] font-semibold">${lead.budget.toLocaleString()}/mo</span>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-lg border font-bold hidden sm:block flex-shrink-0 ${scoreBadge(dLabel)}`}>{dLabel}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {lead.phone ? (
                                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                                  <Phone size={11} />
                                  <span className="hidden sm:inline">{lead.phone}</span>
                                  <span className="sm:hidden">Call</span>
                                </a>
                              ) : lead.email ? (
                                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(96,165,250,0.3)]">
                                  <Mail size={11} />
                                  <span className="hidden sm:inline">{lead.email}</span>
                                  <span className="sm:hidden">Email</span>
                                </a>
                              ) : (
                                <span className="px-2.5 py-2 rounded-xl border border-[rgba(250,204,21,0.25)] text-yellow-500 text-xs font-bold opacity-70">No contact</span>
                              )}
                              <button
                                onClick={() => setActiveCallLog({ leadId: lead.id, leadName: lead.name, phone: lead.phone || "" })}
                                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] text-gray-400 text-xs font-bold hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-all"
                                title="Log call notes"
                              >
                                <FileText size={11} />
                                <span className="hidden sm:inline">Log</span>
                              </button>
                            </div>
                          </div>
                          {/* Call activity strip */}
                          {lastLog && (
                            <div className={`px-4 py-1.5 flex items-center gap-2 border-t border-[rgba(255,255,255,0.04)] ${followUpDue ? "bg-[rgba(239,68,68,0.06)]" : "bg-[rgba(255,255,255,0.01)]"}`}>
                              {followUpDue && <span className="text-[9px] font-black text-red-400 uppercase tracking-wide animate-pulse">⚠ Follow-up Due</span>}
                              <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: outcomeColor(lastLog.outcome) }}>{outcomeLabel(lastLog.outcome)}</span>
                              <span className="text-[9px] text-gray-700">·</span>
                              <span className="text-[9px] text-gray-600">{new Date(lastLog.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}</span>
                              {logsForLead.length > 1 && <span className="text-[9px] text-gray-700 ml-auto">{logsForLead.length} calls logged</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Add Lead Panel */}
            <AddLeadPanel
              onLeadAdded={lead => {
                seenIdsRef.current.add(lead.id);
                setLeads(prev => [lead, ...prev]);
              }}
              currentUserName={currentUser?.name}
              currentUserEmail={currentUser?.email}
            />

            {/* QR Leaderboard */}
            {(() => {
              const qrLeads = activeLeads.filter(l => l.source === "qr");
              if (!qrLeads.length) return null;
              const byAgent: Record<string, { count: number; pipeline: number; latest: string }> = {};
              qrLeads.forEach(l => {
                const slug = l.campaign || "team";
                if (!byAgent[slug]) byAgent[slug] = { count: 0, pipeline: 0, latest: l.timestamp };
                byAgent[slug].count++;
                byAgent[slug].pipeline += parseBudget(l.budget);
                if (l.timestamp > byAgent[slug].latest) byAgent[slug].latest = l.timestamp;
              });
              const ranked = Object.entries(byAgent).sort((a, b) => b[1].count - a[1].count);
              return (
                <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-5 mb-6 shadow-[0_0_24px_rgba(56,189,248,0.06)]">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base">🏆</span>
                    <p className="text-xs font-black text-sky-400 uppercase tracking-widest">QR Lead Leaderboard</p>
                    <span className="text-xs text-gray-600 ml-1">— in-person captures</span>
                  </div>
                  <div className="space-y-2">
                    {ranked.map(([slug, stats], i) => (
                      <div key={slug} className="flex items-center gap-3">
                        <span className="text-sm font-black w-5 text-center" style={{ color: i === 0 ? "#FACC15" : i === 1 ? "#94A3B8" : "#92400E" }}>#{i + 1}</span>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/25 flex items-center justify-center text-xs font-black text-sky-400">
                          {slug.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white capitalize">{slug}</p>
                          <p className="text-xs text-gray-600">{timeAgo(stats.latest)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#4ADE80]">{stats.count} lead{stats.count !== 1 ? "s" : ""}</p>
                          {stats.pipeline > 0 && <p className="text-xs text-gray-600">${stats.pipeline.toLocaleString()}/mo</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Filter + Print row */}
            <div className="flex flex-col gap-3.5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div id="leads-list" className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Filter size={13} className="text-gray-500 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-gray-600 mr-0.5 sm:mr-1">Filter:</span>
                  {(["All", "Verified Lead", "MQL", "Prospect Lead", "Potential Spam", "Whale", "New Today"] as const).map(f => {
                    const tip =
                      f === "All"            ? "Show all active leads" :
                      f === "Verified Lead"  ? "Score 70+. High urgency, verified interest in available property." :
                      f === "MQL"            ? "Score 40–69. Marketing Qualified Lead - shown web interest." :
                      f === "Prospect Lead"  ? "Score below 40. Potential customer unqualified." :
                      f === "Potential Spam" ? "AI flagged potential spam or sales pitch/solicitation." :
                      f === "Whale"          ? "Budget $4,000+/mo. High-value prospects — prioritize." :
                                               "Leads that arrived in the last 24 hours.";
                    return (
                      <Tooltip key={f} text={tip}>
                        <button onClick={() => setFilter(f)} className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition-all ${filter === f ? "bg-white/[0.08] border-white/20 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]" : "border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-gray-300"}`}>
                          {f === "Whale" ? "🐳 Whales" : f === "New Today" ? "🆕 New Today" : f === "Potential Spam" ? "⚠️ Spam" : f}
                          {f === "Whale" && ` (${activeLeads.filter(l => l.isWhale).length})`}
                          {f === "New Today" && ` (${activeLeads.filter(l => (Date.now() - new Date(l.timestamp).getTime()) < 864e5).length})`}
                          {f !== "All" && f !== "Whale" && f !== "New Today" && ` (${activeLeads.filter(l => getDecayedLabel(getDecayedScore(l.score, l, callLogs), l) === f).length})`}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
                <PrintButton
                  label="Print Call Sheet"
                  title={`Daily Call Sheet — ${filter} Leads`}
                  buildHTML={() => {
                    if (filtered.length === 0) return "<p>No leads match the current filter.</p>";
                    const rows = filtered.map((l, i) => `
                      <tr style="background:${i % 2 === 0 ? "#fff" : "#f7f7f7"}">
                        <td style="text-align:center;font-size:10pt;font-weight:900;border:1px solid #bbb;padding:5px 8px">${l.score}</td>
                        <td style="border:1px solid #bbb;padding:5px 8px"><strong>${l.name || "—"}</strong></td>
                        <td style="border:1px solid #bbb;padding:5px 8px">${l.phone ? `<a href="tel:${l.phone}" style="color:#000">${l.phone}</a>` : "—"}</td>
                        <td style="border:1px solid #bbb;padding:5px 8px">${l.email ? `<a href="mailto:${l.email}" style="color:#000;font-size:8.5pt">${l.email}</a>` : "—"}</td>
                        <td style="border:1px solid #bbb;padding:5px 8px">${l.budget ? (parseBudget(l.budget) ? `$${parseBudget(l.budget).toLocaleString()}/mo` : l.budget) : "—"}</td>
                        <td style="border:1px solid #bbb;padding:5px 8px">${l.spaceType || "—"}</td>
                        <td style="border:1px solid #bbb;padding:5px 8px">${l.teamSize || "—"}</td>
                        <td style="border:1px solid #bbb;padding:5px 8px;font-size:8.5pt">${l.timeline || "—"}</td>
                        <td style="border:1px solid #bbb;padding:5px 8px;font-weight:700;font-size:8.5pt">${l.scoreLabel || "—"}</td>
                      </tr>`).join("");
                    return `
                      <table style="width:100%;border-collapse:collapse;font-size:9.5pt;color:#000">
                        <thead>
                          <tr style="background:#f0f0f0">
                            <th style="border:1px solid #bbb;padding:6px 8px;text-align:center">Score</th>
                            <th style="border:1px solid #bbb;padding:6px 8px">Name</th>
                            <th style="border:1px solid #bbb;padding:6px 8px">Phone</th>
                            <th style="border:1px solid #bbb;padding:6px 8px">Email</th>
                            <th style="border:1px solid #bbb;padding:6px 8px">Budget</th>
                            <th style="border:1px solid #bbb;padding:6px 8px">Space Type</th>
                            <th style="border:1px solid #bbb;padding:6px 8px">Team Size</th>
                            <th style="border:1px solid #bbb;padding:6px 8px">Timeline</th>
                            <th style="border:1px solid #bbb;padding:6px 8px">Priority</th>
                          </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                      </table>
                      <p style="margin-top:16px;font-size:8.5pt;color:#666">Total: ${filtered.length} lead${filtered.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Filter: ${filter}</p>`;
                  }}
                />
              </div>

              {/* Speech-to-text Search bar row */}
              <div className="flex gap-2 items-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2">
                <Search size={14} className="text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search active leads by name, email, phone, assignee, location or notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-gray-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-[10px] text-gray-500 hover:text-white font-bold transition-colors mr-1">
                    Clear
                  </button>
                )}
                <MicButton onResult={(text) => setSearchQuery(text)} size={14} className="text-gray-400 hover:text-[#4ADE80] transition-colors" />
              </div>
            </div>

            <div id="print-leads" className="space-y-4">
              {filtered.map(lead => {
                const isLive = recentLiveIds.has(lead.id);
                return (
                <div
                  key={lead.id}
                  id={`lead-card-${lead.id}`}
                  className={`glass rounded-2xl border transition-all p-3 sm:p-5 ${
                    lead.isWhale && lead.whaleTier === "gold"
                      ? "border-amber-400/40 shadow-[0_0_28px_rgba(250,204,21,0.12)]"
                      : lead.isWhale
                      ? "border-white/25 shadow-[0_0_24px_rgba(56,189,248,0.18)]"
                      : isLive
                      ? "border-white/30 shadow-[0_0_24px_rgba(56,189,248,0.25)]"
                      : "border-white/[0.08] hover:border-white/20 hover:shadow-[0_0_16px_rgba(56,189,248,0.10)]"
                  }`}
                  style={isLive ? { animation: "slideInTop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both" } : undefined}
                >
                  {isLive && (
                    <style>{`
                      @keyframes slideInTop {
                        from { opacity: 0; transform: translateY(-12px); }
                        to   { opacity: 1; transform: translateY(0); }
                      }
                    `}</style>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0 text-center">
                      {(() => {
                        const dScore = getDecayedScore(lead.score, lead, callLogs);
                        const hasDecayed = dScore < lead.score;
                        const isSpamLead = lead.scoreLabel === "Potential Spam";
                        return (
                          <Tooltip text={isSpamLead ? `AI Spam Analysis: ${lead.reasoning}` : hasDecayed ? `Original: ${lead.score} → Now: ${dScore} (decayed over ${daysOld(lead.timestamp)}d without contact)` : `AI Lead Score: ${lead.score}/100 — calculated from budget, urgency, timeline, and space type signals.`} wide>
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border cursor-help" style={{ borderColor: isSpamLead ? "#EF444460" : `${scoreColor(dScore)}40`, backgroundColor: isSpamLead ? "#EF444415" : `${scoreColor(dScore)}0A` }}>
                              {isSpamLead ? (
                                <AlertTriangle size={20} className="text-red-500 animate-bounce sm:scale-125" />
                              ) : (
                                <>
                                  <span className="text-lg sm:text-2xl font-black tabular-nums leading-none" style={{ color: scoreColor(dScore) }}>{dScore}</span>
                                  {hasDecayed ? (
                                    <span className="text-[8px] sm:text-[9px] text-gray-600 mt-0.5 line-through">{lead.score}</span>
                                  ) : (
                                    <span className="text-[8px] sm:text-[9px] text-gray-600 mt-0.5">/ 100</span>
                                  )}
                                </>
                              )}
                            </div>
                          </Tooltip>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-bold text-sm sm:text-base">{lead.name}</h3>
                            {(() => {
                              const dScore = getDecayedScore(lead.score, lead, callLogs);
                              const dLabel = getDecayedLabel(dScore, lead);
                              return (
                                <Tooltip text={dLabel === "Verified Lead" ? "Verified Lead: Score 75+. Vetted interest in available property." : dLabel === "MQL" ? "MQL: Score 50–74. Marketing Qualified Lead - shown web interest." : dLabel === "Potential Spam" ? "Potential Spam: Flagged by AI spam detection. High likelihood of automated outreach, sales pitch, or marketing solicitation." : "Prospect Lead: Score below 50. Potential customer unqualified."}>
                                  <span className={`text-xs px-2 py-0.5 rounded-lg border font-bold cursor-help ${scoreBadge(dLabel)}`}>{dLabel}</span>
                                </Tooltip>
                              );
                            })()}
                            {lead.isWhale && lead.whaleTier === "gold" && (
                              <Tooltip text="Whale Alert: Budget $8k+/mo. Top-priority prospect — escalate immediately and offer a personal showing." wide>
                                <span className="flex items-center gap-1 text-xs font-black text-[#FACC15] bg-[rgba(250,204,21,0.12)] border border-[rgba(250,204,21,0.4)] px-2 py-0.5 rounded-lg cursor-help">
                                  ⭐ Whale Alert
                                </span>
                              </Tooltip>
                            )}
                            {lead.isWhale && lead.whaleTier === "silver" && (
                              <Tooltip text="High-Intent Whale: Budget $4–8k/mo. High-value prospect — prioritize follow-up within 24 hours." wide>
                                <span className="flex items-center gap-1 text-xs font-black text-[#C4B5FD] bg-[rgba(196,181,253,0.08)] border border-[rgba(196,181,253,0.25)] px-2 py-0.5 rounded-lg cursor-help">
                                  🐳 High Intent
                                </span>
                              </Tooltip>
                            )}
                            {isLive && (
                              <Tooltip text="New lead — just arrived in real time from the AI chat widget.">
                                <span className="flex items-center gap-1 text-xs font-black text-[#4ADE80] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.35)] px-2 py-0.5 rounded-lg cursor-help">
                                  <span className="w-1 h-1 rounded-full bg-[#4ADE80] animate-pulse" />
                                  NEW
                                </span>
                              </Tooltip>
                            )}
                            {/* Call history badge */}
                            {(() => {
                              const logsForLead = callLogs.filter(l => l.lead_id === lead.id);
                              const lastLog = logsForLead[0];
                              if (!lastLog) return null;
                              const followUpDue = lastLog.follow_up_date && new Date(lastLog.follow_up_date) < new Date() && lastLog.outcome !== "answered";
                              return (
                                <button
                                  onClick={() => setActiveCallLog({ leadId: lead.id, leadName: lead.name, phone: lead.phone || "" })}
                                  className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border transition-all hover:opacity-80 cursor-pointer"
                                  style={{ color: followUpDue ? "#F87171" : outcomeColor(lastLog.outcome), borderColor: followUpDue ? "rgba(248,113,113,0.4)" : `${outcomeColor(lastLog.outcome)}40`, backgroundColor: followUpDue ? "rgba(248,113,113,0.1)" : `${outcomeColor(lastLog.outcome)}12` }}
                                  title={`Last call: ${outcomeLabel(lastLog.outcome)} — click to view call log`}
                                >
                                  <Phone size={9} />
                                  {followUpDue ? "⚠ Follow-up Due" : outcomeLabel(lastLog.outcome)}
                                  {logsForLead.length > 1 && <span className="opacity-60">×{logsForLead.length}</span>}
                                </button>
                              );
                            })()}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-1.5 text-xs items-center">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-gray-400 hover:text-[#4ADE80] transition-colors font-mono" title="Click to call or copy">
                                <Phone size={10} className="flex-shrink-0" />
                                {lead.phone}
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-gray-400 hover:text-[#60A5FA] transition-colors" title="Send email">
                                <Mail size={10} className="flex-shrink-0" />
                                {lead.email}
                              </a>
                            )}
                            <span className="flex items-center gap-1 text-gray-600"><Clock size={10} /> {timeAgo(lead.timestamp)}</span>
                            
                            <div className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-0.5 text-[11px] text-gray-450">
                              <span className="text-gray-500 font-bold">👤 Assignee:</span>
                              <select
                                value={lead.assignedEmployee || ""}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  await fetch("/api/admin-lead", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: lead.id, assignedEmployee: val }),
                                  });
                                  setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, assignedEmployee: val } : l));
                                }}
                                className="bg-transparent border-none text-gray-400 hover:text-white transition-colors cursor-pointer outline-none font-black p-0"
                              >
                                <option value="" className="bg-[#0D1117]">Unassigned</option>
                                {adminStaff.map(name => (
                                  <option key={name} value={name} className="bg-[#0D1117]">{name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Expiring-soon badge */}
                            {daysRemaining(lead.timestamp) <= 30 && daysRemaining(lead.timestamp) > 0 && (
                              <Tooltip text={`This lead auto-archives in ${daysRemaining(lead.timestamp)} days if no action is taken. Follow up soon!`} wide>
                                <span className="flex items-center gap-1 text-xs font-bold text-orange-400 animate-pulse cursor-help">
                                  ⏳ {daysRemaining(lead.timestamp)}d left
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/[0.04] border border-white/15 text-[#4ADE80] text-[11px] sm:text-xs font-bold hover:border-white/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all">
                              <Phone size={11} /> Call Now
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/[0.04] border border-white/15 text-[#60A5FA] text-[11px] sm:text-xs font-bold hover:border-white/30 hover:shadow-[0_0_12px_rgba(96,165,250,0.2)] transition-all">
                              <Mail size={11} /> Email
                            </a>
                          )}
                          {/* Delete lead */}
                          {deletingLeadId === lead.id ? (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-xs text-red-400 font-semibold">Delete?</span>
                              <button
                                onClick={() => deleteLead(lead.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.35)] text-red-400 text-xs font-bold hover:bg-[rgba(239,68,68,0.2)] transition-colors"
                              >
                                <Trash2 size={10} /> Yes
                              </button>
                              <button
                                onClick={() => setDeletingLeadId(null)}
                                className="px-2 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs font-bold hover:text-gray-300 transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingLeadId(lead.id)}
                              className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-[rgba(239,68,68,0.06)] transition-colors"
                              title="Delete lead"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
                        {[`🏢 ${lead.spaceType}`, `💰 $${(lead.budget || 0).toLocaleString()}/mo`, `📅 ${lead.timeline}`, `👥 ${lead.teamSize}`].map(chip => (
                          <span key={chip} className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400">{chip}</span>
                        ))}
                        {lead.createdByEmployee && (
                          <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400 font-medium">
                            👤 Entered by: {lead.createdByEmployee}
                          </span>
                        )}
                        {(() => {
                          const todayStr = getTodayDateString();
                          const isOverdue = lead.followUpDate && lead.followUpDate < todayStr;
                          const parts = lead.followUpDate ? lead.followUpDate.split("-") : [];
                          const formattedDate = parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : lead.followUpDate;
                          return (
                            <button
                              onClick={() => {
                                if (reschedulingLeadId === lead.id) {
                                  setReschedulingLeadId(null);
                                } else {
                                  setReschedulingLeadId(lead.id);
                                  setNewFollowUpDate(lead.followUpDate || "");
                                  setRescheduleComment("");
                                }
                              }}
                              className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer ${
                                isOverdue
                                  ? "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.35)] text-red-400 animate-pulse"
                                  : lead.followUpDate
                                  ? "bg-[rgba(74,222,128,0.06)] border-[rgba(74,222,128,0.22)] text-[#4ADE80]"
                                  : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-gray-500 hover:text-gray-300"
                              }`}
                              title="Click to reschedule or set follow-up"
                            >
                              <span>📅</span>
                              <span>
                                {isOverdue
                                  ? `Overdue: ${formattedDate}`
                                  : lead.followUpDate
                                  ? `Follow-up: ${formattedDate}`
                                  : "Set Follow-up"}
                              </span>
                            </button>
                          );
                        })()}
                        {lead.isWhale && lead.whaleKeywords && lead.whaleKeywords.length > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-semibold">
                            🎯 {lead.whaleKeywords.slice(0, 2).join(" · ")}
                          </span>
                        )}
                        {lead.source === "qr" && (
                          <Tooltip text={`Captured in person via ${lead.campaign ? lead.campaign.charAt(0).toUpperCase() + lead.campaign.slice(1) + "'s" : "a"} QR code — direct referral, high conversion potential.`} wide>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold border bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.35)] text-[#4ADE80] flex items-center gap-1 cursor-help">
                              📲 QR Capture{lead.campaign ? ` · ${lead.campaign.charAt(0).toUpperCase() + lead.campaign.slice(1)}` : ""}
                            </span>
                          </Tooltip>
                        )}
                        {lead.source === "contact-form" && (
                          <Tooltip text="Submitted via the Contact page form — this person actively sought you out." wide>
                            <span className="text-xs px-2.5 py-1 rounded-lg font-bold border bg-[rgba(168,85,247,0.1)] border-[rgba(168,85,247,0.35)] text-[#C084FC] flex items-center gap-1 cursor-help">
                              ✉️ Contact Form
                            </span>
                          </Tooltip>
                        )}
                        {lead.source === "import" && (
                          <span className="text-xs px-2.5 py-1 rounded-lg font-semibold border bg-[rgba(96,165,250,0.08)] border-[rgba(96,165,250,0.25)] text-[#60A5FA]">
                            📥 Imported
                          </span>
                        )}
                        {lead.source === "manual" && (
                          <span className="text-xs px-2.5 py-1 rounded-lg font-semibold border bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.2)] text-[#94A3B8]">
                            ✏️ Manual
                          </span>
                        )}
                        {lead.source && lead.source !== "organic" && lead.source !== "qr" && lead.source !== "contact-form" && lead.source !== "import" && lead.source !== "manual" && (
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${
                            lead.source === "facebook"
                              ? "bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.25)] text-[#60A5FA]"
                              : lead.source === "instagram"
                              ? "bg-[rgba(236,72,153,0.08)] border-[rgba(236,72,153,0.25)] text-[#F472B6]"
                              : lead.source === "google"
                              ? "bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.2)] text-[#FACC15]"
                              : "bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.2)] text-[#94A3B8]"
                          }`}>
                            {lead.source === "facebook" ? "📘" : lead.source === "instagram" ? "📷" : lead.source === "google" ? "🔍" : "🌐"} {lead.source.charAt(0).toUpperCase() + lead.source.slice(1)}
                          </span>
                        )}
                      </div>

                      {/* Inline reschedule form */}
                      {reschedulingLeadId === lead.id && (
                        <div className="mt-2.5 mb-3 p-3.5 rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.03)] space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-red-400 uppercase tracking-widest">Reschedule Follow-up</span>
                            <span className="text-[10px] text-gray-500 italic">* required comment</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">New Follow-up Date</label>
                              <input
                                type="date"
                                value={newFollowUpDate}
                                onChange={e => setNewFollowUpDate(e.target.value)}
                                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-2 py-1.5 text-xs text-white focus:border-blue-400/60 focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] outline-none"
                                style={{ colorScheme: "dark" }}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Reason for reschedule</label>
                              <textarea
                                value={rescheduleComment}
                                onChange={e => setRescheduleComment(e.target.value)}
                                placeholder="Explain why the follow-up date was changed..."
                                rows={2}
                                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-2.5 py-1 text-xs text-white focus:border-blue-400/60 focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] outline-none resize-none placeholder:text-gray-700"
                              />
                            </div>
                          </div>
                          {rescheduleError && <p className="text-[11px] text-red-400">{rescheduleError}</p>}
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleSaveFollowUp(lead)}
                              disabled={rescheduling || !newFollowUpDate || !rescheduleComment.trim()}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-400 to-red-500 hover:opacity-90 text-black text-xs font-black disabled:opacity-40 transition-all shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                            >
                              {rescheduling ? "Saving..." : "Save New Date"}
                            </button>
                            <button
                              onClick={() => { setReschedulingLeadId(null); setRescheduleError(""); }}
                              className="px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {lead.source === "manual" ? (
                        lead.additionalInfo ? (
                          <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed mb-3">
                            <span className="text-[#4ADE80] font-semibold">Notes: </span>{lead.additionalInfo}
                          </p>
                        ) : null
                      ) : (
                        <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed mb-3">
                          <span className="text-[#4ADE80] font-semibold">AI Analysis: </span>{lead.reasoning}
                        </p>
                      )}

                      {/* Lead Progress Bar */}
                      <div className="mt-3.5 mb-2.5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Lead Progress</span>
                        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                          {(["0-25%", "25-50%", "50-75%", "75-100%"] as const).map(tier => {
                            const isSelected = (lead.progress || "0-25%") === tier;
                            const colors = {
                              "0-25%": { border: "rgba(96,165,250,0.45)", bg: "rgba(96,165,250,0.12)", text: "#60A5FA" },
                              "25-50%": { border: "rgba(167,139,250,0.45)", bg: "rgba(167,139,250,0.12)", text: "#A78BFA" },
                              "50-75%": { border: "rgba(251,146,60,0.45)", bg: "rgba(251,146,60,0.12)", text: "#FB923C" },
                              "75-100%": { border: "rgba(74,222,128,0.45)", bg: "rgba(74,222,128,0.12)", text: "#4ADE80" },
                            };
                            const c = colors[tier];
                            return (
                              <button
                                key={tier}
                                onClick={() => updateLeadProgress(lead.id, tier)}
                                className={`text-[10px] sm:text-xs font-black py-1.5 rounded-lg border transition-all text-center cursor-pointer ${
                                  isSelected
                                    ? "shadow-[0_0_8px_rgba(255,255,255,0.03)]"
                                    : "border-transparent bg-transparent text-gray-600 hover:text-gray-400"
                                }`}
                                style={isSelected ? { borderColor: c.border, backgroundColor: c.bg, color: c.text } : {}}
                              >
                                {tier}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comments / Activity */}
                      <LeadComments leadId={lead.id} currentUserName={currentUser?.name} />
                      {/* Age bar */}
                    <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock size={9} /> Lead age: {daysOld(lead.timestamp)} day{daysOld(lead.timestamp) !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs font-bold" style={{ color: ageBarColor(daysOld(lead.timestamp)) }}>
                          {daysRemaining(lead.timestamp)} days remaining
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${ageBarPct(daysOld(lead.timestamp))}%`,
                            backgroundColor: ageBarColor(daysOld(lead.timestamp)),
                            opacity: 0.8,
                          }}
                        />
                      </div>
                      {/* Actions */}
                      <div className="flex items-center justify-between mt-2.5 gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setPrepopulatedTenant({
                                name: lead.name,
                                contactName: lead.name,
                                email: lead.email,
                                phone: lead.phone,
                                monthlyRent: parseBudget(lead.budget),
                                sourceLeadId: lead.id,
                                status: "active",
                              });
                              setActiveTab("tenants");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-lg text-sky-400 border border-white/12 bg-white/[0.03] hover:border-white/20 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] transition-all"
                          >
                            <Building2 size={11} /> Convert to Tenant
                          </button>
                          <button
                            onClick={() => setEditingLead(lead)}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-lg text-[#60A5FA] border border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.03)] hover:bg-[rgba(96,165,250,0.08)] transition-all"
                          >
                            <Pencil size={11} /> Edit Details
                          </button>
                        </div>

                        {archiveConfirmId === lead.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500">Are you sure?</span>
                            <button
                              onClick={() => archiveLead(lead.id)}
                              className="text-[11px] font-bold px-3 py-1 rounded-lg bg-[rgba(239,68,68,0.12)] text-red-400 border border-[rgba(239,68,68,0.25)] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
                            >
                              Yes, Archive
                            </button>
                            <button
                              onClick={() => setArchiveConfirmId(null)}
                              className="text-[11px] font-bold px-3 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] text-gray-500 border border-[rgba(255,255,255,0.08)] hover:text-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setArchiveConfirmId(lead.id)}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-lg text-gray-600 hover:text-gray-400 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
                          >
                            <Archive size={11} /> Archive Lead
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ); })}

            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20 text-gray-600">
                <Zap size={32} className="mx-auto mb-3 opacity-30" />
                <p>No {filter.toLowerCase()}s yet.</p>
                <p className="text-sm mt-1">Leads appear here as they come in through Ask OpsIQ.</p>
              </div>
            )}

            {/* ── Cold Pipeline ─────────────────────────────────────────── */}
            {coldLeads.length > 0 && (
              <div className="mt-8 rounded-2xl border border-[rgba(96,165,250,0.15)] bg-[rgba(96,165,250,0.03)] overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setColdPipelineOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[rgba(96,165,250,0.15)] flex items-center justify-center text-base">❄️</div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[#93C5FD]">Cold Pipeline <span className="text-[#60A5FA] font-bold ml-1">({coldLeads.length})</span></p>
                      <p className="text-xs text-gray-600">No contact in {COLD_DAYS}+ days — needs re-engagement</p>
                    </div>
                  </div>
                  <ChevronDown size={14} className={`text-gray-600 transition-transform duration-200 ${coldPipelineOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Cold lead cards */}
                {coldPipelineOpen && (
                  <div className="px-5 pb-5 space-y-2 border-t border-[rgba(96,165,250,0.08)]">
                    {coldLeads.map(lead => {
                      const dsc = daysSinceContact(lead, callLogs);
                      const logsForLead = callLogs.filter(l => l.lead_id === lead.id);
                      const lastLog = logsForLead[0];
                      return (
                        <div key={lead.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(96,165,250,0.04)] border border-[rgba(96,165,250,0.1)] hover:border-[rgba(96,165,250,0.25)] transition-all">
                          {/* Score circle */}
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black text-gray-500 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">{getDecayedScore(lead.score, lead, callLogs)}</div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-gray-400 truncate">{lead.name}</p>
                              <span className="text-[9px] px-2 py-0.5 rounded-full border border-[rgba(96,165,250,0.3)] text-[#93C5FD] font-black bg-[rgba(96,165,250,0.08)]">
                                ❄ {dsc}d cold
                              </span>
                              {lastLog && (
                                <span className="text-[9px] text-gray-700">
                                  Last: {outcomeLabel(lastLog.outcome)} · {new Date(lastLog.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-x-3 mt-0.5 text-xs text-gray-600">
                              <span>{lead.spaceType}</span>
                              <span>${lead.budget.toLocaleString()}/mo</span>
                              {lead.phone && <span className="font-mono">{lead.phone}</span>}
                            </div>
                          </div>
                          {/* Warm Up button */}
                          <button
                            onClick={() => setActiveCallLog({ leadId: lead.id, leadName: lead.name, phone: lead.phone || "" })}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgba(96,165,250,0.3)] text-[#60A5FA] text-xs font-black hover:bg-[rgba(96,165,250,0.12)] transition-all flex-shrink-0"
                            title="Log a call to re-warm this lead"
                          >
                            <Flame size={11} />
                            Warm Up
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ─ ARCHIVED TAB ─────────────────────────────────────── */}
        {/* ─ ANALYTICS TAB ──────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <AnalyticsTab leads={activeLeads as unknown as AnalyticsLead[]} />
        )}

        {/* ─ MAINTENANCE TAB ─────────────────────────────────────────── */}
        {activeTab === "maintenance" && (
          <MaintenanceTab currentUserName={currentUser?.name} currentUserEmail={currentUser?.email} />
        )}

        {/* ─ CLEANING TAB ──────────────────────────────────────────── */}
        {activeTab === "cleaning" && <CleaningTab currentUserName={currentUser?.name} currentUserEmail={currentUser?.email} />}

        {/* ─ TENANTS TAB ──────────────────────────────────────────────── */}
        {activeTab === "tenants" && (
          <>
            {renderLeaseAlerts()}

            {/* ═══ Rent Ledger — collapsible panel ═══ */}
            <div className="mb-6">
              <button
                onClick={() => setRentLedgerOpen(prev => !prev)}
                className={`w-full group flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 ${
                  rentLedgerOpen
                    ? "bg-[rgba(16,185,129,0.06)] border-[rgba(16,185,129,0.25)]"
                    : "bg-[rgba(16,185,129,0.03)] border-[rgba(16,185,129,0.12)] hover:border-[rgba(16,185,129,0.3)] hover:bg-[rgba(16,185,129,0.06)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      rentLedgerOpen ? "shadow-lg" : "group-hover:shadow-md"
                    }`}
                    style={{
                      background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))",
                      border: "1px solid rgba(16,185,129,0.35)",
                      boxShadow: rentLedgerOpen ? "0 0 20px rgba(16,185,129,0.2)" : undefined,
                    }}
                  >
                    <DollarSign size={18} className="text-[#10B981]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-white">Rent Ledger</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Monthly Payment Tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[10px] font-bold text-[#10B981]/60 uppercase tracking-widest">
                    {rentLedgerOpen ? "Collapse" : "Open"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-[#10B981] transition-transform duration-300 ${
                      rentLedgerOpen ? "rotate-180" : "group-hover:translate-y-0.5"
                    }`}
                  />
                </div>
              </button>

              {/* Expanded content */}
              {rentLedgerOpen && (
                <div
                  className="mt-2 rounded-2xl border border-[rgba(16,185,129,0.15)] bg-[rgba(0,0,0,0.2)] p-4 sm:p-6"
                  style={{ animation: "fadeSlideIn 0.3s ease-out" }}
                >
                  <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                  <RentLedgerTab currentUserName={currentUser?.name} currentUserEmail={currentUser?.email} />
                </div>
              )}
            </div>

            {/* ═══ Security Deposit Ledger — collapsible panel ═══ */}
            <div className="mb-6">
              <button
                onClick={() => setSecDepLedgerOpen(prev => !prev)}
                className={`w-full group flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 ${
                  secDepLedgerOpen
                    ? "bg-[rgba(96,165,250,0.06)] border-[rgba(96,165,250,0.25)]"
                    : "bg-[rgba(96,165,250,0.03)] border-[rgba(96,165,250,0.12)] hover:border-[rgba(96,165,250,0.3)] hover:bg-[rgba(96,165,250,0.06)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      secDepLedgerOpen ? "shadow-lg" : "group-hover:shadow-md"
                    }`}
                    style={{
                      background: "linear-gradient(135deg, rgba(96,165,250,0.2), rgba(37,99,235,0.15))",
                      border: "1px solid rgba(96,165,250,0.35)",
                      boxShadow: secDepLedgerOpen ? "0 0 20px rgba(96,165,250,0.2)" : undefined,
                    }}
                  >
                    <Landmark size={18} className="text-[#60A5FA]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-white">Security Deposit Ledger</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Deposit Tracking & Management</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[10px] font-bold text-[#60A5FA]/60 uppercase tracking-widest">
                    {secDepLedgerOpen ? "Collapse" : "Open"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-[#60A5FA] transition-transform duration-300 ${
                      secDepLedgerOpen ? "rotate-180" : "group-hover:translate-y-0.5"
                    }`}
                  />
                </div>
              </button>

              {secDepLedgerOpen && (
                <div
                  className="mt-2 rounded-2xl border border-[rgba(96,165,250,0.15)] bg-[rgba(0,0,0,0.2)] p-4 sm:p-6"
                  style={{ animation: "fadeSlideIn 0.3s ease-out" }}
                >
                  <SecurityDepositLedgerTab
                    currentUserName={currentUser?.name}
                    currentUserEmail={currentUser?.email}
                  />
                </div>
              )}
            </div>

            <TenantsTab
              currentUserName={currentUser?.name}
              currentUserEmail={currentUser?.email}
              leads={leads}
              prepopulatedTenant={prepopulatedTenant}
              onClearPrepopulated={() => setPrepopulatedTenant(null)}
              onLeadConverted={(leadId) => {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, archivedAt: new Date().toISOString() } : l));
                fetchLeads();
              }}
            />
          </>
        )}

        {/* ─ PROP DETAILS TAB ─────────────────────────────────────────────── */}
        {activeTab === "propdetails" && (
          <>
            {renderLeaseAlerts()}
            <PropDetailsTab />
          </>
        )}

        {activeTab === "archived" && (
          <>
            <div className="rounded-2xl border border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.03)] p-5 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Archive size={14} className="text-gray-500" />
                <p className="text-sm font-bold text-gray-400">Archived Leads</p>
              </div>
              <p className="text-xs text-gray-600">Leads archived manually or after passing the 180-day window. They are retained for reference.</p>
            </div>

            {archivedLeads.length === 0 ? (
              <div className="text-center py-20 text-gray-700">
                <Archive size={32} className="mx-auto mb-3 opacity-30" />
                <p>No archived leads yet.</p>
                <p className="text-sm mt-1 text-gray-600">Leads automatically move here after 180 days, or you can archive them manually.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedLeads.map(lead => (
                  <div key={lead.id} className="glass rounded-2xl border border-[rgba(255,255,255,0.04)] p-4 opacity-70 hover:opacity-90 transition-opacity">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center border border-[rgba(148,163,184,0.2)] bg-[rgba(148,163,184,0.05)] flex-shrink-0">
                        <span className="text-lg font-black tabular-nums text-gray-500">{lead.score}</span>
                        <span className="text-[8px] text-gray-700">/ 100</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-400">{lead.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-lg border border-[rgba(148,163,184,0.2)] text-gray-600 font-bold">{lead.scoreLabel}</span>
                          <span className="text-xs text-gray-700 flex items-center gap-1">
                            <Archive size={9} />
                            {lead.archivedAt
                              ? `Archived ${Math.floor((Date.now() - new Date(lead.archivedAt).getTime()) / 864e5)}d ago`
                              : `Archived ${daysOld(lead.timestamp) - MAX_AGE_DAYS}d ago`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-600">
                          <span>{lead.spaceType}</span>
                          <span>${lead.budget.toLocaleString()}/mo</span>
                          {lead.phone && <span>{lead.phone}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Reset timestamp to now to reactivate
                          setLeads(prev => prev.map(l =>
                            l.id === lead.id ? { ...l, timestamp: new Date().toISOString() } : l
                          ));
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/12 text-sky-400 text-xs font-bold hover:border-white/20 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] bg-white/[0.03] transition-colors"
                      >
                        <RefreshCw size={11} /> Reactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─ SETTINGS TAB ───────────────────────────────────────────────────── */}
        {activeTab === "marketing" && (<>
          <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-8">
            <MarketingTab onSubTabChange={setMarketingSubTab} />
          </div>
          {marketingSubTab === "social" && (
            <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-8 mt-6">
              <SocialLinksCard />
            </div>
          )}
        </>)}


        {activeTab === "content" && (
          <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-8">
            <ContentTab onSubViewChange={setContentSubView} activeOrg={activeOrg} />
          </div>
        )}

        {activeTab === "teamboard" && (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl w-fit">
              <button
                onClick={() => setTeamBoardSubTab("chat")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  teamBoardSubTab === "chat"
                    ? "bg-[#4ADE80] text-black shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Comm Board
              </button>
              <button
                onClick={() => setTeamBoardSubTab("tasks")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  teamBoardSubTab === "tasks"
                    ? "bg-[#4ADE80] text-black shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Task List
              </button>
            </div>

            {teamBoardSubTab === "chat" ? (
              <ConversationTab
                currentUserName={currentUser?.name}
                currentUserEmail={currentUser?.email}
                onMention={handleNewMention}
              />
            ) : (
              <TasksTab currentUserName={currentUser?.name} currentUserEmail={currentUser?.email} />
            )}
          </div>
        )}




        {activeTab === "settings" && (
          <SettingsTab
            leads={activeLeads}
            deletingAll={deletingAll}
            deleteAllConfirm={deleteAllConfirm}
            setDeleteAllConfirm={setDeleteAllConfirm}
            deleteAllLeads={deleteAllLeads}
            activeOrg={activeOrg}
            onDomainUpdated={(domain) => setActiveOrg(prev => prev ? { ...prev, custom_domain: domain } : null)}
          />
        )}

        <div className="text-center text-[10px] sm:text-xs text-gray-700 mt-10 mb-6 px-4 space-y-0.5">
          <p className="font-semibold text-gray-600">OperateIQ Property Operations Platform</p>
          <p>AI-Powered by Gemini · Auto-refreshes every 30s</p>
        </div>
      </div>

      {/* ─ PRO TIPS floating button (always visible, context-aware) ─────────── */}
      <ProTips activeTab={(activeTab === "marketing" ? `marketing-${marketingSubTab}` : activeTab === "content" ? contentSubView : activeTab) as import("./ProTips").TabKey} />

      {/* Activity Feed slide-in panel */}
      {showActivityFeed && (
        <ActivityFeedPanel onClose={() => setShowActivityFeed(false)} />
      )}

    </div>
  );
}
