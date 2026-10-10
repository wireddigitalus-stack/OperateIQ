"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Section definitions matching the ContentTab SECTION_META + page flow ──────

interface WireframeSection {
  key: string;
  label: string;
  shortLabel: string;
  yStart: number; // % from top
  height: number; // % of total
  color: string;
  page: "home" | "about";
}

const HOMEPAGE_SECTIONS: WireframeSection[] = [
  { key: "hero",         label: "Hero Section",    shortLabel: "HERO",   yStart: 0,  height: 22, color: "#4ADE80", page: "home" },
  { key: "stats",        label: "Stats Bar",       shortLabel: "STATS",  yStart: 22, height: 6,  color: "#60A5FA", page: "home" },
  { key: "services",     label: "Services Cards",  shortLabel: "SERVICES", yStart: 28, height: 18, color: "#A78BFA", page: "home" },
  { key: "testimonials", label: "Testimonials",    shortLabel: "REVIEWS", yStart: 46, height: 16, color: "#F472B6", page: "home" },
  { key: "faq",          label: "FAQ",             shortLabel: "FAQ",    yStart: 62, height: 18, color: "#FACC15", page: "home" },
  { key: "cta",          label: "CTA Banner",      shortLabel: "CTA",    yStart: 80, height: 12, color: "#FB923C", page: "home" },
  { key: "footer",       label: "Footer",          shortLabel: "FOOTER", yStart: 92, height: 8,  color: "#94A3B8", page: "home" },
];



// ── Wireframe block renderer inside the SVG ──────────────────────────────────

