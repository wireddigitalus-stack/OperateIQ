"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Save, CheckCircle2, Loader2, RotateCcw, AlertCircle,
  Type, ChevronDown, ChevronRight, FileText,
} from "lucide-react";
import { SPACE_TYPE_PAGES } from "@/lib/data";
import SeoFieldGuard, { getSeoConfig } from "./SeoFieldGuard";

// ── Build editable defaults for Space Type pages + standalone pages ──────────

type FieldMeta = { label: string; value: string; type: "text" | "textarea" };

function buildDefaults(): Record<string, Record<string, FieldMeta>> {
  const sections: Record<string, Record<string, FieldMeta>> = {};

  // ── Space Type pages (Office, CoWorking, Retail, Industrial) ──
  for (const sp of SPACE_TYPE_PAGES) {
    const key = `space:${sp.slug}`;
    sections[key] = {
      h1:              { label: "Page Heading (H1)", value: sp.h1, type: "text" },
      metaTitle:       { label: "SEO Title (browser tab)", value: sp.metaTitle, type: "text" },
      metaDescription: { label: "SEO Description (Google snippet)", value: sp.metaDescription, type: "textarea" },
      tagline:         { label: "Tagline / Subheading", value: sp.tagline, type: "text" },
      intro:           { label: "Intro Paragraph", value: sp.intro, type: "textarea" },
      // Benefits
      benefit_1_title: { label: "Benefit 1 — Title", value: sp.benefits[0]?.title ?? "", type: "text" },
      benefit_1_body:  { label: "Benefit 1 — Description", value: sp.benefits[0]?.body ?? "", type: "textarea" },
      benefit_2_title: { label: "Benefit 2 — Title", value: sp.benefits[1]?.title ?? "", type: "text" },
      benefit_2_body:  { label: "Benefit 2 — Description", value: sp.benefits[1]?.body ?? "", type: "textarea" },
      benefit_3_title: { label: "Benefit 3 — Title", value: sp.benefits[2]?.title ?? "", type: "text" },
      benefit_3_body:  { label: "Benefit 3 — Description", value: sp.benefits[2]?.body ?? "", type: "textarea" },
      benefit_4_title: { label: "Benefit 4 — Title", value: sp.benefits[3]?.title ?? "", type: "text" },
      benefit_4_body:  { label: "Benefit 4 — Description", value: sp.benefits[3]?.body ?? "", type: "textarea" },
      // FAQs
      ...(sp.faqs || []).reduce((acc, faq, i) => {
        acc[`faq_q${i + 1}`] = { label: `FAQ ${i + 1} — Question`, value: faq.q, type: "text" };
        acc[`faq_a${i + 1}`] = { label: `FAQ ${i + 1} — Answer`, value: faq.a, type: "textarea" };
        return acc;
      }, {} as Record<string, FieldMeta>),
    };
  }

  // ── CoWork standalone page ──
  sections["page:cowork"] = {
    hero_badge:       { label: "Hero Badge Text", value: "Now Open · 620 State Street", type: "text" },
    hero_description: { label: "Hero Description", value: "Downtown Bristol's premier professional workspace — built for entrepreneurs, remote teams, and growing businesses that need more than a coffee shop.", type: "textarea" },
    hero_subtext:     { label: "Hero Subtext", value: "620 State Street, Bristol, TN · All-inclusive memberships · Private offices available today", type: "text" },
    plans_heading:    { label: "Plans Section Heading", value: "Membership Plans", type: "text" },
    plans_subtext:    { label: "Plans Section Subtext", value: "All plans include Wi-Fi, coffee, and access to communal areas. Contact us for current rates.", type: "textarea" },
    plan_1_name:      { label: "Plan 1 — Name", value: "Hot Desk", type: "text" },
    plan_1_price:     { label: "Plan 1 — Price", value: "Contact Us", type: "text" },
    plan_1_desc:      { label: "Plan 1 — Description", value: "Flexible open workspace. Drop in when you need it.", type: "text" },
    plan_1_features:  { label: "Plan 1 — Features (one per line)", value: "Shared Workspace Access\nHigh-Speed Wi-Fi\nCoffee & Beverages\nBusiness Address Use\nCommunity Lounge", type: "textarea" },
    plan_2_name:      { label: "Plan 2 — Name", value: "Dedicated Desk", type: "text" },
    plan_2_price:     { label: "Plan 2 — Price", value: "Contact Us", type: "text" },
    plan_2_desc:      { label: "Plan 2 — Description", value: "Your own reserved desk. Locked storage. Always ready.", type: "text" },
    plan_2_features:  { label: "Plan 2 — Features (one per line)", value: "Reserved Dedicated Desk\nLocked File Cabinet\n24/7 Building Access\nHigh-Speed Wi-Fi\nBusiness Address\nMail Handling\nConference Room Hours", type: "textarea" },
    plan_3_name:      { label: "Plan 3 — Name", value: "Private Office", type: "text" },
    plan_3_price:     { label: "Plan 3 — Price", value: "Contact Us", type: "text" },
    plan_3_desc:      { label: "Plan 3 — Description", value: "Fully furnished, lockable private office. Move in tomorrow.", type: "text" },
    plan_3_features:  { label: "Plan 3 — Features (one per line)", value: "Private Lockable Office\nFurnished & Ready\nAll Utilities Included\nDedicated Internet\nBusiness Address\nConference Rooms Included\n24/7 Access\nSignage Options", type: "textarea" },
    location_heading: { label: "Location Section Heading", value: "Prime Downtown Location", type: "text" },
    location_address: { label: "Location Address", value: "620 State Street · Bristol, TN 37620", type: "text" },
    location_desc:    { label: "Location Description", value: "Located on Bristol's iconic State Street — right on the TN/VA state line, steps from restaurants, hotels, and the region's most active commercial corridor.", type: "textarea" },
  };

  // ── Executive Advisement standalone page ──
  sections["page:executive-advisement"] = {
    hero_badge:       { label: "Hero Badge", value: "Division III — Executive Advisement", type: "text" },
    hero_heading:     { label: "Hero Heading", value: "Big Moves. Smart Strategy. Fresh Insight.", type: "text" },
    hero_description: { label: "Hero Description", value: "Vision LLC's Executive Advisement division delivers C-suite consulting and strategic guidance grounded in 30+ years of real-world leadership — not theory.", type: "textarea" },
    hero_subtext:     { label: "Hero Subtext", value: "We scale WITH you. Hands-on. Accountable. Integrated.", type: "text" },
    cred_stat_1:      { label: "Credibility Stat 1", value: "30+ Years Executive Experience", type: "text" },
    cred_stat_2:      { label: "Credibility Stat 2", value: "3 Specialized Advisory Divisions", type: "text" },
    cred_stat_3:      { label: "Credibility Stat 3", value: "20+ Years Tri-Cities Market Knowledge", type: "text" },
    cred_stat_4:      { label: "Credibility Stat 4", value: "#1 Integrated CRE + Strategy Firm in Region", type: "text" },
    services_heading: { label: "Services Section Heading", value: "Core Advisory Services", type: "text" },
    services_subtext: { label: "Services Section Subtext", value: "Five integrated service pillars — each designed to move the needle at the executive level.", type: "textarea" },
    svc_1_title:      { label: "Service 1 — Title", value: "Executive Leadership Coaching", type: "text" },
    svc_1_desc:       { label: "Service 1 — Description", value: "Personalized, high-accountability mentorship for C-suite leaders, founders, and senior decision-makers.", type: "textarea" },
    svc_2_title:      { label: "Service 2 — Title", value: "Strategic Planning & Growth Execution", type: "text" },
    svc_2_desc:       { label: "Service 2 — Description", value: "Practical frameworks that actually get implemented. From market entry strategy to expansion roadmaps.", type: "textarea" },
    svc_3_title:      { label: "Service 3 — Title", value: "Operational Alignment & Accountability", type: "text" },
    svc_3_desc:       { label: "Service 3 — Description", value: "Synchronize your people, processes, and systems. Eliminate silos, reduce overhead.", type: "textarea" },
    svc_4_title:      { label: "Service 4 — Title", value: "Planning & Infrastructure", type: "text" },
    svc_4_desc:       { label: "Service 4 — Description", value: "Site selection, facility design, operational flow, and long-range capital planning.", type: "textarea" },
    svc_5_title:      { label: "Service 5 — Title", value: "Real Estate-Driven Business Optimization", type: "text" },
    svc_5_desc:       { label: "Service 5 — Description", value: "We uniquely leverage commercial real estate as a strategic tool — reducing occupancy costs, unlocking equity.", type: "textarea" },
    div_1_title:      { label: "Division 1 — Title", value: "Government & Public Sector", type: "text" },
    div_1_sub:        { label: "Division 1 — Subtitle", value: "Public-Private Partnerships · Regulatory Navigation · Grant-Aligned Development", type: "text" },
    div_1_desc:       { label: "Division 1 — Description", value: "Vision LLC has deep experience bridging the public and private sectors.", type: "textarea" },
    div_2_title:      { label: "Division 2 — Title", value: "Global & National Industry", type: "text" },
    div_2_sub:        { label: "Division 2 — Subtitle", value: "Construction · Manufacturing · Technology · Professional Services", type: "text" },
    div_2_desc:       { label: "Division 2 — Description", value: "With established relationships across construction, manufacturing, technology, public safety, and professional services sectors.", type: "textarea" },
    div_3_title:      { label: "Division 3 — Title", value: "Private Equity & Strategic Investment", type: "text" },
    div_3_sub:        { label: "Division 3 — Subtitle", value: "Board Advisory · Portfolio Strategy · Sustainable Scaling", type: "text" },
    div_3_desc:       { label: "Division 3 — Description", value: "We take active board-level advisory roles in select portfolio companies.", type: "textarea" },
    ecosystem_heading:{ label: "Ecosystem Heading", value: "The Integrated Ecosystem Advantage", type: "text" },
    ecosystem_desc:   { label: "Ecosystem Description", value: "Vision LLC is the only firm in the Tri-Cities that operates simultaneously across four critical domains.", type: "textarea" },
    who_heading:      { label: "Who We Work With Heading", value: "Who We Work With", type: "text" },
    who_subtext:      { label: "Who We Work With Subtext", value: "From local founders to national executives — we work with leaders who are serious about growth.", type: "textarea" },
    who_tags:         { label: "Client Types (one per line)", value: "Growth-Stage Founders\nC-Suite & Board Members\nRegional Governments\nPrivate Equity Firms\nHealthcare Organizations\nManufacturing Companies\nCommercial Developers\nNonprofit Leadership", type: "textarea" },
    final_quote:      { label: "Final Quote", value: "\"The sum of all parts is greater than the whole.\"", type: "text" },
    final_attribution:{ label: "Quote Attribution", value: "— J. Allen Hurley II", type: "text" },
    final_subtext:    { label: "Final Subtext", value: "That's not just a philosophy. It's how we build. How we advise. How we grow — with you.", type: "textarea" },
  };

  return sections;
}

