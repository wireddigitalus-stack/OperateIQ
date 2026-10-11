"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";

interface ImpersonatingOrg {
  id: string;
  name: string;
  slug: string;
  tier: string;
}

export default function ImpersonationBanner() {
  const router = useRouter();
  const [org, setOrg] = useState<ImpersonatingOrg | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.impersonatingOrg) {
          setOrg(data.impersonatingOrg);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (org) {
      document.body.classList.add("has-support-banner");
    } else {
      document.body.classList.remove("has-support-banner");
    }
    return () => {
      document.body.classList.remove("has-support-banner");
    };
  }, [org]);

  async function exitSupportMode() {
    try {
      await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: null }),
      });
      document.body.classList.remove("has-support-banner");
      router.push("/platform");
      router.refresh();
    } catch {
      window.location.href = "/platform";
    }
  }

  if (loading || !org) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-[#0D1528] via-[#09101E] to-[#0D1528] border-b border-indigo-500/30 px-4 sm:px-6 py-2 text-xs flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-2 w-2 relative flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <div className="flex items-center gap-1.5 text-indigo-200 truncate">
          <ShieldAlert size={14} className="text-cyan-400 flex-shrink-0" />
          <span className="font-semibold text-white whitespace-nowrap">SUPPORT MODE:</span>
          <span className="hidden sm:inline text-gray-400">Managing</span>
          <strong className="text-white font-bold truncate max-w-[140px] sm:max-w-[260px]">{org.name}</strong>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 whitespace-nowrap hidden md:inline-block">
            {org.tier} Plan
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        <button
          onClick={() => router.push("/platform")}
          className="text-indigo-300 hover:text-white flex items-center gap-1 transition-colors text-xs whitespace-nowrap"
        >
          <ArrowLeft size={12} />
          <span className="hidden sm:inline">Platform Directory</span>
          <span className="sm:hidden">Directory</span>
        </button>
        <button
          onClick={exitSupportMode}
          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm text-xs whitespace-nowrap"
        >
          <LogOut size={12} />
          <span>Exit Support Mode</span>
        </button>
      </div>
    </div>
  );
}
