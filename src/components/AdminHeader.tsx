"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LayoutDashboard, ShieldCheck, Building2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isSuperAdmin } from "@/lib/platform";

export default function AdminHeader() {
  const router = useRouter();
  const [canAccessPlatform, setCanAccessPlatform] = useState(false);
  const [activeOrg, setActiveOrg] = useState<{ id: string; name: string; slug: string; tier: string } | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (email && isSuperAdmin(email)) {
        setCanAccessPlatform(true);
      }
    }).catch(() => {});

    fetch("/api/platform/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.isSuperAdmin) setCanAccessPlatform(true);
        if (data.impersonatingOrg) setActiveOrg(data.impersonatingOrg);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6
      bg-[rgba(8,12,20,0.92)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">

      {/* ── Left: Logo + context badge ── */}
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
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-indigo-500/40 bg-indigo-950/60 text-[11px] font-bold text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
              <Building2 size={11} className="text-cyan-400" />
              <span>{activeOrg.name}</span>
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-white/15 bg-white/[0.04] text-[10px] font-black text-sky-400 uppercase tracking-widest shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <LayoutDashboard size={9} />
              Admin
            </span>
          )}
        </button>

        {canAccessPlatform && (
          <Link
            href="/platform"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900/60 hover:text-white transition-all shadow-sm"
          >
            <ShieldCheck size={13} className="text-cyan-400" />
            <span className="hidden md:inline">Platform Master Console</span>
            <span className="md:hidden">Platform</span>
          </Link>
        )}
      </div>

      {/* ── Right: Live Site Preview Links ── */}
      <div className="flex items-center gap-2">
        <a
          href="/demo-site"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/10 border border-sky-400/30 text-sky-300 hover:bg-sky-500/20 hover:text-white shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all"
          title="Open the public ACME Commercial property demo site"
        >
          <Building2 size={12} className="text-sky-400" />
          <span className="hidden md:inline">ACME Property Site</span>
          <span className="md:hidden">Property Site</span>
          <ExternalLink size={10} />
        </a>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
          title="View OperateIQ SaaS product homepage"
        >
          <span className="hidden sm:inline">SaaS Site</span>
          <ExternalLink size={10} />
        </a>
      </div>
    </header>
  );
}
