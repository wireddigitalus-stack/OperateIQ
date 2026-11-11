"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, CheckCircle2, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { BRAND } from "@/lib/brand";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      // Support direct hash or PKCE code if Supabase redirected straight to /auth/reset
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        const code = sp.get("code");
        if (code) {
          await supabaseBrowser.auth.exchangeCodeForSession(code).catch(() => {});
        } else if (window.location.hash) {
          const hp = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const accessToken = hp.get("access_token");
          const refreshToken = hp.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabaseBrowser.auth
              .setSession({ access_token: accessToken, refresh_token: refreshToken })
              .catch(() => {});
          }
        }
      }

      const { data } = await supabaseBrowser.auth.getSession();
      if (!active) return;
      if (data.session?.user) {
        setHasSession(true);
        setUserEmail(data.session.user.email || "");
      }
      setChecking(false);
    }

    init();

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        setHasSession(true);
        setUserEmail(session.user.email || "");
        setChecking(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabaseBrowser.auth.updateUser({ password });
      if (updateErr) {
        setError(updateErr.message);
      } else {
        setDone(true);
        setTimeout(() => {
          router.replace("/admin");
        }, 1800);
      }
    } catch {
      setError("Could not update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl bg-[#0D1322] border border-white/10 p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center mx-auto text-sky-400">
            <KeyRound size={22} />
          </div>
          <h1 className="text-xl font-black tracking-tight">Set a New Password</h1>
          <p className="text-xs text-slate-400">
            {userEmail ? `Updating password for ${userEmail}` : `${BRAND.name} Account Recovery`}
          </p>
        </div>

        {checking ? (
          <div className="py-10 flex flex-col items-center gap-3 text-slate-400 text-xs">
            <Loader2 size={22} className="animate-spin text-sky-400" />
            <span>Verifying your recovery link…</span>
          </div>
        ) : done ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-center space-y-3">
            <CheckCircle2 size={28} className="mx-auto text-emerald-400" />
            <p className="text-sm font-bold text-white">Password updated</p>
            <p className="text-xs text-slate-300">Taking you to your dashboard…</p>
          </div>
        ) : !hasSession ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-400/25 rounded-xl p-4 leading-relaxed">
              This password reset link has expired or was opened in a different browser than where it was requested. Request a fresh link on the sign-in page.
            </p>
            <Link
              href="/admin/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all"
            >
              <span>Back to Sign In</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-black/40 border border-white/15 text-base sm:text-sm text-white outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-base sm:text-sm text-white outline-none focus:border-sky-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving Password…</span>
                </>
              ) : (
                <span>Save New Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
