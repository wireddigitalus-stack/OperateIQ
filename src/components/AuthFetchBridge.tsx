"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AuthFetchBridge — attaches the signed-in user's Supabase access token to every
// same-origin `/api/*` request as `Authorization: Bearer <jwt>`, and mirrors it
// into the `oiq_at` cookie so server components/layouts can verify the session.
//
// The patch is installed at MODULE EVALUATION time (not in an effect) so it is
// active before any child component fires its mount-time fetches.
// The server re-verifies every token with Supabase Auth — the client can't forge it.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const COOKIE = "oiq_at";

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
      // getSession() transparently refreshes an expired access token.
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
        return nativeFetch(input, { ...init, headers });
      }
    } catch {
      /* fall through unauthenticated */
    }
    return nativeFetch(input, init);
  };

  // Keep the cookie mirror in sync with the session lifecycle.
  supabaseBrowser.auth.getSession().then(({ data }) => {
    writeTokenCookie(data.session?.access_token ?? null, data.session?.expires_at);
  });
  supabaseBrowser.auth.onAuthStateChange((_event, session) => {
    writeTokenCookie(session?.access_token ?? null, session?.expires_at);
  });
}

export default function AuthFetchBridge() {
  // Module side effects do the work; this effect only guarantees the module is kept.
  useEffect(() => {}, []);
  return null;
}