function WireframeBlock({
  section,
  isActive,
  svgWidth,
  svgHeight,
  onHover,
  onClick,
}: {
  section: WireframeSection;
  isActive: boolean;
  svgWidth: number;
  svgHeight: number;
  onHover: (key: string | null) => void;
  onClick: (key: string) => void;
}) {
  const x = 16;
  const w = svgWidth * 0.52;
  const y = (section.yStart / 100) * svgHeight + 8;
  const h = (section.height / 100) * svgHeight - 4;
  const r = 6;

  return (
    <g
      onMouseEnter={() => onHover(section.key)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(section.key)}
      style={{ cursor: "pointer" }}
    >
      {/* Glow effect when active */}
      {isActive && (
        <rect
          x={x - 3}
          y={y - 3}
          width={w + 6}
          height={h + 6}
          rx={r + 2}
          fill="none"
          stroke={section.color}
          strokeWidth={2}
          opacity={0.6}
          className="animate-pulse"
        />
      )}

      {/* Background block */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        fill={isActive ? `${section.color}15` : "rgba(255,255,255,0.03)"}
        stroke={isActive ? section.color : "rgba(255,255,255,0.08)"}
        strokeWidth={isActive ? 1.5 : 0.5}
        style={{ transition: "all 0.3s ease" }}
      />

      {/* Inner wireframe details */}
      {section.key === "hero" && (
        <g opacity={isActive ? 0.7 : 0.2}>
          {/* Badge line */}
          <rect x={x + w * 0.25} y={y + 10} width={w * 0.5} height={4} rx={2} fill={section.color} />
          {/* Heading lines */}
          <rect x={x + w * 0.15} y={y + 22} width={w * 0.7} height={6} rx={2} fill="white" />
          <rect x={x + w * 0.2} y={y + 32} width={w * 0.6} height={6} rx={2} fill="white" />
          {/* Subtext */}
          <rect x={x + w * 0.1} y={y + 46} width={w * 0.8} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={x + w * 0.15} y={y + 52} width={w * 0.7} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          {/* CTA buttons */}
          <rect x={x + w * 0.18} y={y + 64} width={w * 0.28} height={10} rx={5} fill={section.color} />
          <rect x={x + w * 0.52} y={y + 64} width={w * 0.28} height={10} rx={5} fill="none" stroke="white" strokeWidth={0.8} />
          {/* Micro stats row */}
          {[0, 1, 2, 3].map(i => (
            <g key={i}>
              <rect x={x + w * (0.08 + i * 0.23)} y={y + h - 24} width={w * 0.18} height={3} rx={1.5} fill={section.color} />
              <rect x={x + w * (0.1 + i * 0.23)} y={y + h - 18} width={w * 0.14} height={2} rx={1} fill="rgba(255,255,255,0.4)" />
            </g>
          ))}
        </g>
      )}

      {section.key === "stats" && (
        <g opacity={isActive ? 0.7 : 0.2}>
          {[0, 1, 2, 3].map(i => (
            <g key={i}>
              <rect x={x + w * (0.05 + i * 0.24)} y={y + h * 0.2} width={w * 0.18} height={5} rx={2} fill={section.color} />
              <rect x={x + w * (0.06 + i * 0.24)} y={y + h * 0.6} width={w * 0.16} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
            </g>
          ))}
        </g>
      )}

      {section.key === "services" && (
        <g opacity={isActive ? 0.7 : 0.2}>
          {/* Section heading */}
          <rect x={x + w * 0.2} y={y + 8} width={w * 0.6} height={4} rx={2} fill="white" />
          <rect x={x + w * 0.25} y={y + 16} width={w * 0.5} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
          {/* 3 cards */}
          {[0, 1, 2].map(i => (
            <rect key={i} x={x + w * (0.05 + i * 0.32)} y={y + 28} width={w * 0.28} height={h - 36} rx={4} fill="none" stroke={section.color} strokeWidth={0.8} />
          ))}
        </g>
      )}

      {section.key === "testimonials" && (
        <g opacity={isActive ? 0.7 : 0.2}>
          <rect x={x + w * 0.2} y={y + 8} width={w * 0.6} height={4} rx={2} fill="white" />
          {/* Quote blocks */}
          {[0, 1, 2].map(i => (
            <g key={i}>
              <rect x={x + w * (0.05 + i * 0.32)} y={y + 22} width={w * 0.28} height={h - 30} rx={4} fill="none" stroke={section.color} strokeWidth={0.6} />
              <rect x={x + w * (0.08 + i * 0.32)} y={y + 30} width={w * 0.22} height={2} rx={1} fill="rgba(255,255,255,0.3)" />
              <rect x={x + w * (0.09 + i * 0.32)} y={y + 35} width={w * 0.2} height={2} rx={1} fill="rgba(255,255,255,0.3)" />
            </g>
          ))}
        </g>
      )}

      {section.key === "faq" && (
        <g opacity={isActive ? 0.7 : 0.2}>
          <rect x={x + w * 0.2} y={y + 8} width={w * 0.6} height={4} rx={2} fill="white" />
          {/* FAQ accordion rows */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <rect key={i} x={x + w * 0.1} y={y + 20 + i * (h - 28) / 6} width={w * 0.8} height={(h - 28) / 6 - 3} rx={3} fill="none" stroke={section.color} strokeWidth={0.5} />
          ))}
        </g>
      )}

      {section.key === "cta" && (
        <g opacity={isActive ? 0.7 : 0.2}>
          <rect x={x + w * 0.15} y={y + h * 0.15} width={w * 0.7} height={5} rx={2} fill="white" />
          <rect x={x + w * 0.2} y={y + h * 0.4} width={w * 0.6} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
          <rect x={x + w * 0.3} y={y + h * 0.65} width={w * 0.4} height={10} rx={5} fill={section.color} />
        </g>
      )}

      {section.key === "footer" && (
        <g opacity={isActive ? 0.7 : 0.2}>
          <rect x={x + w * 0.05} y={y + 6} width={w * 0.35} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={x + w * 0.05} y={y + 14} width={w * 0.55} height={2} rx={1} fill="rgba(255,255,255,0.25)" />
          {/* Social icons */}
          {[0, 1, 2].map(i => (
            <circle key={i} cx={x + w * (0.1 + i * 0.08)} cy={y + h - 10} r={4} fill="none" stroke={section.color} strokeWidth={0.6} />
          ))}
        </g>
      )}

      {section.key === "about" && (
        <g opacity={isActive ? 0.7 : 0.2}>
          <rect x={x + w * 0.2} y={y + 20} width={w * 0.6} height={6} rx={2} fill="white" />
          <rect x={x + w * 0.15} y={y + 35} width={w * 0.7} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
          <rect x={x + w * 0.1} y={y + 60} width={w * 0.35} height={40} rx={4} fill="none" stroke={section.color} strokeWidth={0.6} />
          <rect x={x + w * 0.52} y={y + 60} width={w * 0.38} height={3} rx={1.5} fill="white" />
          <rect x={x + w * 0.52} y={y + 68} width={w * 0.36} height={2} rx={1} fill="rgba(255,255,255,0.3)" />
          <rect x={x + w * 0.52} y={y + 74} width={w * 0.34} height={2} rx={1} fill="rgba(255,255,255,0.3)" />
          <rect x={x + w * 0.52} y={y + 80} width={w * 0.32} height={2} rx={1} fill="rgba(255,255,255,0.3)" />
        </g>
      )}

      {/* Section label */}
      <text
        x={x + w / 2}
        y={y + h / 2 + (section.key === "hero" ? -12 : 1)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isActive ? section.color : "rgba(255,255,255,0.2)"}
        fontSize={section.key === "stats" || section.key === "footer" ? 8 : 9}
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1.5"
        style={{ transition: "fill 0.3s ease", pointerEvents: "none" }}
      >
        {section.shortLabel}
      </text>
    </g>
  );
}

// ── Animated connector line ──────────────────────────────────────────────────

