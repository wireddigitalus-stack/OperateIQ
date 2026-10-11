"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Sparkles, Building2, Globe } from "lucide-react";
import AcmeNavbar from "@/components/demo-site/AcmeNavbar";
import AcmeHeroBanner, { HeroSlideItem } from "@/components/demo-site/AcmeHeroBanner";
import AcmePropertyGrid from "@/components/demo-site/AcmePropertyGrid";
import AcmeAiSearchInspector from "@/components/demo-site/AcmeAiSearchInspector";
import AcmeTourModal from "@/components/demo-site/AcmeTourModal";
import AcmeBuildingSpecsModal from "@/components/demo-site/AcmeBuildingSpecsModal";
import AcmeFooter from "@/components/demo-site/AcmeFooter";
import { PROPERTIES } from "@/lib/data";
import {
  WIRED_DIGITAL_PROPERTIES,
  WIRED_DIGITAL_HERO_SLIDES,
  SeedProperty,
} from "@/lib/seeded-tenant-data";

export default function TenantPublicSitePage() {
  const params = useParams();
  const slugParam = typeof params?.slug === "string" ? params.slug : "wired-digital";

  const isWiredDigital =
    slugParam.toLowerCase() === "wired-digital" ||
    slugParam.toLowerCase() === "wireddigitalllc" ||
    slugParam.toLowerCase() === "wired";

  const [org, setOrg] = useState<{
    id: string;
    name: string;
    slug: string;
    tier: string;
    contact_email?: string;
    contact_phone?: string;
    custom_domain?: string | null;
  }>({
    id: isWiredDigital ? "11111111-2222-3333-4444-555555555555" : "00000000-0000-0000-0000-000000000001",
    name: isWiredDigital ? "WIRED DIGITAL LLC" : "ACME Regional Property Partners",
    slug: slugParam,
    tier: "pro",
    contact_email: isWiredDigital ? "wireddigitalus@gmail.com" : "leasing@acmeregional.demo",
    contact_phone: "(800) 555-0199",
  });

  const [properties, setProperties] = useState<any[]>(
    isWiredDigital ? WIRED_DIGITAL_PROPERTIES : PROPERTIES
  );
  const [heroSlides, setHeroSlides] = useState<HeroSlideItem[]>(
    isWiredDigital ? WIRED_DIGITAL_HERO_SLIDES : []
  );

  const [isAiInspectorOpen, setIsAiInspectorOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [tourPropertyId, setTourPropertyId] = useState<string | undefined>(
    isWiredDigital ? "wired-tech-hub" : "heritage-square"
  );
  const [specsPropertyId, setSpecsPropertyId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [minSqft, setMinSqft] = useState(0);

  // 1. Fetch organization details & live properties from DB
  useEffect(() => {
    async function loadOrgAndProperties() {
      try {
        const orgRes = await fetch(`/api/platform/organizations?slug=${encodeURIComponent(slugParam)}`);
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          if (orgData.organization) {
            setOrg(orgData.organization);

            // Fetch real properties for this organization if any exist
            const propsRes = await fetch(`/api/properties?org_id=${encodeURIComponent(orgData.organization.id)}`);
            if (propsRes.ok) {
              const propsData = await propsRes.json();
              if (Array.isArray(propsData.properties) && propsData.properties.length > 0) {
                // Map database properties into the UI format
                const formatted = propsData.properties.map((p: any) => ({
                  id: p.id || p.slug || `prop-${Math.random().toString(36).slice(2, 6)}`,
                  name: p.name || "Commercial Asset",
                  type: p.type || "Commercial Office",
                  city: p.city || "Commercial District",
                  address: p.address || `${p.name}, Suite 100`,
                  sqft: p.total_sqft ? `${Number(p.total_sqft).toLocaleString()} RSF` : "1,200 – 5,000",
                  status: p.status || "Available",
                  badge: p.type || "Featured Asset",
                  badgeColor: "blue",
                  image: p.featured_image || p.image || "/demo-properties/oakridge-professional-plaza.jpg",
                  specs: {
                    yearBuilt: p.year_built || "2022",
                    floors: p.floors || 2,
                    parking: p.parking || "On-site dedicated parking",
                    zoning: p.zoning || "Commercial",
                    hvac: "Central Climate Controlled",
                    fiber: "Dedicated High-Speed Fiber",
                    power: "Commercial Standard",
                    ceilingHeight: "12 ft",
                  },
                  description: p.description || `${p.name} managed by ${orgData.organization.name}.`,
                  highlights: [
                    "High-speed fiber connectivity",
                    "Dedicated parking & tenant access control",
                    "Turnkey condition ready for immediate occupancy",
                  ],
                }));

                setProperties(formatted);

                // Build hero slides from real properties
                const slides: HeroSlideItem[] = formatted.slice(0, 4).map((p: any) => ({
                  propertyId: p.id,
                  name: p.name,
                  tagline: p.description?.slice(0, 80) || "Premier Commercial Space",
                  submarket: `${p.city} · Commercial Corridor`,
                  image: p.image,
                  type: p.type,
                  featuredSuite: "Suite 100 · Prime Location",
                  suiteSpecs: p.sqft,
                  rate: "Competitive Market Rate",
                  badge: p.badge,
                }));
                setHeroSlides(slides);
              }
            }
          }
        }
      } catch (err) {
        console.warn("[TenantPublicSite] Falling back to seeded tenant assets:", err);
      }
    }

    loadOrgAndProperties();
  }, [slugParam, isWiredDigital]);

  const handleOpenTour = (propId?: string) => {
    if (propId) setTourPropertyId(propId);
    else if (properties[0]?.id) setTourPropertyId(properties[0].id);
    setIsTourModalOpen(true);
  };

  const handleFilterChange = (type: string, sqft: number) => {
    setFilterType(type);
    setMinSqft(sqft);
  };

  // Structured Schema.org JSON-LD for Generative Engine Optimization (GEO) & SEO
  const jsonLdData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateAgent",
        "@id": `https://${org.custom_domain || "operateiq-peach.vercel.app"}/site/${org.slug}#organization`,
        "name": org.name,
        "url": `https://${org.custom_domain || "operateiq-peach.vercel.app"}/site/${org.slug}`,
        "description": `Premier commercial and residential properties managed by ${org.name}.`,
        "telephone": org.contact_phone || "(800) 555-0199",
        "email": org.contact_email || "wireddigitalus@gmail.com",
      },
      ...properties.map((prop) => ({
        "@type": "RealEstateListing",
        "@id": `https://${org.custom_domain || "operateiq-peach.vercel.app"}/site/${org.slug}/properties/${prop.id}#listing`,
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
          <span className="text-sky-300 font-bold truncate">{org.name}</span>
          {org.custom_domain && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30">
              <Globe size={10} />
              {org.custom_domain}
            </span>
          )}
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
        orgName={org.name}
        hasTopBar={true}
      />

      {/* Animated Image Hero Banner */}
      <AcmeHeroBanner
        onSelectProperty={(id) => setSpecsPropertyId(id)}
        onOpenTourModal={handleOpenTour}
        onFilterChange={handleFilterChange}
        slides={heroSlides}
        orgName={org.name}
      />

      {/* Featured Properties Grid & Space Catalog */}
      <AcmePropertyGrid
        filterType={filterType}
        minSqft={minSqft}
        onSelectProperty={(id) => setSpecsPropertyId(id)}
        onOpenTourModal={handleOpenTour}
        properties={properties}
        orgName={org.name}
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
        properties={properties}
        orgName={org.name}
        orgId={org.id}
      />

      {/* Building Specifications Modal */}
      <AcmeBuildingSpecsModal
        propertyId={specsPropertyId}
        onClose={() => setSpecsPropertyId(null)}
        onOpenTourModal={handleOpenTour}
        properties={properties}
      />

      {/* Footer */}
      <AcmeFooter
        onOpenAiInspector={() => setIsAiInspectorOpen(true)}
        orgName={org.name}
        phone={org.contact_phone}
        email={org.contact_email}
      />
    </div>
  );
}
