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
  address?: string;
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
  description: string;
  highlights: string[];
}

interface TenantSiteClientProps {
  initialOrg: OrgData;
  initialProperties: FormattedProperty[];
  initialHeroSlides: HeroSlideItem[];
}

export default function TenantSiteClient({
  initialOrg,
  initialProperties,
  initialHeroSlides,
}: TenantSiteClientProps) {
  const [org] = useState<OrgData>(initialOrg);
  const [properties] = useState<FormattedProperty[]>(initialProperties);
  const [heroSlides] = useState<HeroSlideItem[]>(initialHeroSlides);
  const [isMember, setIsMember] = useState(false);

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
        orgName={org.name}
        orgSlug={org.slug}
        customDomain={org.custom_domain}
        tier={org.tier}
        hasTopBar={isMember}
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
                  <span>Commercial & Residential Management</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  {org.name}
                </h1>
                <p className="text-base text-gray-300 leading-relaxed">
                  {org.description ||
                    `${org.name} provides premier property management, commercial leasing, and residential holdings with personalized service and tenant support.`}
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
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg mb-3">
                  <Building2 size={28} />
                </div>
                <span className="text-sm font-bold text-white">{org.name}</span>
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
                  Send a direct message to {org.name}&apos;s leasing team. Inquiries are logged in real-time.
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
                <span>{org.name} Portfolio</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Available Spaces & Holdings
              </h1>
              <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
                {org.description ||
                  `Explore our current portfolio of quality commercial, retail, and residential spaces managed by ${org.name}.`}
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
                    href="/admin?tab=properties"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs"
                  >
                    Add Properties in Dashboard
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
      {isProTier && properties.length === 0 && (
        <main id="portfolio" className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
          <Building2 size={40} className="mx-auto text-gray-500" />
          <h1 className="text-3xl font-black text-white">{org.name}</h1>
          <p className="text-sm text-gray-400">
            {isMember
              ? "No published properties yet. Add and publish properties in your Dashboard and they will appear here automatically."
              : `New listings from ${org.name} are coming soon. Use the contact details below to get in touch.`}
          </p>
          {isMember && (
            <Link
              href="/admin?tab=properties"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs"
            >
              Add Properties in Dashboard
            </Link>
          )}
        </main>
      )}

      {isProTier && properties.length > 0 && (
        <main>
          {/* Animated Image Hero Banner */}
          <AcmeHeroBanner
            onSelectProperty={(id) => setSpecsPropertyId(id)}
            onOpenTourModal={handleOpenTour}
            onFilterChange={handleFilterChange}
            slides={heroSlides}
            orgName={org.name}
          />

          {/* Featured Properties Grid & Space Catalog */}
          <AcmePropertyGrid
            filterType={filterType}
            minSqft={minSqft}
            onSelectProperty={(id) => setSpecsPropertyId(id)}
            onOpenTourModal={handleOpenTour}
            properties={properties}
            orgName={org.name}
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

      {/* Schedule Private Tour Modal (for Growth & Pro tiers) */}
      <AcmeTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        selectedPropertyId={tourPropertyId}
        properties={properties}
        orgName={org.name}
        orgId={org.id}
        orgSlug={org.slug}
      />

      {/* Footer */}
      <AcmeFooter
        onOpenAiInspector={() => {}}
        orgName={org.name}
        phone={org.contact_phone}
        email={org.contact_email}
        description={org.description}
        isMember={isMember}
        assetClasses={assetClasses}
        markets={markets}
        anchorId={isStarterTier ? "site-footer" : "contact"}
      />
    </div>
  );
}
