"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, ArrowRight, MapPin, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { COMPANY } from "@/lib/data";

const cityBadges = [
  "Bristol, TN/VA",
  "Kingsport, TN",
  "Johnson City, TN",
  "Abingdon, VA",
];

// Real scraped property images for the hero slideshow
const HERO_SLIDES = [
  {
    src: "/property-images/commercial-city-centre-exterior.jpg",
    label: "City Centre Professional Suites",
    location: "Downtown Bristol, TN",
  },
  {
    src: "/property-images/cowork-shared-office.jpg",
    label: "Bristol CoWork",
    location: "620 State Street",
  },
  {
    src: "/property-images/commercial-executive-entry.jpg",
    label: "The Executive — Premier Offices",
    location: "Downtown Bristol, TN",
  },
  {
    src: "/property-images/commercial-centerpoint-mall.jpg",
    label: "Centre Point Suites",
    location: "Bristol, TN",
  },
  {
    src: "/property-images/development-event-space-after.jpg",
    label: "Foundation Event Facility",
    location: "Downtown Bristol",
  },
  {
    src: "/property-images/cowork-conference-room.jpg",
    label: "Bristol CoWork — Conference Rooms",
    location: "620 State Street",
  },
];

// ── CMS Overrides type ───────────────────────────────────────────────────────
interface HeroOverrides {
  trust_badge?: string;
  headline_before?: string;
  headline_highlight?: string;
  headline_after?: string;
  subtext?: string;
  cta_primary?: string;
  cta_secondary?: string;
  micro_stat_1_value?: string;
  micro_stat_1_label?: string;
  micro_stat_2_value?: string;
  micro_stat_2_label?: string;
  micro_stat_3_value?: string;
  micro_stat_3_label?: string;
  micro_stat_4_value?: string;
  micro_stat_4_label?: string;
}

