"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Building2, ArrowRight, Phone, Search, Users, Warehouse, Briefcase } from "lucide-react";
import { PROPERTIES, COMPANY } from "@/lib/data";
import Navigation from "@/components/Navigation";
import LeaseBotTrigger from "@/components/LeaseBotTrigger";
import PropertyCardCarousel from "@/components/PropertyCardCarousel";
import CustomSearchCTA from "@/components/CustomSearchCTA";
import { TrackedPropertyLink, TrackedCTALink } from "@/components/TrackedPropertyLink";


const ALL_TYPES = ["All", "Mixed-Use", "Office", "CoWorking", "Retail / Office", "Event Space / Commercial", "Industrial"];

const typeIcons: Record<string, React.ReactNode> = {
  "Mixed-Use": <Building2 size={16} />,
  "Retail / Office": <Building2 size={16} />,
  "Event Space / Commercial": <Building2 size={16} />,
  CoWorking: <Users size={16} />,
  Office: <Briefcase size={16} />,
  Industrial: <Warehouse size={16} />,
};

const badgeColors: Record<string, string> = {
  green: "bg-[rgba(74,222,128,0.12)] text-[#4ADE80] border-[rgba(74,222,128,0.3)]",
  gold: "bg-[rgba(250,204,21,0.12)] text-[#FACC15] border-[rgba(250,204,21,0.3)]",
  blue: "bg-[rgba(96,165,250,0.12)] text-[#60A5FA] border-[rgba(96,165,250,0.3)]",
  gray: "bg-[rgba(156,163,175,0.12)] text-[#9CA3AF] border-[rgba(156,163,175,0.3)]",
};

