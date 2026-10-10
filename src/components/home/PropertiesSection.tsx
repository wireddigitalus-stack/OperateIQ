import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, Users, Warehouse, Briefcase, ArrowRight, MapPin } from "lucide-react";
import { PROPERTIES } from "@/lib/data";
import LeaseBotTrigger from "@/components/LeaseBotTrigger";
import { fetchImageOverrides, resolveHeroImage } from "@/lib/property-image-overrides";
import { getPropertyOverrides } from "@/lib/site-content";
import { TrackedPropertyLink } from "@/components/TrackedPropertyLink";


const typeIcons: Record<string, React.ReactNode> = {
  "Mixed-Use": <Building2 size={14} />,
  "Retail / Office": <Building2 size={14} />,
  "Event Space / Commercial": <Building2 size={14} />,
  CoWorking: <Users size={14} />,
  Office: <Briefcase size={14} />,
  Retail: <Building2 size={14} />,
  Industrial: <Warehouse size={14} />,
};

const badgeColors: Record<string, string> = {
  green: "bg-[rgba(74,222,128,0.12)] text-[#4ADE80] border-[rgba(74,222,128,0.3)]",
  gold: "bg-[rgba(250,204,21,0.12)] text-[#FACC15] border-[rgba(250,204,21,0.3)]",
  blue: "bg-[rgba(96,165,250,0.12)] text-[#60A5FA] border-[rgba(96,165,250,0.3)]",
  gray: "bg-[rgba(156,163,175,0.12)] text-[#9CA3AF] border-[rgba(156,163,175,0.3)]",
};

export default async function PropertiesSection() {
  const overrides = await fetchImageOverrides();
  const propOverrides = await getPropertyOverrides();

  // Apply CMS text overrides to each property
  const properties = PROPERTIES.map((p) => {
    const po = propOverrides[p.id];
    if (!po) return p;
    return {
      ...p,
      name: po.name || p.name,
      type: po.type || p.type,
      city: po.city || p.city,
      sqft: po.sqft || p.sqft,
      status: po.status || p.status,
      badge: po.badge ?? p.badge,
      description: po.description || p.description,
      features: po.features ? po.features.split("\n").filter(Boolean) : p.features,
      imageAlt: po.imageAlt || p.imageAlt,
    };
  });

  return (
    <section id="properties" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 bg-[#0D1117]/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="section-line mb-4" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
              Available{" "}
              <span className="gradient-text-green">Properties</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-xl">
              From downtown office suites to large-format industrial space — the most diverse
              commercial portfolio in Downtown Bristol.
            </p>
          </div>
          <Link
            href="/commercial-real-estate"
            id="view-all-properties"
            className="btn-secondary flex-shrink-0 self-start md:self-auto"
          >
            View All Properties <ArrowRight size={16} />
          </Link>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map((property) => (
            <article
              key={property.id}
              className="group glass rounded-2xl overflow-hidden property-card border border-[rgba(74,222,128,0.1)]"
              aria-label={property.name}
            >
              {/* Property Image */}
              <div className="relative h-56 bg-gradient-to-br from-[#111827] to-[#0D1117] overflow-hidden">
                {(() => {
                  const displayImage = resolveHeroImage(property.id, (property as any).image, overrides);
                  return displayImage ? (
                    <Image
                      src={displayImage}
                      alt={property.imageAlt || property.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Building2 size={48} className="text-[rgba(74,222,128,0.1)]" />
                    </div>
                  );
                })()}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/80 via-transparent to-transparent" />

                {/* Badge */}
                <div className="absolute top-3 left-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      badgeColors[property.badgeColor]
                    }`}
                  >
                    {property.badge}
                  </span>
                </div>

                {/* Status */}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[11px] font-semibold text-white">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] pulse-green" />
                    {property.status}
                  </span>
                </div>

                {/* Type chip at bottom */}
                <div className="absolute bottom-3 left-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-[11px] text-gray-300">
                    {typeIcons[property.type]}
                    {property.type}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#4ADE80] transition-colors">
                  {property.name}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                  <MapPin size={11} className="text-[#4ADE80]" />
                  {property.city}
                  <span className="mx-1">·</span>
                  {property.sqft} sqft
                </div>

                <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">
                  {property.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {property.features.slice(0, 3).map((f) => (
                    <span
                      key={f}
                      className="text-[11px] px-2 py-1 rounded-md bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.12)] text-gray-400"
                    >
                      {f}
                    </span>
                  ))}
                </div>

                <TrackedPropertyLink
                  href={`/properties/${property.id}`}
                  propertyId={property.id}
                  propertyName={property.name}
                  id={`property-cta-${property.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-[#4ADE80] hover:text-white transition-colors group-hover:gap-3 mb-3"
                >
                  Inquire About This Space <ArrowRight size={14} />
                </TrackedPropertyLink>
                <LeaseBotTrigger propertyName={property.name} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