const DEFAULTS = buildDefaults();

const PAGE_META: { key: string; label: string; description: string; color: string }[] = [
  // Space type pages
  ...SPACE_TYPE_PAGES.map(sp => ({
    key: `space:${sp.slug}`,
    label: `${sp.badge} — ${sp.type}`,
    description: `/spaces/${sp.slug}`,
    color: sp.accentColor || "#4ADE80",
  })),
  // Standalone pages
  {
    key: "page:cowork",
    label: "CoWork Page",
    description: "/cowork — Bristol CoWork standalone page",
    color: "#FACC15",
  },
  {
    key: "page:executive-advisement",
    label: "Executive Advisement",
    description: "/executive-advisement — C-Suite consulting page",
    color: "#FACC15",
  },
];

interface ContentItem { section: string; key: string; value: string }

export default function PageEditor() {
  const [overrides, setOverrides] = useState<ContentItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch("/api/site-content");
      const data = await res.json();
      const items: ContentItem[] = (data.items || []).filter(
        (i: ContentItem) => i.section.startsWith("space:") || i.section.startsWith("page:")
      );
      setOverrides(items);
    } catch {
      console.warn("Failed to fetch page content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const getValue = (section: string, key: string): string => {
    const editKey = `${section}:${key}`;
    if (editKey in editedValues) return editedValues[editKey];
    const override = overrides.find(o => o.section === section && o.key === key);
    if (override) return override.value;
    return DEFAULTS[section]?.[key]?.value ?? "";
  };

  const isDirty = (section: string, key: string): boolean => {
    const editKey = `${section}:${key}`;
    if (!(editKey in editedValues)) return false;
    const override = overrides.find(o => o.section === section && o.key === key);
    const saved = override?.value ?? DEFAULTS[section]?.[key]?.value ?? "";
    return editedValues[editKey] !== saved;
  };

  const isOverridden = (section: string, key: string): boolean =>
    overrides.some(o => o.section === section && o.key === key);

  const allDirtyFields = (): { section: string; key: string }[] => {
    const dirty: { section: string; key: string }[] = [];
    for (const [sec, fields] of Object.entries(DEFAULTS)) {
      for (const key of Object.keys(fields)) {
        if (isDirty(sec, key)) dirty.push({ section: sec, key });
      }
    }
    return dirty;
  };

  const totalDirty = allDirtyFields().length;

  const handleChange = (section: string, key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [`${section}:${key}`]: value }));
    setSaveSuccess(false);
  };

  const saveAll = async () => {
    const dirty = allDirtyFields();
    if (dirty.length === 0) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      for (const { section, key } of dirty) {
        const value = editedValues[`${section}:${key}`] ?? getValue(section, key);
        const res = await fetch("/api/site-content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, key, value }),
        });
        if (!res.ok) throw new Error(`Failed to save ${section}/${key}`);
        setOverrides(prev => {
          const filtered = prev.filter(o => !(o.section === section && o.key === key));
          return [...filtered, { section, key, value }];
        });
      }
      setEditedValues({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const revertField = async (section: string, key: string) => {
    const editKey = `${section}:${key}`;
    setEditedValues(prev => { const n = { ...prev }; delete n[editKey]; return n; });
    if (isOverridden(section, key)) {
      try {
        await fetch(`/api/site-content?section=${encodeURIComponent(section)}&key=${encodeURIComponent(key)}`, { method: "DELETE" });
        setOverrides(prev => prev.filter(o => !(o.section === section && o.key === key)));
      } catch { setError("Failed to revert field"); }
    }
  };

  const toggleSection = (s: string) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  const sectionDirtyCount = (s: string): number =>
    Object.keys(DEFAULTS[s] || {}).filter(k => isDirty(s, k)).length;

  const inputClass =
    "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[rgba(74,222,128,0.5)] focus:bg-[rgba(255,255,255,0.06)] transition-all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#4ADE80]" />
        <span className="ml-3 text-gray-400 text-sm">Loading page editor…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-5 glass rounded-2xl border border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <FileText size={20} className="text-[#FACC15]" />
            Space &amp; Page Editor
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Edit Space Type pages (Office, CoWorking, Retail, Warehouse), CoWork, and Executive Advisement.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={totalDirty === 0 || saving}
          className={`flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all ${
            saveSuccess
              ? "bg-[#4ADE80] text-black"
              : totalDirty > 0
              ? "bg-[#4ADE80] hover:bg-[#22C55E] text-black shadow-lg shadow-[rgba(74,222,128,0.25)]"
              : "bg-[rgba(255,255,255,0.06)] text-gray-600 cursor-not-allowed"
          }`}
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving…</>
          ) : saveSuccess ? (
            <><CheckCircle2 size={16} /> All Changes Saved!</>
          ) : (
            <><Save size={16} /> Save Changes {totalDirty > 0 && `(${totalDirty})`}</>
          )}
        </button>
      </div>

      {totalDirty > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[rgba(250,204,21,0.06)] border border-[rgba(250,204,21,0.2)]">
          <AlertCircle size={15} className="text-[#FACC15] flex-shrink-0" />
          <p className="text-xs text-[#FACC15]">
            You have <strong>{totalDirty} unsaved change{totalDirty > 1 ? "s" : ""}</strong>. Click <strong>Save Changes</strong> to publish.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-950/40 border border-red-900/50">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Page sections */}
      {PAGE_META.map(meta => {
        const sectionKey = meta.key;
        const fields = DEFAULTS[sectionKey];
        if (!fields) return null;
        const isExpanded = expandedSections[sectionKey];
        const dirtyCount = sectionDirtyCount(sectionKey);
        const customized = Object.keys(fields).filter(k => isOverridden(sectionKey, k)).length;

        return (
          <div
            key={sectionKey}
            className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden"
          >
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${meta.color}18`,
                    borderWidth: 1, borderStyle: "solid", borderColor: `${meta.color}33`,
                    color: meta.color,
                  }}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {meta.label}
                    {customized > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.25)] text-[#60A5FA] font-semibold">
                        {customized} edited
                      </span>
                    )}
                    {dirtyCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-semibold">
                        {dirtyCount} unsaved
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                </div>
              </div>
              <div className="text-gray-600">
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </button>

            {isExpanded && (
              <div
                className="border-t border-[rgba(255,255,255,0.05)] p-5 space-y-4"
                style={{ borderLeft: `3px solid ${meta.color}50` }}
              >
                {Object.entries(fields).map(([fieldKey, fieldMeta]) => {
                  const val = getValue(sectionKey, fieldKey);
                  const dirty = isDirty(sectionKey, fieldKey);
                  const custom = isOverridden(sectionKey, fieldKey);
                  const seoConfig = getSeoConfig(fieldKey);
                  const isDesc = fieldKey === "metaDescription";
                  // Build slug-specific keywords for critical SEO fields
                  const isH1 = fieldKey === "h1";
                  const isTitle = fieldKey === "metaTitle";
                  const pageKeywords = (isH1 || isTitle || isDesc)
                    ? sectionKey.startsWith("space:")
                      ? ["commercial real estate", "Bristol", "Tri-Cities"]
                      : sectionKey === "page:cowork"
                      ? ["coworking", "Bristol", "workspace"]
                      : ["executive", "consulting", "Vision LLC"]
                    : undefined;

                  return (
                    <div key={fieldKey}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                          <Type size={11} className="text-gray-600" />
                          {fieldMeta.label}
                          {dirty && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] inline-block" />}
                        </label>
                        {(custom || dirty) && (
                          <button
                            onClick={() => revertField(sectionKey, fieldKey)}
                            className="text-[10px] text-gray-600 hover:text-gray-300 flex items-center gap-1 transition-colors"
                            title="Reset to default"
                          >
                            <RotateCcw size={10} /> Reset
                          </button>
                        )}
                      </div>
                      {fieldMeta.type === "textarea" ? (
                        <textarea
                          value={val}
                          onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                          rows={3}
                          className={`${inputClass} resize-none ${dirty ? "border-[rgba(250,204,21,0.3)]" : ""}`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                          className={`${inputClass} ${dirty ? "border-[rgba(250,204,21,0.3)]" : ""}`}
                        />
                      )}
                      {/* SEO Guardrail */}
                      {seoConfig && (
                        <SeoFieldGuard
                          value={val}
                          defaultValue={fieldMeta.value}
                          seoLevel={seoConfig.seoLevel}
                          charRange={seoConfig.charRange}
                          hint={seoConfig.hint}
                          keywords={pageKeywords}
                          googlePreview={isDesc ? {
                            title: getValue(sectionKey, "metaTitle") || getValue(sectionKey, "hero_heading") || "",
                            description: val,
                            url: sectionKey.startsWith("space:") ? `teamvisionllc.com/spaces/${sectionKey.replace("space:", "")}` : `teamvisionllc.com/${sectionKey.replace("page:", "")}`,
                          } : undefined}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="text-center pt-2 pb-4">
        <p className="text-xs text-gray-600">
          {overrides.length} page field{overrides.length !== 1 ? "s" : ""} customized · Changes appear on the live site within 60 seconds
        </p>
      </div>
    </div>
  );
}
