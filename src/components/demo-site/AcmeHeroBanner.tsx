"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Building2, MapPin, Sparkles, ChevronRight, Calendar,
  ShieldCheck, Wifi, ArrowUpRight, CheckCircle2, Layers,
  Search, SlidersHorizontal
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

interface AcmeHeroBannerProps {
  onSelectProperty: (propertyId: string) => void;
  onOpenTourModal: (propertyId?: string) => void;
  onFilterChange: (type: string, minSqft: number) => void;
}

const HERO_SLIDES = [
  {
    propertyId: "heritage-square",
    name: "Heritage Square Mixed-Use",
    tagline: "Historic Main Street Retail & Residential Lofts",
    submarket: "Historic Downtown Main St · Oakridge",
    image: "/demo-properties/heritage-square-mixed-use.jpg",
    type: "Mixed-Use & Lofts",
    featuredSuite: "Suite 101 Cafe & Loft 2B",
    suiteSpecs: "1,850 RSF Streetfront Retail + 1,150 RSF 2-Bed Loft",
    rate: "$24 / SF Retail · $1,650/mo Loft",
    badge: "Main St Mixed-Use",
  },
  {
    propertyId: "oakridge-plaza",
    name: "Oakridge Professional & Medical Plaza",
    tagline: "Clinical Suites, Dental Practices & Executive Offices",
    submarket: "Valley Medical Corridor · Oakridge",
    image: "/demo-properties/oakridge-professional-plaza.jpg",
    type: "Medical & Office",
    featuredSuite: "Suite 210 · Clinical / Dental Suite",
    suiteSpecs: "2,400 RSF · 5 Exam Rooms · Patient Drop-Off Canopy",
    rate: "$22 / SF Full Service",
    badge: "Healthcare & Pro",
  },
  {
    propertyId: "pinecrest-apartments",
    name: "Pinecrest Valley Residences",
    tagline: "Craftsman Garden-Style 1 & 2-Bedroom Residential Community",
    submarket: "Pinecrest Residential District",
    image: "/demo-properties/pinecrest-valley-apartments.jpg",
    type: "Residential Apartments",
    featuredSuite: "Residence 14-B · 2-Bed / 2-Bath",
    suiteSpecs: "1,120 Sq Ft · Private Balcony · In-Unit Laundry & EV Charging",
    rate: "$1,450 / month",
    badge: "Garden Multi-Family",
  },
  {
    propertyId: "cedar-creek-trade",
    name: "Cedar Creek Trade & Contractor Center",
    tagline: "Drive-In Flex Bays for Plumbing, HVAC, Electrical & Supply",
    submarket: "Industrial Trade Gateway",
    image: "/demo-properties/cedar-creek-trade-center.jpg",
    type: "Contractor Flex",
    featuredSuite: "Bay 6 · Drive-In Contractor Flex",
    suiteSpecs: "3,200 RSF · 12-Ft Roll-Up Door · Conditioned Front Office",
    rate: "$12.50 / SF Modified Gross",
    badge: "Trade & Flex Bay",
  },
];