function ConnectorLine({
  x1, y1, x2, y2, color, isActive,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; isActive: boolean;
}) {
  if (!isActive) return null;

  // S-curve path from wireframe block to editor field
  const midX = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  return (
    <g>
      {/* Glow behind the line */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={4}
        opacity={0.15}
      />
      {/* Main connector */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={0.8}
        strokeDasharray="6 4"
        className="animate-dash"
      />
      {/* Source dot */}
      <circle cx={x1} cy={y1} r={4} fill={color} opacity={0.9}>
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Target dot */}
      <circle cx={x2} cy={y2} r={3} fill={color} opacity={0.7} />
    </g>
  );
}

// ── Main PageMap Component ───────────────────────────────────────────────────

interface PageMapProps {
  activeSection: string | null;
  onSectionSelect: (sectionKey: string) => void;
}

export default function PageMap({ activeSection, onSectionSelect }: PageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ w: 320, h: 480 });

  const currentActive = hoveredSection || activeSection;
  const sections = HOMEPAGE_SECTIONS;

  // Responsive sizing
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ w: Math.max(280, rect.width), h: Math.max(400, Math.min(600, rect.width * 1.5)) });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const handleSectionClick = useCallback((key: string) => {
    onSectionSelect(key);
  }, [onSectionSelect]);

  const svgW = dimensions.w;
  const svgH = dimensions.h;
  const wireframeRight = 16 + svgW * 0.52; // right edge of wireframe blocks
  const editorX = svgW - 16; // right side where editor conceptually is

  return (
    <div>
      {/* SVG Wireframe */}
      <div ref={containerRef} className="relative p-3">
        <svg
          width="100%"
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="select-none"
        >
          {/* Background grid pattern */}
          <defs>
            <pattern id="pageMapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            </pattern>
            {/* Animated dash keyframe via SVG */}
            <style>{`
              @keyframes dashFlow {
                to { stroke-dashoffset: -20; }
              }
              .animate-dash {
                animation: dashFlow 1.5s linear infinite;
              }
            `}</style>
          </defs>

          {/* Grid background */}
          <rect width={svgW} height={svgH} fill="url(#pageMapGrid)" rx={8} />

          {/* Browser chrome mock */}
          <rect x={10} y={0} width={svgW * 0.52 + 12} height={svgH} rx={10} fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
          {/* URL bar */}
          <rect x={20} y={-14} width={svgW * 0.4} height={12} rx={4} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
          <text x={28} y={-6} fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">teamvisionllc.com</text>

          {/* Section blocks */}
          {sections.map(section => (
            <WireframeBlock
              key={section.key}
              section={section}
              isActive={currentActive === section.key}
              svgWidth={svgW}
              svgHeight={svgH}
              onHover={setHoveredSection}
              onClick={handleSectionClick}
            />
          ))}

          {/* Connector lines from wireframe to right-side label */}
          {sections.map(section => {
            const blockY = (section.yStart / 100) * svgH + (section.height / 100) * svgH / 2 + 8;
            const connectorEndX = svgW - 12;
            const connectorEndY = blockY;

            return (
              <ConnectorLine
                key={`conn-${section.key}`}
                x1={wireframeRight + 4}
                y1={blockY}
                x2={connectorEndX}
                y2={connectorEndY}
                color={section.color}
                isActive={currentActive === section.key}
              />
            );
          })}

          {/* Right side: section labels (representing the editor panel) */}
          {sections.map(section => {
            const blockY = (section.yStart / 100) * svgH + (section.height / 100) * svgH / 2 + 8;
            const isActive = currentActive === section.key;

            return (
              <g key={`label-${section.key}`} opacity={isActive ? 1 : 0.3}>
                {/* Label background */}
                <rect
                  x={svgW - svgW * 0.38 - 4}
                  y={blockY - 16}
                  width={svgW * 0.38}
                  height={32}
                  rx={8}
                  fill={isActive ? `${section.color}12` : "transparent"}
                  stroke={isActive ? `${section.color}40` : "transparent"}
                  strokeWidth={1}
                />
                {/* Icon dot */}
                <circle
                  cx={svgW - svgW * 0.38 + 12}
                  cy={blockY}
                  r={5}
                  fill={isActive ? section.color : "rgba(255,255,255,0.15)"}
                />
                {/* Label text — large & readable */}
                <text
                  x={svgW - svgW * 0.38 + 24}
                  y={blockY}
                  dominantBaseline="middle"
                  fill={isActive ? "white" : "rgba(255,255,255,0.3)"}
                  fontSize={14}
                  fontWeight="800"
                  fontFamily="system-ui, sans-serif"
                  letterSpacing="0.5"
                >
                  {section.label}
                </text>
                {/* Edit indicator */}
                {isActive && (
                  <text
                    x={svgW - 16}
                    y={blockY}
                    dominantBaseline="middle"
                    textAnchor="end"
                    fill={section.color}
                    fontSize={10}
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                    opacity={0.8}
                  >
                    EDIT ▸
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => handleSectionClick(s.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wide transition-all ${
                currentActive === s.key
                  ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color, opacity: currentActive === s.key ? 1 : 0.4 }}
              />
              {s.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
