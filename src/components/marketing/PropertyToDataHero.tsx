"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Activity,
  Layers,
  Search,
  ChevronRight,
  DollarSign,
  Wrench,
  Cpu,
  RefreshCw,
} from "lucide-react";
import HeroChart, { CountUp } from "./HeroChart";

interface PropertyAssetMode {
  id: string;
  name: string;
  typeBadge: string;
  submarket: string;
  image: string;
  monthlyRent: number;
  occupancy: number;
  runRate: number;
  activeUnits: string;
  hotspots: {
    label: string;
    sub: string;
    x: number; // percentage
    y: number; // percentage
    tone: "emerald" | "sky" | "amber";
  }[];
  telemetryStream: {
    text: string;
    tone: "emerald" | "sky" | "indigo";
    cls: string;
  }[];
  brief: string;
}

const PROPERTY_MODES: PropertyAssetMode[] = [
  {
    id: "heritage-square",
    name: "Heritage Square Mixed-Use",
    typeBadge: "Main St Mixed-Use",
    submarket: "Historic Downtown Main St · 100 Main Street",
    image: "/demo-properties/heritage-square-mixed-use.jpg",
    monthlyRent: 284500,
    occupancy: 98.4,
    runRate: 3414000,
    activeUnits: "12 Lofts + Streetfront Cafe",
    hotspots: [
      { label: "Suite 101 Cafe", sub: "Auto-drafted · $2,400/mo", x: 26, y: 72, tone: "emerald" },
      { label: "Loft 2B Residence", sub: "Lease renewed · 12-mo", x: 62, y: 36, tone: "sky" },
      { label: "Roof HVAC Loop", sub: "Filter inspected · Pass", x: 80, y: 16, tone: "amber" },
    ],
    telemetryStream: [
      { text: "+$2,400 Rent Auto-Drafted", tone: "emerald", cls: "animate-packet-1" },
      { text: "Loft 2B Lease Executed", tone: "indigo", cls: "animate-packet-2" },
      { text: "HVAC Inspection: Verified", tone: "sky", cls: "animate-packet-3" },
    ],
    brief: "Heritage Square: October rent is 100% collected. 1 renewal queued for Nov 30. Zero open repair tickets.",
  },
  {
    id: "oakridge-plaza",
    name: "Oakridge Professional & Medical Plaza",
    typeBadge: "Medical & Pro Plaza",
    submarket: "Valley Medical Corridor · 450 Valley View Pkwy",
    image: "/demo-properties/oakridge-professional-plaza.jpg",
    monthlyRent: 312800,
    occupancy: 96.8,
    runRate: 3753600,
    activeUnits: "5 Exam Rooms, Dental & Executive",
    hotspots: [
      { label: "Suite 210 Dental Clinic", sub: "Annual escalation +4.5%", x: 32, y: 62, tone: "emerald" },
      { label: "Porte-Cochère Canopy", sub: "Motion telemetry OK", x: 66, y: 48, tone: "sky" },
      { label: "Clinical Chiller Loop", sub: "Refrigerant calibrated", x: 74, y: 18, tone: "amber" },
    ],
    telemetryStream: [
      { text: "+$6,800 Clinic Lease Rec'd", tone: "emerald", cls: "animate-packet-1" },
      { text: "Whale Lead Scored (96%)", tone: "sky", cls: "animate-packet-2" },
      { text: "Clinical Sensor: Optimal", tone: "indigo", cls: "animate-packet-3" },
    ],
    brief: "Oakridge Plaza: Clinical suites at 96.8% occupancy. Chiller loop calibrated. Dental practice escalation logged.",
  },
  {
    id: "cedar-creek",
    name: "Cedar Creek Trade Center",
    typeBadge: "Contractor Flex Bays",
    submarket: "Industrial Trade Gateway · 1200 Industrial Way",
    image: "/demo-properties/cedar-creek-trade-center.jpg",
    monthlyRent: 268400,
    occupancy: 97.2,
    runRate: 3220800,
    activeUnits: "8 Drive-In 12-Ft Roll-Up Bays",
    hotspots: [
      { label: "Bay 4 Mechanical", sub: "12-ft overhead door OK", x: 28, y: 68, tone: "emerald" },
      { label: "Bay 6 HVAC Showroom", sub: "3-phase power: 42kW", x: 56, y: 60, tone: "sky" },
      { label: "Fenced Fleet Staging", sub: "Yard slots allocated", x: 82, y: 32, tone: "amber" },
    ],
    telemetryStream: [
      { text: "+$3,450 Flex Bay Rent", tone: "emerald", cls: "animate-packet-1" },
      { text: "Overhead Door Sensor: OK", tone: "indigo", cls: "animate-packet-2" },
      { text: "3-Phase Power Load: 42kW", tone: "sky", cls: "animate-packet-3" },
    ],
    brief: "Cedar Creek: 8 of 8 contractor bays active. 3-phase electrical nominal. Fleet staging yard fully allocated.",
  },
];

