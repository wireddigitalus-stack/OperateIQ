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

  async function exitSupportMode() {
    try {
      await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: null }),
      });
      router.push("/platform");
      router.refresh();
    } catch {
      window.location.href = "/platform";
    }
  }

  if (loading || !org) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/30 px-4 py-2 text-xs flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2.5">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <div className="flex items-center gap-1.5 text-indigo-200">
          <ShieldAlert size={14} className="text-cyan-400" />
          <span className="font-semibold text-white">SUPPORT MODE:</span>
          <span>Managing</span>
          <strong className="text-white font-bold">{org.name}</strong>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            {org.tier} Plan
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/platform")}
          className="text-indigo-300 hover:text-white flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={12} />
          <span>Platform Directory</span>
        </button>
        <button
          onClick={exitSupportMode}
          className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <LogOut size={12} />
          <span>Exit Support Mode</span>
        </button>
      </div>
    </div>
  );
}
