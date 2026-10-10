import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AIChatWidget from "@/components/AIChatWidget";

export const metadata: Metadata = {
  title: "Find Commercial Space in Bristol, TN/VA | Vision LLC",
  description: "Looking for office, retail, or coworking space in the Tri-Cities area? Vision LLC has premium commercial spaces in Downtown Bristol, TN/VA.",
  robots: { index: false, follow: false },
};

// ── Property data for feature cards ────────────────────────────────────────────

const PROPERTY_DETAILS: Record<string, {
  label: string; sub: string; href: string; emoji: string;
  image: string; headline: string; desc: string; tags: string[];
}> = {
  "the-executive": {
    label: "🏢 Executive Suites", sub: "The Executive · Downtown", href: "/properties/the-executive", emoji: "🏢",
    image: "/property-images/commercial-executive-entry.jpg",
    headline: "The Executive — Premier Office Suites",
    desc: "Prestigious office space in a restored historic Downtown Bristol building. Full-service amenities, professional address, and flexible terms from 500–12,000 sqft.",
    tags: ["Historic Building", "Full-Service", "500–12k sqft"],
  },
  "city-centre": {
    label: "💼 City Centre Suites", sub: "Flexible offices · 1,200–18k sqft", href: "/properties/city-centre", emoji: "💼",
    image: "/property-images/commercial-city-centre-exterior.jpg",
    headline: "City Centre — Flexible Office Suites",
    desc: "Modern professional office space in the heart of Bristol. Scalable suites from 1,200 to 18,000 sqft with premium finishes and all-inclusive options.",
    tags: ["Flexible Terms", "Premium Finishes", "1.2k–18k sqft"],
  },
  "bristol-cowork": {
    label: "☕ Bristol CoWork", sub: "620 State St · All-inclusive", href: "/properties/bristol-cowork", emoji: "☕",
    image: "/property-images/cowork-shared-office.jpg",
    headline: "Bristol CoWork — All-Inclusive Workspace",
    desc: "Move-in ready coworking at 620 State Street. Private offices, dedicated desks, high-speed internet, and a creative community — all included.",
    tags: ["All-Inclusive", "Move-In Ready", "620 State St"],
  },
  "centre-point-suites": {
    label: "🏪 Centre Point", sub: "Retail & office · Casino Adjacent", href: "/properties/centre-point-suites", emoji: "🏪",
    image: "/property-images/commercial-centerpoint-mall.jpg",
    headline: "Centre Point — Casino Adjacent Development",
    desc: "Prime commercial space directly across from Hard Rock Hotel & Casino Bristol. Ideal for retail, restaurant, or service businesses seeking high-traffic visibility.",
    tags: ["Casino Adjacent", "High Traffic", "Retail/Restaurant"],
  },
  "foundation-event-facility": {
    label: "🎉 Event Facility", sub: "Up to 450 Guests · 620 State St", href: "/properties/foundation-event-facility", emoji: "🎉",
    image: "/property-images/development-event-space-after.jpg",
    headline: "Foundation — Premier Event Venue",
    desc: "The Tri-Cities' premier event venue in a restored 110+ year-old building. 3 distinct rooms for up to 450 guests — featuring 17-ft ceilings, Bose sound, HD projection, elevated stage, built-in bar, and full-service catering.",
    tags: ["Up to 450 Guests", "3 Venues", "Full AV & Stage", "Built-In Bar", "Catering Available"],
  },
  "warehouse": {
    label: "🏭 Warehouse", sub: "2,000–25,000 sqft · Bristol Metro", href: "/spaces/industrial-space-tri-cities-tn", emoji: "🏭",
    image: "/property-images/1913-W--state- Exterior.jpg",
    headline: "Industrial Warehouse Space",
    desc: "Functional warehouse and industrial space in Bristol Metro. Drive-in access, high ceilings, and scalable units from 2,000 to 25,000 sqft.",
    tags: ["Drive-In Access", "High Ceilings", "2k–25k sqft"],
  },
};

const ALL_SLUGS = Object.keys(PROPERTY_DETAILS);

// ── Page ────────────────────────────────────────────────────────────────────────

