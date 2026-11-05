"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import HeroWaveGL from "@/components/marketing/HeroWaveGL";

const BACKGROUND_PROPERTIES = [
  {
    src: "/demo-properties/heritage-square-mixed-use.jpg",
    alt: "Heritage Square Mixed-Use — Main Street Retail & Lofts",
    label: "Heritage Square Mixed-Use",
    // Building already fills the frame — nudge up slightly, keep natural scale
    focus: "55% 45%",
    baseScale: 1.0,
  },
  {
    src: "/demo-properties/oakridge-professional-plaza.jpg",
    alt: "Oakridge Professional Plaza — Medical & Executive Suites",
    label: "Oakridge Professional Plaza",
    // Lots of sky on top — anchor low and enlarge so the facade rises into frame
    focus: "50% 70%",
    baseScale: 1.12,
  },
  {
    src: "/demo-properties/cedar-creek-trade-center.jpg",
    alt: "Cedar Creek Trade Center — Contractor Flex & Drive-In Bays",
    label: "Cedar Creek Trade Center",
    focus: "42% 68%",
    baseScale: 1.12,
  },
];

export default function HeroPropertyBackground() {
  const [currentIdx, setCurrentIdx] = useState(0);

  // Slow, serene cross-dissolve cycle every 7.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % BACKGROUND_PROPERTIES.length);
    }, 7500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Cross-dissolving property photos — pinned to the first screen (not the full, much
             taller hero section) so each building lands above the fold instead of behind the
             dashboard card. Per-photo focal point + bottom-anchored zoom trims empty sky. */}
      <div className="absolute inset-x-0 top-0 h-[100svh] min-h-[640px] max-h-[980px] overflow-hidden">
        {BACKGROUND_PROPERTIES.map((prop, idx) => {
          const isActive = idx === currentIdx;
          return (
            <div
              key={prop.src}
              className={`absolute inset-0 transition-opacity duration-[2500ms] ease-in-out transform-gpu will-change-[opacity] ${
                isActive ? "opacity-35 sm:opacity-40 z-[1]" : "opacity-0 z-0"
              }`}
            >
              <Image
                src={prop.src}
                alt={prop.alt}
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover transform-gpu will-change-transform transition-transform duration-[8000ms] ease-out"
                style={{
                  objectPosition: prop.focus,
                  transformOrigin: prop.focus,
                  transform: `scale(${isActive ? prop.baseScale + 0.05 : prop.baseScale})`,
                }}
              />
            </div>
          );
        })}
        {/* Soft fade where the photo box ends so it blends into the dark section below */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#060911] to-transparent z-[2]" />
      </div>

      {/* 2. Deep Contrast Vignettes & Gradient Scrims (Ensures 100% Text Readability) */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#060911] via-[#060911]/85 to-transparent z-10" />
      <div className="absolute inset-0 bg-radial from-[#060911]/30 via-[#060911]/70 to-[#060911] z-10" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#060911] via-[#060911]/70 to-transparent z-10" />

      {/* 3. GPU spectral data wave — pinned to the first screen (the hero section is much taller
             because it contains the dashboard demo card), additive glow above scrims, below copy */}
      <div className="absolute inset-x-0 top-0 h-[100svh] min-h-[640px] max-h-[980px] z-20">
        <HeroWaveGL intensity={0.95} speed={0.9} />
      </div>
    </div>
  );
}
