"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, LayoutDashboard, Globe, ExternalLink } from "lucide-react";

export default function AdminHeader() {
  const router = useRouter();
  const [activeOrg, setActiveOrg] = useState<{ id: string; name: string; slug: string; tier: string } | null>(null);

  useEffect(() => {
    fetch("/api/platform/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.activeOrg) setActiveOrg(data.activeOrg);
        else if (data.impersonatingOrg) setActiveOrg(data.impersonatingOrg);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6
      bg-[rgba(8,12,20,0.92)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">

      {/* ── Left: Logo + workspace context badge ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin?tab=leads")}
          className="flex items-center gap-2.5 group"
          aria-label="Go to dashboard home"
        >
          <Image
            src="/operateiq-logo.svg"
            alt="OperateIQ"
            width={88}
            height={28}
            className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
            priority
          />
          {activeOrg ? (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-950/50 text-[11px] font-bold text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.15)]">
              <Building2 size={11} className="text-cyan-400" />
              <span>{activeOrg.name}</span>
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-white/15 bg-white/[0.04] text-[10px] font-black text-sky-400 uppercase tracking-widest shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <LayoutDashboard size={9} />
              Workspace
            </span>
          )}
        </button>
      </div>

      {/* ── Right: View Public Site & Workspace Plan ── */}
      <div className="flex items-center gap-2.5">
        <a
          href="/demo-site"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/10 border border-sky-400/30 text-sky-300 hover:bg-sky-500/20 hover:text-white shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all"
          title={`View public website for ${activeOrg?.name || "your company"}`}
        >
          <Globe size={13} className="text-sky-400" />
          <span className="hidden sm:inline">View Public Site</span>
          <span className="sm:hidden">Public Site</span>
          <ExternalLink size={10} />
        </a>

        {activeOrg && (
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/10 text-gray-400">
            {activeOrg.tier} Tier
          </span>
        )}
      </div>
    </header>
  );
}
