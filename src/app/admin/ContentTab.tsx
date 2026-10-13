"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Save, CheckCircle2, Loader2, RotateCcw, AlertCircle,
  Type, Hash, Pencil, ChevronDown, ChevronRight,
  Eye, Building2, BarChart3, Briefcase, Phone, MapPin,
  Globe, ExternalLink, Image as ImageIcon, Copy, Check, Sparkles, LayoutTemplate,
} from "lucide-react";
import PageMap from "./PageMap";
import HeroBannerManager from "./HeroBannerManager";
import PropertyEditor from "./PropertyEditor";
import PropertyCreator from "./PropertyCreator";
import CustomDomainManager from "@/components/admin/CustomDomainManager";

// ── Default values (mirrors what renders on the public tenant website) ───────

const DEFAULTS: Record<string, Record<string, { label: string; value: string; type: "text" | "textarea" | "number" }>> = {
  hero: {
    trust_badge: { label: "Top Badge Text", value: "Commercial & Residential Leasing", type: "text" },
    headline_before: { label: "Headline (Line 1)", value: "Premier Commercial &", type: "text" },
    headline_highlight: { label: "Headline (Highlighted)", value: "Workspace Leasing", type: "text" },
    headline_after: { label: "Headline (After Highlight)", value: "", type: "text" },
    subtext: { label: "Hero Subtext / Description", value: "Tell visitors what makes your properties great — your experience, your service area, and the kinds of spaces you offer.", type: "textarea" },
    cta_primary: { label: "Primary Button Text", value: "Schedule a Tour", type: "text" },
    cta_secondary: { label: "Secondary Button Text", value: "Browse Properties", type: "text" },
    micro_stat_1_value: { label: "Stat Pill 1 — Value", value: "20+", type: "text" },
    micro_stat_1_label: { label: "Stat Pill 1 — Label", value: "Years in Business", type: "text" },
    micro_stat_2_value: { label: "Stat Pill 2 — Value", value: "100%", type: "text" },
    micro_stat_2_label: { label: "Stat Pill 2 — Label", value: "Locally Managed", type: "text" },
    micro_stat_3_value: { label: "Stat Pill 3 — Value", value: "24/7", type: "text" },
    micro_stat_3_label: { label: "Stat Pill 3 — Label", value: "Responsive Maintenance", type: "text" },
    micro_stat_4_value: { label: "Stat Pill 4 — Value", value: "Flexible", type: "text" },
    micro_stat_4_label: { label: "Stat Pill 4 — Label", value: "Lease Terms", type: "text" },
  },
  stats: {
    stat_1_value: { label: "Stat 1 — Value", value: "20+", type: "text" },
    stat_1_label: { label: "Stat 1 — Label", value: "Years in Business", type: "text" },
    stat_2_value: { label: "Stat 2 — Value", value: "#1", type: "text" },
    stat_2_label: { label: "Stat 2 — Label", value: "Locally Owned & Operated", type: "text" },
    stat_3_value: { label: "Stat 3 — Value", value: "100%", type: "text" },
    stat_3_label: { label: "Stat 3 — Label", value: "Hands-On Management", type: "text" },
    stat_4_value: { label: "Stat 4 — Value", value: "24/7", type: "text" },
    stat_4_label: { label: "Stat 4 — Label", value: "Tenant Support", type: "text" },
  },
  services: {
    section_heading_1: { label: "Section Heading (Line 1)", value: "Everything You Need.", type: "text" },
    section_heading_2: { label: "Section Heading (Highlighted)", value: "One Hands-On Partner.", type: "text" },
    section_subtext: { label: "Section Description", value: "From initial tour and space planning through build-out and responsive day-to-day property management — no silos, just results.", type: "textarea" },
    card_1_title: { label: "Card 1 — Title", value: "Commercial & Suite Leasing", type: "text" },
    card_1_short: { label: "Card 1 — Subtitle", value: "Office, retail, warehouse & flex space", type: "text" },
    card_1_desc: { label: "Card 1 — Description", value: "From private executive suites and storefronts to large-format commercial and industrial space tailored to your operations.", type: "textarea" },
    card_2_title: { label: "Card 2 — Title", value: "Custom Build-Outs & Renovations", type: "text" },
    card_2_short: { label: "Card 2 — Subtitle", value: "Spaces configured around your workflow", type: "text" },
    card_2_desc: { label: "Card 2 — Description", value: "We partner with tenants to customize layouts, finishes, and infrastructure so your space is move-in ready from day one.", type: "textarea" },
    card_3_title: { label: "Card 3 — Title", value: "Dedicated Property Management", type: "text" },
    card_3_short: { label: "Card 3 — Subtitle", value: "Direct, local maintenance & tenant care", type: "text" },
    card_3_desc: { label: "Card 3 — Description", value: "Our in-house maintenance and operations team responds fast, keeping your building clean, secure, and running smoothly.", type: "textarea" },
  },
  about: {
    hero_heading_1: { label: "About Heading (Line 1)", value: "Committed to Our", type: "text" },
    hero_heading_2: { label: "About Heading (Highlighted)", value: "Community & Tenants", type: "text" },
    hero_subtext: { label: "Company Story / Overview", value: "We are a locally owned and operated property company focused on long-term relationships, well-maintained buildings, and flexible leasing.", type: "textarea" },
    leader_heading: { label: "Leadership / Team Heading", value: "Our Leadership Philosophy", type: "text" },
    leader_bio_1: { label: "Story Paragraph 1", value: "We believe great commercial real estate starts with responsive local ownership and pride of maintenance.", type: "textarea" },
    leader_bio_2: { label: "Story Paragraph 2", value: "Whether you are launching a new storefront, expanding your regional office, or scaling warehouse operations, our team works directly with you.", type: "textarea" },
    leader_quote: { label: "Featured Quote", value: "We don't just lease buildings — we invest in the long-term success of every business in our portfolio.", type: "textarea" },
  },
  testimonials: {
    section_heading_1: { label: "Section Heading", value: "What Our ", type: "text" },
    section_heading_2: { label: "Section Heading (Highlighted)", value: "Tenants Say", type: "text" },
    section_subtext: { label: "Section Subtext", value: "Businesses across our community trust our team to put them in the right space and support their growth.", type: "textarea" },
    quote_1: { label: "Review 1 — Quote", value: "The team didn't just find us a space — they positioned us for long-term success. Responsive, professional, and easy to work with.", type: "textarea" },
    author_1: { label: "Review 1 — Name / Role", value: "Local Business Owner", type: "text" },
    location_1: { label: "Review 1 — Location", value: "Commercial Tenant", type: "text" },
    quote_2: { label: "Review 2 — Quote", value: "Flexible terms gave our company the professional environment we needed without unnecessary overhead. Genuinely invested in our success.", type: "textarea" },
    author_2: { label: "Review 2 — Name / Role", value: "Managing Partner", type: "text" },
    location_2: { label: "Review 2 — Location", value: "Office Suite Tenant", type: "text" },
    quote_3: { label: "Review 3 — Quote", value: "Maintenance requests get handled fast and communication is always clear. It's the best landlord experience we've had.", type: "textarea" },
    author_3: { label: "Review 3 — Name / Role", value: "Operations Director", type: "text" },
    location_3: { label: "Review 3 — Location", value: "Long-Term Tenant", type: "text" },
    review_score: { label: "Review Score Badge", value: "5.0 Stars", type: "text" },
    review_tagline: { label: "Review Tagline", value: "Trusted by local businesses", type: "text" },
  },
  faq: {
    section_badge: { label: "Section Badge", value: "Common Questions", type: "text" },
    section_heading_1: { label: "Section Heading", value: "Leasing With Us ", type: "text" },
    section_heading_2: { label: "Section Heading (Highlighted)", value: "— FAQ", type: "text" },
    section_subtext: { label: "Section Subtext", value: "Everything you need to know about touring and leasing space with our team.", type: "textarea" },
    q_1: { label: "FAQ 1 — Question", value: "How do I schedule a tour or get pricing?", type: "text" },
    a_1: { label: "FAQ 1 — Answer", value: "Rates vary by property, square footage, and finish level. Click 'Schedule a Tour' or contact us directly for current availability and pricing.", type: "textarea" },
    q_2: { label: "FAQ 2 — Question", value: "Do you offer flexible or multi-year lease terms?", type: "text" },
    a_2: { label: "FAQ 2 — Answer", value: "Yes — we work with tenants on lease structures that fit their business stage, from flexible terms to multi-year commercial leases.", type: "textarea" },
    q_3: { label: "FAQ 3 — Question", value: "What types of properties do you offer?", type: "text" },
    a_3: { label: "FAQ 3 — Answer", value: "Browse our live property portfolio above to filter by space type, square footage, and immediate availability.", type: "textarea" },
    q_4: { label: "FAQ 4 — Question", value: "How are maintenance requests handled?", type: "text" },
    a_4: { label: "FAQ 4 — Answer", value: "Our dedicated in-house maintenance crew handles service requests promptly so you can stay focused on your business.", type: "textarea" },
  },
  cta: {
    badge_text: { label: "Badge Text", value: "Now Leasing", type: "text" },
    heading_1: { label: "Heading (Line 1)", value: "Ready to Tour Your Next Space?", type: "text" },
    heading_2: { label: "Heading (Highlighted)", value: "Let's Talk.", type: "text" },
    subtext: { label: "Subtext", value: "Whether you're looking for an office suite, retail storefront, or warehouse space — our team is ready to help.", type: "textarea" },
    cta_button: { label: "CTA Button Text", value: "Schedule a Tour", type: "text" },
  },
  footer: {
    tagline: { label: "Footer Tagline", value: "Professional property management and commercial leasing.", type: "textarea" },
    facebook_url: { label: "Facebook URL", value: "", type: "text" },
    linkedin_url: { label: "LinkedIn URL", value: "", type: "text" },
    youtube_url: { label: "YouTube URL", value: "", type: "text" },
  },
};

