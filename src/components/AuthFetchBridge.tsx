"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AuthFetchBridge — attaches the signed-in user's Supabase access token to every
// same-origin `/api/*` request as `Authorization: Bearer <jwt>`, mirrors it into
// the `oiq_at` cookie so server components/layouts can verify the session, and
// intercepts HTTP 402 (`SUBSCRIPTION_INACTIVE`) responses so expired-trial saves
// never fail silently.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { CreditCard, X, ArrowRight } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

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

function isSameOriginApi(input: RequestInfo | URL): boolean {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function notifyIfSubscriptionRequired(res: Response) {
  if (res.status !== 402 || typeof window === "undefined") return;
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
    if (!isSameOriginApi(input)) return nativeFetch(input, init);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
        const res = await nativeFetch(input, { ...init, headers });
        notifyIfSubscriptionRequired(res);
        return res;
      }
    } catch {
      /* fall through unauthenticated */
    }
    const res = await nativeFetch(input, init);
    notifyIfSubscriptionRequired(res);
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

  useEffect(() => {
    const handler = (e: Event) => {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin")) return;
      const ce = e as CustomEvent<{ message?: string }>;
      setBillingPromptMsg(
        ce.detail?.message ||
          "Your free trial has ended or your subscription is inactive. Choose a plan in Settings → Billing to continue saving changes."
      );
    };
    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, handler);
  }, []);

  if (!billingPromptMsg) return null;

  return (
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
  );
}
