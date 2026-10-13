"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Calendar,
  Send,
  Loader2,
  Briefcase,
  Sparkles,
  Star,
  ChevronDown,
  Quote,
} from "lucide-react";
import AcmeNavbar from "@/components/demo-site/AcmeNavbar";
import AcmeHeroBanner, { HeroSlideItem } from "@/components/demo-site/AcmeHeroBanner";
import AcmePropertyGrid from "@/components/demo-site/AcmePropertyGrid";
import AcmeTourModal from "@/components/demo-site/AcmeTourModal";
import AcmeBuildingSpecsModal from "@/components/demo-site/AcmeBuildingSpecsModal";
import AcmeFooter from "@/components/demo-site/AcmeFooter";

export interface OrgData {
  id: string;
  name: string;
  slug: string;
  tier: "starter" | "growth" | "pro" | string;
  contact_email?: string;
  contact_phone?: string;
  custom_domain?: string | null;
  description?: string;
  city?: string;
  state?: string;
  address?: string;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  brand_primary_color?: string | null;
  brand_accent_color?: string | null;
}

export interface FormattedProperty {
  id: string;
  name: string;
  type: string;
  city: string;
  address: string;
  sqft: string;
  status: string;
  badge: string;
  badgeColor: string;
  image: string;
  images?: string[];
  description: string;
  highlights: string[];
}

interface TenantSiteClientProps {
  initialOrg: OrgData;
  initialProperties: FormattedProperty[];
  initialHeroSlides: HeroSlideItem[];
  initialSiteContent?: Record<string, Record<string, string>>;
}

