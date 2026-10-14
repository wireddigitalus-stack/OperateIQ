"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Users,
  Search,
  Plus,
  ArrowRight,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
  Lock,
  Mail,
  Phone,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isSuperAdmin } from "@/lib/platform";
import { PLANS, type Tier } from "@/lib/plans";

interface Org {
  id: string;
  name: string;
  slug: string;
  tier: Tier;
  subscription_status: string;
  contact_email?: string;
  contact_phone?: string;
  custom_domain?: string;
  created_at: string;
  properties_count: number;
  tenants_count: number;
  tickets_count: number;
}

interface PlatformSignup {
  id: string;
  submitted_at: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  interest: string;
  city: string;
  message: string;
  org_id?: string | null;
}

interface Stats {
  totalOrgs: number;
  totalProperties: number;
  totalTenants: number;
  activeSubscriptions: number;
  trialing: number;
}

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [activeTab, setActiveTab] = useState<"organizations" | "signups">("organizations");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [signups, setSignups] = useState<PlatformSignup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgTier, setNewOrgTier] = useState<Tier>("growth");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [newOrgPhone, setNewOrgPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [editTier, setEditTier] = useState<Tier>("growth");
  const [editStatus, setEditStatus] = useState("active");
  const [editDomain, setEditDomain] = useState("");
  const [updating, setUpdating] = useState(false);

  // 1. Verify Platform Super-Admin access
  useEffect(() => {
    // Security: purge any stale client-side demo tokens immediately
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("oiq_demo_auth");
      localStorage.removeItem("oiq_demo_auth");
    }

    supabaseBrowser.auth.getUser().then(({ data }) => {
      const email = data.user?.email || null;
      setCurrentUserEmail(email);
      if (email && isSuperAdmin(email)) {
        setAuthorized(true);
      }
      setAuthChecking(false);
    }).catch(() => {
      setCurrentUserEmail(null);
      setAuthorized(false);
      setAuthChecking(false);
    });
  }, []);

  // 2. Fetch all organizations & platform stats & signups
  const loadPlatformData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/platform/overview")
        .then((res) => res.json())
        .then((data) => {
          if (data.organizations) setOrgs(data.organizations);
          if (data.stats) setStats(data.stats);
        }),
      fetch("/api/platform/signups")
        .then((res) => res.json())
        .then((data) => {
          if (data.signups) setSignups(data.signups);
        })
    ])
      .catch((err) => console.error("Error loading platform data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authorized) {
      loadPlatformData();
    }
  }, [authorized]);

  // Support Mode: Impersonate org and jump to /admin
  async function handleEnterSupportMode(org: Org) {
    await handleEnterSupportModeById(org.id);
  }

  async function handleEnterSupportModeById(orgId: string) {
    try {
      await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      router.push("/admin");
    } catch (err) {
      console.error("Failed to start support mode:", err);
      alert("Could not activate support session");
    }
  }

  // Create new organization
  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/platform/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrgName.trim(),
          tier: newOrgTier,
          contact_email: newOrgEmail.trim() || undefined,
          contact_phone: newOrgPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create organization");
      setShowAddModal(false);
      setNewOrgName("");
      setNewOrgEmail("");
      setNewOrgPhone("");
      loadPlatformData();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error creating organization");
    } finally {
      setCreating(false);
    }
  }

  // Update existing organization tier / status
  async function handleUpdateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrg) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editOrg.id,
          tier: editTier,
          subscription_status: editStatus,
          custom_domain: editDomain.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update organization");
      setEditOrg(null);
      loadPlatformData();
    } catch (err) {
      console.error(err);
      alert("Error saving organization updates");
    } finally {
      setUpdating(false);
    }
  }

  async function handleGoogleMasterLogin() {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("oiq_auth_next", "/platform");
      }
      if (currentUserEmail && !isSuperAdmin(currentUserEmail)) {
        await supabaseBrowser.auth.signOut();
      }
      await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/platform`,
          queryParams: { prompt: "select_account" },
        },
      });
    } catch (err) {
      console.error("Failed to start Google sign-in:", err);
    }
  }

  async function handlePlatformSignOut() {
    try {
      await fetch("/api/platform/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: null }),
      }).catch(() => {});
      await supabaseBrowser.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-cyan-400 mr-2" size={20} />
        <span>Verifying platform credentials…</span>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-gradient-to-b from-[#0E1526] to-[#0A101E] border border-cyan-500/25 shadow-[0_24px_60px_rgba(0,0,0,0.65)] text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 flex items-center justify-center mx-auto mb-5 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-xl font-extrabold text-white mb-2">OperateIQ Master Console</h1>
          <p className="text-sm text-slate-400 mb-6">
            Sign in with your authorized Google Super-Admin account to manage client organizations and platform operations.
            {currentUserEmail ? (
              <span className="block mt-3 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
                Currently signed in as <strong className="text-white">{currentUserEmail}</strong> (Customer Workspace). This account does not have Master Console access.
              </span>
            ) : null}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleMasterLogin}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer"
            >
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
              <span>{currentUserEmail ? "Switch to Google Admin Account" : "Sign in with Google"}</span>
            </button>
            <Link
              href="/"
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm transition-all"
            >
              Return to Main Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrgs = orgs.filter((o) => {
    const matchSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()) ||
      (o.contact_email && o.contact_email.toLowerCase().includes(search.toLowerCase()));
    const matchTier = filterTier === "all" || o.tier === filterTier;
    return matchSearch && matchTier;
  });

  const filteredSignups = signups.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.company?.toLowerCase().includes(term) ||
      s.phone?.toLowerCase().includes(term) ||
      s.interest?.toLowerCase().includes(term) ||
      s.message?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-200">
      {/* ── Top Bar ── */}
      <header className="h-16 border-b border-white/[0.08] bg-[#0A1020]/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/operateiq-logo.svg" alt="OperateIQ" width={110} height={32} className="h-7 w-auto" />
          </Link>
          <span className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30">
              <ShieldCheck size={13} />
              Platform Master Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Master Admin: <strong className="text-white">{currentUserEmail}</strong>
          </span>
          <a
            href="/demo-site"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-300 bg-sky-950/60 border border-sky-500/30 hover:bg-sky-900/60 hover:text-white transition-all shadow-sm"
          >
            <Building2 size={12} className="text-sky-400" />
            <span className="hidden md:inline">Demo Property Site</span>
            <span className="md:hidden">Demo Site</span>
            <ExternalLink size={11} />
          </a>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
          >
            <span>Main Website</span>
            <ExternalLink size={12} />
          </Link>
          <button
            type="button"
            onClick={handlePlatformSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 hover:text-white transition-all cursor-pointer"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title & Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Client Organizations</h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage client accounts, adjust service tiers, or enter customer dashboards in support mode.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="oiq-btn !py-2.5 text-sm flex items-center gap-2 self-start md:self-auto"
          >
            <Plus size={16} />
            <span>Add Client Organization</span>
          </button>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="oiq-card p-5">
              <p className="text-xs text-slate-400 font-medium">Total Portfolios</p>
              <p className="text-3xl font-extrabold text-white mt-1.5">{stats.totalOrgs}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>{stats.activeSubscriptions} active subscriptions</span>
              </div>
            </div>

            <div className="oiq-card p-5">
              <p className="text-xs text-slate-400 font-medium">Inbound Signups & Leads</p>
              <p className="text-3xl font-extrabold text-white mt-1.5">{signups.length}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400 font-medium">
                <Users size={12} />
                <span>Platform intake pipeline</span>
              </div>
            </div>

            <div className="oiq-card p-5">
              <p className="text-xs text-slate-400 font-medium">Total Properties</p>
              <p className="text-3xl font-extrabold text-white mt-1.5">{stats.totalProperties}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <Building2 size={12} className="text-indigo-400" />
                <span>Across all customer accounts</span>
              </div>
            </div>

            <div className="oiq-card p-5">
              <p className="text-xs text-slate-400 font-medium">Trial Accounts</p>
              <p className="text-3xl font-extrabold text-white mt-1.5">{stats.trialing}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <Clock size={12} className="text-amber-400" />
                <span>14-day evaluation period</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs Navigation ── */}
        <div className="flex items-center gap-2 border-b border-white/10 mb-6 pb-2">
          <button
            onClick={() => setActiveTab("organizations")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "organizations"
                ? "bg-white/10 text-white shadow-sm border border-white/15"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 size={16} className={activeTab === "organizations" ? "text-cyan-400" : ""} />
            <span>Client Organizations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-slate-300 font-mono">
              {filteredOrgs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("signups")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "signups"
                ? "bg-white/10 text-white shadow-sm border border-white/15"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users size={16} className={activeTab === "signups" ? "text-emerald-400" : ""} />
            <span>Inbound Signups & Leads</span>
            {signups.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono font-bold">
                {signups.length}
              </span>
            )}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder={activeTab === "organizations" ? "Search organizations or emails…" : "Search signups, companies, emails…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {activeTab === "organizations" && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {["all", "starter", "growth", "pro"].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setFilterTier(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    filterTier === tier
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.07]"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tables Section */}
        {activeTab === "signups" ? (
          <div className="oiq-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] border-b border-white/[0.08] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Lead / Company</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Interest / Plan</th>
                    <th className="py-3.5 px-4">Portfolio & Units</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Loader2 size={24} className="animate-spin text-cyan-400 mx-auto mb-2" />
                        Loading inbound signups…
                      </td>
                    </tr>
                  ) : filteredSignups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No inbound signups or inquiries found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredSignups.map((s) => {
                      const isTrial = (s.interest || "").toLowerCase().includes("trial");
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{s.company || s.name}</span>
                              {isTrial && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  Trial Intake
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{s.name}</p>
                          </td>

                          <td className="py-4 px-4 text-xs space-y-0.5">
                            <a
                              href={`mailto:${s.email}`}
                              className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                            >
                              <Mail size={12} />
                              <span>{s.email}</span>
                            </a>
                            {s.phone && (
                              <a
                                href={`tel:${s.phone}`}
                                className="text-slate-400 hover:text-white flex items-center gap-1"
                              >
                                <Phone size={12} />
                                <span>{s.phone}</span>
                              </a>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-500/30">
                              {s.interest || "14-Day Free Trial"}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-xs text-slate-300">
                            <p className="font-medium text-white">{s.city || "Commercial / Residential"}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{s.message}</p>
                          </td>

                          <td className="py-4 px-4 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(s.submitted_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>

                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {s.org_id ? (
                              <button
                                onClick={() => handleEnterSupportModeById(s.org_id!)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white oiq-grad-bg hover:opacity-95 transition-opacity shadow-sm inline-flex items-center gap-1.5"
                              >
                                <span>Enter Workspace</span>
                                <ArrowRight size={13} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setNewOrgName(s.company || s.name);
                                  setNewOrgEmail(s.email);
                                  setNewOrgPhone(s.phone);
                                  setShowAddModal(true);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all inline-flex items-center gap-1"
                              >
                                <Plus size={12} />
                                <span>Provision Org</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Organizations Table */
          <div className="oiq-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] border-b border-white/[0.08] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Organization</th>
                    <th className="py-3.5 px-4">Plan Tier</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Properties</th>
                    <th className="py-3.5 px-4">Tenants</th>
                    <th className="py-3.5 px-4">Open Tickets</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Loader2 size={24} className="animate-spin text-cyan-400 mx-auto mb-2" />
                        Loading organizations…
                      </td>
                    </tr>
                  ) : filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No organizations found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org) => {
                      const planColor =
                        org.tier === "pro"
                          ? "text-purple-300 bg-purple-950/60 border-purple-500/40"
                          : org.tier === "growth"
                          ? "text-cyan-300 bg-cyan-950/60 border-cyan-500/40"
                          : "text-slate-300 bg-slate-800/60 border-slate-600/40";

                      const statusColor =
                        org.subscription_status === "active"
                          ? "text-emerald-400 bg-emerald-950/40 border-emerald-500/30"
                          : org.subscription_status === "trialing"
                          ? "text-amber-400 bg-amber-950/40 border-amber-500/30"
                          : "text-rose-400 bg-rose-950/40 border-rose-500/30";

                      return (
                        <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{org.name}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">/{org.slug}</p>
                            {org.contact_email && (
                              <p className="text-xs text-slate-400 mt-1">{org.contact_email}</p>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${planColor}`}
                            >
                              {org.tier}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${statusColor}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {org.subscription_status}
                            </span>
                          </td>

                          <td className="py-4 px-4 font-semibold text-slate-200">
                            {org.properties_count}
                          </td>

                          <td className="py-4 px-4 font-semibold text-slate-200">
                            {org.tenants_count}
                          </td>

                          <td className="py-4 px-4">
                            {org.tickets_count > 0 ? (
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {org.tickets_count} open
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">0</span>
                            )}
                          </td>

                          <td className="py-4 px-5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditOrg(org);
                                  setEditTier(org.tier);
                                  setEditStatus(org.subscription_status);
                                  setEditDomain(org.custom_domain || "");
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                title="Edit tier & subscription settings"
                              >
                                <Sliders size={15} />
                              </button>

                              <button
                                onClick={() => handleEnterSupportMode(org)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white oiq-grad-bg hover:opacity-95 transition-opacity shadow-sm flex items-center gap-1.5"
                              >
                                <span>Enter Dashboard</span>
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Modal: Add Client Organization ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl bg-[#0E1526] border border-white/15 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Add Client Organization</h2>
            <p className="text-xs text-slate-400 mb-5">
              Provision a new customer portfolio in OperateIQ.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Portfolio Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Property Group"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Service Tier</label>
                <select
                  value={newOrgTier}
                  onChange={(e) => setNewOrgTier(e.target.value as Tier)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D1A] border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.monthly}/mo · {p.limits.properties ? `up to ${p.limits.properties} properties` : "unlimited properties"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Contact Email</label>
                <input
                  type="email"
                  placeholder="owner@clientcompany.com"
                  value={newOrgEmail}
                  onChange={(e) => setNewOrgEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={newOrgPhone}
                  onChange={(e) => setNewOrgPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newOrgName.trim()}
                  className="oiq-btn !py-2 text-sm disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create Portfolio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Organization Settings ── */}
      {editOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl bg-[#0E1526] border border-white/15 p-6 shadow-2xl relative">
            <button
              onClick={() => setEditOrg(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Edit {editOrg.name}</h2>
            <p className="text-xs text-slate-400 mb-5">Adjust service tier and subscription status.</p>

            <form onSubmit={handleUpdateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Service Tier</label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value as Tier)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D1A] border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} Plan
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subscription Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D1A] border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="active">Active (Paid)</option>
                  <option value="trialing">Trialing (Evaluation)</option>
                  <option value="past_due">Past Due</option>
                  <option value="paused">Paused</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Domain (Pro Tier)</label>
                <input
                  type="text"
                  placeholder="e.g. portal.apexproperties.com"
                  value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditOrg(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="oiq-btn !py-2 text-sm disabled:opacity-50"
                >
                  {updating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