export default function CommercialRealEstatePage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [propOverrides, setPropOverrides] = useState<Record<string, Record<string, string>>>({});
  const [imageOverrides, setImageOverrides] = useState<Record<string, { hero_url: string | null; all_urls: string[] }>>({});

  // Fetch property text overrides on mount
  useEffect(() => {
    fetch("/api/site-content")
      .then(r => r.json())
      .then(data => {
        const items: { section: string; key: string; value: string }[] = data.items || [];
        const result: Record<string, Record<string, string>> = {};
        for (const item of items) {
          if (!item.section.startsWith("property:")) continue;
          const propId = item.section.replace("property:", "");
          if (!result[propId]) result[propId] = {};
          result[propId][item.key] = item.value;
        }
        setPropOverrides(result);
      })
      .catch(() => {});
  }, []);

  // Fetch property image overrides on mount
  useEffect(() => {
    fetch("/api/property-images")
      .then(r => r.json())
      .then(data => {
        const map: Record<string, { hero_url: string | null; all_urls: string[] }> = {};
        if (Array.isArray(data.overrides)) {
          for (const row of data.overrides) {
            if (!row.property_id) continue;
            map[row.property_id] = {
              hero_url: row.hero_url || row.image_url || null,
              all_urls: Array.isArray(row.all_urls) ? row.all_urls : (row.image_url ? [row.image_url] : []),
            };
          }
        }
        setImageOverrides(map);
      })
      .catch(() => {});
  }, []);

  // Apply CMS text + image overrides to properties
  const properties = useMemo(() => PROPERTIES.map(p => {
    const po = propOverrides[p.id];
    const io = imageOverrides[p.id];
    const base = po ? {
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
    } : p;
    // Merge image overrides — admin uploads win over static data, hero always first
    if (io?.all_urls?.length) {
      const hero = io.hero_url || io.all_urls[0];
      const orderedUrls = hero
        ? [hero, ...io.all_urls.filter((u: string) => u !== hero)]
        : io.all_urls;
      return { ...base, images: orderedUrls, image: hero };
    }
    return base;

  }), [propOverrides, imageOverrides]);

  const filtered = activeFilter === "All"
    ? properties
    : properties.filter((p) => p.type === activeFilter);

  const activeTypes = ["All", ...Array.from(new Set(properties.map((p) => p.type)))];

  return (
    <>
      <Navigation />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0D1117] relative overflow-hidden">
          {/* Ghosted property image */}
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src="/property-images/commercial-city-centre-exterior.jpg"
              alt=""
              fill
              className="object-cover object-center"
              style={{ opacity: 0.07 }}
              priority
              aria-hidden="true"
            />
            {/* Gradient overlay — keeps text readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117] via-[#0D1117]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-transparent to-[#0D1117]/40" />
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(74,222,128,0.06)_0%,transparent_60%)]" />
          <div className="max-w-7xl mx-auto relative">
            <div className="section-line mb-4" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              Commercial Real Estate<br />
              <span className="gradient-text-green">Bristol, TN/VA — Tri-Cities</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mb-8">
              Vision LLC manages the most diverse commercial portfolio in Downtown Bristol.
              Office suites, retail storefronts, coworking, industrial — all in one trusted portfolio.
            </p>
            <div className="flex flex-wrap gap-4">
              <TrackedCTALink href={COMPANY.phoneHref} label="Call CTA" context="CRE Hero" className="btn-primary">
                <Phone size={16} /> Call {COMPANY.phone}
              </TrackedCTALink>
              <TrackedCTALink href="/contact" label="Request a Tour" context="CRE Hero" className="btn-secondary">
                Request a Tour <ArrowRight size={16} />
              </TrackedCTALink>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <div className="bg-[rgba(74,222,128,0.05)] border-y border-[rgba(74,222,128,0.1)] py-5 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6 text-sm text-gray-400">
            <span><strong className="text-white text-lg">6</strong> Active Listings</span>
            <span><strong className="text-white text-lg">50+</strong> Commercial Properties Managed</span>
            <span><strong className="text-white text-lg">#1</strong> Private CRE Owner in Downtown Bristol</span>
            <span><strong className="text-white text-lg">20+</strong> Years in the Tri-Cities</span>
          </div>
        </div>

        {/* Filter + Grid */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-10">
              <Search size={16} className="text-gray-500 self-center mr-1 hidden sm:block" />
              {activeTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                    activeFilter === type
                      ? "bg-[#4ADE80] text-black border-[#4ADE80]"
                      : "border-[rgba(255,255,255,0.1)] text-gray-400 hover:border-[rgba(74,222,128,0.4)] hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
              <span className="ml-auto self-center text-sm text-gray-500">
                {filtered.length} {filtered.length === 1 ? "property" : "properties"}
              </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((property) => (
                <article
                  key={property.id}
                  className="group glass rounded-2xl overflow-hidden property-card border border-[rgba(74,222,128,0.1)] flex flex-col"
                >
                  {/* Image */}
                  {/* Image carousel */}
                  <div className="relative h-64 bg-gradient-to-br from-[#111827] to-[#0D1117] overflow-hidden flex-shrink-0">
                    {((property as any).images && (property as any).images.length > 1) ? (
                      <PropertyCardCarousel
                        images={(property as any).images}
                        alt={property.imageAlt || property.name}
                      />
                    ) : (property as any).image ? (
                      <Image
                        src={(property as any).image}
                        alt={property.imageAlt || property.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Building2 size={56} className="text-[rgba(74,222,128,0.08)]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/80 via-transparent to-transparent pointer-events-none" />
                    {/* Badges */}
                    <div className="absolute top-3 left-3 z-20 pointer-events-none">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${badgeColors[property.badgeColor]}`}>
                        {property.badge}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 z-20 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[11px] font-semibold text-white">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] pulse-green" />
                        {property.status}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-[11px] text-gray-300">
                        {typeIcons[property.type] || <Building2 size={12} />}
                        {property.type}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#4ADE80] transition-colors">
                      {property.name}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <MapPin size={11} className="text-[#4ADE80]" />
                      {property.city}
                      <span className="mx-1">·</span>
                      {property.sqft} sqft
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed mb-4 flex-1">
                      {property.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {property.features.map((f) => (
                        <span key={f} className="text-[11px] px-2 py-1 rounded-md bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.12)] text-gray-400">
                          {f}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-auto mb-0">
                      <TrackedPropertyLink
                        href={`/properties/${property.id}`}
                        propertyId={property.id}
                        propertyName={property.name}
                        className="flex-1 btn-primary text-center text-sm py-2.5 justify-center"
                      >
                        View Details
                      </TrackedPropertyLink>
                      <TrackedCTALink
                        href="/contact"
                        label="Inquire"
                        context={property.name}
                        className="flex-1 btn-secondary text-center text-sm py-2.5 justify-center"
                      >
                        Inquire
                      </TrackedCTALink>
                    </div>
                    <LeaseBotTrigger propertyName={property.name} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <CustomSearchCTA />
      </main>
    </>
  );
}