const SECTION_META: Record<string, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  hero:         { label: "Hero Headlines & Stats", icon: <Eye size={18} />,       description: "Main headline, call-to-action buttons, and stat pills at the top of your site", color: "#38BDF8" },
  stats:        { label: "Portfolio Stats Bar",    icon: <BarChart3 size={18} />, description: "Key metrics strip displayed below the hero section",                            color: "#60A5FA" },
  services:     { label: "Services & Divisions",   icon: <Briefcase size={18} />, description: "Three capability cards highlighting your leasing & management services",         color: "#A78BFA" },
  about:        { label: "About & Company Story",  icon: <Sparkles size={18} />,  description: "Your company story, mission, and leadership quote",                             color: "#34D399" },
  testimonials: { label: "Client Testimonials",    icon: <Building2 size={18} />, description: "Tenant reviews and social proof cards",                                         color: "#F472B6" },
  faq:          { label: "Leasing FAQ",            icon: <Hash size={18} />,      description: "Frequently asked questions for prospective tenants",                            color: "#FACC15" },
  cta:          { label: "Bottom Call-to-Action",  icon: <Phone size={18} />,     description: "Closing banner inviting prospects to schedule a tour",                          color: "#FB923C" },
  footer:       { label: "Footer & Social Links",  icon: <MapPin size={18} />,    description: "Footer description and social media links",                                     color: "#94A3B8" },
};

