"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

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
    <div className="absolute inset-x-0 top-0 h-[580px] sm:h-[650px] lg:h-[720px] overflow-hidden pointer-events-none z-0">
      {/* 1. Multi-Layer Cross-Dissolving Panoramic Images — Positioned High in the Hero */}
      {BACKGROUND_PROPERTIES.map((prop, idx) => {
        const isActive = idx === currentIdx;
        return (
          <div
            key={prop.src}
            className={`absolute inset-0 transition-opacity duration-[2500ms] ease-in-out ${
              isActive ? "opacity-45 sm:opacity-50 z-10" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={prop.src}
              alt={prop.alt}
              fill
              priority
              sizes="100vw"
              className={`object-cover object-[center_22%] filter saturate-120 contrast-110 transition-transform duration-[8000ms] ease-out ${
                isActive ? "scale-105" : "scale-100"
              }`}
            />
          </div>
        );
      })}

      {/* 2. Cybernetic / Digital Data Grid Overlay (Property Merging to Data) */}
      <div
        className="absolute inset-0 z-20 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 30%, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 30%, black 40%, transparent 80%)",
        }}
      />

      {/* 3. Glowing Horizontal Energy Streams & Data Nodes */}
      <svg
        className="absolute inset-0 w-full h-full z-20 opacity-40"
        viewBox="0 0 1440 600"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="heroStream1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0" />
            <stop offset="35%" stopColor="#22D3EE" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroStream2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0" />
            <stop offset="45%" stopColor="#34D399" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#38BDF8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient Flow Beams */}
        <path
          d="M 100 190 C 450 130, 850 230, 1340 170"
          stroke="url(#heroStream1)"
          strokeWidth="2"
          strokeDasharray="12 16"
          className="animate-conduit-stream"
        />
        <path
          d="M 50 310 C 500 370, 950 260, 1400 320"
          stroke="url(#heroStream2)"
          strokeWidth="1.5"
          strokeDasharray="8 12"
          className="animate-conduit-stream-fast"
        />

        {/* Subtle Glowing Telemetry Rings */}
        <circle cx="360" cy="175" r="4" fill="#22D3EE" className="animate-pulse shadow-[0_0_12px_#22D3EE]" />
        <circle cx="720" cy="215" r="3" fill="#818CF8" className="animate-pulse shadow-[0_0_10px_#818CF8]" />
        <circle cx="1080" cy="285" r="4" fill="#34D399" className="animate-pulse shadow-[0_0_12px_#34D399]" />
      </svg>

      {/* 4. Deep Contrast Vignettes & Gradient Scrims (Ensures 100% Text Readability) */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#060911]/80 via-[#060911]/30 to-transparent z-30" />
      <div className="absolute inset-0 bg-radial from-[#060911]/30 via-[#060911]/70 to-[#060911] z-30" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#060911] via-[#060911]/85 to-transparent z-30" />
    </div>
  );
}
