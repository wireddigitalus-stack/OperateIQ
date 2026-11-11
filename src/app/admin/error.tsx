"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LifeBuoy } from "lucide-react";
import { reportClientError } from "@/lib/api-client";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    reportClientError(error, "admin-dashboard").then((id) => {
      if (id) setErrorId(id);
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl bg-[#0E1526] border border-amber-400/25 p-8 shadow-2xl space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 mx-auto">
          <AlertTriangle size={22} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black tracking-tight">Dashboard view encountered an error</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your properties, tenants, and ledger records are safe. We&apos;ve logged this crash automatically so our team can fix it.
          </p>
          {(errorId || error.digest) && (
            <p className="text-[11px] font-mono text-slate-400 bg-white/[0.04] border border-white/10 rounded-lg py-1.5 px-3 inline-block">
              Diagnostic ID: {errorId || error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Reload Dashboard</span>
          </button>
          <Link
            href="/help"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 font-semibold text-xs transition"
          >
            <LifeBuoy size={14} />
            <span>Report Issue</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
