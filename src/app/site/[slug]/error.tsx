"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { reportClientError } from "@/lib/api-client";

export default function TenantSiteErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    reportClientError(error, "tenant-site").then((id) => {
      if (id) setErrorId(id);
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-[#0E1526] border border-white/10 p-8 shadow-2xl space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-300 mx-auto">
          <AlertTriangle size={22} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-black tracking-tight">Portfolio page temporarily unavailable</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            We hit a temporary issue loading this portfolio site. Please try refreshing in a moment.
          </p>
          {(errorId || error.digest) && (
            <p className="text-[11px] font-mono text-slate-400 bg-white/[0.04] border border-white/10 rounded-lg py-1.5 px-3 inline-block">
              Ref: {errorId || error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 font-semibold text-xs transition"
          >
            <Home size={14} />
            <span>PropOpsIQ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