export default function AcmeHeroBanner({
  onSelectProperty,
  onOpenTourModal,
  onFilterChange,
}: AcmeHeroBannerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSqft, setSelectedSqft] = useState(0);

  // Auto-advance banner smoothly every 7s
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setPrevIdx((current) => current);
      setCurrentIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const slide = HERO_SLIDES[currentIdx];

  const handleApplyFilter = () => {
    onFilterChange(selectedType, selectedSqft);
    const el = document.getElementById("portfolio");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const goToSlide = (idx: number) => {
    setPrevIdx(currentIdx);
    setCurrentIdx(idx);
    setIsAutoPlaying(false);
  };

  return (
    <section className="relative min-h-[92vh] pt-24 pb-16 flex flex-col justify-between overflow-hidden bg-[#060911]">
      
      {/* ── Background Slides with Silky Apple/Stripe Crossfade ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#060911]">
        {HERO_SLIDES.map((item, index) => {
          const isActive = index === currentIdx;
          const isPrev = index === prevIdx && !isActive;

          // Layering: Active slide is z-10 (fades in on top)
          // Previous slide is z-5 (remains opaque underneath to prevent dark gaps/flicker)
          // Inactive slides are z-0 opacity-0
          const zIndex = isActive ? 10 : isPrev ? 5 : 0;
          const isVisible = isActive || isPrev;

          return (
            <div
              key={item.propertyId}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out transform-gpu will-change-[opacity] ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
              style={{ zIndex }}
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                priority
                sizes="100vw"
                className={`object-cover object-center transform-gpu will-change-transform transition-transform duration-[8000ms] ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              />
              {/* Cinematic Vignette & Deep Blue Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/60 to-[#060911]/30" />
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#060911]/50 to-[#060911]/80" />
            </div>
          );
        })}
      </div>

      {/* ── Foreground Hero Content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full pt-10 sm:pt-16">
        
        {/* Top Tagline / Context Pill */}
        <div key={`tag-${slide.propertyId}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/20 backdrop-blur-md text-xs text-sky-300 font-semibold mb-6 shadow-[0_0_20px_rgba(56,189,248,0.2)] animate-in fade-in duration-500">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
          </span>
          <span>{slide.submarket}</span>
          <span className="text-gray-500">·</span>
          <span className="text-white font-bold">{slide.badge}</span>
        </div>

        {/* Main Headline & Animated Copy */}
        <div key={`text-${slide.propertyId}`} className="max-w-3xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.05] drop-shadow-md">
            {slide.name}
          </h1>
          <p className="text-base sm:text-xl text-gray-200 font-medium leading-relaxed max-w-2xl drop-shadow">
            {slide.tagline}
          </p>
        </div>

        {/* Floating Glassmorphism Availability Card */}
        <div key={`card-${slide.propertyId}`} className="mt-8 max-w-xl p-5 rounded-2xl bg-[#0B1020]/80 backdrop-blur-xl border border-white/20 shadow-[0_0_40px_rgba(56,189,248,0.18)] space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Immediately Available Space
              </span>
            </div>
            <span className="text-xs font-black text-sky-400 bg-sky-500/10 border border-sky-400/30 px-2.5 py-0.5 rounded-lg">
              {slide.rate}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {slide.featuredSuite}
            </h3>
            <p className="text-xs text-gray-300 mt-0.5">
              {slide.suiteSpecs}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onOpenTourModal(slide.propertyId)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-95 shadow-[0_0_15px_rgba(59,130,246,0.35)] transition-all flex items-center gap-1.5"
            >
              <Calendar size={13} />
              <span>Schedule Tour</span>
            </button>
            <button
              onClick={() => onSelectProperty(slide.propertyId)}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1"
            >
              <span>Explore Building Specs</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Slide Carousel Selector Buttons */}
        <div className="flex items-center gap-2 mt-8">
          {HERO_SLIDES.map((item, idx) => (
            <button
              key={item.propertyId}
              onClick={() => goToSlide(idx)}
              className={`h-2 rounded-full transition-all duration-500 ${
                idx === currentIdx
                  ? "w-10 bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
                  : "w-2.5 bg-white/30 hover:bg-white/60"
              }`}
              title={item.name}
            />
          ))}
          <span className="text-[10px] text-gray-400 ml-2 font-mono">
            0{currentIdx + 1} / 0{HERO_SLIDES.length}
          </span>
        </div>
      </div>

      {/* ── Bottom Interactive Search & Filter Bar ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full mt-10">
        <div className="p-4 rounded-2xl bg-[#090E1A]/90 backdrop-blur-2xl border border-white/20 shadow-[0_0_35px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            
            {/* Space Type */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Property / Space Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
              >
                <option value="all">All Asset Classes</option>
                <option value="Mixed-Use & Lofts">Mixed-Use & Downtown Lofts</option>
                <option value="Medical & Office">Medical & Professional Office</option>
                <option value="Residential Apartments">Residential Apartments</option>
                <option value="Contractor Flex">Contractor Flex & Trade Bays</option>
              </select>
            </div>

            {/* Min RSF */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Minimum Square Footage
              </label>
              <select
                value={selectedSqft}
                onChange={(e) => setSelectedSqft(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
              >
                <option value="0">Any Square Footage</option>
                <option value="800">800+ RSF</option>
                <option value="1500">1,500+ RSF</option>
                <option value="3000">3,000+ RSF</option>
                <option value="5000">5,000+ RSF</option>
              </select>
            </div>

            {/* Submarket */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Regional Submarket
              </label>
              <select className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors">
                <option value="all">All Regional Markets</option>
                <option value="downtown">Historic Downtown Main St</option>
                <option value="medical">Valley Medical Corridor</option>
                <option value="pinecrest">Pinecrest Residential District</option>
                <option value="trade">Industrial Trade District</option>
              </select>
            </div>

            {/* CTA Button */}
            <div className="sm:pt-4">
              <button
                type="button"
                onClick={handleApplyFilter}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-600 text-white font-bold text-xs shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <Search size={14} />
                <span>Search 12 Available Suites</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-5 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <Wifi size={13} className="text-sky-400" />
            <span>Dual Gigabit Dark Fiber Redundancy</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>LEED Gold & Energy Star Certified</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-purple-400" />
            <span>Indexed for ChatGPT & Perplexity Search</span>
          </span>
        </div>
      </div>
    </section>
  );
}
