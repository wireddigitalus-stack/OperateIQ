"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Phone, MessageSquare } from "lucide-react";
import { COMPANY } from "@/lib/data";

/**
 * MobileStickyBar
 * Shown only on mobile/tablet (hidden on lg+). Provides a persistent
 * "Call Now" and "Ask VISION" bar at the bottom of the screen —
 * the two highest-intent actions for mobile visitors.
 * Hidden on admin and staff dashboards which have their own UI.
 *
 * Auto-hides on scroll down (user is reading content) and
 * reappears on scroll up (user wants to take action) — matching
 * the iOS Safari URL-bar pattern for a native feel.
 */
export default function MobileStickyBar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const lastScrollY = useRef(0);
  const scrollDelta = useRef(0);
  const ticking = useRef(false);

  const THRESHOLD = 15; // px of intentional scroll before toggling

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;
      const atTop = currentY < 50;
      const atBottom =
        window.innerHeight + currentY >=
        document.documentElement.scrollHeight - 50;

      if (atBottom) {
        // Always show at page bottom — user reached end, show CTA
        setIsVisible(true);
        scrollDelta.current = 0;
      } else if (diff > 0) {
        // Scrolling down — accumulate and hide after threshold
        scrollDelta.current = Math.max(0, scrollDelta.current + diff);
        if (scrollDelta.current > THRESHOLD) setIsVisible(false);
      } else if (diff < 0) {
        // Scrolling up — accumulate and show after threshold
        scrollDelta.current = Math.min(0, scrollDelta.current + diff);
        if (scrollDelta.current < -THRESHOLD) setIsVisible(true);
      }

      lastScrollY.current = currentY;
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Sync hide/show state to the document root so sibling components
  // (AI chat toggle, nudge card) can reposition via CSS — zero JS coupling.
  useEffect(() => {
    if (isVisible) {
      document.documentElement.classList.remove("mobile-bar-hidden");
    } else {
      document.documentElement.classList.add("mobile-bar-hidden");
    }
  }, [isVisible]);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/staff")) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom"
      style={{
        transform: isVisible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      role="complementary"
      aria-label="Quick contact actions"
    >
      {/* Gradient fade above the bar so content doesn't hard-cut */}
      <div className="h-6 bg-gradient-to-t from-[#080B0F] to-transparent pointer-events-none" />

      <div className="bg-[#080B0F]/95 backdrop-blur-xl border-t border-[rgba(74,222,128,0.15)] px-4 py-3 flex gap-3">
        {/* Primary: Call Now */}
        <a
          href={COMPANY.phoneHref}
          id="mobile-sticky-call"
          className="flex-1 flex items-center justify-center gap-2 bg-[#4ADE80] text-[#080B0F] font-bold text-sm rounded-xl py-3.5 hover:bg-[#6EF4A0] transition-colors active:scale-95"
          aria-label={`Call Vision LLC at ${COMPANY.phone}`}
        >
          <Phone size={16} />
          Call Now · {COMPANY.phone}
        </a>

        {/* Secondary: Open AI Chat */}
        <button
          id="mobile-sticky-chat"
          onClick={() =>
            (document.getElementById("lease-bot-toggle") as HTMLButtonElement)?.click()
          }
          className="flex items-center justify-center gap-2 border border-[rgba(74,222,128,0.3)] text-[#4ADE80] font-bold text-sm rounded-xl px-4 py-3.5 hover:bg-[rgba(74,222,128,0.08)] transition-colors active:scale-95"
          aria-label="Open VISION AI chat"
        >
          <MessageSquare size={16} />
          Ask VISION
        </button>
      </div>
    </div>
  );
}
