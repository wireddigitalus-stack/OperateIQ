"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Building2, LayoutDashboard, Globe, ExternalLink, HelpCircle, LifeBuoy, Copy, Check, ShieldCheck } from "lucide-react";
import { getCustomerCode } from "@/lib/platform";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
  tier: string;
  role?: string;
  custom_domain?: string | null;
  customer_code?: string;
}

export default function AdminHeader() {
  const router = useRouter();
  const [activeOrg, setActiveOrg] = useState<OrgOption | null>(null);
  const [memberships, setMemberships] = useState<OrgOption[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const customerCode = activeOrg ? getCustomerCode(activeOrg.id, activeOrg.customer_code) : null;

  function handleCopySupportId() {
    if (!customerCode) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(customerCode).catch(() => {});
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  useEffect(() => {
    const loadSession = () => {
      fetch("/api/platform/session", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.isSuperAdmin === "boolean") setIsSuperAdmin(data.isSuperAdmin);
          if (Array.isArray(data.memberships)) setMemberships(data.memberships);
          if (data.activeOrg) setActiveOrg(data.activeOrg);
          else if (data.impersonatingOrg) setActiveOrg(data.impersonatingOrg);
        })
        .catch(() => {});
    };

    loadSession();

    const handleOrgUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ tier?: string; subscription_status?: string }>).detail;
      if (detail?.tier) {
        setActiveOrg((prev) => (prev ? { ...prev, tier: detail.tier! } : prev));
        setMemberships((prev) =>
          prev.map((m) => (activeOrg && m.id === activeOrg.id ? { ...m, tier: detail.tier! } : m))
        );
      }
      loadSession();
    };

    window.addEventListener("oiq-org-updated", handleOrgUpdated);
    return () => window.removeEventListener("oiq-org-updated", handleOrgUpdated);
  }, [activeOrg?.id]);

  async function handleSwitchOrg(orgId: string) {
    if (!orgId || orgId === activeOrg?.id) return;
    setSwitchingOrg(true);
    try {
      await fetch("/api/platform/set-active-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      window.location.href = "/admin";
    } catch {
      setSwitchingOrg(false);
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6
      bg-[rgba(8,12,20,0.92)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">

      {/* ── Left: Logo + workspace context badge / switcher ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin?tab=leads")}
          className="flex items-center gap-2.5 group"
          aria-label="Go to dashboard home"
        >
          <Image
            src="/operateiq_google_ICON_logo_1791954043128.png"
            alt="OpsIQ"
            width={32}
            height={32}
            className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform"
            priority
          />
          <span className={`text-white font-extrabold tracking-tight text-lg truncate ${activeOrg && memberships.length > 1 ? "hidden sm:inline" : ""}`}>
            Ops<span className="oiq-grad-text">IQ</span>
          </span>
          {activeOrg && memberships.length <= 1 ? (
            <span
              title={customerCode ? `${activeOrg.name} — Support ID: ${customerCode}` : activeOrg.name}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-950/50 text-[11px] font-bold text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
            >
              <Building2 size={11} className="text-cyan-400" />
              <span>{activeOrg.name}</span>
            </span>
          ) : !activeOrg ? (
            <span className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-white/15 bg-white/[0.04] text-[10px] font-black text-sky-400 uppercase tracking-widest shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <LayoutDashboard size={9} />
              Workspace
            </span>
          ) : null}
        </button>

        {activeOrg && memberships.length > 1 && (
          <div
            title={customerCode ? `${activeOrg.name} — Support ID: ${customerCode}` : activeOrg.name}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-sky-500/30 bg-sky-950/50 text-[11px] font-bold text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.15)] min-w-0"
          >
            <Building2 size={11} className="text-cyan-400 flex-shrink-0" />
            <select
              value={activeOrg.id}
              disabled={switchingOrg}
              onChange={(e) => handleSwitchOrg(e.target.value)}
              aria-label="Switch active organization"
              className="bg-transparent text-sky-200 font-bold text-[11px] outline-none cursor-pointer pr-1 max-w-[130px] sm:max-w-[220px] truncate"
              style={{ colorScheme: "dark" }}
            >
              {memberships.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0A0F1A] text-white">
                  {m.name} ({m.tier})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Right: View Public Site, Help & Workspace Plan ── */}
      <div className="flex items-center gap-2">
        {isSuperAdmin && (
          <Link
            href="/platform"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30 hover:text-white shadow-[0_0_16px_rgba(34,211,238,0.28)] transition-all"
            title="Open OpsIQ Master Admin Console (/platform)"
          >
            <ShieldCheck size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">Master Console</span>
            <span className="sm:hidden">Master</span>
          </Link>
        )}
        {(() => {
          const siteUrl = activeOrg?.custom_domain
            ? `https://${activeOrg.custom_domain}`
            : activeOrg?.slug
            ? `/site/${activeOrg.slug}`
            : null;

          if (!siteUrl) return null;
          return (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/10 border border-sky-400/30 text-sky-300 hover:bg-sky-500/20 hover:text-white shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all"
              title={`View public website for ${activeOrg?.name || "your company"}`}
            >
              <Globe size={13} className="text-sky-400" />
              <span className="hidden sm:inline">View Public Site</span>
              <span className="sm:hidden">Public Site</span>
              <ExternalLink size={10} />
            </a>
          );
        })()}

        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-help-center"))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.05] border border-white/15 text-slate-200 hover:bg-sky-500/15 hover:border-sky-400/40 hover:text-white transition-all cursor-pointer"
          title="Open Quick ProTips Guide Modal"
        >
          <HelpCircle size={14} className="text-sky-400" />
          <span className="hidden sm:inline">Quick Guide</span>
          <span className="sm:hidden">Guide</span>
        </button>

        <Link
          href="/help"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/15 border border-sky-400/35 text-sky-200 hover:bg-sky-500/25 hover:text-white transition-all"
          title="Open Full Help & Tech Support Center"
        >
          <LifeBuoy size={14} className="text-sky-400" />
          <span>Help Center</span>
        </Link>

        {activeOrg && customerCode && (
          <button
            type="button"
            onClick={handleCopySupportId}
            title="Click to copy your OpsIQ Support ID"
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/35 text-cyan-300 transition-all cursor-pointer"
          >
            <span>{copiedId ? "Copied ID!" : `ID: ${customerCode}`}</span>
            {copiedId ? (
              <Check size={12} className="text-emerald-400" />
            ) : (
              <Copy size={12} className="text-cyan-400/80" />
            )}
          </button>
        )}

        {activeOrg && (
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.04] border border-white/10 text-gray-400">
            {activeOrg.tier} Tier
          </span>
        )}
      </div>
    </header>
  );
}