interface ContentItem { section: string; key: string; value: string }

interface ContentTabProps {
  onSubViewChange?: (view: string) => void;
  activeOrg?: { id: string; name: string; slug: string; tier: string; custom_domain?: string | null } | null;
}

type BuilderTab = "properties" | "hero" | "content" | "domain";

export default function ContentTab({ onSubViewChange, activeOrg }: ContentTabProps) {
  const [overrides, setOverrides] = useState<ContentItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [propRefreshKey, setPropRefreshKey] = useState(0);

  const siteUrl = activeOrg?.custom_domain
    ? `https://${activeOrg.custom_domain}`
    : activeOrg?.slug
    ? `/site/${activeOrg.slug}`
    : "/demo-site";

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ hero: true });
  const [loading, setLoading] = useState(true);
  const [activeMapSection, setActiveMapSection] = useState<string | null>("hero");
  const [mapOpen, setMapOpen] = useState(false);
  const [activeView, setActiveView] = useState<BuilderTab>("properties");

  const handleViewChange = (view: BuilderTab) => {
    setActiveView(view);
    const viewMap: Record<BuilderTab, string> = {
      properties: "content-properties",
      hero: "content-homepage",
      content: "content-homepage",
      domain: "content-domain",
    };
    onSubViewChange?.(viewMap[view] || "content");
  };

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleMapSectionSelect = useCallback((sectionKey: string) => {
    setActiveMapSection(sectionKey);
    setExpandedSections(prev => ({ ...prev, [sectionKey]: true }));
    setTimeout(() => {
      sectionRefs.current[sectionKey]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch("/api/site-content");
      const data = await res.json();
      setOverrides(data.items || []);
    } catch {
      console.warn("Failed to fetch site content");
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

  const handleCopyUrl = () => {
    const fullUrl = siteUrl.startsWith("http")
      ? siteUrl
      : `${window.location.origin}${siteUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const inputClass =
    "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-400/60 focus:bg-[rgba(255,255,255,0.06)] transition-all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-sky-400" />
        <span className="ml-3 text-slate-300 text-sm font-medium">Loading Site Builder &amp; Content Manager…</span>
      </div>
    );
  }

  const navCards: {
    key: BuilderTab;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      key: "properties",
      label: "Properties & Listings",
      subtitle: "Add buildings, photos & availability",
      icon: <Building2 size={18} />,
    },
    {
      key: "hero",
      label: "Hero Banner & Video",
      subtitle: "Rotating slides & background video",
      icon: <ImageIcon size={18} />,
    },
    {
      key: "content",
      label: "Website Copy & Sections",
      subtitle: "Headlines, stats, services, FAQ & footer",
      icon: <LayoutTemplate size={18} />,
      badge: totalDirty > 0 ? `${totalDirty} unsaved` : undefined,
    },
    {
      key: "domain",
      label: "Custom Domain & DNS",
      subtitle: activeOrg?.custom_domain ? activeOrg.custom_domain : "Connect GoDaddy or IONOS",
      icon: <Globe size={18} />,
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Live Public Website Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-sky-950/70 via-[#0B1426] to-indigo-950/60 border border-sky-500/30 shadow-[0_10px_30px_rgba(2,8,23,0.45)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 flex-shrink-0 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <Globe size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Site Builder &amp; Content Management
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Customize your public property portfolio, hero showcase, website copy, and domain — updates publish directly to your live site.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-slate-200 transition-all"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Site Link"}</span>
          </button>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)]"
          >
            <span>Open Live Website</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* ── Stacked 4-Card Site Builder Navigation Grid (Zero Side-Scrolling) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {navCards.map(tab => {
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleViewChange(tab.key)}
              className={`group relative flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-br from-sky-500/20 via-blue-600/15 to-indigo-600/15 border-sky-400/50 text-white shadow-[0_0_24px_rgba(56,189,248,0.18)]"
                  : "bg-white/[0.02] border-white/[0.07] text-slate-300 hover:bg-white/[0.05] hover:border-white/15"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive
                    ? "bg-sky-400 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                    : "bg-white/[0.05] text-slate-400 group-hover:text-white"
                }`}
              >
                {tab.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <p className={`text-sm font-black truncate ${isActive ? "text-white" : "text-slate-200"}`}>
                    {tab.label}
                  </p>
                  {tab.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 flex-shrink-0">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {tab.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ══  1. PROPERTIES & LISTINGS VIEW                                     ══ */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeView === "properties" && (
        <div className="space-y-5">
          {/* Collapsible Add New Property Card */}
          <div className="glass rounded-2xl border border-sky-500/25 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSections(prev => ({ ...prev, addPropertyOpen: !prev["addPropertyOpen"] }))}
              className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                  <Building2 size={20} className="text-slate-950" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-black text-white">Add New Property to Website</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Create a new building or suite listing, upload photos, and use Gemini AI to write the description
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                <span className="hidden sm:inline">{expandedSections["addPropertyOpen"] ? "Close Form" : "Expand Form"}</span>
                {expandedSections["addPropertyOpen"] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </button>

            {expandedSections["addPropertyOpen"] && (
              <div className="border-t border-white/[0.06] p-5 sm:p-6">
                <PropertyCreator
                  hideList={true}
                  onCreated={() => {
                    setPropRefreshKey(k => k + 1);
                  }}
                />
              </div>
            )}
          </div>

          {/* Unified Property Editor */}
          <PropertyEditor refreshKey={propRefreshKey} />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ══  2. HERO BANNER & SLIDES VIEW                                      ══ */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeView === "hero" && (
        <div className="space-y-5">
          <HeroBannerManager defaultExpanded={true} />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ══  3. WEBSITE COPY & SECTIONS VIEW                                   ══ */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeView === "content" && (
        <div className="space-y-5">
          {/* Visual Page Map Blueprint (collapsible) */}
          <div className="glass rounded-2xl border border-white/[0.08] overflow-hidden">
            <button
              type="button"
              onClick={() => setMapOpen(p => !p)}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.02] transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400">
                  <LayoutTemplate size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Interactive Website Blueprint</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any section on the visual page map to jump directly to its copy editor
                  </p>
                </div>
              </div>
              <div className="text-slate-400 flex items-center gap-1.5 text-xs font-semibold">
                <span className="hidden sm:inline">{mapOpen ? "Hide Map" : "Show Map"}</span>
                {mapOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </button>
            {mapOpen && (
              <div className="border-t border-white/[0.06]">
                <PageMap
                  activeSection={activeMapSection}
                  onSectionSelect={handleMapSectionSelect}
                />
              </div>
            )}
          </div>

          {/* Top Bar: Title + Save Button */}
          <div className="flex items-center justify-between flex-wrap gap-4 p-5 sm:p-6 glass rounded-2xl border border-white/[0.08]">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2.5">
                <Pencil size={20} className="text-sky-400" />
                Website Copy &amp; Section Editor
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Customize the headlines, service cards, company bio, testimonials, FAQ, and footer on your live website.
              </p>
            </div>

            <button
              type="button"
              onClick={saveAll}
              disabled={totalDirty === 0 || saving}
              className={`flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all ${
                saveSuccess
                  ? "bg-emerald-400 text-slate-950"
                  : totalDirty > 0
                  ? "bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-lg shadow-sky-500/25"
                  : "bg-white/[0.06] text-slate-500 cursor-not-allowed"
              }`}
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : saveSuccess ? (
                <><CheckCircle2 size={16} /> Published to Live Site!</>
              ) : (
                <><Save size={16} /> Save Website Copy {totalDirty > 0 && `(${totalDirty})`}</>
              )}
            </button>
          </div>

          {totalDirty > 0 && (
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30">
              <AlertCircle size={16} className="text-amber-300 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-amber-200">
                You have <strong>{totalDirty} unsaved change{totalDirty > 1 ? "s" : ""}</strong>. Click <strong>Save Website Copy</strong> above to publish them to your live website.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-red-950/40 border border-red-900/50">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Section Editors */}
          {Object.entries(SECTION_META).map(([sectionKey, meta]) => {
            const fields = DEFAULTS[sectionKey];
            if (!fields) return null;
            const isExpanded = expandedSections[sectionKey];
            const dirtyCount = sectionDirtyCount(sectionKey);
            const customized = Object.keys(fields).filter(k => isOverridden(sectionKey, k)).length;

            return (
              <div
                key={sectionKey}
                ref={el => { sectionRefs.current[sectionKey] = el; }}
                className="glass rounded-2xl border overflow-hidden transition-all duration-300"
                style={activeMapSection === sectionKey
                  ? { borderColor: `${meta.color}50`, boxShadow: `0 0 20px ${meta.color}14` }
                  : { borderColor: "rgba(255,255,255,0.07)" }
                }
              >
                <button
                  type="button"
                  onClick={() => { toggleSection(sectionKey); setActiveMapSection(sectionKey); }}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${meta.color}18`,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: `${meta.color}38`,
                        color: meta.color,
                      }}
                    >
                      {meta.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex flex-wrap items-center gap-2">
                        {meta.label}
                        {customized > 0 && (
                          <span
                            className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor: `${meta.color}18`,
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor: `${meta.color}40`,
                              color: meta.color,
                            }}
                          >
                            {customized} customized
                          </span>
                        )}
                        {dirtyCount > 0 && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-semibold">
                            {dirtyCount} unsaved
                          </span>
                        )}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{meta.description}</p>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>

                {isExpanded && (
                  <div
                    className="border-t border-white/[0.06] p-5 space-y-4"
                    style={{ borderLeft: `3px solid ${meta.color}60` }}
                  >
                    {Object.entries(fields).map(([fieldKey, fieldMeta]) => {
                      const val = getValue(sectionKey, fieldKey);
                      const dirty = isDirty(sectionKey, fieldKey);
                      const custom = isOverridden(sectionKey, fieldKey);

                      return (
                        <div key={fieldKey}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                              <Type size={13} className="text-slate-400" />
                              {fieldMeta.label}
                              {dirty && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />}
                            </label>
                            {(custom || dirty) && (
                              <button
                                type="button"
                                onClick={() => revertField(sectionKey, fieldKey)}
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                title="Reset to default"
                              >
                                <RotateCcw size={11} /> Reset to default
                              </button>
                            )}
                          </div>
                          {fieldMeta.type === "textarea" ? (
                            <textarea
                              value={val}
                              onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                              rows={3}
                              className={`${inputClass} resize-none ${dirty ? "border-amber-400/50" : ""}`}
                            />
                          ) : (
                            <input
                              type={fieldMeta.type}
                              value={val}
                              onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                              className={`${inputClass} ${dirty ? "border-amber-400/50" : ""}`}
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
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ══  4. CUSTOM DOMAIN & DNS VIEW                                       ══ */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeView === "domain" && (
        <CustomDomainManager
          orgId={activeOrg?.id}
          orgName={activeOrg?.name}
          currentDomain={activeOrg?.custom_domain}
        />
      )}

    </div>
  );
}
