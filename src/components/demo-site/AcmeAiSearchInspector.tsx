"use client";

import React, { useState } from "react";
import {
  Sparkles, X, Bot, Search, ExternalLink, ShieldCheck,
  CheckCircle2, Terminal, Zap, ArrowRight, Database, Globe
} from "lucide-react";

interface AcmeAiSearchInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_QUERIES = [
  {
    id: "medical",
    label: "Medical & Dental Suite Query",
    prompt: "Find a 2,400 sq ft turn-key clinical or dental suite in Oakridge Valley with dedicated patient drop-off and ground-level parking.",
    llmName: "Perplexity Pro & ChatGPT Search",
    citedBuilding: "Oakridge Professional & Medical Plaza",
    answer:
      "Based on verified real-time listing schema from **ACME Regional Property Partners**, **Oakridge Professional & Medical Plaza** at 450 Valley View Pkwy matches your criteria:\n\n• **Available Unit:** Suite 210 (2,400 RSF medical/dental suite)\n• **Base Rate:** $22 / SF Full Service\n• **Clinical Specs:** 5 exam rooms with plumbing chases, patient reception lobby, sound-insulated consultation rooms, and private lab.\n• **Accessibility:** Covered patient porte-cochere drop-off canopy, 120 ADA surface parking stalls, and lighted pylon monument signage.\n\nDirect leasing tours can be scheduled via ACME Regional's leasing portal.",
    citations: ["acmeregional.demo/properties/oakridge-plaza", "Schema: MedicalBusiness #oakridge-210"],
  },
  {
    id: "mixed-use",
    label: "Downtown Main St Retail & Lofts",
    prompt: "Historic Main Street retail storefront with upstairs residential loft living in Oakridge.",
    llmName: "ChatGPT Search (GPT-4o)",
    citedBuilding: "Heritage Square Mixed-Use",
    answer:
      "**Heritage Square Mixed-Use** (managed by **ACME Regional Property Partners**) at 100 Main Street features an immediate downtown live-work opportunity:\n\n• **Featured Spaces:** Suite 101 Cafe (1,850 RSF streetfront) + Loft 2B (1,150 RSF 2-bed upper residence)\n• **Architecture:** Historic 3-story brick landmark with exposed brickwork, restored timber, and sidewalk patio permits\n• **Parking & Connectivity:** Dedicated rear tenant parking plus ample street stalls, high-speed fiber, and individual climate controls.",
    citations: ["acmeregional.demo/properties/heritage-square", "Schema: RealEstateListing #heritage-101"],
  },
  {
    id: "contractor",
    label: "Contractor Trade Flex Bay",
    prompt: "Trade contractor flex bay with 12ft drive-in roll-up door, conditioned front office, and 3-phase power for HVAC or plumbing.",
    llmName: "Google AI Overviews",
    citedBuilding: "Cedar Creek Trade & Contractor Center",
    answer:
      "According to real-time property inventory from **ACME Regional Property Partners**, **Cedar Creek Trade & Contractor Center** at 1200 Industrial Way provides specialized contractor facilities:\n\n• **Available Bay:** Bay 6 (3,200 RSF flex unit)\n• **Access & Loading:** 12-foot insulated drive-in overhead roll-up door\n• **Office & Specs:** Conditioned front showroom/reception office, 20-ft clear interior height, and heavy 3-phase 200A power\n• **Storage:** Optional fenced rear staging yard for service trucks and equipment.",
    citations: ["acmeregional.demo/properties/cedar-creek-trade", "Schema: WarehouseListing #cedar-bay6"],
  },
];

const JSON_LD_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      "@id": "https://acmeregional.demo/#organization",
      "name": "ACME Regional Property Partners",
      "url": "https://acmeregional.demo",
      "telephone": "(800) 555-0199",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "120 Heritage Way, Suite 200",
        "addressLocality": "Oakridge Valley",
        "postalCode": "37620",
        "addressCountry": "US"
      }
    },
    {
      "@type": "RealEstateListing",
      "@id": "https://acmeregional.demo/properties/oakridge-plaza#listing",
      "name": "Oakridge Professional & Medical Plaza — Suite 210",
      "description": "Turn-key clinical and dental suite with 5 exam rooms, patient porte-cochere drop-off, and ADA surface parking.",
      "category": "Medical & Office",
      "floorSize": {
        "@type": "QuantitativeValue",
        "value": 2400,
        "unitCode": "FTK"
      },
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": 22.00,
        "priceCurrency": "USD",
        "unitText": "SF/year"
      },
      "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": "Patient Porte-Cochere Drop-Off", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "120 Surface Parking Stalls", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Clinical Plumbing & Exam Rooms", "value": true }
      ]
    }
  ]
};

