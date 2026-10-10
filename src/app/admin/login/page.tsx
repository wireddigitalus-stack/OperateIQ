"use client";

import { useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Loader2, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      if (error) setError(error.message);
    } catch {
      setError("Something went wrong. Please try again.");
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
        <div className="flex justify-center mb-10">
          <Image
            src="/vision-logo.png"
            alt="Vision LLC"
            width={150}
            height={54}
            className="h-12 w-auto"
            priority
          />
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-8 backdrop-blur-sm shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(74,222,128,0.25)]">
              <Shield size={22} className="text-black" />
            </div>
            <h1 className="text-xl font-black text-white mb-1">VISION</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Property Intelligence Platform</p>
            <p className="text-sm text-gray-500">Sign in to access your dashboard</p>
          </div>

          {/* Google sign-in button */}
          <button
            id="google-signin-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-semibold text-sm transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin text-gray-500" />
            ) : (
              /* Google G logo */
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.5 3.2 29.6 1 24 1 14.9 1 7.2 6.6 3.8 14.4l7 5.4C12.6 13.2 17.9 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.3 37.4 46.5 31.4 46.5 24.5z"/>
                <path fill="#FBBC05" d="M10.8 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7-5.4A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8.2-6.1z"/>
                <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-6.1 0-11.3-3.6-13.2-9.1l-8.2 6.1C7.2 41.5 14.9 47 24 47z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )}
            {loading ? "Redirecting to Google…" : "Sign in with Google"}
          </button>

          {error && (
            <p className="text-xs text-red-400 text-center mt-3">{error}</p>
          )}

          {/* Security note */}
          <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-[11px] text-gray-600 text-center leading-relaxed">
              🔐 Access restricted to authorized team members only.
              <br />Your Google account must be approved for access.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-6">
          VISION · Property Intelligence Platform
        </p>
      </div>
    </div>
  );
}