export default async function InstagramLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const params = await searchParams;
  const featureSlug = params.feature || "";
  const featured = PROPERTY_DETAILS[featureSlug] || null;
  const otherSlugs = featured ? ALL_SLUGS.filter(s => s !== featureSlug) : ALL_SLUGS;

  return (
    <main className="min-h-screen bg-[#080C0F] flex flex-col">
      {/* Background glow effects — warmer/pink for Instagram */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#EC4899] opacity-[0.04] blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#4ADE80] opacity-[0.04] blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 pt-24 pb-12 text-center">

        {/* Source tag */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#F472B6] bg-[rgba(236,72,153,0.1)] border border-[rgba(236,72,153,0.25)] px-3 py-1.5 rounded-full mb-6">
          <span>📷</span> You came from Instagram
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4 max-w-lg">
          Find Your Perfect<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ADE80] to-[#22C55E]">
            Commercial Space
          </span>
        </h1>

        <p className="text-gray-400 text-lg max-w-md mb-8 leading-relaxed">
          {featured
            ? `Check out this featured property — or browse all available spaces in Downtown Bristol, TN/VA.`
            : `Office suites, coworking, and retail in Downtown Bristol, TN/VA. Browse available spaces or chat with our AI advisor — no phone calls required.`
          }
        </p>

        {/* ── FEATURED PROPERTY HERO CARD ── */}
        {featured && (
          <Link href={featured.href}
            className="group w-full max-w-md rounded-3xl overflow-hidden border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.04)] mb-8 text-left block transition-all hover:border-[rgba(74,222,128,0.5)] hover:shadow-[0_0_40px_rgba(74,222,128,0.12)]">
            {/* Image */}
            <div className="relative w-full h-48 sm:h-56 overflow-hidden">
              <Image
                src={featured.image}
                alt={featured.headline}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080C0F] via-transparent to-transparent" />
              {/* Featured badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-[10px] font-black uppercase tracking-wider shadow-lg">
                ⭐ Featured Property
              </div>
            </div>
            {/* Info */}
            <div className="p-5">
              <h2 className="text-lg font-black text-white mb-1.5 group-hover:text-[#4ADE80] transition-colors">
                {featured.headline}
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">
                {featured.desc}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {featured.tags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.15)] text-[#4ADE80] font-bold">{t}</span>
                ))}
              </div>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-sm font-black">
                View This Property →
              </div>
            </div>
          </Link>
        )}

        {/* Primary CTA — all properties */}
        {!featured && (
          <>
            <Link
              href="/commercial-real-estate"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black font-black text-base hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(74,222,128,0.25)] mb-4"
            >
              Browse All Available Spaces →
            </Link>
            <p className="text-xs text-gray-600 mb-10">No obligation · No phone call required</p>
          </>
        )}

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
          {[
            { icon: "🏢", label: "Premium Downtown Spaces" },
            { icon: "⚡", label: "AI-Matched to Your Needs" },
            { icon: "🔒", label: "No Obligation" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-gray-400">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Section label if featured */}
        {featured && (
          <p className="text-[11px] text-gray-600 font-bold uppercase tracking-widest mb-4">More Available Spaces</p>
        )}

        {/* Property link grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md">
          {otherSlugs.map(slug => {
            const p = PROPERTY_DETAILS[slug];
            return (
              <Link
                key={slug}
                href={p.href}
                className="group flex flex-col items-start px-3 py-3 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] hover:bg-[rgba(74,222,128,0.1)] hover:border-[rgba(74,222,128,0.35)] transition-all text-left"
              >
                <span className="text-xs font-bold text-white leading-tight group-hover:text-[#4ADE80] transition-colors">{p.label}</span>
                <span className="text-[10px] text-gray-600 mt-0.5 leading-tight">{p.sub}</span>
              </Link>
            );
          })}
        </div>

        {/* Browse All CTA when featured */}
        {featured && (
          <Link href="/commercial-real-estate"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[rgba(74,222,128,0.25)] text-[#4ADE80] text-sm font-bold hover:bg-[rgba(74,222,128,0.06)] transition-all">
            Browse All Available Spaces →
          </Link>
        )}

        {/* Chat nudge */}
        <p className="text-xs text-gray-600 mt-8 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse inline-block" />
          Or chat with our AI Space Advisor below
        </p>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-[11px] text-gray-700">
        Vision LLC · Downtown Bristol, TN/VA · All rights reserved
      </footer>

      {/* Chat widget */}
      <AIChatWidget />
    </main>
  );
}
