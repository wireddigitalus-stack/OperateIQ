"use client";

import React, { useState } from "react";
import AcmeNavbar from "@/components/demo-site/AcmeNavbar";
import AcmeHeroBanner from "@/components/demo-site/AcmeHeroBanner";
import AcmePropertyGrid from "@/components/demo-site/AcmePropertyGrid";
import AcmeAiSearchInspector from "@/components/demo-site/AcmeAiSearchInspector";
import AcmeTourModal from "@/components/demo-site/AcmeTourModal";
import AcmeBuildingSpecsModal from "@/components/demo-site/AcmeBuildingSpecsModal";
import AcmeFooter from "@/components/demo-site/AcmeFooter";
import { PROPERTIES } from "@/lib/data";

export default function DemoPropertySitePage() {
  const [isAiInspectorOpen, setIsAiInspectorOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [tourPropertyId, setTourPropertyId] = useState<string | undefined>("heritage-square");
  const [specsPropertyId, setSpecsPropertyId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [minSqft, setMinSqft] = useState(0);

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
    <div className="min-h-screen bg-[#060911] text-white selection:bg-sky-500 selection:text-white">
      {/* ── Ultra SEO & Generative Engine Optimization (GEO) Structured Data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* Navigation */}
      <AcmeNavbar
        onOpenAiInspector={() => setIsAiInspectorOpen(true)}
        onOpenTourModal={handleOpenTour}
      />

      {/* Killer Animated Image Hero Banner */}
      <AcmeHeroBanner
        onSelectProperty={(id) => setSpecsPropertyId(id)}
        onOpenTourModal={handleOpenTour}
        onFilterChange={handleFilterChange}
      />

      {/* Featured Properties Grid & Space Catalog */}
      <AcmePropertyGrid
        filterType={filterType}
        minSqft={minSqft}
        onSelectProperty={(id) => setSpecsPropertyId(id)}
        onOpenTourModal={handleOpenTour}
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
      />

      {/* Building Specifications Modal */}
      <AcmeBuildingSpecsModal
        propertyId={specsPropertyId}
        onClose={() => setSpecsPropertyId(null)}
        onOpenTourModal={handleOpenTour}
      />

      {/* ACME Footer */}
      <AcmeFooter onOpenAiInspector={() => setIsAiInspectorOpen(true)} />
    </div>
  );
}
