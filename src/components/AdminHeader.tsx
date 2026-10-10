"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LayoutDashboard, ShieldCheck } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isSuperAdmin } from "@/lib/platform";

export default function AdminHeader() {
  const router = useRouter();
  const [canAccessPlatform, setCanAccessPlatform] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (email && isSuperAdmin(email)) {
        setCanAccessPlatform(true);
      }
    }).catch(() => {});
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
          <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.08)] text-[10px] font-black text-[#4ADE80] uppercase tracking-widest">
            <LayoutDashboard size={9} />
            Admin
          </span>
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

      {/* ── Right: View Live Site CTA ── */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
          border border-[rgba(255,255,255,0.10)] text-gray-400
          hover:border-[rgba(255,255,255,0.22)] hover:text-white
          hover:bg-[rgba(255,255,255,0.04)]
          transition-all duration-150 group"
      >
        <span className="hidden sm:inline">View Live Site</span>
        <span className="sm:hidden">Live Site</span>
        <ExternalLink size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
      </a>
    </header>
  );
}
