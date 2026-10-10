import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Building2,
  Users,
  ArrowRight,
  CheckCircle2,
  Star,
  ChevronDown,
} from "lucide-react";
import { GEO_PAGES, COMPANY, PROPERTIES } from "@/lib/data";
import CustomSearchCTA from "@/components/CustomSearchCTA";
import { getSiteContent } from "@/lib/site-content";
import SafeEmail from "@/components/SafeEmail";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return GEO_PAGES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const geo = GEO_PAGES.find((g) => g.slug === slug);
  if (!geo) return {};

  return {
    title: geo.metaTitle,
    description: geo.metaDescription,
    keywords: [
      `commercial real estate ${geo.city} ${geo.state}`,
      `office space ${geo.city} ${geo.state}`,
      `commercial property ${geo.city}`,
      `${geo.countyName} commercial real estate`,
      geo.zipCode,
      ...geo.neighborhoods,
    ],
    alternates: {
      canonical: `https://www.teamvisionllc.com/markets/${geo.slug}`,
    },
    openGraph: {
      title: geo.metaTitle,
      description: geo.metaDescription,
      url: `https://www.teamvisionllc.com/markets/${geo.slug}`,
      images: [
        {
          url: `https://www.teamvisionllc.com/api/og?title=${encodeURIComponent(`Commercial Real Estate ${geo.city}, ${geo.state}`)}&subtitle=${encodeURIComponent(`${geo.countyName} · Vision LLC serves ${geo.region}`)}&tag=${encodeURIComponent(geo.city)}&type=geo`,
          width: 1200,
          height: 630,
          alt: `Commercial Real Estate ${geo.city}, ${geo.state} | Vision LLC`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: geo.metaTitle,
      description: geo.metaDescription,
      images: [
        `https://www.teamvisionllc.com/api/og?title=${encodeURIComponent(`Commercial Real Estate ${geo.city}, ${geo.state}`)}&subtitle=${encodeURIComponent(`${geo.countyName} · Vision LLC serves ${geo.region}`)}&tag=${encodeURIComponent(geo.city)}&type=geo`,
      ],
    },
    other: {
      "geo.region": `US-${geo.state}`,
      "geo.placename": `${geo.city}, ${geo.state}`,
      "geo.position": `${geo.lat};${geo.lng}`,
      "ICBM": `${geo.lat}, ${geo.lng}`,
    },
  };

}

export default async function GeoPage({ params }: Props) {
  const { slug } = await params;
  const geo = GEO_PAGES.find((g) => g.slug === slug);
  if (!geo) notFound();

  // Fetch content overrides from admin MarketEditor
  const overrides = await getSiteContent(`market:${slug}`);
  const c = (key: string, fallback: string) => overrides[key] || fallback;
  const cArr = (key: string, fallback: string[]) => {
    const val = overrides[key];
    return val ? val.split("\n").filter(Boolean) : fallback;
  };

  // Build overridden geo data
  const geoData = {
    ...geo,
    h1: c("h1", geo.h1),
    heroSubline: c("heroSubline", geo.heroSubline),
    marketBlurb: c("marketBlurb", geo.marketBlurb),
    population: c("population", geo.population),
    medianIncome: c("medianIncome", geo.medianIncome),
    neighborhoods: cArr("neighborhoods", geo.neighborhoods),
    keyEmployers: cArr("keyEmployers", geo.keyEmployers),
    nearbyHighways: cArr("nearbyHighways", geo.nearbyHighways),
    availableTypes: cArr("availableTypes", geo.availableTypes),
  };

  // FAQs for this city (with content editor overrides)
  const defaultFaqs = [
    {
      q: `Does Vision LLC have commercial property available in ${geo.city}, ${geo.state}?`,
      a: geo.isPrimary
        ? `Yes! Vision LLC is the largest private commercial property owner in Downtown Bristol with a full portfolio including ${geoData.availableTypes.join(", ")}. Contact our team at ${COMPANY.phone} to discuss current availability.`
        : `Vision LLC doesn't maintain offices in ${geo.city}, but we actively serve businesses from ${geo.city} — connecting them with our commercial portfolio in Downtown Bristol, TN, typically a short drive via regional highways. Our available types include ${geoData.availableTypes.join(", ")}. Call ${COMPANY.phone} to discuss options.`,
    },
    {
      q: `What types of commercial space does Vision LLC offer in the ${geo.region}?`,
      a: `In the ${geo.region} market, Vision LLC offers ${geoData.availableTypes.join(", ")}. We specialize in finding the right fit for your business — from flexible coworking memberships to long-term commercial leases.`,
    },
    {
      q: `How long has Vision LLC been serving ${geo.city}?`,
      a: `Vision LLC has been investing in and serving the ${geo.region} region for over 20 years. Based in Downtown Bristol, TN, we extend our commercial real estate expertise across the entire Tri-Cities and Southwest Virginia market.`,
    },
    {
      q: `How do I schedule a property tour in ${geo.city}?`,
      a: `You can call us at ${COMPANY.phone}, email ${COMPANY.email}, or fill out our contact form. Our team typically responds within 24 hours to schedule a tour of any available space.`,
    },
  ];
  const faqs = defaultFaqs.map((f, i) => ({
    q: c(`faq_q${i + 1}`, f.q),
    a: c(`faq_a${i + 1}`, f.a),
  }));

  // JSON-LD for this specific geo page
  const localSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: `Vision LLC — ${geo.city}, ${geo.state} Commercial Real Estate`,
    url: `https://www.teamvisionllc.com/markets/${geo.slug}`,
    telephone: "+14235731022",
    address: {
      "@type": "PostalAddress",
      streetAddress: "100 5th St., Suite 2W",
      addressLocality: "Bristol",
      addressRegion: "TN",
      postalCode: "37620",
      addressCountry: "US",
    },
    areaServed: [
      {
        "@type": "City",
        name: geo.city,
        containedIn: geo.stateFullName,
      },
      ...geo.neighborhoods.map((n: string) => ({
        "@type": "Neighborhood",
        name: n,
        containedIn: geo.city,
      })),
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: geo.lat.toString(),
      longitude: geo.lng.toString(),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "47",
      bestRating: "5",
    },
    description: geo.metaDescription,
    hasMap: `https://maps.google.com/?q=${geo.lat},${geo.lng}`,
    priceRange: "$$",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.teamvisionllc.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Markets",
        item: "https://www.teamvisionllc.com/markets",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${geo.city}, ${geo.state}`,
        item: `https://www.teamvisionllc.com/markets/${geo.slug}`,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      {/* JSON-LD Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Breadcrumb */}
      <div className="pt-24 pb-0 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link href="/" className="hover:text-[#4ADE80] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/markets" className="hover:text-[#4ADE80] transition-colors">Markets</Link>
          <span>/</span>
          <span className="text-[#4ADE80]">{geo.city}, {geo.state}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="py-12 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="map-badge">
                <MapPin size={11} />
                {geo.city}, {geo.state}
              </span>
              <span className="map-badge">
                <Building2 size={11} />
                {geo.region}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
              {geoData.h1}
            </h1>

            <p className="text-lg sm:text-xl text-[#4ADE80] font-semibold mb-4">
              {geoData.heroSubline}
            </p>

            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-2xl">
              {geoData.marketBlurb}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact" id={`geo-tour-cta-${slug}`} className="btn-primary py-4 px-7">
                {geo.isPrimary ? `Schedule a Tour in ${geo.city}` : "Schedule a Tour"} <ArrowRight size={17} />
              </Link>
              <a href={COMPANY.phoneHref} id={`geo-phone-cta-${slug}`} className="btn-secondary py-4 px-7">
                <Phone size={17} /> {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Market Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-[rgba(74,222,128,0.08)] bg-[#0D1117]/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest">City</span>
              <span className="text-2xl font-black text-white">{geo.city}</span>
              <span className="text-xs text-gray-500">{geo.state === "TN" ? "Tennessee" : "Virginia"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest">Population</span>
              <span className="text-2xl font-black text-white">{geoData.population}</span>
              <span className="text-xs text-gray-500">Metro area</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest">Median Income</span>
              <span className="text-2xl font-black text-white">{geoData.medianIncome}</span>
              <span className="text-xs text-gray-500">Household / year</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest">Space Types</span>
              <span className="text-lg font-black text-white leading-snug">{geoData.availableTypes.length}+</span>
              <span className="text-xs text-gray-500">Commercial categories</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Market */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="section-line mb-4" />
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 leading-tight">
                Why Choose {geo.city} for Your{" "}
                <span className="gradient-text-green">Commercial Space?</span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">{geoData.marketBlurb}</p>

              <div className="space-y-3">
                {[
                  `Access to ${geoData.population} metro area residents`,
                  `Major employers: ${geoData.keyEmployers.join(", ")}`,
                  `Vision LLC's 20+ year regional expertise`,
                  "Flexible leasing terms and tenant-friendly approach",
                  "Vertically integrated team (no third-party hand-offs)",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3 text-sm text-gray-400">
                    <CheckCircle2 size={16} className="text-[#4ADE80] flex-shrink-0 mt-0.5" />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            {/* Available space types */}
            <div className="glass rounded-2xl p-7 border border-[rgba(74,222,128,0.15)]">
              <h3 className="text-lg font-bold text-white mb-5">
                {geo.isPrimary ? `Available Space Types in ${geo.city}` : "Space Types Available — Downtown Bristol, TN"}
              </h3>
              <div className="space-y-4">
                {geoData.availableTypes.map((type) => (
                  <div
                    key={type}
                    className="flex items-center justify-between py-3 border-b border-[rgba(74,222,128,0.08)] last:border-0"
                  >
                    <div className="flex items-center gap-3 text-sm font-medium text-white">
                      <Building2 size={15} className="text-[#4ADE80]" />
                      {type}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] pulse-green" />
                      <span className="text-xs text-[#4ADE80] font-semibold">Available</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/contact" id={`geo-space-cta-${slug}`} className="btn-primary w-full justify-center py-3">
                  {geo.isPrimary ? `Inquire About Space in ${geo.city}` : "Inquire About Our Bristol Portfolio"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Properties from Bristol (link out) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0D1117]/50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <div className="section-line mb-4" />
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Our{" "}
              <span className="gradient-text-green">Portfolio</span> — Serving {geo.region}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROPERTIES.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                id={`geo-property-${p.id}-${slug}`}
                className="group glass rounded-2xl p-6 border border-[rgba(74,222,128,0.08)] hover:border-[rgba(74,222,128,0.3)] property-card"
              >
                <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.08)] flex items-center justify-center text-[#4ADE80] mb-4">
                  <Building2 size={18} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#4ADE80] transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-gray-500 mb-3">{p.type} · {p.sqft} sqft</p>
                <p className="text-sm text-gray-400 line-clamp-2">{p.description}</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#4ADE80] mt-4 group-hover:gap-3 transition-all">
                  Learn More <ArrowRight size={13} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ (FAQPage schema) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              Frequently Asked Questions —{" "}
              <span className="gradient-text-green">{geo.city}</span>
            </h2>
            <p className="text-gray-400">Common questions about commercial real estate in {geo.city}, {geo.state}</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group glass rounded-2xl border border-[rgba(74,222,128,0.1)] hover:border-[rgba(74,222,128,0.25)] overflow-hidden transition-colors"
              >
                <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none">
                  <span className="font-semibold text-white text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className="text-[#4ADE80] flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="px-6 pb-6 text-sm text-gray-400 leading-relaxed border-t border-[rgba(74,222,128,0.08)] pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Local CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong rounded-3xl p-10 border border-[rgba(74,222,128,0.2)] text-center glow-green">
            <MapPin size={32} className="text-[#4ADE80] mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
              {geo.isPrimary
                ? `Ready to Explore Commercial Real Estate in ${geo.city}?`
                : "Ready to Find Your Space in Downtown Bristol?"}
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              {geo.isPrimary
                ? `Our team has deep roots in the ${geo.region} market. Let's find the right space for your business.`
                : `Our Downtown Bristol portfolio is a short drive from ${geo.city}. Let's find the right space for your business.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact" id={`geo-final-cta-${slug}`} className="btn-primary py-4 px-8">
                Schedule a Tour <ArrowRight size={17} />
              </Link>
              <a href={COMPANY.phoneHref} id={`geo-final-phone-${slug}`} className="btn-secondary py-4 px-8">
                <Phone size={17} /> Call {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Hyperlocal NAP + Service Area Block — critical on-page geo signal */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-[rgba(74,222,128,0.02)] border-t border-[rgba(74,222,128,0.07)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            {/* NAP */}
            <div>
              <h2 className="text-lg font-black text-white mb-4 uppercase tracking-widest text-sm">
                Serving {geo.city}, {geo.state} — {geo.countyName}
              </h2>
              <address className="not-italic space-y-2 text-sm text-gray-400">
                <p className="font-semibold text-white">Vision LLC</p>
                <p>100 5th St., Suite 2W</p>
                <p>Bristol, TN 37620</p>
                <p>
                  <a href="tel:+14235731022" className="text-[#4ADE80] hover:underline font-semibold">
                    423-573-1022
                  </a>
                </p>
                <p>
                  <SafeEmail className="text-[#4ADE80] hover:underline" />
                </p>
                <p className="pt-2 text-xs text-gray-500">
                  Zip Code: {geo.zipCode} · {geo.countyName}, {geo.stateFullName}
                </p>
              </address>

              <div className="mt-6">
                <p className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest mb-2">Neighborhoods Served</p>
                <div className="flex flex-wrap gap-2">
                  {geoData.neighborhoods.map((n: string) => (
                    <span key={n} className="text-xs px-3 py-1 rounded-lg bg-[rgba(74,222,128,0.07)] border border-[rgba(74,222,128,0.15)] text-gray-400">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Highway access + property types */}
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest mb-2">Major Highways</p>
                <div className="flex flex-wrap gap-2">
                  {geoData.nearbyHighways.map((hw: string) => (
                    <span key={hw} className="text-xs px-3 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-gray-400">
                      {hw}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest mb-2">Commercial Space Available</p>
                <div className="flex flex-wrap gap-2">
                  {geoData.availableTypes.map((t: string) => (
                    <span key={t} className="text-xs px-3 py-1 rounded-lg bg-[rgba(74,222,128,0.07)] border border-[rgba(74,222,128,0.15)] text-gray-400">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest mb-2">Top Employers in {geo.city}</p>
                <div className="flex flex-wrap gap-2">
                  {geoData.keyEmployers.map((e: string) => (
                    <span key={e} className="text-xs px-3 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-gray-400">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby Markets — internal link silo */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[rgba(74,222,128,0.07)]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-black text-white uppercase tracking-widest mb-5">
            Other Markets We Serve
          </h2>
          <div className="flex flex-wrap gap-3">
            {GEO_PAGES.filter((g) => g.slug !== slug).map((g) => (
              <Link
                key={g.slug}
                href={`/markets/${g.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[rgba(74,222,128,0.15)] text-gray-400 hover:text-white hover:border-[rgba(74,222,128,0.4)] hover:bg-[rgba(74,222,128,0.05)] transition-all"
              >
                <MapPin size={12} className="text-[#4ADE80]" />
                {g.city}, {g.state}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CustomSearchCTA />
    </>
  );
}
