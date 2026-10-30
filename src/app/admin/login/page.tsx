"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Loader2, Shield, Mail, KeyRound, ArrowRight, CheckCircle2, Zap, HelpCircle } from "lucide-react";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const modeParam = searchParams.get("mode");

  const [authMode, setAuthMode] = useState<"google" | "email" | "password">(
    modeParam === "password" ? "password" : modeParam === "email" ? "email" : emailParam ? "password" : "google"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
    if (modeParam === "password") {
      setAuthMode("password");
    } else if (modeParam === "email") {
      setAuthMode("email");
    } else if (emailParam) {
      setAuthMode("password");
    }
  }, [emailParam, modeParam]);

  // Already signed in? Skip the login screen.
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace("/admin");
    });
  }, []);

  // Security: purge any stale client-side demo tokens immediately
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("oiq_demo_auth");
    localStorage.removeItem("oiq_demo_auth");
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const redirectBase =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "");

      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectBase}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        if (error.message.includes("provider is not enabled") || error.message.includes("validation_failed")) {
          setError("Google OAuth is not enabled in your Supabase project yet. You can sign in using Email or enable Google in the Supabase Dashboard.");
        } else {
          setError(error.message);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmailOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setMagicLinkSent(false);
    setResetLinkSent(false);

    try {
      const redirectBase =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "");

      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${redirectBase}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setError("Failed to send magic link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Please enter your email address above first so we can send your reset / sign-in link.");
      return;
    }
    setLoading(true);
    setError("");
    setResetLinkSent(false);
    try {
      const redirectBase =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || "");
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${redirectBase}/auth/callback?next=/admin` }
      );
      if (error) {
        setError(error.message);
      } else {
        setResetLinkSent(true);
      }
    } catch {
      setError("Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/admin";
      }
    } catch {
      setError("Sign-in failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center px-5">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-600 opacity-[0.08] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/operateiq_google_ICON_logo_1791954043128.png"
            alt="OperateIQ"
            width={44}
            height={44}
            className="w-11 h-11 object-contain drop-shadow-[0_0_16px_rgba(34,211,238,0.4)]"
            priority
          />
          <span className="text-white font-extrabold tracking-tight text-2xl">
            Operate<span className="oiq-grad-text">IQ</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/15 bg-[rgba(13,17,27,0.7)] p-8 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(56,189,248,0.12)]">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(59,130,246,0.35)] text-white">
              <Shield size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-black text-white mb-1">OperateIQ</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Property Intelligence Platform</p>
            <p className="text-xs text-gray-400">Sign in to access your dashboard</p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setAuthMode("google"); setError(""); }}
              className={`py-2 rounded-lg transition-all ${
                authMode === "google"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("email"); setError(""); }}
              className={`py-2 rounded-lg transition-all ${
                authMode !== "google"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Email / Magic Link
            </button>
          </div>

          {/* Google Sign In */}
          {authMode === "google" && (
            <button
              id="google-signin-btn"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-semibold text-sm transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin text-gray-500" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.5 3.2 29.6 1 24 1 14.9 1 7.2 6.6 3.8 14.4l7 5.4C12.6 13.2 17.9 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.3 37.4 46.5 31.4 46.5 24.5z"/>
                  <path fill="#FBBC05" d="M10.8 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7-5.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8.2-6.1z"/>
                  <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-6.1 0-11.3-3.6-13.2-9.1l-8.2 6.1C7.2 41.5 14.9 47 24 47z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              )}
              {loading ? "Redirecting to Google…" : "Continue with Google"}
            </button>
          )}

          {/* Email Magic Link / Password */}
          {authMode !== "google" && (
            <div className="space-y-3">
              {magicLinkSent || resetLinkSent ? (
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/15 shadow-[0_0_20px_rgba(56,189,248,0.12)] text-center">
                  <CheckCircle2 size={24} className="text-sky-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">
                    {resetLinkSent ? "Reset / Sign-In Link Sent!" : "Magic Link Dispatched!"}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-1">
                    Check your inbox at <strong>{email}</strong> and click the link to sign in.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setMagicLinkSent(false); setResetLinkSent(false); }}
                    className="mt-3 text-[11px] text-gray-400 hover:text-white underline"
                  >
                    Try another address or password
                  </button>
                </div>
              ) : (
                <form onSubmit={authMode === "password" ? signInWithEmailPassword : signInWithEmailOtp} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] focus:outline-none text-white text-xs placeholder-gray-600"
                      />
                    </div>
                  </div>

                  {authMode === "password" && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] focus:outline-none text-white text-xs placeholder-gray-600"
                        />
                      </div>
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={loading}
                          className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium"
                        >
                          Forgot or haven&apos;t set a password? Send a reset / sign-in link
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-[0_2px_14px_rgba(59,130,246,0.35)] disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin text-white" />
                    ) : (
                      <>
                        <span>{authMode === "password" ? "Sign In with Password" : "Send Magic Link"}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setAuthMode(authMode === "password" ? "email" : "password"); setError(""); }}
                      className="text-[11px] text-gray-500 hover:text-gray-300 underline"
                    >
                      {authMode === "password" ? "Switch to Email Magic Link" : "Sign in with password instead"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 text-center leading-relaxed">
              {error}
            </div>
          )}

          {/* Security note */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] space-y-3">
            <p className="text-[11px] text-gray-400 text-center leading-relaxed flex items-center justify-center gap-1.5">
              <Shield size={12} className="text-emerald-400" />
              <span>Authorized personnel only. Sessions are encrypted and logged.</span>
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                ← Home
              </Link>
              <span className="text-gray-700">·</span>
              <Link
                href="/help?view=techsupport"
                className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors"
              >
                <HelpCircle size={13} />
                <span>Help &amp; Tech Support</span>
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-6">
          OperateIQ · Property Intelligence Platform
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
          <Loader2 size={24} className="text-sky-400 animate-spin" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
