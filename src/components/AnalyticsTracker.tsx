// ══════════════════════════════════════════════════════════════════════════════
// AnalyticsTracker — Client component wrapper that injects useAnalytics
// into the root layout.  Renders nothing visible — purely a behavior hook.
// Wrapped in Suspense because useSearchParams() requires it in Next.js 14+.
// ══════════════════════════════════════════════════════════════════════════════

"use client";

import { Suspense } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

function AnalyticsInner() {
  useAnalytics();
  return null;
}

export default function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}
