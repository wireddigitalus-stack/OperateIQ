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
  Copy,
  Check,
  LifeBuoy,
  BookOpen,
  Wrench,
  HelpCircle,
  Trash2,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isSuperAdmin, getCustomerCode, getTrialCountdown } from "@/lib/platform";
import { PLANS, type Tier } from "@/lib/plans";
import { TECH_SUPPORT_GUIDES, BASIC_FAQS, ACCENT_STYLES } from "@/lib/help-data";
import type { SupportTicketItem } from "@/app/api/support-tickets/route";

interface Org {
  id: string;
  customer_code?: string;
  name: string;
  slug: string;
  tier: Tier;
  subscription_status: string;
  trial_ends_at?: string | null;
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
  customer_code?: string;
}

interface Stats {
  totalOrgs: number;
  totalProperties: number;
  totalTenants: number;
  activeSubscriptions: number;
  trialing: number;
}

interface PlatformSecurityLog {
  id: string;
  org_id?: string | null;
  customer_code?: string;
  action: "admin_login" | "admin_blocked" | string;
  actor_name: string;
  actor_role?: string;
  description: string;
  created_at: string;
  meta?: Record<string, string>;
}

export default function PlatformDashboardPage() {
  const router = useRouter();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [activeTab, setActiveTab] = useState<"organizations" | "signups" | "support" | "security">("organizations");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [signups, setSignups] = useState<PlatformSignup[]>([]);
  const [securityLogs, setSecurityLogs] = useState<PlatformSecurityLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketItem[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"all" | "Open" | "Resolved">("all");
  const [lookupCode, setLookupCode] = useState("");
  const [kbSearch, setKbSearch] = useState("");
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");

  // Master Security & OpsIQ Shield states
  const [isRunningSecurityAudit, setIsRunningSecurityAudit] = useState(false);
  const [securityAuditResult, setSecurityAuditResult] = useState<{
    status: "secure" | "warning" | "critical";
    securityScore?: number;
    summary: string;
    recommendation: string;
    auditedAt: string;
  } | null>(null);
  const [phishingInput, setPhishingInput] = useState("");
  const [isScanningPhishing, setIsScanningPhishing] = useState(false);
  const [phishingResult, setPhishingResult] = useState<{
    riskLevel: "safe" | "caution" | "danger";
    riskScore: number;
    headline: string;
    redFlags: string[];
    actionStep: string;
    scannedAt: string;
  } | null>(null);

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
  const [extendingTrial, setExtendingTrial] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function handleCopyCode(code: string, key = code) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(key);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === key ? null : prev));
    }, 2000);
  }

  async function runMasterSecurityAudit(simulateAttack = false) {
    setIsRunningSecurityAudit(true);
    try {
      let logsToAudit = securityLogs.slice(0, 20).map((item) => ({
        status: (item.action === "admin_blocked" ? "blocked" : "success") as "success" | "blocked",
        email: item.actor_name,
        device: item.meta?.device || "Platform Browser",
        reason: item.meta?.reason || item.description,
        timestamp: item.created_at,
      }));

      if (simulateAttack) {
        const now = new Date();
        logsToAudit = [
          {
            status: "blocked",
            email: "Unknown Crew PIN Attempt (IP: 185.220.101.44)",
            device: "Automated Python Scanner / Tor Exit Node",
            reason: "Invalid 4-digit PIN (Attempt 6/6 — 15-min IP Lockout Triggered)",
            timestamp: now.toISOString(),
          },
          {
            status: "blocked",
            email: "bot-scanner@protonmail.com",
            device: "HeadlessLinux / Chrome 120",
            reason: "Edge WAF Exploit Probe (/.env & /wp-admin blocked with 403)",
            timestamp: new Date(now.getTime() - 45_000).toISOString(),
          },
          {
            status: "blocked",
            email: "admin-spoof@evil-domain.ru",
            device: "Windows 10 / curl 8.4.0",
            reason: "Cross-Site Request Forgery (CSRF Origin Mismatch Blocked)",
            timestamp: new Date(now.getTime() - 110_000).toISOString(),
          },
          ...logsToAudit,
        ];
      }

      const res = await fetch("/api/security-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logsToAudit }),
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        setSecurityAuditResult({
          status: data.status || "secure",
          securityScore: typeof data.securityScore === "number" ? data.securityScore : undefined,
          summary: data.summary,
          recommendation: data.recommendation || "",
          auditedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        });
      }
    } catch {
      // Fallback handled silently
    } finally {
      setIsRunningSecurityAudit(false);
    }
  }

  async function handleScanPhishingText(overrideText?: string) {
    const text = (overrideText ?? phishingInput).trim();
    if (!text) return;
    if (overrideText) setPhishingInput(overrideText);
    setIsScanningPhishing(true);
    try {
      const res = await fetch("/api/security-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "scan_phishing", textToScan: text }),
      });
      const data = await res.json();
      if (res.ok && data.headline) {
        setPhishingResult({
          riskLevel: data.riskLevel || "caution",
          riskScore: typeof data.riskScore === "number" ? data.riskScore : 50,
          headline: data.headline,
          redFlags: Array.isArray(data.redFlags) ? data.redFlags : [],
          actionStep: data.actionStep || "Verify sender identity by phone before acting.",
          scannedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        });
      }
    } catch {
      // Fallback handled silently
    } finally {
      setIsScanningPhishing(false);
    }
  }

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
      } else if (email) {
        // Strictly forbid authenticated tenants from viewing /platform
        router.replace("/admin");
        return;
      }
      setAuthChecking(false);
    }).catch(() => {
      setCurrentUserEmail(null);
      setAuthorized(false);
      setAuthChecking(false);
    });
  }, []);

  // 2. Fetch all organizations & platform stats & signups & security logs
  const loadPlatformData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/platform/overview")
        .then((res) => res.json())
        .then((data) => {
          if (data.organizations) setOrgs(data.organizations);
          if (data.stats) setStats(data.stats);
          if (Array.isArray(data.securityLogs)) setSecurityLogs(data.securityLogs);
        }),
      fetch("/api/platform/signups")
        .then((res) => res.json())
        .then((data) => {
          if (data.signups) setSignups(data.signups);
        }),
      fetch("/api/support-tickets")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.tickets)) setSupportTickets(data.tickets);
        }),
    ])
      .catch((err) => console.error("Error loading platform data:", err))
      .finally(() => setLoading(false));
  };

  async function handleToggleTicketStatus(ticket: SupportTicketItem) {
    const nextStatus: "Open" | "Resolved" = ticket.status === "Open" ? "Resolved" : "Open";
    setSupportTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: nextStatus } : t))
    );
    try {
      await fetch("/api/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticket.id, status: nextStatus }),
      });
    } catch (err) {
      console.error("Failed to toggle ticket status:", err);
      loadPlatformData();
    }
  }

  async function handleDeleteSupportTicket(ticketId: string) {
    setSupportTickets((prev) => prev.filter((t) => t.id !== ticketId));
    try {
      await fetch(`/api/support-tickets?id=${encodeURIComponent(ticketId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete support ticket:", err);
      loadPlatformData();
    }
  }

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

  async function handleExtendTrial(days = 14) {
    if (!editOrg) return;
    setExtendingTrial(true);
    try {
      const res = await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editOrg.id,
          extend_trial_days: days,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend trial");
      if (data.organization) {
        setEditOrg((prev) =>
          prev
            ? {
                ...prev,
                subscription_status: "trialing",
                trial_ends_at: data.organization.trial_ends_at,
              }
            : null
        );
        setEditStatus("trialing");
      }
      loadPlatformData();
    } catch (err) {
      console.error(err);
      alert("Could not extend trial");
    } finally {
      setExtendingTrial(false);
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
          <h1 className="text-xl font-extrabold text-white mb-2">PropOpsIQ Master Console</h1>
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
    const term = search.trim().toLowerCase();
    const code = (o.customer_code || getCustomerCode(o.id)).toLowerCase();
    const codeSuffix = code.replace(/^oiq-/, "");
    const matchSearch =
      !term ||
      code.includes(term) ||
      codeSuffix.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.name.toLowerCase().includes(term) ||
      o.slug.toLowerCase().includes(term) ||
      (o.custom_domain && o.custom_domain.toLowerCase().includes(term)) ||
      (o.contact_email && o.contact_email.toLowerCase().includes(term));
    const matchTier = filterTier === "all" || o.tier === filterTier;
    return matchSearch && matchTier;
  });

  const filteredSignups = signups.filter((s) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const code = (s.customer_code || (s.org_id ? getCustomerCode(s.org_id) : "")).toLowerCase();
    const codeSuffix = code.replace(/^oiq-/, "");
    return (
      (code && (code.includes(term) || codeSuffix.includes(term))) ||
      (s.org_id && s.org_id.toLowerCase().includes(term)) ||
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
      <header className="min-h-16 py-2.5 border-b border-white/[0.08] bg-[#0A1020]/80 backdrop-blur-xl px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/operateiq_google_ICON_logo_1791954043128.png"
              alt="PropOpsIQ"
              width={32}
              height={32}
              className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform"
              priority
            />
            <span className="text-white font-extrabold tracking-tight text-lg">
              PropOps<span className="oiq-grad-text">IQ</span>
            </span>
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
          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              activeTab === "support"
                ? "text-white bg-sky-500/30 border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.3)]"
                : "text-sky-200 bg-sky-500/15 border-sky-400/35 hover:bg-sky-500/25 hover:text-white"
            }`}
          >
            <LifeBuoy size={13} className="text-sky-400" />
            <span>Support Center</span>
          </button>
          <Link
            href="/help"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
            title="Open Public /help Page in New Tab"
          >
            <span>Public /help Page</span>
            <ExternalLink size={11} />
          </Link>
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
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 mb-6 pb-2">
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

          <button
            onClick={() => setActiveTab("support")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "support"
                ? "bg-sky-500/20 text-white shadow-sm border border-sky-400/45"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LifeBuoy size={16} className={activeTab === "support" ? "text-sky-400" : ""} />
            <span>Help &amp; Support Center</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 border border-sky-400/40 text-sky-200 font-mono font-bold">
              {supportTickets.filter((t) => t.status === "Open").length} open
            </span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "security"
                ? "bg-emerald-500/20 text-white shadow-sm border border-emerald-400/45"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck size={16} className={activeTab === "security" ? "text-emerald-400" : ""} />
            <span>Security &amp; OpsIQ Shield</span>
            {(() => {
              const blockedCount = securityLogs.filter((l) => l.action === "admin_blocked").length;
              return (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    blockedCount > 0
                      ? "bg-rose-500/20 border-rose-400/40 text-rose-200"
                      : "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                  }`}
                >
                  {blockedCount > 0 ? `${blockedCount} blocked` : "Shield Active"}
                </span>
              );
            })()}
          </button>
        </div>

        {/* Search & Filters */}
        {activeTab !== "security" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by Customer Code (e.g. OIQ-7F4K), company name, slug, domain, or email…"
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
        )}

        {/* Tables Section */}
        {activeTab === "security" ? (
          <div className="space-y-6">
            {/* 1. Global Security Score & OpsIQ Shield AI Command Center */}
            {(() => {
              const blockedCount = securityLogs.filter((l) => l.action === "admin_blocked").length;
              const defaultScore = blockedCount === 0 ? 98 : blockedCount >= 3 ? 42 : 76;
              const liveScore = securityAuditResult?.securityScore ?? defaultScore;
              const liveStatus =
                securityAuditResult?.status ??
                (blockedCount === 0 ? "secure" : blockedCount >= 3 ? "critical" : "warning");

              return (
                <div className="oiq-card p-6 border border-emerald-500/35 bg-gradient-to-br from-[#07161B] via-[#091224] to-[#0B172A]">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-white/10">
                    <div className="flex items-start gap-4">
                      {/* Score Gauge */}
                      <div
                        className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border shadow-lg flex-shrink-0 ${
                          liveStatus === "critical"
                            ? "bg-rose-950/80 border-rose-400/50 text-rose-300"
                            : liveStatus === "warning"
                            ? "bg-amber-950/80 border-amber-400/50 text-amber-300"
                            : "bg-emerald-950/80 border-emerald-400/50 text-emerald-300"
                        }`}
                      >
                        <span className="text-2xl font-black leading-none">{liveScore}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 mt-0.5">
                          Score
                        </span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                            <ShieldCheck size={12} /> OpsIQ Shield AI · Master Defense Center
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
                            www.PropOpsIQ.com
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-white">
                          Global Anti-Hacker, Security Center
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                          Real-time edge WAF protection, constant-time PIN brute-force defense, cross-tenant RLS isolation, and AI phishing/wire-scam inspection across all {orgs.length} client organizations.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => runMasterSecurityAudit(false)}
                        disabled={isRunningSecurityAudit}
                        className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-500 to-cyan-600 hover:opacity-95 transition-opacity shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                      >
                        {isRunningSecurityAudit ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Auditing Platform…</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={14} />
                            <span>Audit Platform Now</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => runMasterSecurityAudit(true)}
                        disabled={isRunningSecurityAudit}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        ⚡ Simulate Hacker Attack
                      </button>
                    </div>
                  </div>

                  {/* AI Executive Audit Banner */}
                  <div className="mt-5 rounded-xl p-4 bg-[#060B16]/90 border border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          liveStatus === "critical"
                            ? "text-rose-400"
                            : liveStatus === "warning"
                            ? "text-amber-300"
                            : "text-emerald-400"
                        }`}
                      >
                        {liveStatus === "critical"
                          ? "🚨 Threat Alert — Active Brute-Force / Exploit Probe Neutralized"
                          : liveStatus === "warning"
                          ? "⚠️ Elevated Vigilance — Blocked Auth Attempts Logged"
                          : "✅ All 4 Defense Layers Nominal — Zero Active Breaches"}
                      </span>
                      {securityAuditResult?.auditedAt && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Audited at {securityAuditResult.auditedAt}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-white font-semibold leading-relaxed">
                      {securityAuditResult?.summary ||
                        `OpsIQ Shield is actively guarding www.PropOpsIQ.com across ${orgs.length} tenant workspaces. ${
                          blockedCount > 0
                            ? `${blockedCount} unauthorized login or PIN attempt(s) were automatically blocked and logged.`
                            : "Zero unauthorized access attempts or cross-origin anomalies detected."
                        }`}
                    </p>
                    <p className="text-xs text-cyan-200/90 mt-1.5">
                      <span className="font-bold text-cyan-300">OpsIQ Shield Directive:</span>{" "}
                      {securityAuditResult?.recommendation ||
                        "Click 'Audit Platform Now' to run a live Gemini 2.5 Flash security posture analysis, or 'Simulate Hacker Attack' to test threat detection."}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 2. 4 Active Defense Layer Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="oiq-card p-5 border border-emerald-500/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                    Layer 1 · Anti-Hacker
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p className="text-sm font-extrabold text-white">Edge WAF &amp; Exploit Trap</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Blocks <code className="text-slate-200">/.env</code>, <code className="text-slate-200">/.git</code>, <code className="text-slate-200">/wp-admin</code>, and <code className="text-slate-200">.php</code> probes at the edge before hitting Next.js or Supabase. Enforces strict CSRF Origin checks and HSTS Preload.
                </p>
              </div>

              <div className="oiq-card p-5 border border-cyan-500/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                    Layer 2 · Brute-Force Guard
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Active
                  </span>
                </div>
                <p className="text-sm font-extrabold text-white">PIN &amp; Auth Brute-Force Guard</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Constant-time jitter (220–380ms) defeats timing attacks. Locks out IPs for 15 minutes after 6 failed PINs, blocks trivial PINs (<code className="text-slate-200">0000</code>, <code className="text-slate-200">1234</code>), and logs every failure.
                </p>
              </div>

              <div className="oiq-card p-5 border border-indigo-500/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                    Layer 3 · Anti-Phisher
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Active
                  </span>
                </div>
                <p className="text-sm font-extrabold text-white">Link Defanger &amp; Domain Seal</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Automatically defangs raw <code className="text-slate-200">http://</code> links in public leads (<code className="text-slate-200">hxxp://</code>), flags wire/gift-card lures, and displays a live <code className="text-slate-200">www.PropOpsIQ.com</code> anti-spoofing seal on login.
                </p>
              </div>

              <div className="oiq-card p-5 border border-purple-500/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
                    Layer 4 · Multi-Tenant RLS
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Active
                  </span>
                </div>
                <p className="text-sm font-extrabold text-white">Strict Org &amp; Crew Isolation</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  PostgreSQL Row-Level Security isolates every <code className="text-slate-200">org_id</code>. Crew sessions use HMAC-SHA256 <code className="text-slate-200">httpOnly</code> cookies and cannot access <code className="text-slate-200">/admin</code> or <code className="text-slate-200">/platform</code>.
                </p>
              </div>
            </div>

            {/* 3. Interactive Phishing, Suspicious Link & Wire-Scam Inspector */}
            <div className="oiq-card p-6 border border-cyan-500/30 bg-[#080F20]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 mb-1.5">
                    🛡️ OpsIQ AI Phishing &amp; Wire-Scam Inspector
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    Scan Suspicious Emails, Texts, Vendor Invoices &amp; Links
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Paste any suspicious message or URL below. OpsIQ Shield AI inspects lookalike domains, urgente wire/ACH routing changes, and credential-harvesting lures.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleScanPhishingText(
                        "URGENT: Please update our HVAC vendor payout to our new ACH routing 021000021 account 99812344 immediately and wire the $4,850 invoice balance today so we don't pause service."
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 transition-colors cursor-pointer"
                  >
                    Test Vendor Wire Scam
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleScanPhishingText(
                        "Action Required: Your PropOpsIQ administrator password expires in 2 hours. Verify your account immediately at http://prop0psiq-security-login.tk/verify or your portfolio will be suspended."
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 transition-colors cursor-pointer"
                  >
                    Test Lookalike Phishing Link
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  rows={3}
                  value={phishingInput}
                  onChange={(e) => setPhishingInput(e.target.value)}
                  placeholder="Paste a suspicious email, SMS, vendor ACH change request, or URL here to inspect with OpsIQ Shield AI…"
                  className="flex-1 rounded-xl bg-[#050914] border border-white/15 p-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => handleScanPhishingText()}
                  disabled={isScanningPhishing || !phishingInput.trim()}
                  className="sm:w-48 px-4 py-3 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isScanningPhishing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Inspecting…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      <span>Scan for Phishing</span>
                    </>
                  )}
                </button>
              </div>

              {phishingResult && (
                <div
                  className={`mt-4 rounded-xl p-4 border ${
                    phishingResult.riskLevel === "danger"
                      ? "bg-rose-950/60 border-rose-500/50 text-rose-100"
                      : phishingResult.riskLevel === "caution"
                      ? "bg-amber-950/60 border-amber-500/50 text-amber-100"
                      : "bg-emerald-950/60 border-emerald-500/50 text-emerald-100"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          phishingResult.riskLevel === "danger"
                            ? "bg-rose-500 text-white"
                            : phishingResult.riskLevel === "caution"
                            ? "bg-amber-400 text-slate-950"
                            : "bg-emerald-500 text-slate-950"
                        }`}
                      >
                        {phishingResult.riskLevel.toUpperCase()} · Risk {phishingResult.riskScore}/100
                      </span>
                      <span className="text-sm font-extrabold text-white">{phishingResult.headline}</span>
                    </div>
                    <span className="text-[11px] opacity-75 font-mono">
                      Scanned at {phishingResult.scannedAt}
                    </span>
                  </div>

                  {phishingResult.redFlags.length > 0 && (
                    <ul className="list-disc list-inside text-xs space-y-1 mb-2.5 opacity-95">
                      {phishingResult.redFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  )}

                  <p className="text-xs font-bold bg-black/30 rounded-lg px-3 py-2 border border-white/10">
                    🛡️ Recommended Action: {phishingResult.actionStep}
                  </p>
                </div>
              )}
            </div>

            {/* 4. Global Cross-Organization Security & Auth Event Log */}
            <div className="oiq-card overflow-hidden">
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Lock size={16} className="text-cyan-400" />
                    <span>Global Cross-Organization Security &amp; Auth Event Log</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live stream of administrator sign-ins, failed Crew PIN lockouts, and blocked access attempts across all customer organizations.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
                  {securityLogs.length} recent events
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.02] border-b border-white/[0.08] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-4">Customer / Org</th>
                      <th className="py-3 px-4">Actor / IP</th>
                      <th className="py-3 px-4">Security Event &amp; Device</th>
                      <th className="py-3 px-5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {securityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                          <CheckCircle2 size={22} className="text-emerald-400 mx-auto mb-2" />
                          No blocked attempts or anomalous auth events recorded across customer organizations.
                        </td>
                      </tr>
                    ) : (
                      securityLogs.map((log) => {
                        const isBlocked = log.action === "admin_blocked";
                        const orgMatch = log.org_id ? orgs.find((o) => o.id === log.org_id) : null;
                        const code = log.customer_code || (log.org_id ? getCustomerCode(log.org_id) : null);

                        return (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  isBlocked
                                    ? "bg-rose-950/60 text-rose-300 border-rose-500/40"
                                    : "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                                }`}
                              >
                                {isBlocked ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                                <span>{isBlocked ? "Blocked" : "Verified"}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">
                                  {orgMatch?.name || "Platform / Global"}
                                </span>
                                {code && (
                                  <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                                    {code}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-xs font-mono text-slate-200">
                              {log.actor_name}
                            </td>

                            <td className="py-3.5 px-4 text-xs">
                              <p className="font-semibold text-white">
                                {log.meta?.reason || log.description}
                              </p>
                              {log.meta?.device && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Device: {log.meta.device}
                                </p>
                              )}
                            </td>

                            <td className="py-3.5 px-5 text-right text-xs text-slate-400 whitespace-nowrap font-mono">
                              {new Date(log.created_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === "support" ? (
          <div className="space-y-8">
            {/* 1. Instant Customer Support Code (OIQ-XXXX) Troubleshooter */}
            <div className="oiq-card p-6 border border-sky-500/30 bg-gradient-to-br from-[#0B1328] via-[#0A1020] to-[#0D1830]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/40 mb-2">
                    <Wrench size={12} /> Instant Tenant Troubleshooter
                  </span>
                  <h2 className="text-xl font-extrabold text-white">
                    Lookup by Customer Support Code (OIQ-XXXX)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                    Enter a customer&apos;s 4-character Support ID (shown in their Admin Header, Settings, and /help page) to inspect their system and jump straight into their dashboard.
                  </p>
                </div>

                <div className="relative w-full lg:w-96">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400" />
                  <input
                    type="text"
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value)}
                    placeholder="Enter OIQ-XXXX code, company, or email…"
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#070B16] border border-sky-400/40 font-mono text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  {lookupCode && (
                    <button
                      type="button"
                      onClick={() => setLookupCode("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                const q = (lookupCode || search).trim().toLowerCase();
                const matchedOrgs = q
                  ? orgs.filter((o) => {
                      const code = (o.customer_code || getCustomerCode(o.id)).toLowerCase();
                      const suffix = code.replace(/^oiq-/, "");
                      return (
                        code.includes(q) ||
                        suffix.includes(q) ||
                        o.name.toLowerCase().includes(q) ||
                        o.slug.toLowerCase().includes(q) ||
                        (o.contact_email && o.contact_email.toLowerCase().includes(q))
                      );
                    })
                  : orgs.slice(0, 3);

                if (matchedOrgs.length === 0) {
                  return (
                    <div className="p-6 rounded-2xl bg-black/30 border border-white/10 text-center text-sm text-slate-400">
                      No tenant organization matched <strong className="text-white font-mono">{lookupCode || search}</strong>.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchedOrgs.slice(0, 6).map((org) => {
                      const code = org.customer_code || getCustomerCode(org.id);
                      const trialInfo = org.subscription_status === "trialing" ? getTrialCountdown(org) : null;
                      return (
                        <div
                          key={org.id}
                          className="p-4 rounded-2xl bg-[#070B16]/90 border border-white/12 hover:border-sky-400/45 transition-all flex flex-col justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <button
                                type="button"
                                onClick={() => handleCopyCode(code, `diag-${org.id}`)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-400/45 text-cyan-300 font-mono text-xs font-black tracking-wider cursor-pointer"
                              >
                                <span>{copiedCode === `diag-${org.id}` ? "Copied!" : code}</span>
                                {copiedCode === `diag-${org.id}` ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  trialInfo
                                    ? trialInfo.isExpired || trialInfo.urgency === "critical"
                                      ? "bg-rose-500/15 text-rose-300 border-rose-400/35"
                                      : "bg-amber-500/15 text-amber-300 border-amber-400/35"
                                    : "bg-white/10 text-slate-200 border-white/15"
                                }`}
                              >
                                {trialInfo && <Clock size={10} />}
                                <span>
                                  {org.tier} · {trialInfo ? `Trial (${trialInfo.shortLabel})` : org.subscription_status}
                                </span>
                              </span>
                            </div>
                            <h3 className="text-base font-extrabold text-white truncate">{org.name}</h3>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {org.contact_email || `/${org.slug}`}
                            </p>

                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
                              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                                <p className="text-sm font-extrabold text-white">{org.properties_count}</p>
                                <p className="text-[10px] text-slate-400">Properties</p>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                                <p className="text-sm font-extrabold text-white">{org.tenants_count}</p>
                                <p className="text-[10px] text-slate-400">Tenants</p>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                                <p className="text-sm font-extrabold text-amber-300">{org.tickets_count}</p>
                                <p className="text-[10px] text-slate-400">Maint. Open</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEnterSupportMode(org)}
                              className="flex-1 py-2 px-3 rounded-xl text-xs font-extrabold text-white oiq-grad-bg hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Troubleshoot Dashboard</span>
                              <ArrowRight size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditOrg(org);
                                setEditTier(org.tier);
                                setEditStatus(org.subscription_status);
                                setEditDomain(org.custom_domain || "");
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                              title="Edit Plan Tier, Domain, or Extend Trial"
                            >
                              <Sliders size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* 2. Live Support Tickets Queue (Connected to /help Page) */}
            <div className="oiq-card overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <LifeBuoy size={18} className="text-sky-400" />
                    <h2 className="text-lg sm:text-xl font-extrabold text-white">
                      Customer Support Tickets Queue
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/35">
                      {supportTickets.length} total
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Tickets submitted directly from the <Link href="/help" className="text-sky-400 hover:underline">/help</Link> Support Center and contact escalations.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(["all", "Open", "Resolved"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTicketStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        ticketStatusFilter === st
                          ? "bg-sky-500 text-slate-950"
                          : "bg-white/5 text-slate-300 hover:text-white"
                      }`}
                    >
                      {st === "all" ? "All Tickets" : st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {(() => {
                  const q = (search || lookupCode).trim().toLowerCase();
                  const visibleTickets = supportTickets.filter((t) => {
                    if (ticketStatusFilter !== "all" && t.status !== ticketStatusFilter) return false;
                    if (!q) return true;
                    return (
                      t.customer_code.toLowerCase().includes(q) ||
                      t.company.toLowerCase().includes(q) ||
                      t.name.toLowerCase().includes(q) ||
                      t.email.toLowerCase().includes(q) ||
                      t.category.toLowerCase().includes(q) ||
                      t.message.toLowerCase().includes(q)
                    );
                  });

                  if (visibleTickets.length === 0) {
                    return (
                      <div className="py-12 px-6 text-center text-slate-400 space-y-2">
                        <CheckCircle2 size={28} className="text-emerald-400 mx-auto" />
                        <p className="text-sm font-bold text-white">No matching support tickets in the queue</p>
                        <p className="text-xs text-slate-400">
                          When a customer submits a support request on <code className="text-sky-300">/help</code>, it appears here automatically with their <code className="text-cyan-300">OIQ-XXXX</code> code.
                        </p>
                      </div>
                    );
                  }

                  return visibleTickets.map((t) => {
                    const priorityStyle =
                      t.priority === "Urgent"
                        ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
                        : t.priority === "High"
                        ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                        : "bg-slate-500/20 text-slate-300 border-slate-400/30";

                    return (
                      <div
                        key={t.id}
                        className="p-5 sm:p-6 hover:bg-white/[0.02] transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                      >
                        <div className="space-y-2 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                                t.status === "Open"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-400/45"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-400/45"
                              }`}
                            >
                              {t.status}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${priorityStyle}`}>
                              {t.priority} Priority
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-950/70 text-indigo-300 border border-indigo-500/35">
                              {t.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(t.customer_code, `ticket-${t.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold cursor-pointer"
                            >
                              <span>{copiedCode === `ticket-${t.id}` ? "Copied!" : t.customer_code}</span>
                              <Copy size={11} />
                            </button>
                            <span className="text-xs text-slate-400">
                              {new Date(t.submitted_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                            <strong className="text-white text-sm">{t.company}</strong>
                            <span>·</span>
                            <span>{t.name}</span>
                            {t.email && (
                              <a
                                href={`mailto:${t.email}?subject=${encodeURIComponent(
                                  `Re: [PropOpsIQ Support ${t.customer_code}] ${t.category}`
                                )}`}
                                className="text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold"
                              >
                                <Mail size={12} /> {t.email}
                              </a>
                            )}
                            {t.phone && (
                              <a href={`tel:${t.phone}`} className="text-slate-300 hover:text-white inline-flex items-center gap-1">
                                <Phone size={12} /> {t.phone}
                              </a>
                            )}
                          </div>

                          <p className="text-sm text-slate-200 whitespace-pre-wrap bg-black/30 border border-white/10 rounded-xl p-3.5 leading-relaxed">
                            {t.message}
                          </p>
                        </div>

                        <div className="flex flex-wrap lg:flex-col items-stretch sm:items-end gap-2 shrink-0">
                          {t.org_id && (
                            <button
                              type="button"
                              onClick={() => handleEnterSupportModeById(t.org_id!)}
                              className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-white oiq-grad-bg hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Enter Customer Dashboard</span>
                              <ArrowRight size={13} />
                            </button>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleTicketStatus(t)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                t.status === "Open"
                                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/40"
                                  : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/15"
                              }`}
                            >
                              {t.status === "Open" ? "Mark Resolved" : "Reopen Ticket"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupportTicket(t.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 cursor-pointer"
                              title="Delete ticket"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* 3. Connected /help Troubleshooting Guides & Quick-Share Reference */}
            <div className="oiq-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-cyan-400" />
                    <h2 className="text-lg sm:text-xl font-extrabold text-white">
                      Connected Help Center Knowledge Base ({TECH_SUPPORT_GUIDES.length} Guides &amp; {BASIC_FAQS.length} FAQs)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Synced with <Link href="/help" className="text-sky-400 hover:underline">/help</Link> and the AI Help Assistant. Click any guide to view steps or copy a direct troubleshooting link for a client.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                    placeholder="Filter guides (e.g. PIN, DNS, Excel)…"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TECH_SUPPORT_GUIDES.filter((g) => {
                  const q = kbSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    g.title.toLowerCase().includes(q) ||
                    g.symptom.toLowerCase().includes(q) ||
                    g.solutionSummary.toLowerCase().includes(q) ||
                    g.category.toLowerCase().includes(q)
                  );
                }).map((guide) => {
                  const Icon = guide.icon;
                  const accent = ACCENT_STYLES[guide.accent];
                  const isExp = expandedGuideId === guide.id;
                  const shareUrl = `${typeof window !== "undefined" && !window.location.origin.toLowerCase().includes("propopsiq.com") && !window.location.origin.toLowerCase().includes("operateiq.com") ? window.location.origin : "https://www.PropOpsIQ.com"}/help?view=techsupport&q=${encodeURIComponent(guide.title)}`;

                  return (
                    <div
                      key={guide.id}
                      className="rounded-2xl bg-[#070B16]/90 border border-white/10 p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${accent.badgeBg} ${accent.badgeBorder}`}>
                              <Icon size={18} className={accent.iconText} />
                            </div>
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${accent.pillBg} ${accent.pillText}`}>
                                {guide.category}
                              </span>
                              <h3 className="text-sm font-bold text-white leading-snug">{guide.title}</h3>
                              <p className="text-xs text-slate-400 mt-0.5">{guide.symptom}</p>
                            </div>
                          </div>
                        </div>

                        {isExp && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs text-slate-200">
                            <p className="font-semibold text-sky-300">{guide.solutionSummary}</p>
                            <ol className="list-decimal list-inside space-y-1 text-slate-300">
                              {guide.steps.map((st, idx) => (
                                <li key={idx}>{st}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => setExpandedGuideId(isExp ? null : guide.id)}
                          className="text-xs font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                        >
                          {isExp ? "Hide Steps" : "View Fix Steps"}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(shareUrl, `guide-${guide.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 cursor-pointer"
                          >
                            {copiedCode === `guide-${guide.id}` ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span className="text-emerald-300">Link Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy /help Link</span>
                              </>
                            )}
                          </button>
                          <Link
                            href={`/help?view=techsupport&q=${encodeURIComponent(guide.title)}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30"
                            title="Open in /help page"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === "signups" ? (
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
                      const code = s.customer_code || (s.org_id ? getCustomerCode(s.org_id) : null);
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-white flex flex-wrap items-center gap-2">
                              <span>{s.company || s.name}</span>
                              {code && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(code, `signup-${s.id}`)}
                                  title="Click to copy Customer Support Code"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer"
                                >
                                  <span>{copiedCode === `signup-${s.id}` ? "Copied!" : code}</span>
                                  {copiedCode === `signup-${s.id}` ? (
                                    <Check size={11} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={11} className="text-cyan-400/80" />
                                  )}
                                </button>
                              )}
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

                      const trialInfo = org.subscription_status === "trialing" ? getTrialCountdown(org) : null;

                      const statusColor =
                        org.subscription_status === "active"
                          ? "text-emerald-400 bg-emerald-950/40 border-emerald-500/30"
                          : org.subscription_status === "trialing"
                          ? trialInfo?.isExpired || trialInfo?.urgency === "critical"
                            ? "text-rose-300 bg-rose-950/50 border-rose-500/40"
                            : trialInfo?.urgency === "warning"
                            ? "text-amber-300 bg-amber-950/50 border-amber-500/40"
                            : "text-sky-300 bg-sky-950/50 border-sky-400/40"
                          : "text-rose-400 bg-rose-950/40 border-rose-500/30";

                      const code = org.customer_code || getCustomerCode(org.id);

                      return (
                        <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-white flex flex-wrap items-center gap-2">
                              <span>{org.name}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(code, `org-${org.id}`)}
                                title="Click to copy Customer Support Code"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer"
                              >
                                <span>{copiedCode === `org-${org.id}` ? "Copied!" : code}</span>
                                {copiedCode === `org-${org.id}` ? (
                                  <Check size={11} className="text-emerald-400" />
                                ) : (
                                  <Copy size={11} className="text-cyan-400/80" />
                                )}
                              </button>
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
                            <div className="inline-flex flex-col gap-1.5 min-w-[132px]">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border w-fit ${statusColor}`}
                              >
                                {trialInfo ? (
                                  <Clock size={11} className="flex-shrink-0" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                )}
                                <span>
                                  {trialInfo
                                    ? `Trial · ${trialInfo.shortLabel}`
                                    : org.subscription_status}
                                </span>
                              </span>

                              {trialInfo && (
                                <div className="w-32">
                                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        trialInfo.isExpired || trialInfo.urgency === "critical"
                                          ? "bg-gradient-to-r from-rose-500 to-orange-400"
                                          : trialInfo.urgency === "warning"
                                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                          : "bg-gradient-to-r from-sky-400 to-emerald-400"
                                      }`}
                                      style={{ width: `${Math.max(6, trialInfo.remainingPct)}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    {trialInfo.isExpired
                                      ? `Ended ${trialInfo.endDateShort}`
                                      : `${trialInfo.daysRemaining}/${trialInfo.totalDays}d · Ends ${trialInfo.endDateShort}`}
                                  </p>
                                </div>
                              )}
                            </div>
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
              Provision a new customer portfolio in PropOpsIQ.
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

            <div className="flex flex-wrap items-center gap-2 mb-1 pr-6">
              <h2 className="text-xl font-bold text-white">Edit {editOrg.name}</h2>
              {(() => {
                const editCode = editOrg.customer_code || getCustomerCode(editOrg.id);
                return (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(editCode, `modal-${editOrg.id}`)}
                    title="Click to copy Customer Support Code"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold tracking-wider transition-all cursor-pointer"
                  >
                    <span>{copiedCode === `modal-${editOrg.id}` ? "Copied!" : editCode}</span>
                    {copiedCode === `modal-${editOrg.id}` ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} className="text-cyan-400/80" />
                    )}
                  </button>
                );
              })()}
            </div>
            <p className="text-xs text-slate-400 mb-5">Adjust service tier, trial duration, and subscription status.</p>

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

              {(() => {
                const editTrial = getTrialCountdown({
                  ...editOrg,
                  subscription_status: editStatus,
                });
                const isTrialMode = editStatus === "trialing" || Boolean(editOrg.trial_ends_at);

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.015] border border-white/12 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                          <Clock size={15} />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-white block">
                            14-Day Trial Countdown
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {editTrial && isTrialMode
                              ? `Expires ${editTrial.endDateFull}`
                              : editStatus === "active"
                              ? "Paid subscription active (no trial limit)"
                              : "No active trial window"}
                          </span>
                        </div>
                      </div>

                      {editTrial && isTrialMode && (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                            editTrial.isExpired || editTrial.urgency === "critical"
                              ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
                              : editTrial.urgency === "warning"
                              ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                          }`}
                        >
                          {editTrial.longLabel}
                        </span>
                      )}
                    </div>

                    {editTrial && isTrialMode && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                          <span>
                            {editTrial.isExpired
                              ? "0 of 14 days remaining"
                              : `${editTrial.daysRemaining} of ${editTrial.totalDays} days remaining`}
                          </span>
                          <span className="font-mono text-sky-300">{editTrial.remainingPct}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-black/50 border border-white/10 overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              editTrial.isExpired || editTrial.urgency === "critical"
                                ? "bg-gradient-to-r from-rose-500 to-orange-400"
                                : editTrial.urgency === "warning"
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                : "bg-gradient-to-r from-sky-400 to-emerald-400"
                            }`}
                            style={{ width: `${Math.max(4, editTrial.remainingPct)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-400">
                        Grant extra evaluation time:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExtendTrial(7)}
                          disabled={extendingTrial}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-300 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {extendingTrial ? "…" : "+7 Days"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtendTrial(14)}
                          disabled={extendingTrial}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {extendingTrial ? "Extending…" : "+14 Days Trial"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
