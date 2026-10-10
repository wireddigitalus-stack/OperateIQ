import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Phone, Check, MapPin, ChevronDown } from "lucide-react";
import { SPACE_TYPE_PAGES, PROPERTIES, GEO_PAGES, COMPANY } from "@/lib/data";
import Navigation from "@/components/Navigation";
import LeaseBotTrigger from "@/components/LeaseBotTrigger";
import { fetchImageOverrides, resolveHeroImage } from "@/lib/property-image-overrides";
import { getSiteContent } from "@/lib/site-content";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return SPACE_TYPE_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = SPACE_TYPE_PAGES.find((p) => p.slug === slug);
  if (!page) return {};
  const ogUrl = `https://www.teamvisionllc.com/api/og?title=${encodeURIComponent(page.h1)}&subtitle=${encodeURIComponent(page.tagline)}&tag=${encodeURIComponent(page.badge)}&type=property`;
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: page.canonicalUrl },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: page.canonicalUrl,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: page.h1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
      images: [ogUrl],
    },
  };
}

export default async function SpaceTypePage({ params }: Props) {
  const { slug } = await params;
  const page = SPACE_TYPE_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();

  const matchedProperties = PROPERTIES.filter((p) =>
    page.propertyIds.includes(p.id)
  );
  const linkedGeoPages = GEO_PAGES.filter((g) =>
    page.geoLinks.includes(g.slug)
  );

  // Fetch content overrides from admin Content Editor
  const [imgOverrides, contentOverrides] = await Promise.all([
    fetchImageOverrides(),
    getSiteContent(`space:${slug}`),
  ]);
  const c = (key: string, fallback: string) => contentOverrides[key] || fallback;

  // Override page text with admin edits (falls back to data.ts defaults)
  const pageData = {
    ...page,
    h1: c("h1", page.h1),
    tagline: c("tagline", page.tagline),
    intro: c("intro", page.intro),
    benefits: page.benefits.map((b, i) => ({
      ...b,
      title: c(`benefit_${i + 1}_title`, b.title),
      body: c(`benefit_${i + 1}_body`, b.body),
    })),
    faqs: page.faqs.map((f, i) => ({
      q: c(`faq_q${i + 1}`, f.q),
      a: c(`faq_a${i + 1}`, f.a),
    })),
  };

  const resolvedProperties = matchedProperties.map(p => ({
    ...p,
    image: resolveHeroImage(p.id, (p as any).image, imgOverrides),
  }));

  const isGold = page.accentColor === "#FACC15";
  const accent = isGold ? "#FACC15" : "#4ADE80";
  const accentClass = isGold ? "text-[#FACC15]" : "text-[#4ADE80]";
  const accentBg = isGold
    ? "bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.15)]"
    : "bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.15)]";
  const accentBorder = isGold
    ? "border-[rgba(250,204,21,0.25)]"
    : "border-[rgba(74,222,128,0.25)]";

  // ── JSON-LD ──────────────────────────────────────────────────────────────
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  const localBizSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Vision LLC",
    description: page.metaDescription,
    url: page.canonicalUrl,
    telephone: "+14235731022",
    address: {
      "@type": "PostalAddress",
      streetAddress: "100 5th St., Suite 2W",
      addressLocality: "Bristol",
      addressRegion: "TN",
      postalCode: "37620",
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: 36.5951, longitude: -82.1887 },
    areaServed: [
      { "@type": "City", name: "Bristol", containedInPlace: { "@type": "State", name: "Tennessee" } },
      { "@type": "City", name: "Bristol", containedInPlace: { "@type": "State", name: "Virginia" } },
      { "@type": "City", name: "Kingsport", containedInPlace: { "@type": "State", name: "Tennessee" } },
      { "@type": "City", name: "Johnson City", containedInPlace: { "@type": "State", name: "Tennessee" } },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.teamvisionllc.com" },
      { "@type": "ListItem", position: 2, name: "Properties", item: "https://www.teamvisionllc.com/commercial-real-estate" },
      { "@type": "ListItem", position: 3, name: page.h1, item: page.canonicalUrl },
    ],
  };

  // Choose contextual hero image per space type
  const heroImage: Record<string, string> = {
    "office-space-tri-cities-tn": "/property-images/commercial-city-centre-exterior.jpg",
    "coworking-space-bristol-tn": "/property-images/cowork-shared-office.jpg",
    "retail-space-bristol-tn": "/property-images/commercial-centerpoint-mall.jpg",
    "industrial-space-tri-cities-tn": "/property-images/commercial-vision-office.jpg",
  };
  const bgImage = heroImage[slug] ?? "/property-images/commercial-city-centre-exterior.jpg";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBizSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Navigation />

      <main>
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Ghosted property image */}
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src={bgImage}
              alt=""
              fill
              className="object-cover object-center"
              style={{ opacity: 0.07 }}
              priority
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117] via-[#0D1117]/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-transparent to-[#0D1117]/50" />
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 20% 30%, ${accent}12 0%, transparent 70%)`,
            }}
          />
          <div className="max-w-7xl mx-auto relative">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-gray-600 mb-8">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <Link href="/commercial-real-estate" className="hover:text-white transition-colors">Properties</Link>
              <span>/</span>
              <span className={accentClass}>{page.badge}</span>
            </nav>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                {/* Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider mb-6 ${accentBg} ${accentBorder}`}>
                  <div className="w-1.5 h-1.5 rounded-full pulse-green" style={{ backgroundColor: accent }} />
                  <span style={{ color: accent }}>{page.badge} Space Available</span>
                </div>

                {/* H1 */}
                <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
                  {pageData.h1}
                </h1>
                <p className={`text-lg font-semibold mb-4 ${accentClass}`}>{pageData.tagline}</p>
                <p className="text-gray-400 leading-relaxed mb-8 text-base max-w-lg">
                  {pageData.intro}
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-3">
                  <a href={COMPANY.phoneHref} id={`space-type-phone-${slug}`} className="btn-primary">
                    <Phone size={16} /> {COMPANY.phone}
                  </a>
                  <Link href="/contact" id={`space-type-contact-${slug}`} className="btn-secondary">
                    Schedule a Tour <ArrowRight size={16} />
                  </Link>
                </div>

                {/* Ask VISION nudge */}
                <div className="mt-4">
                  <LeaseBotTrigger propertyName={`${page.badge} space in the Tri-Cities`} />
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-4">
                {pageData.benefits.map((b, i) => (
                  <div
                    key={i}
                    className={`glass rounded-2xl p-5 border ${accentBorder} flex flex-col gap-3`}
                  >
                    <span className="text-3xl">{b.icon}</span>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">{b.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{b.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Matching Properties ─────────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[rgba(255,255,255,0.05)]">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
                Available Now
              </span>
              <h2 className="text-3xl font-black text-white mt-2">
                {page.badge} Properties in the Tri-Cities
              </h2>
              <p className="text-gray-500 mt-2 text-sm">
                {matchedProperties.length} propert{matchedProperties.length === 1 ? "y" : "ies"} matching your search
              </p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {resolvedProperties.map((property) => (
                <article
                  key={property.id}
                  className={`group glass rounded-2xl overflow-hidden border ${accentBorder} flex flex-col property-card`}
                >
                  {/* Image */}
                  <div className="relative h-52 bg-gradient-to-br from-[#111827] to-[#0D1117] overflow-hidden flex-shrink-0">
                    {(property as any).image ? (
                      <Image
                        src={(property as any).image}
                        alt={property.imageAlt || property.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-5xl text-gray-800">
                        🏢
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/70 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[11px] font-semibold text-white"
                      >
                        <div className="w-1.5 h-1.5 rounded-full pulse-green" style={{ backgroundColor: accent }} />
                        {property.status}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                      <MapPin size={10} style={{ color: accent }} />
                      {property.city} · {property.sqft} sqft
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:transition-colors" style={{ transition: "color 0.2s" }}>
                      {property.name}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-4 flex-1 line-clamp-3">
                      {property.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {property.features.slice(0, 3).map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border"
                          style={{
                            backgroundColor: `${accent}08`,
                            borderColor: `${accent}18`,
                            color: "#9CA3AF",
                          }}
                        >
                          <Check size={9} style={{ color: accent }} /> {f}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/properties/${property.id}`}
                      id={`space-card-${property.id}-${slug}`}
                      className="btn-primary w-full justify-center text-sm py-2.5 mb-2"
                    >
                      View Details <ArrowRight size={14} />
                    </Link>
                    <LeaseBotTrigger propertyName={property.name} />
                  </div>
                </article>
              ))}
            </div>

            {/* CTA to full listings */}
            <div className="mt-10 text-center">
              <Link
                href="/commercial-real-estate"
                id={`space-type-all-${slug}`}
                className="btn-secondary"
              >
                View All Commercial Properties <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[rgba(255,255,255,0.05)]">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
              Common Questions
            </span>
            <h2 className="text-3xl font-black text-white mt-2 mb-10">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {pageData.faqs.map((faq, i) => (
                <details
                  key={i}
                  className={`group glass rounded-2xl border ${accentBorder} overflow-hidden`}
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none">
                    <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className="text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0"
                    />
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── GEO Market Links ────────────────────────────────────────────── */}
        {linkedGeoPages.length > 0 && (
          <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[rgba(255,255,255,0.05)]">
            <div className="max-w-7xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
                Markets We Serve
              </span>
              <h2 className="text-2xl font-black text-white mt-2 mb-8">
                {page.badge} Space Across the Tri-Cities Region
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {linkedGeoPages.map((geo) => (
                  <Link
                    key={geo.slug}
                    href={`/markets/${geo.slug}`}
                    id={`space-geo-link-${geo.slug}-${slug}`}
                    className={`group glass rounded-xl border ${accentBorder} p-5 flex items-center justify-between hover:border-opacity-60 transition-all property-card`}
                  >
                    <div>
                      <p className="text-sm font-bold text-white group-hover:transition-colors">
                        {page.badge} Space in {geo.city}, {geo.state}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{geo.countyName} · Vision LLC</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-600 group-hover:translate-x-1 transition-transform" style={{ color: accent }} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
        <section
          className="py-20 px-4 sm:px-6 lg:px-8"
          style={{ background: `linear-gradient(135deg, ${accent}06 0%, transparent 60%)` }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-black text-white mb-4">
              Ready to Find Your Space?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Vision LLC has been the Tri-Cities&#39; most trusted commercial real estate partner for over 20 years.
              Let our team match you with the perfect{" "}
              <span style={{ color: accent }} className="font-semibold">{page.badge.toLowerCase()} space</span> — fast.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <a href={COMPANY.phoneHref} id={`space-cta-phone-${slug}`} className="btn-primary">
                <Phone size={16} /> Call {COMPANY.phone}
              </a>
              <Link href="/contact" id={`space-cta-contact-${slug}`} className="btn-secondary">
                Send an Inquiry <ArrowRight size={16} />
              </Link>
            </div>
            <LeaseBotTrigger propertyName={`${page.badge} space in the Tri-Cities`} variant="detail" />
          </div>
        </section>
      </main>

    </>
  );
}
