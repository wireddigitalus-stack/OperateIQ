"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Sparkles, Calendar, ArrowRight, ShieldCheck, Search, Phone, ExternalLink } from "lucide-react";

interface AcmeNavbarProps {
  onOpenAiInspector: () => void;
  onOpenTourModal: (propertyId?: string) => void;
  orgName?: string;
  hasTopBar?: boolean;
}

export default function AcmeNavbar({
  onOpenAiInspector,
  onOpenTourModal,
  orgName,
  hasTopBar,
}: AcmeNavbarProps) {
  return (
    <header className={`fixed ${hasTopBar ? "top-10" : "top-0"} left-0 right-0 z-40 h-20 bg-[#080C14]/90 backdrop-blur-xl border-b border-white/10 transition-all`}>
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
                  {orgName || "ACME Regional"}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Live Portfolio
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium tracking-wide hidden sm:block">
                {orgName ? `${orgName} · Property Portfolio` : "Regional Commercial, Residential & Mixed-Use Holdings"}
              </p>
            </div>
          </Link>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-300">
          <a href="#portfolio" className="hover:text-white transition-colors">
            Featured Assets
          </a>
          <a href="#spaces" className="hover:text-white transition-colors">
            Available Spaces
          </a>
          <a href="#amenities" className="hover:text-white transition-colors">
            Tenant Amenities
          </a>
        </nav>

        {/* Right Action Button: Schedule Tour */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenTourModal()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_18px_rgba(59,130,246,0.35)] transition-all flex items-center gap-2"
          >
            <Calendar size={14} />
            <span>Schedule Tour</span>
          </button>
        </div>
      </div>
    </header>
  );
}
