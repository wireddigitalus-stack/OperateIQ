"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Eye, ShieldCheck, Info, ChevronDown, ChevronRight } from "lucide-react";

// ── SEO importance levels ────────────────────────────────────────────────────

export type SeoLevel = "critical" | "important" | "safe";

const SEO_BADGE: Record<SeoLevel, { label: string; color: string; bg: string; border: string }> = {
  critical:  { label: "🔴 Critical SEO", color: "#F87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
  important: { label: "🟡 Important",    color: "#FACC15", bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.2)" },
  safe:      { label: "🟢 Safe to Edit", color: "#4ADE80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)" },
};

// ── Character limit helpers ──────────────────────────────────────────────────

function charColor(current: number, ideal: [number, number]): string {
  if (current === 0) return "#6B7280";
  if (current >= ideal[0] && current <= ideal[1]) return "#4ADE80";
  if (current < ideal[0] * 0.7 || current > ideal[1] * 1.15) return "#F87171";
  return "#FACC15";
}

// ── Keyword checker ──────────────────────────────────────────────────────────

function checkKeywords(value: string, keywords: string[]): { present: string[]; missing: string[] } {
  const lower = value.toLowerCase();
  const present: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) present.push(kw);
    else missing.push(kw);
  }
  return { present, missing };
}

// ── Google Search Preview ────────────────────────────────────────────────────

function GooglePreview({ title, description, url }: { title: string; description: string; url: string }) {
  const truncTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
  const truncDesc = description.length > 160 ? description.slice(0, 157) + "..." : description;

  return (
    <div className="bg-white rounded-xl p-4 space-y-1">
      <p className="text-xs text-[#202124] truncate" style={{ fontFamily: "Arial, sans-serif" }}>
        {url}
      </p>
      <p
        className="text-sm font-medium leading-snug"
        style={{ fontFamily: "Arial, sans-serif", color: "#1a0dab" }}
      >
        {truncTitle || "Page Title"}
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{ fontFamily: "Arial, sans-serif", color: "#4d5156" }}
      >
        {truncDesc || "Meta description preview will appear here."}
      </p>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface SeoFieldGuardProps {
  /** The field's current value */
  value: string;
  /** The original/default SEO-optimized value */
  defaultValue: string;
  /** SEO importance level */
  seoLevel: SeoLevel;
  /** Ideal character range [min, max]. Shown as a counter. */
  charRange?: [number, number];
  /** SEO keywords that should be present in this field */
  keywords?: string[];
  /** Optional hint text shown below the field */
  hint?: string;
  /** If true, show a Google Search preview (only for meta title + description pairs) */
  googlePreview?: {
    title: string;
    description: string;
    url: string;
  };
}

export default function SeoFieldGuard({
  value,
  defaultValue,
  seoLevel,
  charRange,
  keywords,
  hint,
  googlePreview,
}: SeoFieldGuardProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const badge = SEO_BADGE[seoLevel];

  const kwResult = useMemo(
    () => (keywords ? checkKeywords(value, keywords) : null),
    [value, keywords]
  );

  const hasChanged = value !== defaultValue;

  return (
    <div className="mt-1.5 space-y-2">
      {/* Badge + char counter row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* SEO badge */}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
            style={{ color: badge.color, backgroundColor: badge.bg, border: `1px solid ${badge.border}` }}
          >
            {badge.label}
          </span>

          {/* Char counter */}
          {charRange && (
            <span className="text-[10px] font-mono" style={{ color: charColor(value.length, charRange) }}>
              {value.length} / {charRange[0]}–{charRange[1]} chars
            </span>
          )}
        </div>

        {/* View Original toggle */}
        {hasChanged && (
          <button
            onClick={() => setShowOriginal(p => !p)}
            className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
          >
            <Eye size={10} />
            {showOriginal ? "Hide" : "View"} SEO Original
          </button>
        )}
      </div>

      {/* Hint text */}
      {hint && (
        <p className="text-[10px] text-gray-600 flex items-center gap-1.5">
          <Info size={10} className="text-gray-700 flex-shrink-0" />
          {hint}
        </p>
      )}

      {/* Keyword checker */}
      {kwResult && kwResult.missing.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.15)]">
          <AlertTriangle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-red-300 font-semibold">Missing SEO keywords:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {kwResult.missing.map(kw => (
                <span
                  key={kw}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)] text-red-300 font-medium"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {kwResult && kwResult.present.length > 0 && kwResult.missing.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.12)]">
          <ShieldCheck size={12} className="text-[#4ADE80] flex-shrink-0" />
          <p className="text-[10px] text-[#4ADE80] font-semibold">All SEO keywords present ✓</p>
        </div>
      )}

      {/* Original value reference */}
      {showOriginal && hasChanged && (
        <div className="px-3 py-2.5 rounded-lg bg-[rgba(96,165,250,0.05)] border border-[rgba(96,165,250,0.15)]">
          <p className="text-[10px] font-bold text-[#60A5FA] mb-1">📋 SEO-Optimized Original:</p>
          <p className="text-[10px] text-gray-400 whitespace-pre-wrap leading-relaxed">{defaultValue}</p>
        </div>
      )}

      {/* Google Search Preview */}
      {googlePreview && (
        <div>
          <p className="text-[10px] font-bold text-gray-500 mb-1.5 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google Search Preview
          </p>
          <GooglePreview {...googlePreview} />
        </div>
      )}
    </div>
  );
}

