"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");
  const [pkceError, setPkceError] = useState(false);
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

    let interval: ReturnType<typeof setInterval>;

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
          .then(async ({ data, error }) => {
            if (!error && data.session) {
              goToAdmin();
            } else if (error) {
              const { data: sessionData } = await supabaseBrowser.auth.getSession();
              if (sessionData.session) {
                goToAdmin();
              } else {
                clearInterval(interval);
                setPkceError(true);
                setStatus(
                  "This sign-in link was opened in a different browser or email app than where it was requested. Please open the link in your main browser, or sign in with your password or Google."
                );
              }
            }
          })
          .catch(async () => {
            const { data: sessionData } = await supabaseBrowser.auth.getSession();
            if (sessionData.session) {
              goToAdmin();
            } else {
              clearInterval(interval);
              setPkceError(true);
              setStatus(
                "This sign-in link was opened in a different browser or email app than where it was requested. Please open the link in your main browser, or sign in with your password or Google."
              );
            }
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
    interval = setInterval(async () => {
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
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_rgba(59,130,246,0.35)]">
          <Loader2 size={24} className={`text-white ${pkceError ? "" : "animate-spin"}`} />
        </div>
        <h2 className="text-base font-bold text-white mb-2">PropOpsIQ</h2>
        <p className="text-xs text-gray-300 leading-relaxed">{status}</p>
        {pkceError && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => router.replace("/admin/login")}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition-all cursor-pointer"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
