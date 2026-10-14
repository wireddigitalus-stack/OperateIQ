"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");
  const redirected = useRef(false);

  useEffect(() => {
    function getNextPath(): string {
      if (typeof window === "undefined") return "/admin";
      const sp = new URLSearchParams(window.location.search);
      const fromQuery = sp.get("next");
      const fromStorage = sessionStorage.getItem("oiq_auth_next");
      sessionStorage.removeItem("oiq_auth_next");
      const candidate = fromQuery || fromStorage || "/admin";
      if (candidate.startsWith("/") && !candidate.startsWith("//")) {
        return candidate;
      }
      return "/admin";
    }

    function goToAdmin() {
      if (redirected.current) return;
      redirected.current = true;
      router.replace(getNextPath());
    }

    // Check for PKCE ?code= query parameter
    if (typeof window !== "undefined" && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const errorDesc = searchParams.get("error_description");
      const fallbackLogin = searchParams.get("next") === "/platform" ? "/platform" : "/admin/login";
      if (errorDesc) {
        setStatus(`Sign-in error: ${decodeURIComponent(errorDesc)}`);
        setTimeout(() => router.replace(fallbackLogin), 2500);
        return;
      }
      if (code) {
        supabaseBrowser.auth
          .exchangeCodeForSession(code)
          .then(({ data, error }) => {
            if (!error && data.session) {
              goToAdmin();
            }
          })
          .catch(() => {
            // Let fallback listener / poll handle it
          });
      }
    }

    // Direct hash inspection (Supabase OAuth sends #access_token=...&refresh_token=...)
    if (typeof window !== "undefined" && window.location.hash) {
      const hashStr = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hashStr);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const errorDesc = params.get("error_description");

      if (errorDesc) {
        setStatus(`Sign-in error: ${decodeURIComponent(errorDesc)}`);
        setTimeout(() => router.replace(getNextPath() === "/platform" ? "/platform" : "/admin/login"), 2500);
        return;
      }

      if (accessToken && refreshToken) {
        supabaseBrowser.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(({ data, error }) => {
            if (!error && data.session) {
              goToAdmin();
            }
          })
          .catch(() => {
            // Let fallback listener / poll handle it
          });
      }
    }

    // Listen for ANY auth event that has a session — Supabase fires
    // INITIAL_SESSION (not SIGNED_IN) after PKCE token extraction
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (session) goToAdmin();
      }
    );

    // Backup: poll every 500ms for up to 8 seconds
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await supabaseBrowser.auth.getSession();
      if (data.session) {
        clearInterval(interval);
        goToAdmin();
      } else if (attempts >= 16) {
        clearInterval(interval);
        setStatus("Sign-in timed out — redirecting…");
        setTimeout(() => router.replace(getNextPath() === "/platform" ? "/platform" : "/admin/login"), 1000);
      }
    }, 500);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(59,130,246,0.35)]">
          <Loader2 size={24} className="text-white animate-spin" />
        </div>
        <h2 className="text-base font-bold text-white mb-1">OperateIQ</h2>
        <p className="text-xs text-gray-400">{status}</p>
      </div>
    </div>
  );
}