export default function HeroSection({ overrides }: { overrides?: HeroOverrides }) {
  const o = overrides || {};

  const [slides, setSlides] = useState(HERO_SLIDES);
  const [videoUrl, setVideoUrl] = useState<string|null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [showMesh, setShowMesh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SLIDE_DURATION = 6000;

  // Performance-deferred mesh loading
  useEffect(() => {
    const timer = setTimeout(() => setShowMesh(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch dynamic banner config from admin
  useEffect(() => {
    fetch("/api/hero-banner")
      .then(r => r.json())
      .then(d => {
        if (d.resolved && d.resolved.length > 0) setSlides(d.resolved);
        if (d.raw?.videoEnabled && d.raw?.videoUrl) {
          setVideoUrl(d.raw.videoUrl);
          setVideoEnabled(true);
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const advanceSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  useEffect(() => {
    if (videoEnabled) return; // no slideshow when video is active
    setProgressKey((k) => k + 1);
    intervalRef.current = setInterval(advanceSlide, SLIDE_DURATION);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [currentSlide, videoEnabled, slides.length]);

  const goToSlide = (idx: number) => {
    if (idx === currentSlide) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentSlide(idx);
    setProgressKey((k) => k + 1);
  };

  const activeSlide = slides[currentSlide] || HERO_SLIDES[0];

  // CMS-editable values with defaults
  const trustBadge = o.trust_badge ?? "#1 Commercial Property Owner in Downtown Bristol";
  const headlineBefore = o.headline_before ?? "The Tri-Cities\u2019 ";
  const headlineHighlight = o.headline_highlight ?? "Commercial";
  const headlineAfter = o.headline_after ?? " Real Estate Leader";
  const subtext = o.subtext ?? "Vision LLC has been building Downtown Bristol — and serving businesses across the entire Tri-Cities region — for over 20 years. Office. Retail. Warehouse. Development. Executive Advisement.\nOne team. One vision.";
  const ctaPrimary = o.cta_primary ?? "Schedule a Tour";
  const ctaSecondary = o.cta_secondary ?? COMPANY.phone;

  const microStats = [
    { value: o.micro_stat_1_value ?? "20+", label: o.micro_stat_1_label ?? "Years Invested in the Tri-Cities" },
    { value: o.micro_stat_2_value ?? "50+", label: o.micro_stat_2_label ?? "Commercial Properties" },
    { value: o.micro_stat_3_value ?? "3", label: o.micro_stat_3_label ?? "Integrated Divisions" },
    { value: o.micro_stat_4_value ?? "Award-Winning", label: o.micro_stat_4_label ?? "Historic Developer" },
  ];

  // Split subtext on newlines to preserve <br /> rendering
  const subtextParts = subtext.split("\n");

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      aria-label="Hero — Vision LLC Commercial Real Estate"
    >
      {/* ── BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        {videoEnabled && videoUrl ? (
          /* Video Background */
          <video
            key={videoUrl}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src={videoUrl}
          />
        ) : (
          /* Slideshow with Continuous Ken Burns Cross-Fade */
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  opacity: { duration: 2, ease: "easeInOut" },
                  scale: { duration: 10, ease: "linear" } 
                }}
                className="absolute inset-0 will-change-transform"
              >
                <Image 
                  src={activeSlide.src} 
                  alt={activeSlide.label}
                  fill 
                  priority 
                  className="object-cover" 
                  sizes="100vw"
                  onError={(e) => { (e.target as HTMLImageElement).src = HERO_SLIDES[currentSlide % HERO_SLIDES.length]?.src || HERO_SLIDES[0].src; }}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ── Apple-esque Mesh Gradient Blobs (Loaded after mount for performance) ── */}
        {showMesh && <MeshGradients />}

        {/* Dark overlay — heavier at top/bottom, lighter in middle */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080B0F]/85 via-[#080B0F]/45 to-[#080B0F]/90" />

        {/* Subtle green tint */}
        <div className="absolute inset-0 bg-[rgba(10,20,15,0.25)]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(74, 222, 128, 1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(74, 222, 128, 1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Green orb */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#4ADE80]/8 hidden md:block blur-[120px] pointer-events-none" />
      </div>

      {/* ── HERO CONTENT ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-36 lg:pb-24">
        <div className="max-w-4xl">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-lg border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.08)] backdrop-blur-sm shadow-xl shadow-green-900/10">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={12} className="text-[#FACC15] fill-[#FACC15] drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
              ))}
            </div>
            <span className="text-sm font-semibold text-[#4ADE80]">
              {trustBadge}
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.05] mb-6 tracking-tight drop-shadow-2xl">
            {headlineBefore}
            <span className="gradient-text-green glow-green-text">
              {headlineHighlight}
            </span>
            {headlineAfter}
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 leading-relaxed mb-8 max-w-2xl drop-shadow-lg">
            {subtextParts.map((part, i) => (
              <span key={i}>
                {part}
                {i < subtextParts.length - 1 && <br />}
              </span>
            ))}
          </p>

          {/* City badges */}
          <div className="flex flex-wrap gap-2 mb-10">
            {cityBadges.map((city) => (
              <span key={city} className="map-badge backdrop-blur-sm">
                <MapPin size={11} />
                {city}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/contact" id="hero-tour-cta" className="btn-primary-cta text-base px-7 py-4">
              {ctaPrimary}
              <ArrowRight size={18} />
            </Link>
            <a
              href={COMPANY.phoneHref}
              id="hero-phone-cta"
              className="btn-secondary text-base px-7 py-4 backdrop-blur-sm"
            >
              <Phone size={18} />
              {ctaSecondary}
            </a>
          </div>

          {/* Trust micro-stats */}
          <div className="flex flex-wrap gap-6 mt-12 pt-12 border-t border-[rgba(74,222,128,0.12)]">
            {microStats.map((stat) => (
              <div key={stat.label} className="flex-shrink-0">
                <p className="text-2xl font-black text-white leading-none drop-shadow-lg">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[120px] leading-snug">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SLIDE CONTROLS (bottom-right) ── */}
      <div className="absolute bottom-8 right-6 z-20 flex flex-col items-end gap-3">
        {/* Current property label */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="text-right"
          >
            <p className="text-xs text-[#4ADE80] font-semibold tracking-wider uppercase">{activeSlide.label}</p>
            <p className="text-[11px] text-gray-500">{activeSlide.location}</p>
          </motion.div>
        </AnimatePresence>

        {/* Dot progress indicators */}
        {!videoEnabled && (
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <button key={idx} onClick={() => goToSlide(idx)} aria-label={`Go to slide ${idx + 1}`} className="group relative focus:outline-none">
              <div className={`h-0.5 transition-all duration-300 rounded-full ${idx === currentSlide ? "w-8 bg-[#4ADE80]" : "w-3 bg-white/25 group-hover:bg-white/50"}`}/>
              {idx === currentSlide && (
                <div key={progressKey} className="absolute inset-0 h-0.5 bg-white/30 rounded-full" style={{ animation: `slideProgress ${SLIDE_DURATION}ms linear forwards` }}/>
              )}
              <style>{`@keyframes slideProgress { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
            </button>
          ))}
        </div>
        )}
      </div>

      {/* ── SCROLL INDICATOR ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-40">
        <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
          <div className="w-1 h-2 rounded-full bg-[#4ADE80] animate-bounce" />
        </div>
      </div>
    </section>
  );
}

// ── SUB-COMPONENT: MESH GRADIENTS ───────────────────────────────────────────
function MeshGradients() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-40">
      {/* Deep Blue Blob */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -80, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-blue-900/30 blur-[120px]"
      />
      
      {/* Vision Green Blob */}
      <motion.div
        animate={{
          x: [0, -120, 80, 0],
          y: [0, 100, -60, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-[20%] right-[15%] w-[600px] h-[600px] rounded-full bg-[#4ADE80]/15 blur-[130px]"
      />

      {/* Darker Accent Blob */}
      <motion.div
        animate={{
          x: [0, 60, -40, 0],
          y: [0, 50, 80, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[#080B0F]/40 blur-[100px]"
      />
    </div>
  );
}
