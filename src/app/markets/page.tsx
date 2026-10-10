import { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { GEO_PAGES } from "@/lib/data";
import CustomSearchCTA from "@/components/CustomSearchCTA";

export const metadata: Metadata = {
  title: "Tri-Cities Commercial Real Estate | Bristol, Kingsport & Johnson City | Vision LLC",
  description:
    "Vision LLC serves commercial real estate clients across the Tri-Cities — Bristol TN/VA, Kingsport, Johnson City, Abingdon VA & more. Select your city. Call 423-573-1022.",
  alternates: {
    canonical: "https://www.teamvisionllc.com/markets",
  },
  openGraph: {
    title: "Tri-Cities CRE Markets | Bristol · Kingsport · Johnson City | Vision LLC",
    description:
      "Vision LLC is based in Downtown Bristol, TN — serving commercial real estate clients across the full Tri-Cities metro. Bristol · Kingsport · Johnson City · Abingdon & more.",
    url: "https://www.teamvisionllc.com/markets",
    images: [
      {
        url: "https://www.teamvisionllc.com/api/og?title=Markets+We+Serve&subtitle=Bristol+%C2%B7+Kingsport+%C2%B7+Johnson+City+%C2%B7+Abingdon+%E2%80%94+Vision+LLC&tag=Tri-Cities&type=default",
        width: 1200,
        height: 630,
        alt: "Vision LLC Markets — Tri-Cities Commercial Real Estate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tri-Cities CRE Markets | Bristol · Kingsport · Johnson City | Vision LLC",
    description:
      "Commercial real estate services across Bristol TN/VA, Kingsport, Johnson City, Abingdon VA & surrounding Tri-Cities cities. Vision LLC's portfolio is in Downtown Bristol, TN.",
    images: [
      "https://www.teamvisionllc.com/api/og?title=Markets+We+Serve&subtitle=Bristol+%C2%B7+Kingsport+%C2%B7+Johnson+City+%C2%B7+Abingdon+%E2%80%94+Vision+LLC&tag=Tri-Cities&type=default",
    ],
  },
};

export default function MarketsPage() {
  const marketsSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Vision LLC — Commercial Real Estate Markets Served",
    description: "Geographic market pages for Vision LLC's commercial real estate services across the Tri-Cities TN/VA region.",
    url: "https://www.teamvisionllc.com/markets",
    numberOfItems: GEO_PAGES.length,
    itemListElement: GEO_PAGES.map((geo, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Commercial Real Estate in ${geo.city}, ${geo.state}`,
      url: `https://www.teamvisionllc.com/markets/${geo.slug}`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.teamvisionllc.com" },
      { "@type": "ListItem", position: 2, name: "Markets", item: "https://www.teamvisionllc.com/markets" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(marketsSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <div className="pt-28 pb-20 min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-14">
            <div className="section-line mb-4" />
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Commercial Real Estate{" "}
              <span className="gradient-text-green">Markets</span>
              <span className="block text-2xl sm:text-3xl font-bold text-gray-400 mt-1">Bristol · Kingsport · Johnson City · Tri-Cities</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Vision LLC&apos;s commercial real estate expertise covers the full Tri-Cities
              metro and Southwest Virginia. Select your city below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GEO_PAGES.map((geo) => (
              <Link
                key={geo.slug}
                href={`/markets/${geo.slug}`}
                id={`markets-card-${geo.slug}`}
                className="group glass rounded-2xl p-7 property-card border border-[rgba(74,222,128,0.1)] hover:border-[rgba(74,222,128,0.35)] flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-[#4ADE80]">
                    <MapPin size={22} />
                  </div>
                  {geo.isPrimary && (
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#4ADE80] text-black uppercase tracking-wider">
                      Primary
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest mb-1">{geo.region}</p>
                  <h2 className="text-2xl font-black text-white mb-2 group-hover:text-[#4ADE80] transition-colors">
                    {geo.city}, {geo.state}
                  </h2>
                  <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{geo.marketBlurb}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {geo.availableTypes.map((t) => (
                    <span key={t} className="text-xs px-2 py-1 rounded bg-[rgba(255,255,255,0.04)] text-gray-500">{t}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#4ADE80] group-hover:gap-4 transition-all mt-auto">
                  Explore {geo.city} <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
        <CustomSearchCTA />
      </div>
    </>
  );
}