export default function PropertyToDataHero() {
  const [activeModeIdx, setActiveModeIdx] = useState(0);
  const mode = PROPERTY_MODES[activeModeIdx];

  return (
    <div className="relative mx-auto max-w-7xl mt-10 sm:mt-14 group">
      {/* Dynamic Background Auras */}
      <div className="absolute -inset-4 sm:-inset-10 bg-gradient-to-r from-blue-600/25 via-indigo-600/20 to-cyan-400/25 rounded-[3.5rem] blur-[90px] opacity-70 group-hover:opacity-95 transition-opacity duration-1000 pointer-events-none" />
      <div className="absolute -top-32 left-1/4 w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-[450px] h-[450px] bg-indigo-500/15 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="relative rounded-3xl sm:rounded-[2.5rem] border border-white/20 bg-[rgba(8,12,22,0.94)] backdrop-blur-3xl shadow-[0_32px_120px_rgba(0,0,0,0.85),0_0_60px_rgba(56,189,248,0.18)] overflow-hidden text-left">
        
        {/* Top Metallic Specular Highlight */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* ── 1. Command Header Bar & Interactive Asset Switcher ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 sm:px-7 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          
          {/* OS Window Controls & Live Stream Badge */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 shadow-[0_0_8px_rgba(255,95,86,0.6)]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 shadow-[0_0_8px_rgba(255,189,46,0.6)]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 shadow-[0_0_8px_rgba(39,201,63,0.6)]" />
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]" />
              </span>
              <span className="text-xs font-black text-white tracking-wide uppercase">
                OpsIQ Live Telemetry Engine
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300">
                <Radio size={10} className="animate-pulse text-cyan-400" />
                <span>Physical Asset → Data Pipeline</span>
              </span>
            </div>
          </div>

          {/* Interactive Mode Pills: Switch Regional Asset Class */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
            {PROPERTY_MODES.map((item, idx) => {
              const active = idx === activeModeIdx;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModeIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-[0_0_18px_rgba(56,189,248,0.4)] border border-sky-300/40"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Building2 size={13} className={active ? "text-cyan-200" : "text-slate-500"} />
                  <span>{item.typeBadge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. The Visual Bridge: Physical Property Stage Flowing into Data ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px] border-b border-white/[0.08] relative">
          
          {/* ── Left Stage (Lg: 5 Cols): Physical Real Estate Asset with Laser Scan & Hotspots ── */}
          <div className="lg:col-span-5 relative p-6 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#050811]">
            
            {/* Background Property Image with Crossfade */}
            <div className="absolute inset-0 z-0">
              <Image
                src={mode.image}
                alt={mode.name}
                fill
                priority
                className="object-cover opacity-60 filter saturate-110 contrast-105 transition-all duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080C16] via-[#080C16]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#080C16]/20 to-[#080C16]" />
            </div>

            {/* Futuristic Tech Laser Scanline Animation */}
            <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent z-10 pointer-events-none animate-laser-scan border-b border-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.5)]" />

            {/* Top Property Info Pill */}
            <div className="relative z-20 space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-lg">
                <Building2 size={13} className="text-sky-400" />
                <span>{mode.name}</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium pl-1 drop-shadow-md">
                {mode.submarket}
              </p>
            </div>

            {/* Glowing Telemetry Hotspots Placed Directly on Building Features */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {mode.hotspots.map((h, i) => {
                const colorMap = {
                  emerald: "bg-emerald-400 border-emerald-300 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.8)]",
                  sky: "bg-sky-400 border-sky-300 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.8)]",
                  amber: "bg-amber-400 border-amber-300 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.8)]",
                };

                return (
                  <div
                    key={h.label}
                    style={{ left: `${h.x}%`, top: `${h.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group/node cursor-pointer"
                  >
                    {/* Pulsing Pin Ring */}
                    <span className="relative flex h-5 w-5 items-center justify-center">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${colorMap[h.tone].split(" ")[0]}`} />
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${colorMap[h.tone]}`} />
                    </span>

                    {/* Pop-Out Micro Telemetry Card */}
                    <div className={`absolute ${h.x > 60 ? "right-6" : "left-6"} top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 shadow-xl text-left pointer-events-none transition-transform duration-300`}>
                      <p className="text-[10px] font-bold text-white leading-tight">{h.label}</p>
                      <p className="text-[9px] text-slate-300 font-mono">{h.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Stream Status */}
            <div className="relative z-20 flex items-center justify-between pt-12">
              <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 flex items-center gap-2">
                <Cpu size={12} className="text-cyan-400 animate-pulse" />
                <span>Digitized: <strong>{mode.activeUnits}</strong></span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-400/30 px-2 py-0.5 rounded-md">
                100% Signal
              </span>
            </div>
          </div>

          {/* ── Middle / Right Stage (Lg: 7 Cols): Live Data Stream & Intelligence Dashboard ── */}
          <div className="lg:col-span-7 relative p-5 sm:p-7 flex flex-col justify-between bg-gradient-to-br from-[#090D1A] via-[#080B15] to-[#04060C]">
            
            {/* SVG Data Stream Conduit: Lines Flowing Across Screen */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10 hidden sm:block opacity-65"
              viewBox="0 0 700 460"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="streamGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="streamGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#34D399" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="streamGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#EC4899" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Energy Cable 1 */}
              <path
                d="M 0 100 C 180 80, 260 140, 700 130"
                stroke="url(#streamGrad1)"
                strokeWidth="2.5"
                className="animate-conduit-stream"
              />
              {/* Energy Cable 2 */}
              <path
                d="M 0 240 C 220 230, 320 200, 700 220"
                stroke="url(#streamGrad2)"
                strokeWidth="2"
                className="animate-conduit-stream-fast"
              />
              {/* Energy Cable 3 */}
              <path
                d="M 0 380 C 190 390, 340 320, 700 310"
                stroke="url(#streamGrad3)"
                strokeWidth="1.8"
                className="animate-conduit-stream"
              />
            </svg>

            {/* Floating Telemetry Micro-Badges Moving in the Stream */}
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden hidden sm:block">
              {mode.telemetryStream.map((packet, idx) => {
                const styles: Record<string, string> = {
                  emerald: "bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]",
                  sky: "bg-sky-500/15 border-sky-400/40 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]",
                  indigo: "bg-indigo-500/15 border-indigo-400/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]",
                };

                return (
                  <div
                    key={packet.text}
                    style={{ top: `${20 + idx * 30}%`, left: "6%" }}
                    className={`absolute inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md ${styles[packet.tone]} ${packet.cls}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span>{packet.text}</span>
                  </div>
                );
              })}
            </div>

            {/* ── Content on the Right: Intelligence Feed + Live Metrics ── */}
            <div className="relative z-30 space-y-6">
              
              {/* OpsIQ AI Daily Brief Banner */}
              <div className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600/[0.16] via-indigo-600/[0.10] to-cyan-500/[0.16] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_rgba(56,189,248,0.4)]">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-wide">OpsIQ Telemetry Processor</span>
                      <span className="text-[10px] text-sky-300 font-mono px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30">
                        Autonomous Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed font-medium">
                      “{mode.brief}”
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 shadow-sm flex-shrink-0 self-end sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                  <span>Streaming</span>
                </div>
              </div>

              {/* Ingested KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* KPI 1: Monthly Rent */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F1F]/90 border border-white/10 shadow-md hover:border-sky-400/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Rent Run Rate</span>
                    <DollarSign size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      <CountUp to={mode.monthlyRent} prefix="$" suffix="" decimals={0} />
                    </span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                    +14.8% YoY
                  </span>
                </div>

                {/* KPI 2: Portfolio Occupancy */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F1F]/90 border border-white/10 shadow-md hover:border-cyan-400/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Occupancy</span>
                    <Building2 size={14} className="text-sky-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      <CountUp to={mode.occupancy} prefix="" suffix="%" decimals={1} />
                    </span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded">
                    Optimal
                  </span>
                </div>

                {/* KPI 3: Contracted Annual */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F1F]/90 border border-white/10 shadow-md hover:border-indigo-400/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Annualized</span>
                    <TrendingUp size={14} className="text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      <CountUp to={mode.runRate} prefix="$" suffix="" decimals={0} />
                    </span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    Contracted
                  </span>
                </div>

                {/* KPI 4: Inbound Pipeline */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F1F]/90 border border-white/10 shadow-md hover:border-amber-400/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Inbound Deals</span>
                    <Zap size={14} className="text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      $58,400
                    </span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    3 AI Leads
                  </span>
                </div>
              </div>

              {/* Data Ingestion Terminal Node */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-port-ping shadow-[0_0_12px_rgba(56,189,248,1)]" />
                  <span className="text-slate-300 font-mono text-[11px]">
                    Incoming Telemetry: <strong>3 Data Streams Active</strong> (Lease, Maintenance, Smart Rent)
                  </span>
                </div>
                <Link
                  href="/demo-site"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline"
                >
                  <span>Explore Demo Site</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. High-End Cashflow & Occupancy Trend Chart Engine ── */}
        <div className="p-5 sm:p-8 bg-[#070A14]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Portfolio Cashflow & Occupancy Velocity
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400">
                  Live Synced
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuous reconciliation from tenant payments, utility meters, and OpsIQ lead pipeline.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium text-slate-300">
              <span className="inline-block w-3 h-1.5 rounded-full bg-sky-400" />
              <span>Historical Rent Roll</span>
              <span className="inline-block w-3 h-1.5 rounded-full bg-emerald-400 ml-3" />
              <span>OpsIQ 90-Day Projections</span>
            </div>
          </div>

          {/* Embedded Full Interactive HeroChart Component */}
          <HeroChart />
        </div>
      </div>
    </div>
  );
}
