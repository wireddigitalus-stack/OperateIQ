"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import AcmeNavbar from "@/components/demo-site/AcmeNavbar";
import AcmeHeroBanner from "@/components/demo-site/AcmeHeroBanner";
import AcmePropertyGrid from "@/components/demo-site/AcmePropertyGrid";
import AcmeAiSearchInspector from "@/components/demo-site/AcmeAiSearchInspector";
import AcmeTourModal from "@/components/demo-site/AcmeTourModal";
import AcmeBuildingSpecsModal from "@/components/demo-site/AcmeBuildingSpecsModal";
import AcmeFooter from "@/components/demo-site/AcmeFooter";
import { PROPERTIES } from "@/lib/data";
import {
  WIRED_DIGITAL_PROPERTIES,
  WIRED_DIGITAL_HERO_SLIDES,
} from "@/lib/seeded-tenant-data";

export default function DemoPropertySitePage() {
  const [activeOrg, setActiveOrg] = useState<{ id: string; name: string; slug: string; tier: string } | null>(null);
  const [isAiInspectorOpen, setIsAiInspectorOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [specsPropertyId, setSpecsPropertyId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [minSqft, setMinSqft] = useState(0);

  const isWired =
    activeOrg?.slug?.toLowerCase() === "wired-digital" ||
    activeOrg?.name?.toLowerCase().includes("wired digital");

  const currentProperties = isWired ? WIRED_DIGITAL_PROPERTIES : PROPERTIES;
  const currentHeroSlides = isWired ? WIRED_DIGITAL_HERO_SLIDES : undefined;

  const [tourPropertyId, setTourPropertyId] = useState<string | undefined>(
    isWired ? "wired-tech-hub" : "heritage-square"
  );

  useEffect(() => {
    fetch("/api/platform/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.activeOrg) {
          setActiveOrg(data.activeOrg);
          if (
            data.activeOrg.slug?.toLowerCase() === "wired-digital" ||
            data.activeOrg.name?.toLowerCase().includes("wired digital")
          ) {
            setTourPropertyId("wired-tech-hub");
          }
        } else if (data.impersonatingOrg) {
          setActiveOrg(data.impersonatingOrg);
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenTour = (propId?: string) => {
    if (propId) setTourPropertyId(propId);
    setIsTourModalOpen(true);
  };

  const handleFilterChange = (type: string, sqft: number) => {
    setFilterType(type);
    setMinSqft(sqft);
  };

  // Structured Schema.org JSON-LD graph for true Generative AI Search (GEO) & SEO
  const jsonLdData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateAgent",
        "@id": "https://acmeregional.demo/#organization",
        "name": "ACME Regional Property Partners",
        "url": "https://acmeregional.demo",
        "description": "Diversified regional portfolio spanning downtown mixed-use lofts, healthcare & professional plazas, garden-style multi-family residences, and contractor flex trade centers.",
        "telephone": "(800) 555-0199",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "120 Heritage Way, Suite 200",
          "addressLocality": "Oakridge Valley",
          "postalCode": "37620",
          "addressCountry": "US",
        },
      },
      ...PROPERTIES.map((prop) => ({
        "@type": "RealEstateListing",
        "@id": `https://acmeregional.demo/properties/${prop.id}#listing`,
        "name": prop.name,
        "description": prop.description,
        "image": prop.image,
        "category": prop.type,
        "availableAtOrFrom": {
          "@type": "Place",
          "name": prop.name,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": prop.address,
            "addressLocality": prop.city,
            "addressCountry": "US",
          },
        },
      })),
    ],
  };

  return (
    <div className="min-h-screen bg-[#060911] text-white selection:bg-sky-500 selection:text-white pt-10">
      {/* ── Ultra SEO & Generative Engine Optimization (GEO) Structured Data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* ── Top Workspace Bar: Return to Dashboard & Site Builder ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-10 bg-gradient-to-r from-sky-950/95 via-[#08101E]/95 to-sky-950/95 border-b border-sky-400/30 px-4 sm:px-6 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-gray-400 hidden sm:inline">Live Public Website:</span>
          <span className="text-sky-300 font-bold truncate">{activeOrg ? activeOrg.name : "OperateIQ Showcase Portfolio"}</span>
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

      {/* Navigation */}
      <AcmeNavbar
        onOpenAiInspector={() => setIsAiInspectorOpen(true)}
        onOpenTourModal={handleOpenTour}
        orgName={activeOrg?.name}
        hasTopBar={true}
      />

      {/* Killer Animated Image Hero Banner */}
      <AcmeHeroBanner
        onSelectProperty={(id) => setSpecsPropertyId(id)}
        onOpenTourModal={handleOpenTour}
        onFilterChange={handleFilterChange}
        slides={currentHeroSlides}
        orgName={activeOrg?.name}
      />

      {/* Featured Properties Grid & Space Catalog */}
      <AcmePropertyGrid
        filterType={filterType}
        minSqft={minSqft}
        onSelectProperty={(id) => setSpecsPropertyId(id)}
        onOpenTourModal={handleOpenTour}
        properties={currentProperties}
        orgName={activeOrg?.name}
      />

      {/* AI Search & Generative Engine Optimization (GEO) Drawer Modal */}
      <AcmeAiSearchInspector
        isOpen={isAiInspectorOpen}
        onClose={() => setIsAiInspectorOpen(false)}
      />

      {/* Schedule Private Tour Modal */}
      <AcmeTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        selectedPropertyId={tourPropertyId}
        properties={currentProperties}
        orgName={activeOrg?.name}
        orgId={activeOrg?.id}
      />

      {/* Building Specifications Modal */}
      <AcmeBuildingSpecsModal
        propertyId={specsPropertyId}
        onClose={() => setSpecsPropertyId(null)}
        onOpenTourModal={handleOpenTour}
        properties={currentProperties}
      />

      {/* Footer */}
      <AcmeFooter
        onOpenAiInspector={() => setIsAiInspectorOpen(true)}
        orgName={activeOrg?.name}
      />
    </div>
  );
}
