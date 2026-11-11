"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AuthFetchBridge — attaches the signed-in user's Supabase access token to every
// same-origin `/api/*` request as `Authorization: Bearer <jwt>`, mirrors it into
// the `oiq_at` cookie so server components/layouts can verify the session,
// intercepts HTTP 402 (`SUBSCRIPTION_INACTIVE`) responses, renders global toast
// alerts (`TOAST_EVENT`), and forwards uncaught client crashes to `/api/client-error`.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { CreditCard, X, ArrowRight, AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { TOAST_EVENT, showToast, reportClientError, type ToastPayload } from "@/lib/api-client";

const COOKIE = "oiq_at";
export const SUBSCRIPTION_REQUIRED_EVENT = "oiq:subscription-required";

function writeTokenCookie(token: string | null, expiresAt?: number) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  if (!token) {
    document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    return;
  }
  const maxAge = expiresAt ? Math.max(60, expiresAt - Math.floor(Date.now() / 1000)) : 3600;
  document.cookie = `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function getApiPathname(input: RequestInfo | URL): string | null {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

function inspectApiFailure(res: Response, pathname: string, method: string) {
  if (typeof window === "undefined") return;

  if (res.status === 402) {
    res
      .clone()
      .json()
      .then((data) => {
        window.dispatchEvent(
          new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT, {
            detail: {
              message:
                data?.error ||
                "Your free trial has ended or your subscription is inactive. Activate a plan in Settings → Billing to save changes.",
            },
          })
        );
      })
      .catch(() => {
        window.dispatchEvent(
          new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT, {
            detail: {
              message:
                "Your free trial has ended or your subscription is inactive. Activate a plan in Settings → Billing to save changes.",
            },
          })
        );
      });
    return;
  }

  // Never toast telemetry/error-reporting background endpoints
  if (
    pathname.startsWith("/api/analytics") ||
    pathname.startsWith("/api/client-error") ||
    pathname.startsWith("/api/portfolio-snapshot/record")
  ) {
    return;
  }

  // Automatically surface 5xx mutation failures so failed saves never go unnoticed
  const upperMethod = method.toUpperCase();
  const isMutation =
    upperMethod === "POST" || upperMethod === "PUT" || upperMethod === "PATCH" || upperMethod === "DELETE";

  if (isMutation && res.status >= 500) {
    res
      .clone()
      .json()
      .then((data) => {
        const msg =
          typeof data?.error === "string" && data.error.trim()
            ? data.error.trim()
            : `Server error (${res.status}) while saving changes. Please retry.`;
        showToast(msg, "error");
      })
      .catch(() => {
        showToast(`Server error (${res.status}) while saving changes. Please retry.`, "error");
      });
  }
}

declare global {
  interface Window {
    __oiqFetchPatched?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__oiqFetchPatched) {
  window.__oiqFetchPatched = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const pathname = getApiPathname(input);
    if (!pathname) return nativeFetch(input, init);
    const method = init?.method || (input instanceof Request ? input.method : "GET") || "GET";

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
        const res = await nativeFetch(input, { ...init, headers });
        inspectApiFailure(res, pathname, method);
        return res;
      }
    } catch {
      /* fall through unauthenticated */
    }
    const res = await nativeFetch(input, init);
    inspectApiFailure(res, pathname, method);
    return res;
  };

  supabaseBrowser.auth.getSession().then(({ data }) => {
    writeTokenCookie(data.session?.access_token ?? null, data.session?.expires_at);
  });
  supabaseBrowser.auth.onAuthStateChange((_event, session) => {
    writeTokenCookie(session?.access_token ?? null, session?.expires_at);
  });
}

export default function AuthFetchBridge() {
  const [billingPromptMsg, setBillingPromptMsg] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  useEffect(() => {
    const onSubRequired = (e: Event) => {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin")) return;
      const ce = e as CustomEvent<{ message?: string }>;
      setBillingPromptMsg(
        ce.detail?.message ||
          "Your free trial has ended or your subscription is inactive. Choose a plan in Settings → Billing to continue saving changes."
      );
    };

    const onToast = (e: Event) => {
      const ce = e as CustomEvent<ToastPayload>;
      const payload = ce.detail;
      if (!payload?.message) return;

      setToasts((prev) => {
        // Deduplicate identical message already on screen
        if (prev.some((t) => t.message === payload.message)) return prev;
        return [...prev.slice(-3), payload];
      });

      const ttl = payload.durationMs ?? 5000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== payload.id));
      }, ttl);
    };

    let reportedCount = 0;
    const onWindowError = (event: ErrorEvent) => {
      if (reportedCount >= 3) return;
      // Ignore benign ResizeObserver loop warnings
      if (/ResizeObserver loop/i.test(event.message || "")) return;
      reportedCount += 1;
      const err = event.error instanceof Error ? event.error : new Error(event.message || "Window error");
      reportClientError(err, "window-onerror").catch(() => {});
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (reportedCount >= 3) return;
      const reason = event.reason;
      if (reason && typeof reason === "object" && (reason as { name?: string }).name === "AbortError") return;
      if (reason && typeof reason === "object" && (reason as { name?: string }).name === "ApiError") return;
      reportedCount += 1;
      const err =
        reason instanceof Error
          ? reason
          : new Error(typeof reason === "string" ? reason : "Unhandled promise rejection");
      reportClientError(err, "unhandled-rejection").catch(() => {});
    };

    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, onSubRequired);
    window.addEventListener(TOAST_EVENT, onToast);
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, onSubRequired);
      window.removeEventListener(TOAST_EVENT, onToast);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <>
      {toasts.length > 0 && (
        <div
          role="region"
          aria-label="Notifications"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[110] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
        >
          {toasts.map((t) => {
            const palette =
              t.type === "success"
                ? "bg-[#0B1F1A]/95 border-emerald-400/35 text-emerald-100"
                : t.type === "warning"
                  ? "bg-[#22190B]/95 border-amber-400/35 text-amber-100"
                  : t.type === "info"
                    ? "bg-[#0D1829]/95 border-sky-400/35 text-sky-100"
                    : "bg-[#230D13]/95 border-rose-400/40 text-rose-100";
            const Icon =
              t.type === "success"
                ? CheckCircle2
                : t.type === "warning"
                  ? AlertTriangle
                  : t.type === "info"
                    ? Info
                    : AlertCircle;

            return (
              <div
                key={t.id}
                className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md text-xs leading-relaxed ${palette}`}
              >
                <Icon size={16} className="shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{t.message}</span>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  aria-label="Dismiss notification"
                  className="opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {billingPromptMsg && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D1322] border border-amber-400/35 p-7 shadow-2xl space-y-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <CreditCard size={20} />
              </div>
              <button
                type="button"
                onClick={() => setBillingPromptMsg(null)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight">Activate Your Plan to Save Changes</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{billingPromptMsg}</p>
              <p className="text-[11px] text-slate-400">
                All of your existing properties, tenants, and rent records remain safe in read-only mode until you subscribe.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBillingPromptMsg(null);
                  window.location.href = "/admin?tab=settings";
                }}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs cursor-pointer"
              >
                <span>Open Plan &amp; Billing</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setBillingPromptMsg(null)}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
