"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Building2, MapPin, Layers, CheckCircle2, Calendar,
  ArrowRight, ShieldCheck, ChevronRight, Eye
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

interface AcmePropertyGridProps {
  filterType: string;
  minSqft: number;
  onSelectProperty: (propertyId: string) => void;
  onOpenTourModal: (propertyId?: string) => void;
  properties?: any[];
  orgName?: string;
  tagline?: string;
}

export default function AcmePropertyGrid({
  filterType,
  minSqft,
  onSelectProperty,
  onOpenTourModal,
  properties,
  orgName,
  tagline,
}: AcmePropertyGridProps) {
  const [activeTab, setActiveTab] = useState(filterType || "all");
  const propList = properties ?? PROPERTIES; // demo data only when no list is passed (/demo-site)

  const filtered = propList.filter((p) => {
    if (activeTab !== "all" && p.type !== activeTab) return false;
    return true;
  });

  return (
    <section id="portfolio" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-widest px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20">
            <Building2 size={13} />
            <span>{orgName ? `${orgName} Portfolio Showcase` : "Regional Portfolio Showcase"}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Featured {orgName ? `${orgName} Assets` : "Regional Assets"}
          </h2>
          <p className="text-sm text-gray-400 max-w-xl">
            {tagline ||
              (orgName
                ? `Explore premier commercial suites, creative studios, modern apartments, and contractor flex spaces managed by ${orgName}.`
                : "Explore downtown Main Street storefronts & lofts, medical plazas, garden-style apartments, and trade flex bays across Oakridge Valley.")}
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Properties" },
            { id: "Mixed-Use & Lofts", label: "Mixed-Use & Lofts" },
            { id: "Medical & Office", label: "Medical & Office" },
            { id: "Residential Apartments", label: "Residential Apartments" },
            { id: "Contractor Flex", label: "Contractor Flex" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-white/[0.12] border border-white/30 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                  : "bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((property) => (
          <div
            key={property.id}
            className="group relative rounded-2xl bg-[#090E1A] border border-white/15 overflow-hidden hover:border-sky-400/40 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_0_35px_rgba(56,189,248,0.18)] flex flex-col justify-between"
          >
            {/* Image Header with Badge */}
            <div className="relative h-64 sm:h-72 w-full overflow-hidden">
              <Image
                src={property.image}
                alt={property.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090E1A] via-[#090E1A]/30 to-transparent" />

              {/* Status and Category Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                  {property.type}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Available Now
                </span>
              </div>

              {/* Square Footage Tag */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 bg-sky-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-sky-400/30">
                  {property.sqft} RSF
                </span>
                <span className="text-xs text-gray-300 font-medium bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                  {property.city}
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <MapPin size={13} className="text-sky-400" />
                  <span>{property.address}</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-sky-300 transition-colors">
                  {property.name}
                </h3>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  {property.description}
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="pt-2 border-t border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-300">
                  {((property as any).features || (property as any).highlights || []).slice(0, 4).map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{String(f)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelectProperty(property.id)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Eye size={13} />
                  <span>View Floor Plans</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTourModal(property.id)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-95 shadow-[0_0_14px_rgba(59,130,246,0.35)] transition-all flex items-center gap-1.5"
                >
                  <Calendar size={13} />
                  <span>Schedule Tour</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
