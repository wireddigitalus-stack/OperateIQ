"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Sparkles, Calendar, ArrowRight, ShieldCheck, Search, Phone, ExternalLink, Menu, X } from "lucide-react";

interface AcmeNavbarProps {
  onOpenAiInspector?: () => void;
  onOpenTourModal: (propertyId?: string) => void;
  orgName?: string;
  orgSlug?: string;
  orgPhone?: string | null;
  customDomain?: string | null;
  tier?: string;
  hasTopBar?: boolean;
  brandLogoUrl?: string | null;
  brandPrimaryColor?: string | null;
}

export default function AcmeNavbar({
  onOpenAiInspector,
  onOpenTourModal,
  orgName,
  orgSlug,
  orgPhone,
  customDomain,
  tier,
  hasTopBar,
  brandLogoUrl,
  brandPrimaryColor,
}: AcmeNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const homeHref = customDomain ? "/" : orgSlug ? `/site/${orgSlug}` : "/demo-site";
  const isStarter = tier === "starter";
  const brandName = orgName || "ACME Regional";

  const handleScheduleClick = () => {
    setMobileMenuOpen(false);
    if (isStarter) document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    else onOpenTourModal();
  };

  return (
    <header className={`fixed ${hasTopBar ? "top-10" : "top-0"} left-0 right-0 z-40 h-20 bg-[#080C14]/90 backdrop-blur-xl border-b border-white/10 transition-all`}>
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href={homeHref} className="flex items-center gap-3 group min-w-0">
            {brandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandLogoUrl}
                alt={brandName}
                className="h-9 w-auto rounded-lg object-contain shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 flex items-center justify-center text-white shadow-[0_0_18px_rgba(59,130,246,0.35)] group-hover:scale-105 transition-transform shrink-0"
                style={brandPrimaryColor ? { background: brandPrimaryColor } : undefined}
              >
                <Building2 size={20} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-white tracking-tight uppercase group-hover:text-sky-300 transition-colors truncate max-w-[160px] sm:max-w-none">
                  {brandName}
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

        {/* Center / Navigation Links (only sections that exist on the page) */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-300">
          {!isStarter && (
            <a href="#portfolio" className="hover:text-white transition-colors">
              Properties
            </a>
          )}
          <a href="#contact" className="hover:text-white transition-colors">
            Contact
          </a>
        </nav>

        {/* Right Action Button: Schedule Tour + Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleScheduleClick}
            className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_18px_rgba(59,130,246,0.35)] transition-all flex items-center gap-2"
            style={brandPrimaryColor ? { background: brandPrimaryColor } : undefined}
          >
            <Calendar size={14} />
            <span>{isStarter ? "Contact Us" : "Schedule Tour"}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#080C14]/98 backdrop-blur-xl border-b border-white/10 px-4 py-4 space-y-3 shadow-2xl">
          {!isStarter && (
            <a
              href="#portfolio"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-gray-200 hover:text-white transition-colors"
            >
              Properties
            </a>
          )}
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-gray-200 hover:text-white transition-colors"
          >
            Contact
          </a>
          {orgPhone && (
            <a
              href={`tel:${orgPhone}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <Phone size={15} />
              <span>{orgPhone}</span>
            </a>
          )}
          <button
            type="button"
            onClick={handleScheduleClick}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2"
            style={brandPrimaryColor ? { background: brandPrimaryColor } : undefined}
          >
            <Calendar size={14} />
            <span>{isStarter ? "Contact Us" : "Schedule Tour"}</span>
          </button>
        </div>
      )}
    </header>
  );
}
