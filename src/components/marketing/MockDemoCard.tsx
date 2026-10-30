"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Sparkles,
  Bell,
  AlertTriangle,
  Building2,
  DollarSign,
  Wrench,
  ArrowRight,
  Zap,
  ChevronRight,
  Search,
} from "lucide-react";
import HeroChart, { CountUp } from "./HeroChart";

const KPIS = [
  { label: "Net Monthly Rent", to: 284500, prefix: "$", suffix: "", decimals: 0, change: "+14.8% YoY", sub: "98.4% collected on-time", icon: DollarSign, color: "text-emerald-400" },
  { label: "Annualized Run Rate", to: 3414000, prefix: "$", suffix: "", decimals: 0, change: "+$442k added", sub: "Contracted lease value", icon: TrendingUp, color: "text-sky-400" },
  { label: "Portfolio Occupancy", to: 96.4, prefix: "", suffix: "%", decimals: 1, change: "+5.2% vs Q1", sub: "98 of 102 units leased", icon: Building2, color: "text-indigo-400" },
  { label: "Inbound Pipeline", to: 58400, prefix: "$", suffix: "/mo", decimals: 0, change: "3 Whale Leads", sub: "PropOpsIQ scored & verified", icon: Zap, color: "text-amber-400" },
];

export default function MockDemoCard() {
  const [activeAlert, setActiveAlert] = useState<number>(0);

  return (
    <div className="relative mx-auto max-w-6xl mt-12 group">
      {/* Ambient aura */}
      <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-blue-600/30 via-indigo-600/25 to-cyan-400/25 rounded-[3.2rem] blur-[80px] opacity-75 group-hover:opacity-95 transition-opacity duration-1000 pointer-events-none" />
      <div className="absolute -top-32 left-1/4 w-[420px] h-[420px] bg-cyan-400/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-[420px] h-[420px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Frosted window */}
      <div className="relative rounded-3xl sm:rounded-[2.4rem] border border-white/20 bg-[rgba(9,13,26,0.92)] backdrop-blur-3xl shadow-[0_32px_100px_rgba(0,0,0,0.8),0_0_60px_rgba(56,189,248,0.15)] overflow-hidden text-left">
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* 1. Window bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-7 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-white/10">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              <span className="text-xs font-bold text-white tracking-wide">ACME Regional Property Partners</span>
              <span className="hidden md:inline-block text-[11px] font-medium text-slate-400 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                Portfolio Command · 4 Regional Assets
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 font-mono text-[11px]">
              <Search size={13} className="text-sky-400" />
              <span>⌘K Quick Jump</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>LIVE</span>
            </div>
          </div>
        </div>

        {/* 2. PropOpsIQ Daily Brief */}
        <div className="px-5 sm:px-7 py-3.5 bg-gradient-to-r from-blue-600/[0.14] via-indigo-600/[0.08] to-cyan-500/[0.14] border-b border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(56,189,248,0.45)]">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">PropOpsIQ Daily Brief</span>
                <span className="text-[10px] text-sky-300 font-mono px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30">08:00 AM · Auto-generated</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                “October collections are 98.4% complete (+$38k ahead of forecast). 2 lease notices sent. Chiller loop repair underway.”
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/12 transition-all cursor-pointer self-end sm:self-auto flex-shrink-0 shadow-[0_0_14px_rgba(56,189,248,0.18)]">
            <Sparkles size={13} className="text-sky-400" />
            <span>Ask PropOpsIQ</span>
            <ChevronRight size={13} className="text-slate-400" />
          </div>
        </div>

        {/* 3. KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] border-b border-white/[0.08]">
          {KPIS.map((item) => (
            <div key={item.label} className="bg-[#090D1A]/95 p-4 sm:p-5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{item.label}</span>
                <item.icon size={15} className={item.color} />
              </div>
              <div className="flex flex-wrap items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  <CountUp to={item.to} prefix={item.prefix} suffix={item.suffix} decimals={item.decimals} />
                </span>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md">{item.change}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* 4. Hero chart */}
        <div className="p-4 sm:p-7">
          <HeroChart />
        </div>

        {/* 5. Action Center */}
        <div className="px-5 sm:px-7 pb-6 sm:pb-7">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Action Center</h4>
            </div>
            <span className="text-[11px] text-slate-400">3 items need a decision</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                tone: "red", icon: AlertTriangle, tag: "30-Day Renewal", meta: "Oct 31",
                title: "Heritage Cafe & Bakery", sub: "Heritage Square · #101 · $2,400/mo",
                left: "+4.5% Escalation", leftCls: "text-emerald-400", action: "Send Renewal",
              },
              {
                tone: "blue", icon: Zap, tag: "Whale Lead (Score 96)", meta: "$6,800/mo",
                title: "Valley Medical Practice", sub: "2,400 sqft · Matches Oakridge Plaza #210",
                left: "Scored by PropOpsIQ", leftCls: "text-slate-300", action: "Review LOI",
              },
              {
                tone: "amber", icon: Wrench, tag: "Crew Dispatched", meta: "14m ago",
                title: "Chiller Loop Valve Inspection", sub: "Oakridge Plaza · Assigned to Mike R.",
                left: "Parts On Site", leftCls: "text-emerald-400", action: "View Ticket",
              },
            ].map((a, idx) => {
              const tones: Record<string, { on: string; tag: string }> = {
                red: { on: "bg-red-500/[0.08] border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]", tag: "bg-red-500/15 text-red-400 border-red-500/30" },
                blue: { on: "bg-blue-500/[0.08] border-blue-400/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]", tag: "bg-blue-500/15 text-sky-400 border-blue-400/30" },
                amber: { on: "bg-amber-500/[0.08] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]", tag: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
              };
              const t = tones[a.tone];
              return (
                <div
                  key={a.title}
                  onClick={() => setActiveAlert(idx)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${activeAlert === idx ? t.on : "bg-white/[0.02] border-white/10 hover:border-white/20"}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${t.tag}`}>
                      <a.icon size={11} />
                      <span>{a.tag}</span>
                    </span>
                    <span className={`text-[10px] ${a.tone === "blue" ? "text-emerald-400 font-bold" : "text-slate-400 font-mono"}`}>{a.meta}</span>
                  </div>
                  <p className="text-xs font-bold text-white truncate">{a.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{a.sub}</p>
                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${a.leftCls}`}>{a.left}</span>
                    <span className="text-sky-400 font-semibold flex items-center gap-1 hover:underline">
                      {a.action} <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
