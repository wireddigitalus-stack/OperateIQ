"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import HeroWaveGL from "@/components/marketing/HeroWaveGL";

const BACKGROUND_PROPERTIES = [
  {
    src: "/demo-properties/heritage-square-mixed-use.jpg",
    alt: "Heritage Square Mixed-Use — Main Street Retail & Lofts",
    label: "Heritage Square Mixed-Use",
  },
  {
    src: "/demo-properties/oakridge-professional-plaza.jpg",
    alt: "Oakridge Professional Plaza — Medical & Executive Suites",
    label: "Oakridge Professional Plaza",
  },
  {
    src: "/demo-properties/cedar-creek-trade-center.jpg",
    alt: "Cedar Creek Trade Center — Contractor Flex & Drive-In Bays",
    label: "Cedar Creek Trade Center",
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
      {/* 1. Multi-Layer Cross-Dissolving Panoramic Images (own compositor layers) */}
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
              className={`object-cover object-center transform-gpu will-change-transform transition-transform duration-[8000ms] ease-out ${
                isActive ? "scale-105" : "scale-100"
              }`}
            />
          </div>
        );
      })}

      {/* 2. Deep Contrast Vignettes & Gradient Scrims (Ensures 100% Text Readability) */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#060911] via-[#060911]/85 to-transparent z-10" />
      <div className="absolute inset-0 bg-radial from-[#060911]/30 via-[#060911]/70 to-[#060911] z-10" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#060911] via-[#060911]/70 to-transparent z-10" />

      {/* 3. GPU spectral data wave — pinned to the first screen (the hero section is much taller
             because it contains the dashboard demo card), additive glow above scrims, below copy */}
      <div className="absolute inset-x-0 top-0 h-[100svh] min-h-[640px] max-h-[980px] z-20">
        <HeroWaveGL intensity={0.95} speed={1.0} />
      </div>
    </div>
  );
}
