"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Globe,
  Layers,
  Search,
  Bot,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";

export default function ProWebsiteShowcaseCard() {
  return (
    <div className="relative mx-auto max-w-7xl my-16 px-5 group">
      {/* Ambient Glows */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-purple-600/15 to-cyan-400/20 rounded-[2.5rem] blur-[60px] opacity-70 group-hover:opacity-95 transition-opacity pointer-events-none" />

      {/* Main Showcase Container */}
      <div className="relative rounded-3xl border border-white/20 bg-gradient-to-br from-[rgba(10,15,29,0.95)] via-[rgba(8,12,22,0.92)] to-[rgba(5,8,16,0.95)] backdrop-blur-2xl p-6 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_50px_rgba(56,189,248,0.12)] overflow-hidden">
        
        {/* Top Highlight Shimmer */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ── Left Content (7 Cols) ── */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Tier Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/15 to-purple-500/15 border border-sky-400/30 text-sky-300 text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <Sparkles size={13} className="text-sky-400 animate-pulse" />
              <span>INCLUDED WITH PRO TIER ($499/mo)</span>
            </div>

            {/* Headline */}
            <div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Your Entire Portfolio, Live on the Web in One Click.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Built with agency-grade web architecture right out of the box. OperateIQ automatically generates a premier public property showcase site powered by <strong>Ultra SEO &amp; Generative AI Search (GEO)</strong> — synced live with your rent roll and availability.
              </p>
            </div>

            {/* Key Feature Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-emerald-400">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Generative AI Search (GEO)</h4>
                  <p className="text-[11px] text-slate-400">Schema.org data cited by ChatGPT, Perplexity & Google AI.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-sky-500/20 border border-sky-400/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-sky-400">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Custom Domain & Branding</h4>
                  <p className="text-[11px] text-slate-400">Host on your domain with your logo, colors & floorplans.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-purple-500/20 border border-purple-400/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-purple-300">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Direct-to-CRM Tour Ingestion</h4>
                  <p className="text-[11px] text-slate-400">Tour requests feed straight into your OperateIQ sales board.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-400">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Real-Time Availability Sync</h4>
                  <p className="text-[11px] text-slate-400">Units update automatically when marked leased in your dashboard.</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <Link
                href="/demo-site"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-bold text-xs shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:opacity-95 transition-all flex items-center gap-2 group/btn"
              >
                <span>Launch Interactive Demo Site</span>
                <ExternalLink size={13} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </Link>
              
              <Link
                href="/signup?plan=pro"
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <span>Start Pro 14-Day Free Trial</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* ── Right Content (5 Cols): Interactive Browser Mockup ── */}
          <div className="lg:col-span-5 relative">
            <Link
              href="/demo-site"
              className="block group/mockup relative rounded-2xl border border-white/20 bg-[#060911] shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-300 hover:border-sky-400/50 hover:shadow-[0_0_35px_rgba(56,189,248,0.25)] hover:-translate-y-1"
            >
              {/* Browser Window Bar */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-[#090D18]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80" />
                </div>

                {/* Simulated URL bar */}
                <div className="px-3 py-1 rounded-md bg-black/50 border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1.5 flex-1 max-w-[12rem] min-w-0 mx-2 truncate justify-center">
                  <span className="text-emerald-400">🔒</span>
                  <span className="text-slate-200 truncate">acme-regional.demo</span>
                </div>

                <div className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                  <span>LIVE</span>
                  <ExternalLink size={10} />
                </div>
              </div>

              {/* Miniature Live Preview Canvas */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-[#070A12]">
                {/* Background Hero Banner Preview */}
                <Image
                  src="/demo-properties/heritage-square-mixed-use.jpg"
                  alt="ACME Regional Demo Site Mockup"
                  fill
                  className="object-cover group-hover/mockup:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/60 to-black/30" />

                {/* Floating Site Header Overlay */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15">
                    <Building2 size={12} className="text-sky-400" />
                    <span className="text-[10px] font-bold text-white">ACME Regional</span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 backdrop-blur-md">
                    AI Search Ready
                  </span>
                </div>

                {/* Floating Hero Specs Overlay */}
                <div className="absolute bottom-3 inset-x-3 p-3 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 space-y-1.5 pointer-events-none">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-white">Heritage Square Mixed-Use</span>
                    <span className="text-[10px] font-bold text-sky-300 font-mono">$24/SF · $1,650/mo</span>
                  </div>
                  <p className="text-[10px] text-slate-300 line-clamp-1">
                    Downtown Main St · 1,850 RSF Cafe + 12 Residential Lofts
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] text-slate-400">
                    <span>Includes AI Search (GEO) Schema</span>
                    <span className="text-sky-400 font-bold flex items-center gap-0.5">
                      Preview Site <ArrowRight size={10} />
                    </span>
                  </div>
                </div>

                {/* Hover Invitation Overlay */}
                <div className="absolute inset-0 bg-sky-950/20 opacity-100 sm:opacity-0 sm:group-hover/mockup:opacity-100 transition-opacity backdrop-blur-[1px] flex items-center justify-center">
                  <span className="px-3.5 py-1.5 rounded-xl bg-black/85 border border-sky-400/50 text-sky-300 text-xs font-bold shadow-xl flex items-center gap-1.5">
                    <span>Open Demo Website</span>
                    <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