export default function TenantSiteClient({
  initialOrg,
  initialProperties,
  initialHeroSlides,
  initialSiteContent = {},
}: TenantSiteClientProps) {
  const [org] = useState<OrgData>(initialOrg);
  const [properties] = useState<FormattedProperty[]>(initialProperties);
  const [heroSlides] = useState<HeroSlideItem[]>(initialHeroSlides);
  const [siteContent] = useState<Record<string, Record<string, string>>>(initialSiteContent);
  const [isMember, setIsMember] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const brandName = org.brand_name || org.name;

  // Helper to resolve customized Site Builder copy or fallback
  const c = (section: string, key: string, fallback: string): string => {
    const val = siteContent[section]?.[key];
    return typeof val === "string" && val.trim().length > 0 ? val : fallback;
  };

  // Modals & interaction state
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [tourPropertyId, setTourPropertyId] = useState<string | undefined>(
    initialProperties[0]?.id || undefined
  );
  const [specsPropertyId, setSpecsPropertyId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [minSqft, setMinSqft] = useState(0);

  // Starter tier direct contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactInterest, setContactInterest] = useState("General Inquiry");
  const [contactMessage, setContactMessage] = useState("");
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");

  // Check viewer session to determine if visitor is an authenticated org member
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/platform/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            const isMatch =
              Boolean(data.isSuperAdmin) ||
              (org.id && data.activeOrg?.id === org.id) ||
              data.activeOrg?.slug === org.slug ||
              data.memberships?.some(
                (m: any) => (org.id && m.id === org.id) || m.slug === org.slug
              );
            setIsMember(Boolean(isMatch));
            return;
          }
        }
      } catch {
        // Anonymous visitor
      }
      setIsMember(false);
    }

    if (org.id || org.slug) {
      checkSession();
    }
  }, [org.id, org.slug]);

  const handleOpenTour = (propId?: string) => {
    if (propId) setTourPropertyId(propId);
    else if (properties[0]?.id) setTourPropertyId(properties[0].id);
    setIsTourModalOpen(true);
  };

  const handleFilterChange = (type: string, sqft: number) => {
    setFilterType(type);
    setMinSqft(sqft);
  };

  // Starter tier direct contact form submit
  const handleStarterContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim()) {
      setContactError("Please provide your name and email.");
      return;
    }

    setSubmittingContact(true);
    setContactError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: org.id || null,
          org_slug: org.slug,
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          company: contactCompany.trim(),
          interest: contactInterest,
          message: contactMessage.trim() || "Inquiry from website digital card.",
          source: "public_site",
          medium: "business_card",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to submit inquiry. Please try again.");
      }

      setContactSuccess(true);
    } catch (err: any) {
      setContactError(err?.message || "An error occurred while submitting your message.");
    } finally {
      setSubmittingContact(false);
    }
  };

  const currentTier = (org.tier || "pro").toLowerCase();
  const isStarterTier = currentTier === "starter";
  const isGrowthTier = currentTier === "growth";
  const isProTier = currentTier === "pro";

  const assetClasses = Array.from(
    new Set(properties.map((p) => p.type).filter(Boolean))
  ) as string[];
  const markets = Array.from(
    new Set(properties.map((p) => p.city).filter(Boolean))
  ) as string[];

  const statsItems = [
    {
      value: c("stats", "stat_1_value", "20+"),
      label: c("stats", "stat_1_label", "Years in Business"),
    },
    {
      value: c("stats", "stat_2_value", "#1"),
      label: c("stats", "stat_2_label", "Locally Owned & Operated"),
    },
    {
      value: c("stats", "stat_3_value", properties.length > 0 ? `${properties.length}+` : "100%"),
      label: c("stats", "stat_3_label", "Hands-On Management"),
    },
    {
      value: c("stats", "stat_4_value", "24/7"),
      label: c("stats", "stat_4_label", "Tenant Support"),
    },
  ];

  const servicesCards = [
    {
      title: c("services", "card_1_title", "Commercial & Suite Leasing"),
      short: c("services", "card_1_short", "Office, retail, warehouse & flex space"),
      desc: c(
        "services",
        "card_1_desc",
        `From private executive suites and storefronts to large-format commercial space tailored to your operations.`
      ),
    },
    {
      title: c("services", "card_2_title", "Custom Build-Outs & Renovations"),
      short: c("services", "card_2_short", "Spaces configured around your workflow"),
      desc: c(
        "services",
        "card_2_desc",
        `We partner with tenants to customize layouts, finishes, and infrastructure so your space is move-in ready.`
      ),
    },
    {
      title: c("services", "card_3_title", "Dedicated Property Management"),
      short: c("services", "card_3_short", "Direct, local maintenance & tenant care"),
      desc: c(
        "services",
        "card_3_desc",
        `Our in-house maintenance and operations team responds fast, keeping your building clean, secure, and running smoothly.`
      ),
    },
  ];

  const testimonialsList = [
    {
      quote: c(
        "testimonials",
        "quote_1",
        "The team didn't just find us a space — they positioned us for long-term success. Responsive, professional, and easy to work with."
      ),
      author: c("testimonials", "author_1", "Local Business Owner"),
      location: c("testimonials", "location_1", org.city || "Commercial Tenant"),
    },
    {
      quote: c(
        "testimonials",
        "quote_2",
        "Flexible terms gave our company the professional environment we needed without unnecessary overhead. Genuinely invested in our success."
      ),
      author: c("testimonials", "author_2", "Managing Partner"),
      location: c("testimonials", "location_2", org.city || "Office Suite Tenant"),
    },
    {
      quote: c(
        "testimonials",
        "quote_3",
        "Maintenance requests get handled fast and communication is always clear. It's the best landlord experience we've had."
      ),
      author: c("testimonials", "author_3", "Operations Director"),
      location: c("testimonials", "location_3", org.city || "Long-Term Tenant"),
    },
  ];

  const faqItems = [
    {
      q: c("faq", "q_1", "How do I schedule a tour or get pricing?"),
      a: c(
        "faq",
        "a_1",
        "Rates vary by property, square footage, and finish level. Click 'Schedule a Tour' or contact us directly for current availability and pricing."
      ),
    },
    {
      q: c("faq", "q_2", "Do you offer flexible or multi-year lease terms?"),
      a: c(
        "faq",
        "a_2",
        "Yes — we work with tenants on lease structures that fit their business stage, from flexible terms to multi-year commercial leases."
      ),
    },
    {
      q: c("faq", "q_3", "What types of properties do you offer?"),
      a: c(
        "faq",
        "a_3",
        "Browse our live property portfolio above to filter by space type, square footage, and immediate availability."
      ),
    },
    {
      q: c("faq", "q_4", "How are maintenance requests handled?"),
      a: c(
        "faq",
        "a_4",
        "Our dedicated in-house maintenance crew handles service requests promptly so you can stay focused on your business."
      ),
    },
  ];

  return (
    <div
      className={`min-h-screen bg-[#060911] text-white selection:bg-sky-500 selection:text-white ${
        isMember ? "pt-[120px]" : "pt-20"
      }`}
    >
      {/* ── Top Workspace Bar: Rendered ONLY for Authenticated Org Members ── */}
      {isMember && (
        <div className="fixed top-0 left-0 right-0 z-50 h-10 bg-gradient-to-r from-sky-950/95 via-[#08101E]/95 to-sky-950/95 border-b border-sky-400/30 px-4 sm:px-6 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-gray-400 hidden sm:inline">Live Public Website:</span>
            <span className="text-sky-300 font-bold truncate">{org.name}</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
              {org.tier?.toUpperCase() || "PRO"} TIER
            </span>
            {org.custom_domain && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Globe size={10} />
                {org.custom_domain}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/admin?tab=content"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-all text-xs border border-white/15"
            >
              <Pencil size={11} className="text-amber-400" />
              <span className="hidden sm:inline">Edit in</span>
              <span>Site Builder</span>
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold transition-all text-xs shadow-sm"
            >
              <ArrowLeft size={12} />
              <span className="hidden sm:inline">Back to</span>
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <AcmeNavbar
        onOpenAiInspector={() => {}}
        onOpenTourModal={handleOpenTour}
        orgName={brandName}
        orgSlug={org.slug}
        customDomain={org.custom_domain}
        tier={org.tier}
        hasTopBar={isMember}
        brandLogoUrl={org.brand_logo_url}
        brandPrimaryColor={org.brand_primary_color}
      />

      {/* ── TIER 1: STARTER TIER (Digital Business Card & Direct Lead Capture) ── */}
      {isStarterTier && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-12">
          {/* Executive Business Card Header */}
          <div className="relative rounded-3xl bg-gradient-to-b from-[#0C1427] to-[#080D1A] border border-white/15 p-8 sm:p-12 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-widest px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20">
                  <Building2 size={13} />
                  <span>{c("hero", "trust_badge", "Commercial & Residential Management")}</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  {brandName}
                </h1>
                <p className="text-base text-gray-300 leading-relaxed">
                  {siteContent.hero?.subtext ||
                    org.description ||
                    `${brandName} provides premier property management, commercial leasing, and residential holdings with personalized service and tenant support.`}
                </p>

                {/* Direct Contact Pills */}
                <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-gray-300">
                  {org.contact_phone && (
                    <a
                      href={`tel:${org.contact_phone.replace(/[^0-9]/g, "")}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-sky-400 hover:text-white transition-colors"
                    >
                      <Phone size={14} className="text-sky-400" />
                      <span>{org.contact_phone}</span>
                    </a>
                  )}
                  {org.contact_email && (
                    <a
                      href={`mailto:${org.contact_email}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-sky-400 hover:text-white transition-colors"
                    >
                      <Mail size={14} className="text-sky-400" />
                      <span>{org.contact_email}</span>
                    </a>
                  )}
                  {org.city && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                      <MapPin size={14} className="text-sky-400" />
                      <span>{org.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Verified Badge Icon */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center min-w-[200px]">
                {org.brand_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.brand_logo_url}
                    alt={brandName}
                    className="h-9 w-auto rounded-lg object-contain mb-3"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg mb-3"
                    style={org.brand_primary_color ? { background: org.brand_primary_color } : undefined}
                  >
                    <Building2 size={28} />
                  </div>
                )}
                <span className="text-sm font-bold text-white">{brandName}</span>
                <span className="text-[11px] text-gray-400">Verified Portfolio</span>
              </div>
            </div>
          </div>

          {/* Direct Lead Capture Form */}
          <div id="contact" className="rounded-3xl bg-[#090E1A] border border-white/10 p-8 sm:p-10 shadow-xl">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Inquire or Request Information</h2>
                <p className="text-xs text-gray-400">
                  Send a direct message to {brandName}&apos;s leasing team. Inquiries are logged in real-time.
                </p>
              </div>

              {contactSuccess ? (
                <div className="p-8 text-center space-y-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/30">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Message Transmitted!</h3>
                  <p className="text-xs text-gray-300 max-w-md mx-auto">
                    Thank you for reaching out to {org.name}. Your inquiry has been routed to our team, and we will follow up with you shortly.
                  </p>
                  <button
                    onClick={() => {
                      setContactSuccess(false);
                      setContactName("");
                      setContactEmail("");
                      setContactPhone("");
                      setContactCompany("");
                      setContactMessage("");
                    }}
                    className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStarterContactSubmit} className="space-y-4">
                  {contactError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                      {contactError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="(555) 000-0000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                        Company or Organization
                      </label>
                      <input
                        type="text"
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        placeholder="Morgan Enterprises LLC"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={contactInterest}
                      onChange={(e) => setContactInterest(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                    >
                      <option value="Commercial Space Inquiry">Commercial Office / Suite Availability</option>
                      <option value="Retail or Flex Inquiry">Retail / Contractor Flex Inquiries</option>
                      <option value="Residential Lease Inquiry">Residential Apartment Lease</option>
                      <option value="General Inquiry">General Property Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                      Message / Space Requirements
                    </label>
                    <textarea
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Please let us know your square footage requirements, move-in timeline, or questions..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingContact}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingContact ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Sending Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Submit Direct Inquiry</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── TIER 2: GROWTH TIER (Visual Property Cards Showcase) ── */}
      {isGrowthTier && (
        <main className="space-y-12">
          {/* Visual Hero Header */}
          <div className="relative py-20 px-4 sm:px-6 bg-gradient-to-b from-[#091122] to-[#060911] border-b border-white/10 text-center">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-widest px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20">
                <Building2 size={13} />
                <span>{c("hero", "trust_badge", `${brandName} Portfolio`)}</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {siteContent.hero?.headline_before || siteContent.hero?.headline_highlight
                  ? `${siteContent.hero?.headline_before || ""} ${siteContent.hero?.headline_highlight || ""} ${siteContent.hero?.headline_after || ""}`.trim()
                  : "Available Spaces & Holdings"}
              </h1>
              <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
                {siteContent.hero?.subtext ||
                  org.description ||
                  `Explore our current portfolio of quality commercial, retail, and residential spaces managed by ${brandName}.`}
              </p>
            </div>
          </div>

          {/* Simple Property Cards Grid */}
          <section id="portfolio" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 py-12">
            {properties.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <Building2 size={36} className="mx-auto text-gray-500" />
                <h3 className="text-lg font-bold text-white">No Properties Listed Yet</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {isMember
                    ? "Head to the Site Builder or Properties tab in your Dashboard to add and publish your properties."
                    : `Check back soon for new available listings from ${org.name}.`}
                </p>
                {isMember && (
                  <Link
                    href="/admin?tab=content"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs"
                  >
                    Add Properties in Site Builder
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((p) => (
                  <div
                    key={p.id}
                    className="group rounded-2xl bg-[#090E1A] border border-white/10 overflow-hidden hover:border-sky-400/40 transition-all flex flex-col"
                  >
                    <div className="relative h-52 w-full overflow-hidden bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-sky-300 border border-white/15">
                        {p.type}
                      </div>
                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 text-[11px] font-mono text-white">
                        {p.sqft !== "—" ? `${p.sqft} RSF` : "Contact for size"}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                          <MapPin size={12} className="text-gray-500" />
                          <span>{p.address}</span>
                        </p>
                        <p className="text-xs text-gray-300 line-clamp-2 pt-1">
                          {p.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">{p.status}</span>
                        <button
                          onClick={() => handleOpenTour(p.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-black font-bold text-xs transition-colors"
                        >
                          Inquire About Space
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ── TIER 3: PRO TIER (Full Interactive Commercial Showcase & Spec Hub) ── */}
      {isProTier && properties.length === 0 && heroSlides.length === 0 && (
        <main id="portfolio" className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
          <Building2 size={40} className="mx-auto text-gray-500" />
          <h1 className="text-3xl font-black text-white">{brandName}</h1>
          <p className="text-sm text-gray-400">
            {isMember
              ? "No published properties yet. Add and publish properties in your Site Builder and they will appear here automatically."
              : `New listings from ${brandName} are coming soon. Use the contact details below to get in touch.`}
          </p>
          {isMember && (
            <Link
              href="/admin?tab=content"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs"
            >
              Add Properties in Site Builder
            </Link>
          )}
        </main>
      )}

      {isProTier && (properties.length > 0 || heroSlides.length > 0) && (
        <main>
          {/* Animated Image Hero Banner */}
          <AcmeHeroBanner
            onSelectProperty={(id) => setSpecsPropertyId(id)}
            onOpenTourModal={handleOpenTour}
            onFilterChange={handleFilterChange}
            slides={heroSlides}
            properties={properties}
            orgName={brandName}
          />

          {/* Featured Properties Grid & Space Catalog */}
          <AcmePropertyGrid
            filterType={filterType}
            minSqft={minSqft}
            onSelectProperty={(id) => setSpecsPropertyId(id)}
            onOpenTourModal={handleOpenTour}
            properties={properties}
            orgName={brandName}
          />

          {/* Building Specifications Modal */}
          <AcmeBuildingSpecsModal
            propertyId={specsPropertyId}
            onClose={() => setSpecsPropertyId(null)}
            onOpenTourModal={handleOpenTour}
            properties={properties}
          />
        </main>
      )}

      {/* ── CUSTOMIZABLE SITE BUILDER SECTIONS (Growth & Pro Tiers) ── */}
      {(isGrowthTier || isProTier) && (
        <div className="space-y-24 pb-20">
          {/* 1. Portfolio Stats Bar */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0A1224] via-[#0D172E] to-[#0A1224] border border-white/10 shadow-xl">
              {statsItems.map((st, idx) => (
                <div key={idx} className="text-center space-y-1 p-2">
                  <div className="text-2xl sm:text-4xl font-black text-sky-400 tracking-tight">
                    {st.value}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-300">
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Services & Divisions Section */}
          <section id="services" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-widest px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20">
                <Briefcase size={13} />
                <span>Capabilities &amp; Services</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {c("services", "section_heading_1", "Everything You Need.")}{" "}
                <span className="text-sky-400">
                  {c("services", "section_heading_2", "One Hands-On Partner.")}
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {c(
                  "services",
                  "section_subtext",
                  `From initial tour and space planning through build-out and responsive day-to-day property management — ${brandName} delivers results.`
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {servicesCards.map((card, i) => (
                <div
                  key={i}
                  className="p-6 sm:p-7 rounded-2xl bg-[#090F1E] border border-white/10 hover:border-sky-400/40 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 font-black text-sm">
                      0{i + 1}
                    </div>
                    <h3 className="text-lg font-bold text-white">{card.title}</h3>
                    <p className="text-xs font-semibold text-sky-300">{card.short}</p>
                    <p className="text-sm text-slate-300 leading-relaxed pt-1">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. About & Company Story Section */}
          <section id="about" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6">
            <div className="rounded-3xl bg-gradient-to-br from-[#0B1325] to-[#070B14] border border-white/10 p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20">
                  <Sparkles size={13} />
                  <span>About {brandName}</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  {c("about", "hero_heading_1", "Committed to Our")}{" "}
                  <span className="text-sky-400">
                    {c("about", "hero_heading_2", "Community & Tenants")}
                  </span>
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  {c(
                    "about",
                    "hero_subtext",
                    org.description ||
                      `${brandName} is a locally owned and operated property company focused on long-term relationships, well-maintained buildings, and flexible leasing.`
                  )}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {c(
                    "about",
                    "leader_bio_1",
                    "We believe great commercial real estate starts with responsive local ownership and pride of maintenance."
                  )}
                </p>
                {siteContent.about?.leader_bio_2 && (
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {siteContent.about.leader_bio_2}
                  </p>
                )}
              </div>

              <div className="lg:col-span-5">
                <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                  <Quote size={28} className="text-sky-400 opacity-80" />
                  <p className="text-base sm:text-lg font-medium text-white italic leading-relaxed">
                    &ldquo;
                    {c(
                      "about",
                      "leader_quote",
                      "We don't just lease buildings — we invest in the long-term success of every business in our portfolio."
                    )}
                    &rdquo;
                  </p>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-sm font-bold text-sky-300">
                      {c("about", "leader_heading", brandName)}
                    </p>
                    {org.city && <p className="text-xs text-slate-400">{org.city}</p>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Client Testimonials Section */}
          <section id="testimonials" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20">
                <Star size={12} fill="currentColor" />
                <span>
                  {c("testimonials", "review_score", "5.0 Stars")} ·{" "}
                  {c("testimonials", "review_tagline", "Trusted by local businesses")}
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {c("testimonials", "section_heading_1", "What Our ")}{" "}
                <span className="text-sky-400">
                  {c("testimonials", "section_heading_2", "Tenants Say")}
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                {c(
                  "testimonials",
                  "section_subtext",
                  `Businesses across our community trust ${brandName} to put them in the right space and support their growth.`
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonialsList.map((t, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-[#090F1E] border border-white/10 flex flex-col justify-between space-y-4"
                >
                  <p className="text-sm text-slate-200 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-sm font-bold text-white">{t.author}</p>
                    <p className="text-xs text-slate-400">{t.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Leasing FAQ Section */}
          <section id="faq" className="scroll-mt-24 max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                {c("faq", "section_badge", "Common Questions")}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {c("faq", "section_heading_1", "Leasing With Us ")}{" "}
                <span className="text-sky-400">
                  {c("faq", "section_heading_2", "— FAQ")}
                </span>
              </h2>
              <p className="text-sm text-slate-300">
                {c(
                  "faq",
                  "section_subtext",
                  `Everything you need to know about touring and leasing space with ${brandName}.`
                )}
              </p>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#090F1E] border border-white/10 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm sm:text-base font-bold text-white pr-4">
                        {item.q}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-sky-400 flex-shrink-0 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-white/[0.06] pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. Bottom Call-to-Action Banner */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="rounded-3xl bg-gradient-to-r from-sky-950/80 via-[#0B1528] to-indigo-950/80 border border-sky-400/30 p-8 sm:p-12 text-center space-y-5 shadow-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-300 uppercase tracking-widest px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30">
                {c("cta", "badge_text", org.city ? `Serving ${org.city}` : "Now Leasing")}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {c("cta", "heading_1", "Ready to Tour Your Next Space?")}{" "}
                <span className="text-sky-400">
                  {c("cta", "heading_2", "Let's Talk.")}
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
                {c(
                  "cta",
                  "subtext",
                  "Whether you're looking for an office suite, retail storefront, or warehouse space — our team is ready to help."
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenTour()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-[0_0_24px_rgba(56,189,248,0.35)] transition-all flex items-center gap-2"
                >
                  <Calendar size={16} />
                  <span>{c("cta", "cta_button", "Schedule a Tour")}</span>
                </button>
                {org.contact_phone && (
                  <a
                    href={`tel:${org.contact_phone.replace(/[^0-9]/g, "")}`}
                    className="px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white font-bold text-sm transition-all flex items-center gap-2"
                  >
                    <Phone size={15} className="text-sky-400" />
                    <span>{org.contact_phone}</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Schedule Private Tour Modal (for Growth & Pro tiers) */}
      <AcmeTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        selectedPropertyId={tourPropertyId}
        properties={properties}
        orgName={brandName}
        orgId={org.id}
        orgSlug={org.slug}
      />

      {/* Footer */}
      <AcmeFooter
        onOpenAiInspector={() => {}}
        orgName={brandName}
        phone={org.contact_phone}
        email={org.contact_email}
        description={c("footer", "tagline", org.description || "")}
        isMember={isMember}
        assetClasses={assetClasses}
        markets={markets}
        anchorId={isStarterTier ? "site-footer" : "contact"}
      />
    </div>
  );
}
