"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldCheck, ArrowRight, Loader2, Sparkles } from "lucide-react";

interface DirectAdminRedirectProps {
  orgSlug: string;
  orgName: string;
  targetPath?: string;
}

export default function DirectAdminRedirect({
  orgSlug,
  orgName,
  targetPath = "/admin",
}: DirectAdminRedirectProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function activateAndRedirect() {
      try {
        const res = await fetch("/api/platform/set-active-org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: orgSlug }),
        });

        if (!res.ok) {
          throw new Error("Unable to establish organization workspace session.");
        }

        if (isMounted) {
          setStatus("ready");
          // Short delay for visual confirmation of workspace switch
          setTimeout(() => {
            router.push(targetPath);
          }, 450);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Direct admin redirect error:", err);
          setStatus("error");
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to load organization workspace."
          );
        }
      }
    }

    activateAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [orgSlug, targetPath, router]);

  return (
    <div className="min-h-screen bg-[#060911] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md glass border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center backdrop-blur-xl">
        {/* Glow Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <Sparkles size={12} className="text-sky-400" />
          <span>Dedicated Workspace Entry</span>
        </div>

        {/* Workspace Icon */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 border border-white/20">
          <Building2 size={32} className="text-white" />
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          {orgName}
        </h1>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck size={12} />
            Pro Tier Active
          </span>
          <span className="text-xs text-slate-400 font-mono">
            slug: {orgSlug}
          </span>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 size={24} className="text-sky-400 animate-spin" />
            <p className="text-sm text-slate-300 font-medium">
              Activating your dedicated workspace...
            </p>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-sky-400 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="flex flex-col items-center gap-3 py-4 text-emerald-400">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <ArrowRight size={16} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold">Workspace loaded! Opening dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="py-4">
            <p className="text-sm text-rose-400 mb-4">{errorMessage}</p>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-sm transition-all shadow-md"
            >
              <span>Continue to Admin</span>
              <ArrowRight size={14} />
            </a>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 text-xs text-slate-400 flex items-center justify-between">
          <span>OperateIQ Engine</span>
          <a href="/login" className="hover:text-white transition-colors">
            Account Switcher
          </a>
        </div>
      </div>
    </div>
  );
}
