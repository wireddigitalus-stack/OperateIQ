"use client";

import { useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Loader2, Shield, Mail, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";

export default function AdminLoginPage() {
  const [authMode, setAuthMode] = useState<"google" | "email" | "password">("google");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("wireddigitalus@gmail.com");
  const [password, setPassword] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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

    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#4ADE80] opacity-[0.04] blur-[100px]" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/operateiq-logo.svg"
            alt="OperateIQ"
            width={150}
            height={54}
            className="h-12 w-auto"
            priority
          />
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-8 backdrop-blur-sm shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(74,222,128,0.25)]">
              <Shield size={22} className="text-black" />
            </div>
            <h1 className="text-xl font-black text-white mb-1">OperateIQ</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Property Intelligence Platform</p>
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
              {magicLinkSent ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-emerald-300">Magic Link Dispatched!</p>
                  <p className="text-[11px] text-emerald-400/80 mt-1">
                    Check your inbox at <strong>{email}</strong> and click the link to sign in.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMagicLinkSent(false)}
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
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-emerald-400/60 focus:outline-none text-white text-xs placeholder-gray-600"
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
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-emerald-400/60 focus:outline-none text-white text-xs placeholder-gray-600"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-semibold text-xs transition-all shadow-[0_2px_12px_rgba(74,222,128,0.25)] disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin text-black" />
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
                      onClick={() => setAuthMode(authMode === "password" ? "email" : "password")}
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
          <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-[11px] text-gray-500 text-center leading-relaxed">
              🔐 Platform Super-Admin: <strong className="text-gray-400">wireddigitalus@gmail.com</strong>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-6">
          OperateIQ · Property Intelligence Platform
        </p>
      </div>
    </div>
  );
}
