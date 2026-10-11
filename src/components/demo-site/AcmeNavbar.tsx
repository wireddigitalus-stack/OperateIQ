"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Sparkles, Calendar, ArrowRight, ShieldCheck, Search, Phone, ExternalLink } from "lucide-react";

interface AcmeNavbarProps {
  onOpenAiInspector: () => void;
  onOpenTourModal: (propertyId?: string) => void;
}

export default function AcmeNavbar({
  onOpenAiInspector,
  onOpenTourModal,
}: AcmeNavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-20 bg-[#080C14]/90 backdrop-blur-xl border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <Link href="/demo-site" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 flex items-center justify-center text-white shadow-[0_0_18px_rgba(59,130,246,0.35)] group-hover:scale-105 transition-transform">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-white tracking-tight uppercase group-hover:text-sky-300 transition-colors">
                  ACME Regional
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Live Portfolio
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium tracking-wide hidden sm:block">
                Regional Commercial, Residential & Mixed-Use Holdings
              </p>
            </div>
          </Link>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-gray-300">
          <a href="#portfolio" className="hover:text-white transition-colors">
            Featured Assets
          </a>
          <a href="#spaces" className="hover:text-white transition-colors">
            Available Spaces
          </a>
          <a href="#amenities" className="hover:text-white transition-colors">
            Tenant Amenities
          </a>
          <button
            onClick={onOpenAiInspector}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold transition-all shadow-[0_0_12px_rgba(56,189,248,0.15)]"
          >
            <Sparkles size={12} className="text-sky-400 animate-pulse" />
            <span>AI Search & GEO Engine</span>
          </button>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenAiInspector}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-bold"
            title="Inspect how ChatGPT and Perplexity index ACME listings"
          >
            <Sparkles size={13} className="text-sky-400" />
            <span className="hidden sm:inline">AI Search</span>
          </button>

          <button
            onClick={() => onOpenTourModal()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-95 shadow-[0_0_18px_rgba(59,130,246,0.35)] transition-all flex items-center gap-1.5"
          >
            <Calendar size={13} />
            <span>Schedule Tour</span>
          </button>

          <Link
            href="/admin"
            className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold transition-all"
            title="Return to OperateIQ Admin Dashboard"
          >
            <span>Admin</span>
            <ExternalLink size={11} className="text-gray-400" />
          </Link>
        </div>
      </div>
    </header>
  );
}
