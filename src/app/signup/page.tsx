"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
  Phone,
  Mail,
  User,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PLANS, TRIAL_DAYS, type Tier } from "@/lib/plans";
import { supabaseBrowser } from "@/lib/supabase-browser";

function SignupForm() {
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get("plan") as Tier) || "pro";
  const billing = searchParams.get("billing") === "annual" ? "annual" : "monthly";

  const [selectedPlan, setSelectedPlan] = useState<Tier>(initialPlan);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [unitCount, setUnitCount] = useState("11 - 50 Units");
  const [portfolioType, setPortfolioType] = useState("Mixed-Use (Commercial & Residential)");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthSignedIn, setOauthSignedIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [created, setCreated] = useState<{ slug: string; signedIn: boolean } | null>(null);

  const activePlan = PLANS.find((p) => p.id === selectedPlan) || PLANS[2];

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setOauthSignedIn(true);
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";
        if (metaName) setFullName((prev) => prev || metaName);
        if (user.email) setEmail((prev) => prev || user.email || "");
      }
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    setErrorMsg("");
    try {
      const nextUrl = `/signup?plan=${selectedPlan}${billing === "annual" ? "&billing=annual" : ""}`;
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setOauthLoading(false);
      }
    } catch {
      setErrorMsg("Could not initiate Google sign-in. Please try again.");
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !companyName.trim()) {
      setErrorMsg("Please fill in your name, work email, and portfolio company name.");
      return;
    }
    if (!oauthSignedIn && password && password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: cleanEmail,
          password: oauthSignedIn ? "" : password,
          company: companyName.trim(),
          phone: phone.trim(),
          plan: activePlan.id,
          unitCount,
          portfolioType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not process signup. Please try again.");
      }

      if (oauthSignedIn || data.signedIn) {
        window.location.href = "/admin";
        return;
      }

      if (password.length >= 8) {
        const { data: signInData, error: signInErr } = await supabaseBrowser.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (!signInErr && signInData?.session) {
          window.location.href = "/admin";
          return;
        }
      }

      setCreated({ slug: data.slug, signedIn: !!data.signedIn });
      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg p-8 sm:p-10 rounded-3xl bg-[#080C14] border border-white/20 shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(56,189,248,0.2)] text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.35)]">
          <CheckCircle2 size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Your Workspace Is Ready!</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            Welcome to <strong>PropOpsIQ</strong>, {fullName.split(" ")[0]}. We have provisioned a dedicated <strong>{TRIAL_DAYS}-day free trial</strong> workspace for <strong>{companyName}</strong> on the <strong>{activePlan.name}</strong> plan.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <Sparkles size={14} />
            <span>Workspace Provisioned:</span>
          </div>
          <p>
            • Admin credentials registered to <strong>{email}</strong>.
          </p>
          <p>
            • Sign in with your <strong>Password</strong>, <strong>Google</strong>, or a 1-click <strong>Email Magic Link</strong> using <strong>{email}</strong> — that email is your workspace owner login.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={created?.signedIn ? "/admin" : `/admin/login?email=${encodeURIComponent(email.trim())}&mode=password`}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <span>{created?.signedIn ? "Open Your Dashboard" : "Sign In to Your Dashboard"}</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            href={created?.slug ? `/site/${created.slug}` : "/demo-site"}
            target="_blank"
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <span>{created?.slug ? "Preview Your Public Site" : "Explore Demo Site"}</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* ── Left Column: Value Prop (5 Cols) ── */}
      <div className="lg:col-span-5 space-y-6 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold shadow-sm">
          <Sparkles size={13} className="text-cyan-400 animate-pulse" />
          <span>{TRIAL_DAYS}-DAY FULL ACCESS TRIAL</span>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Run your portfolio on autopilot.
          </h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Zero setup fees. No credit card required. Start with a clean workspace — or load sample demo properties in 1 click.
          </p>
        </div>

        {/* Benefits checklist */}
        <div className="space-y-3 pt-2">
          {[
            "Full access to rent ledgers, maintenance & crew portals",
            "Autonomous AI operations assistant (PropOpsIQ) included",
            "Start with a clean workspace — or load sample demo properties in 1 click",
            "Turnkey public property showcase site on Pro tier",
            "Cancel or upgrade anytime with zero penalties",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-200 font-medium">{item}</span>
            </div>
          ))}
        </div>

        {/* Selected Plan Summary Card */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Selected Plan:</span>
            <span className="text-xs font-black text-sky-400 font-mono bg-sky-950/80 border border-sky-400/30 px-2 py-0.5 rounded">
              {activePlan.name} · {billing === "annual" ? `$${Math.round(activePlan.annual / 12)}/mo billed annually` : `$${activePlan.monthly}/mo`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{activePlan.blurb}</p>
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-300">
            <span>Free for {TRIAL_DAYS} days</span>
            <Link href="/pricing" className="text-sky-400 hover:underline font-bold">
              Change plan
            </Link>
          </div>
        </div>
      </div>

      {/* ── Right Column: The Intake Form (7 Cols) ── */}
      <div className="lg:col-span-7">
        <div className="rounded-3xl border border-white/15 bg-[rgba(12,17,29,0.85)] backdrop-blur-2xl p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_50px_rgba(56,189,248,0.12)] text-left">
          
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">Create Your Free Trial Account</h2>
            <p className="text-xs text-slate-400 mt-0.5">Takes under 2 minutes. No credit card required.</p>
          </div>

          {oauthSignedIn ? (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>
                Signed in as <strong>{email}</strong> — complete your workspace details below
              </span>
            </div>
          ) : (
            <div className="mb-5 space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={oauthLoading || submitting}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
              >
                {oauthLoading ? (
                  <Loader2 size={16} className="animate-spin text-gray-700" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0C111D] px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap">
                  or sign up with email
                </span>
                <div className="border-t border-white/10 w-full" />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name & Work Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Work Email *
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@acmeproperties.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Password (hidden when already authenticated via Google OAuth) */}
            {!oauthSignedIn && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Password (min. 8 characters) *
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (at least 8 characters)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Company Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Company / Portfolio Name *
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ACME Property Management"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 234-5678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Units & Portfolio Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Number of Units Managed
                </label>
                <select
                  value={unitCount}
                  onChange={(e) => setUnitCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
                >
                  <option value="1 - 10 Units">1 – 10 Units</option>
                  <option value="11 - 50 Units">11 – 50 Units</option>
                  <option value="51 - 200 Units">51 – 200 Units</option>
                  <option value="200+ Units">200+ Units</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Primary Property Type
                </label>
                <select
                  value={portfolioType}
                  onChange={(e) => setPortfolioType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
                >
                  <option value="Mixed-Use (Commercial & Residential)">Mixed-Use (Retail & Lofts)</option>
                  <option value="Commercial & Medical Office">Medical & Commercial Office</option>
                  <option value="Multi-Family Residential">Multi-Family Residential</option>
                  <option value="Contractor Flex & Light Industrial">Contractor Flex & Industrial</option>
                  <option value="Diversified Portfolio">Diversified Portfolio</option>
                </select>
              </div>
            </div>

            {/* Plan Tier Selector Pills */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1.5">
                Trial Tier Plan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PLANS.map((p) => {
                  const isSelected = p.id === selectedPlan;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-sky-500/15 border-sky-400/60 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        {p.highlight && (
                          <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                        {billing === "annual" ? `$${Math.round(p.annual / 12)}/mo` : `$${p.monthly}/mo`}
                        {billing === "annual" && <span className="block text-[9px] text-emerald-400">billed annually</span>}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-600 text-white font-bold text-xs shadow-[0_0_24px_rgba(56,189,248,0.35)] hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Creating Your Trial Account…</span>
                  </>
                ) : (
                  <>
                    <span>Start My {TRIAL_DAYS}-Day Free Trial</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-500 mt-2">
              🔒 No credit card required. By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#060911] text-white pt-32 pb-24 px-5">
      <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading trial portal…</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