// ── SEO metadata for common field types ──────────────────────────────────────

/** Standard SEO config for different field types. Use these to quickly wire up fields. */
export const SEO_FIELD_CONFIG: Record<string, {
  seoLevel: SeoLevel;
  charRange?: [number, number];
  hint: string;
}> = {
  h1:              { seoLevel: "critical",  charRange: [20, 70],  hint: "Include your primary keyword + city/state. This is the most important on-page SEO signal." },
  metaTitle:       { seoLevel: "critical",  charRange: [50, 60],  hint: "Google truncates titles longer than ~60 chars. Include your main keyword near the beginning." },
  metaDescription: { seoLevel: "critical",  charRange: [140, 160], hint: "Google shows 150–160 chars. Include a call-to-action and primary keywords." },
  heroSubline:     { seoLevel: "important", hint: "Supports the H1 with additional context. Use secondary keywords naturally." },
  marketBlurb:     { seoLevel: "important", hint: "This paragraph gives Google context about the page topic. Include location + service keywords." },
  tagline:         { seoLevel: "important", hint: "Visible subheading — keep it compelling and include 1–2 keywords." },
  intro:           { seoLevel: "important", hint: "First paragraph on the page. Google weighs early content heavily — lead with keywords." },
  hero_description:{ seoLevel: "important", hint: "Main description visitors see first. Balance readability with keyword placement." },
  neighborhoods:   { seoLevel: "safe",      hint: "These feed into structured data and keyword targeting. Add neighborhoods your clients search for." },
  keyEmployers:    { seoLevel: "safe",      hint: "Employers are informational content. Change freely — no SEO impact." },
  population:      { seoLevel: "safe",      hint: "Informational stat — safe to update without SEO impact." },
  medianIncome:    { seoLevel: "safe",      hint: "Informational stat — safe to update without SEO impact." },
  nearbyHighways:  { seoLevel: "safe",      hint: "Informational — safe to update." },
  availableTypes:  { seoLevel: "safe",      hint: "These are displayed as tags. No direct SEO impact." },
  faq_q:           { seoLevel: "important", hint: "FAQ questions appear in Google's rich snippets. Match how real users would search." },
  faq_a:           { seoLevel: "important", hint: "FAQ answers can appear directly in Google search results. Keep them clear and informative." },
  hero_badge:      { seoLevel: "safe",      hint: "Visual badge only — not indexed by search engines." },
  plan_name:       { seoLevel: "safe",      hint: "Pricing plan name — safe to edit freely." },
  plan_price:      { seoLevel: "safe",      hint: "Price display — safe to edit freely." },
  plan_features:   { seoLevel: "safe",      hint: "Feature lists — safe to edit freely." },
  location_desc:   { seoLevel: "safe",      hint: "Location description — include landmarks for local SEO benefit." },
  services:        { seoLevel: "important", hint: "Service descriptions help Google understand your offerings. Include relevant industry terms." },
  divisions:       { seoLevel: "safe",      hint: "Division info — safe to customize without SEO risk." },
  who_tags:        { seoLevel: "safe",      hint: "Client type tags — safe to edit freely." },
  final_quote:     { seoLevel: "safe",      hint: "Quotes are decorative — safe to edit freely." },
  cred_stat:       { seoLevel: "safe",      hint: "Credibility stats — safe to edit. Keep numbers accurate." },
};

/** Helper to get the right config for a field key */
export function getSeoConfig(fieldKey: string): typeof SEO_FIELD_CONFIG[string] | null {
  // Direct match
  if (SEO_FIELD_CONFIG[fieldKey]) return SEO_FIELD_CONFIG[fieldKey];

  // Pattern matching for FAQ, plan, service, division fields
  if (fieldKey.startsWith("faq_q")) return SEO_FIELD_CONFIG.faq_q;
  if (fieldKey.startsWith("faq_a")) return SEO_FIELD_CONFIG.faq_a;
  if (fieldKey.startsWith("plan_") && fieldKey.includes("name")) return SEO_FIELD_CONFIG.plan_name;
  if (fieldKey.startsWith("plan_") && fieldKey.includes("price")) return SEO_FIELD_CONFIG.plan_price;
  if (fieldKey.startsWith("plan_") && fieldKey.includes("features")) return SEO_FIELD_CONFIG.plan_features;
  if (fieldKey.startsWith("svc_")) return SEO_FIELD_CONFIG.services;
  if (fieldKey.startsWith("div_")) return SEO_FIELD_CONFIG.divisions;
  if (fieldKey.startsWith("cred_stat")) return SEO_FIELD_CONFIG.cred_stat;
  if (fieldKey.startsWith("location_")) return SEO_FIELD_CONFIG.location_desc;
  if (fieldKey.startsWith("who_")) return SEO_FIELD_CONFIG.who_tags;
  if (fieldKey.startsWith("final_")) return SEO_FIELD_CONFIG.final_quote;
  if (fieldKey.startsWith("benefit_")) return SEO_FIELD_CONFIG.services;

  return null;
}

/** Helper: extract likely keywords from a market/page context */
export function buildMarketKeywords(city: string, state: string, type?: string): string[] {
  const kw = [city, state, "commercial real estate"];
  if (type) kw.push(type.toLowerCase());
  return kw;
}
