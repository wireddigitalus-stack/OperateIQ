// ══════════════════════════════════════════════════════════════════════════════
// Vision LLC — Internal Analytics Hook
// Lightweight, privacy-first, zero-dependency tracker.
// Assigns an anonymous session ID via cookie, tracks page views, scroll depth,
// time-on-page, CTA clicks, and property interest — all server-side via
// /api/analytics.  Adblockers can't touch it.
// ══════════════════════════════════════════════════════════════════════════════

"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// ── Session ID management ────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "";

  const COOKIE_NAME = "v_sid";
  const cookies = document.cookie.split(";").reduce((acc, c) => {
    const [k, v] = c.trim().split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {} as Record<string, string>);

  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];

  // Generate a new session ID (UUID v4-like)
  const sid = "s_" + crypto.randomUUID();
  // Set cookie for 30 days — survives browser close for return visitor tracking
  document.cookie = `${COOKIE_NAME}=${sid};path=/;max-age=${30 * 24 * 60 * 60};SameSite=Lax`;
  return sid;
}

// ── Device detection ─────────────────────────────────────────────────────────

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

// ── UTM parameter extraction ─────────────────────────────────────────────────

function getUtmParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  };
}

// ── Event sender (fire-and-forget via sendBeacon with fetch fallback) ─────────

interface AnalyticsEvent {
  session_id: string;
  event_type: string;
  page_path: string;
  page_title?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  event_data?: Record<string, unknown>;
  duration_ms?: number;
  device_type?: string;
  screen_width?: number;
}

function sendEvent(event: AnalyticsEvent): void {
  const payload = JSON.stringify(event);

  // Prefer sendBeacon for page unload reliability
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/analytics", payload);
    if (sent) return;
  }

  // Fallback to fetch (keepalive for page unload)
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Silent fail — analytics should never break the site
  });
}

// ── Exported: track custom events (CTA clicks, property clicks) ──────────────

export function trackEvent(
  eventType: string,
  eventData?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  const sid = getSessionId();
  if (!sid) return;

  sendEvent({
    session_id: sid,
    event_type: eventType,
    page_path: window.location.pathname,
    page_title: document.title,
    event_data: eventData,
    device_type: getDeviceType(),
    screen_width: window.innerWidth,
  });
}

// ── Exported: get session ID for form correlation ────────────────────────────

export function getAnalyticsSessionId(): string {
  return getSessionId();
}

// ── Main hook — auto-tracks page views, scroll, and time-on-page ─────────────

export function useAnalytics(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageEnteredAt = useRef<number>(Date.now());
  const maxScrollPct = useRef<number>(0);
  const hasTrackedView = useRef<string>("");

  // Track page view on route change
  useEffect(() => {
    // Skip admin pages
    if (pathname.startsWith("/admin")) return;

    const sid = getSessionId();
    if (!sid) return;

    // Deduplicate — don't re-fire for the same path
    const pageKey = pathname + (searchParams?.toString() || "");
    if (hasTrackedView.current === pageKey) return;
    hasTrackedView.current = pageKey;

    // Reset counters for new page
    pageEnteredAt.current = Date.now();
    maxScrollPct.current = 0;

    const utmParams = getUtmParams();

    sendEvent({
      session_id: sid,
      event_type: "page_view",
      page_path: pathname,
      page_title: document.title,
      referrer: document.referrer || undefined,
      ...utmParams,
      device_type: getDeviceType(),
      screen_width: window.innerWidth,
    });
  }, [pathname, searchParams]);

  // Track scroll depth (25%, 50%, 75%, 100% thresholds)
  const scrollThresholds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    // Reset thresholds on new page
    scrollThresholds.current = new Set();

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const pct = Math.round((scrollTop / docHeight) * 100);
      maxScrollPct.current = Math.max(maxScrollPct.current, pct);

      // Fire events at 25% thresholds
      const thresholds = [25, 50, 75, 100];
      for (const t of thresholds) {
        if (pct >= t && !scrollThresholds.current.has(t)) {
          scrollThresholds.current.add(t);
          trackEvent("scroll_depth", { scroll_pct: t, page_path: pathname });
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // Track time-on-page on unmount / page navigation
  const sendTimeOnPage = useCallback(() => {
    if (pathname.startsWith("/admin")) return;

    const sid = getSessionId();
    if (!sid) return;

    const duration = Date.now() - pageEnteredAt.current;
    if (duration < 1000) return; // Skip sub-1-second bounces

    sendEvent({
      session_id: sid,
      event_type: "time_on_page",
      page_path: pathname,
      duration_ms: duration,
      event_data: { max_scroll_pct: maxScrollPct.current },
      device_type: getDeviceType(),
      screen_width: window.innerWidth,
    });
  }, [pathname]);

  // Fire time-on-page when leaving
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const handleBeforeUnload = () => sendTimeOnPage();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also fire when React unmounts (SPA navigation)
      sendTimeOnPage();
    };
  }, [pathname, sendTimeOnPage]);
}