export default function AcmeAiSearchInspector({
  isOpen,
  onClose,
}: AcmeAiSearchInspectorProps) {
  const [activeQueryId, setActiveQueryId] = useState("medical");
  const [activeTab, setActiveTab] = useState<"llm" | "schema" | "scorecard">("llm");

  if (!isOpen) return null;

  const currentQuery = SAMPLE_QUERIES.find((q) => q.id === activeQueryId) || SAMPLE_QUERIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#080C14] border border-white/20 shadow-[0_0_50px_rgba(56,189,248,0.2)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0A1020]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-purple-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  OperateIQ Ultra SEO & Generative AI Search (GEO) Engine
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400">
                  Perplexity & ChatGPT Ready
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                How corporate tenants find your buildings when searching through AI assistants instead of obsolete listing portals.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-white/10 bg-[#060911]">
          <button
            onClick={() => setActiveTab("llm")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "llm"
                ? "bg-sky-500/20 border border-sky-400/40 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Bot size={13} />
            <span>Simulated AI Conversational Search</span>
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "schema"
                ? "bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Terminal size={13} />
            <span>Live JSON-LD Schema Graph</span>
          </button>
          <button
            onClick={() => setActiveTab("scorecard")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "scorecard"
                ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <ShieldCheck size={13} />
            <span>Core Web Vitals & SEO Scorecard</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: Simulated LLM Search */}
          {activeTab === "llm" && (
            <div className="space-y-6">
              {/* Query Pill Selector */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Select a Corporate Tenant Search Query:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_QUERIES.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setActiveQueryId(q.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                        q.id === activeQueryId
                          ? "bg-white/[0.08] border-sky-400/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                          : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Search size={12} className="text-sky-400" />
                      <span>{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulated AI Search UI Window */}
              <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden shadow-2xl">
                {/* Search Bar Prompt */}
                <div className="px-5 py-4 border-b border-white/10 bg-[#0B1020] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                    <Search size={15} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-500 font-mono block">USER QUERY PROMPT</span>
                    <p className="text-xs sm:text-sm font-semibold text-white">
                      "{currentQuery.prompt}"
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-purple-500/10 border border-purple-400/30 text-purple-300">
                    {currentQuery.llmName}
                  </span>
                </div>

                {/* AI Generated Answer */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <Bot size={15} />
                    <span>AI Synthesis & Direct Source Attribution:</span>
                  </div>

                  <div className="text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-line bg-white/[0.02] p-4 rounded-xl border border-white/10">
                    {currentQuery.answer}
                  </div>

                  {/* Citation Pills */}
                  <div className="pt-2">
                    <p className="text-[10px] font-mono uppercase text-gray-500 mb-1.5">
                      Grounding Citations / LLM Sources:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {currentQuery.citations.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-400/30 text-[11px] font-mono text-sky-300"
                        >
                          <CheckCircle2 size={11} className="text-emerald-400" />
                          <span>[{i + 1}] {c}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* The Business Value Proposition to Owners */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/20 via-indigo-950/20 to-purple-950/20 border border-sky-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Why Landlords Switch to OperateIQ Site Engine
                  </h4>
                  <p className="text-[11px] text-gray-400 max-w-xl">
                    Traditional commercial sites rely on PDFs and obsolete 2015 meta tags. OperateIQ generates structured knowledge graphs so that conversational AI assistants recommend your properties directly to corporate tenants without paying CoStar or LoopNet listing fees.
                  </p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/20 text-white font-bold text-xs whitespace-nowrap">
                  100% Organic Direct Inquiries
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Schema.org Graph */}
          {activeTab === "schema" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Machine-Readable Schema.org Graph</h4>
                  <p className="text-[11px] text-gray-400">
                    Injected on every ACME property page. Read natively by Google, OpenAI bot, Perplexity, and Apple Intelligence.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Valid Schema.org syntax
                </span>
              </div>

              <pre className="p-4 rounded-xl bg-black/70 border border-white/10 text-[11px] font-mono text-sky-300 overflow-x-auto max-h-96 whitespace-pre">
                {JSON.stringify(JSON_LD_SCHEMA, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB 3: Scorecard */}
          {activeTab === "scorecard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2">
                  <div className="text-3xl font-black text-emerald-400">100 / 100</div>
                  <div className="text-xs font-bold text-white">Google Core Web Vitals</div>
                  <p className="text-[11px] text-gray-400">
                    Sub-300ms First Contentful Paint. Zero layout shift.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2">
                  <div className="text-3xl font-black text-sky-400">Tier 1</div>
                  <div className="text-xs font-bold text-white">LLM Retrieval Indexing</div>
                  <p className="text-[11px] text-gray-400">
                    Semantic headers, clean markdown, and OpenGraph metadata.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2">
                  <div className="text-3xl font-black text-purple-400">100%</div>
                  <div className="text-xs font-bold text-white">Direct Lead Capture</div>
                  <p className="text-[11px] text-gray-400">
                    Tour requests pipe directly to your OperateIQ CRM board.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0B1020]/95">
          <span className="text-xs text-gray-400">
            Powered by OperateIQ Ultra SEO & GEO Platform
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
