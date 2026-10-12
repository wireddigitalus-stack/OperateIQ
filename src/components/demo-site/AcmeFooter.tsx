"use client";

import React from "react";
import Link from "next/link";
import { Building2, Sparkles, ExternalLink, ShieldCheck, ArrowUpRight } from "lucide-react";

interface AcmeFooterProps {
  onOpenAiInspector?: () => void;
  orgName?: string;
  phone?: string;
  email?: string;
  description?: string;
  isMember?: boolean;
}

export default function AcmeFooter({
  onOpenAiInspector,
  orgName,
  phone,
  email,
  description,
  isMember = false,
}: AcmeFooterProps) {
  return (
    <footer className="border-t border-white/10 bg-[#04070F] text-gray-400 py-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Top Disclaimer Banner - Only for Authenticated Org Members */}
        {isMember && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/20 via-blue-950/20 to-purple-950/20 border border-sky-400/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 flex-shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {orgName ? `${orgName} Public Property Website` : "Live Commercial Property Website"}
                </p>
                <p className="text-[11px] text-gray-400">
                  Workspace active · Managed by OperateIQ Site Engine.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin?tab=content"
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-white text-xs font-bold transition-all whitespace-nowrap"
              >
                Site Builder
              </Link>
              <Link
                href="/admin"
                className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold transition-all whitespace-nowrap shadow-sm"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                <Building2 size={16} />
              </div>
              <span className="text-sm font-black text-white uppercase tracking-tight">
                {orgName || "ACME Regional"}
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {description ||
                (orgName
                  ? `Managing premier commercial office suites, tech campuses, creative studios, and residential portfolios for ${orgName}.`
                  : "Managing a diversified regional portfolio of historic downtown mixed-use lofts, healthcare plazas, garden-style apartments, and contractor flex parks across Oakridge Valley.")}
            </p>
            {(phone || email) && (
              <div className="pt-2 text-xs space-y-1">
                {phone && (
                  <p className="text-slate-300">
                    <span className="text-slate-500">Phone: </span>
                    <a href={`tel:${phone.replace(/[^0-9]/g, "")}`} className="hover:text-sky-300 transition-colors">
                      {phone}
                    </a>
                  </p>
                )}
                {email && (
                  <p className="text-slate-300">
                    <span className="text-slate-500">Email: </span>
                    <a href={`mailto:${email}`} className="hover:text-sky-300 transition-colors">
                      {email}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Asset Classes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Asset Classes
            </h4>
            <ul className="text-xs space-y-1.5 text-gray-400">
              <li>Main Street Mixed-Use & Lofts</li>
              <li>Medical & Professional Plazas</li>
              <li>Garden-Style Multi-Family</li>
              <li>Contractor Flex & Trade Bays</li>
            </ul>
          </div>

          {/* Submarkets */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Regional Markets
            </h4>
            <ul className="text-xs space-y-1.5 text-gray-400">
              <li>Historic Downtown Main St</li>
              <li>Valley Medical Corridor</li>
              <li>Pinecrest Residential District</li>
              <li>Industrial Trade District</li>
            </ul>
          </div>

          {/* Quick Links / Ecosystem */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {isMember ? "OperateIQ Architecture" : "Company & Platform"}
            </h4>
            <ul className="text-xs space-y-1.5">
              {isMember && (
                <>
                  <li>
                    <Link href="/admin" className="text-sky-400 hover:underline flex items-center gap-1">
                      <span>Owner Admin Dashboard</span>
                      <ArrowUpRight size={11} />
                    </Link>
                  </li>
                  <li>
                    <Link href="/platform" className="text-sky-400 hover:underline flex items-center gap-1">
                      <span>Platform Master Console</span>
                      <ArrowUpRight size={11} />
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1">
                  <span>OperateIQ Platform</span>
                  <ArrowUpRight size={11} />
                </Link>
              </li>
              <li>
                <a href="#contact" className="text-gray-400 hover:text-white flex items-center gap-1">
                  <span>Contact Leasing Office</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3">
          <p>© {new Date().getFullYear()} {orgName || "Commercial Property Partners"}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Powered by</span>
            <strong className="text-gray-300">OperateIQ</strong>
            <span>Property Intelligence Platform</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
