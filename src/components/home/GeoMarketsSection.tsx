import Link from "next/link";
import Image from "next/image";
import { MapPin, ArrowRight, Users, Building2 } from "lucide-react";
import { GEO_PAGES } from "@/lib/data";

export default function GeoMarketsSection() {
  return (
    <section id="markets" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <div className="section-line mb-4" />
          <div className="map-badge mb-4">
            <MapPin size={12} />
            Tri-Cities Market Coverage
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            We Serve the{" "}
            <span className="gradient-text-green">Entire Region</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Vision LLC&apos;s reach extends far beyond Downtown Bristol. Explore our dedicated
            market pages for commercial real estate opportunities across the Tri-Cities and
            Southwest Virginia.
          </p>
        </div>

        {/* Primary Market — Bristol TN/VA (combined) */}
        <div className="mb-6">
        {(() => {
          const bristolTN = GEO_PAGES.find(g => g.slug === "bristol-tn");
          const bristolVA = GEO_PAGES.find(g => g.slug === "bristol-va");
          if (!bristolTN) return null;
          const combinedEmployers = [
            ...bristolTN.keyEmployers,
            ...(bristolVA ? bristolVA.keyEmployers.filter(e => !bristolTN.keyEmployers.includes(e)) : []),
          ].slice(0, 6);
          const combinedTypes = [
            ...new Set([...bristolTN.availableTypes, ...(bristolVA?.availableTypes || [])]),
          ];
          return (
            <Link
              href="/markets/bristol-tn"
              id="geo-primary-bristol"
              className="group relative glass rounded-2xl overflow-hidden property-card border border-[rgba(74,222,128,0.2)] flex flex-col lg:flex-row"
            >
              {/* Hero photo */}
              <div className="relative lg:w-2/5 h-52 lg:h-auto overflow-hidden">
                <Image
                  src="/images/Down-Town-Bristol-TN-VA.jpg"
                  alt="Downtown Bristol, TN-VA — Commercial Real Estate"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/60 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 px-3 py-1 bg-[#4ADE80] text-black text-xs font-black rounded-lg uppercase tracking-wider">
                  Primary Market
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-7 lg:p-10">
                <h3 className="text-2xl lg:text-3xl font-black text-white mb-2 group-hover:text-[#4ADE80] transition-colors">
                  Commercial Real Estate in Bristol, TN/VA
                </h3>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Bristol sits on the Tennessee-Virginia state line, offering businesses a rare dual-state advantage. Downtown Bristol is experiencing a powerful urban revival — and with the opening of Hard Rock Hotel &amp; Casino on the Virginia side, the entire corridor has become the region&apos;s fastest-growing commercial market.
                </p>

                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users size={14} className="text-[#4ADE80]" />
                    Combined Pop: 60,800+
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Building2 size={14} className="text-[#4ADE80]" />
                    {combinedTypes.join(" · ")}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {combinedEmployers.map((emp) => (
                    <span
                      key={emp}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.15)] text-gray-400"
                    >
                      {emp}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[#4ADE80] font-bold group-hover:gap-4 transition-all">
                  Explore Bristol Commercial RE <ArrowRight size={18} />
                </div>
              </div>
            </Link>
          );
        })()}
        </div>


        {/* Secondary Markets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {GEO_PAGES.filter((g) => g.slug !== "bristol-tn" && g.slug !== "bristol-va").map((geo) => (
            <Link
              key={geo.slug}
              href={`/markets/${geo.slug}`}
              id={`geo-secondary-${geo.slug}`}
              className="group glass rounded-2xl p-6 property-card border border-[rgba(74,222,128,0.08)] hover:border-[rgba(74,222,128,0.3)] flex flex-col gap-4"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.15)] flex items-center justify-center text-[#4ADE80] group-hover:bg-[rgba(74,222,128,0.15)] transition-colors">
                <MapPin size={20} />
              </div>

              <div>
                <p className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest mb-1">
                  {geo.state === "VA" ? "Southwest Virginia" : "Tri-Cities, TN"}
                </p>
                <h3 className="text-xl font-black text-white mb-2 group-hover:text-[#4ADE80] transition-colors">
                  {geo.city}, {geo.state}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {geo.marketBlurb}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-auto">
                {geo.availableTypes.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-gray-500"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#4ADE80] group-hover:gap-3 transition-all">
                View Market <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
