"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Users,
  DollarSign,
  KeyRound,
  Globe,
  CheckCircle2,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react";
import { getPlan } from "@/lib/plans";
import { isSampleProperty, isSampleTenant } from "@/lib/sample-data";

export interface ChecklistOrg {
  id: string;
  name: string;
  slug: string;
  tier: string;
  subscription_status?: string;
  trial_ends_at?: string | null;
  created_at?: string | null;
  custom_domain?: string | null;
  site_published?: boolean;
  checklist_dismissed?: boolean;
}

export default function GetStartedChecklist({
  activeOrg,
  onNavigateTab,
  onOpenIntake,
  onOpenBilling,
  onDismissed,
}: {
  activeOrg: ChecklistOrg;
  onNavigateTab: (tab: "propdetails" | "tenants" | "rentledger" | "content" | "settings") => void;
  onOpenIntake: () => void;
  onOpenBilling: () => void;
  onDismissed: () => void;
}) {
  const [counts, setCounts] = useState<{
    realProperties: number;
    realTenants: number;
    rentRecords: number;
    staffPins: number;
    loaded: boolean;
  }>({
    realProperties: 0,
    realTenants: 0,
    rentRecords: 0,
    staffPins: 0,
    loaded: false,
  });
  const [dismissing, setDismissing] = useState(false);
  const [localDismissed, setLocalDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`oiq_checklist_dismissed_${activeOrg.id}`);
      if (saved === "1") setLocalDismissed(true);
    }
  }, [activeOrg.id]);

  const isChecklistHidden = Boolean(activeOrg.checklist_dismissed) || localDismissed;

  useEffect(() => {
    if (isChecklistHidden) return;
    let cancelled = false;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    Promise.all([
      fetch("/api/properties-dynamic", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { properties: [] }))
        .catch(() => ({ properties: [] })),
      fetch("/api/tenants", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { tenants: [] }))
        .catch(() => ({ tenants: [] })),
      fetch(`/api/rent-payments?month=${ym}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { payments: [] }))
        .catch(() => ({ payments: [] })),
      Promise.all([
        fetch("/api/allowed-users?role=maintenance", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : { users: [] }))
          .catch(() => ({ users: [] })),
        fetch("/api/allowed-users?role=cleaning", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : { users: [] }))
          .catch(() => ({ users: [] })),
      ]),
    ]).then(([propData, tenantData, ledgerData, [maintData, cleanData]]) => {
      if (cancelled) return;
      const props = Array.isArray(propData?.properties) ? propData.properties : [];
      const tenants = Array.isArray(tenantData?.tenants) ? tenantData.tenants : [];
      const records = Array.isArray(ledgerData?.payments)
        ? ledgerData.payments
        : Array.isArray(ledgerData?.records)
        ? ledgerData.records
        : [];
      const staffCount =
        (Array.isArray(maintData?.users) ? maintData.users.length : 0) +
        (Array.isArray(cleanData?.users) ? cleanData.users.length : 0);

      setCounts({
        realProperties: props.filter((p: { id?: string; badge?: string | null }) => !isSampleProperty(p)).length,
        realTenants: tenants.filter((t: { name?: string | null; notes?: string | null }) => !isSampleTenant(t)).length,
        rentRecords: records.length,
        staffPins: staffCount,
        loaded: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeOrg.id, isChecklistHidden]);

  const handleDismiss = async () => {
    setDismissing(true);
    setLocalDismissed(true);
    try {
      localStorage.setItem(`oiq_checklist_dismissed_${activeOrg.id}`, "1");
    } catch {
      /* ignore */
    }
    try {
      await fetch("/api/platform/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist_dismissed: true }),
      });
    } catch {
      /* ignore */
    } finally {
      setDismissing(false);
      onDismissed();
    }
  };

  const planDef = getPlan(activeOrg.tier);
  const isPaidActive = activeOrg.subscription_status === "active";
  const isPastDue = activeOrg.subscription_status === "past_due";
  const isCanceled = activeOrg.subscription_status === "canceled";

  const totalTrialDays = 14;
  const fallbackEndMs = activeOrg.created_at
    ? new Date(activeOrg.created_at).getTime() + totalTrialDays * 86_400_000
    : Date.now() + totalTrialDays * 86_400_000;
  const trialEndsMs = activeOrg.trial_ends_at
    ? new Date(activeOrg.trial_ends_at).getTime()
    : fallbackEndMs;
  const msRemaining = Math.max(0, trialEndsMs - Date.now());
  const daysLeft = Math.min(totalTrialDays, Math.max(0, Math.ceil(msRemaining / 86_400_000)));
  const trialEndDateLabel = new Date(trialEndsMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isTrialExpired = !isPaidActive && !isPastDue && (msRemaining <= 0 || isCanceled);
  const isUrgentTrial = !isPaidActive && !isTrialExpired && !isPastDue && daysLeft <= 3;

  // When checklist is dismissed, only show a compact status bar if action is needed (past_due, expired, or <=3d left)
  if (isChecklistHidden) {
    if (!isPastDue && !isTrialExpired && !isUrgentTrial) return null;
    return (
      <div
        className={`mb-6 rounded-2xl border px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 ${
          isPastDue || isTrialExpired
            ? "bg-rose-950/45 border-rose-500/45 text-rose-100"
            : "bg-amber-950/35 border-amber-500/40 text-amber-100"
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
          <AlertTriangle
            size={16}
            className={isPastDue || isTrialExpired ? "text-rose-400 shrink-0" : "text-amber-400 shrink-0"}
          />
          <span>
            {isPastDue
              ? `Your ${planDef.name} subscription payment is past due. Update your card to keep workspace edits enabled.`
              : isTrialExpired
              ? `Your 14-day ${planDef.name} trial ended on ${trialEndDateLabel}. Activate a plan to save new changes.`
              : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your ${planDef.name} free trial (ends ${trialEndDateLabel}).`}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenBilling}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-black transition-all cursor-pointer"
        >
          <span>{isPastDue ? "Update Payment Method" : "Choose a Plan"}</span>
          <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  const steps = [
    {
      id: "properties",
      done: counts.realProperties > 0,
      title: "Add your first property",
      desc:
        counts.realProperties > 0
          ? `${counts.realProperties} propert${counts.realProperties === 1 ? "y" : "ies"} in your portfolio`
          : "Enter an address & unit count, or import a spreadsheet",
      icon: Building2,
      actionLabel: counts.realProperties > 0 ? "View Properties" : "Add Property",
      onClick: () => onNavigateTab("propdetails"),
      secondaryLabel: counts.realProperties === 0 ? "Import File" : undefined,
      onSecondaryClick: counts.realProperties === 0 ? onOpenIntake : undefined,
    },
    {
      id: "tenants",
      done: counts.realTenants > 0,
      title: "Add or import your tenants",
      desc:
        counts.realTenants > 0
          ? `${counts.realTenants} tenant${counts.realTenants === 1 ? "" : "s"} on your rent roll`
          : "Add active leases manually or drop an Excel / CSV / PDF rent roll",
      icon: Users,
      actionLabel: counts.realTenants > 0 ? "Open Rent Roll" : "Add Tenants",
      onClick: () => onNavigateTab("tenants"),
      secondaryLabel: counts.realTenants === 0 ? "AI Import" : undefined,
      onSecondaryClick: counts.realTenants === 0 ? onOpenIntake : undefined,
    },
    {
      id: "rent",
      done: counts.rentRecords > 0,
      title: "Review or log this month's rent",
      desc:
        counts.rentRecords > 0
          ? "Monthly rent ledger active for current billing period"
          : "Track paid, partial, and overdue balances in one ledger",
      icon: DollarSign,
      actionLabel: "Open Rent Ledger",
      onClick: () => onNavigateTab("rentledger"),
    },
    {
      id: "crew",
      done: counts.staffPins > 0,
      title: "Create a 6-digit crew PIN",
      desc:
        counts.staffPins > 0
          ? `${counts.staffPins} field staff PIN${counts.staffPins === 1 ? "" : "s"} configured`
          : "Give maintenance or cleaning techs mobile access without admin login",
      icon: KeyRound,
      actionLabel: counts.staffPins > 0 ? "Manage Access" : "Create PIN",
      onClick: () => onNavigateTab("settings"),
    },
    {
      id: "site",
      done: Boolean(activeOrg.site_published),
      optional: true,
      title: "Customize & publish your portfolio site",
      desc: activeOrg.site_published
        ? "Your public portfolio site is live"
        : "Private draft by default — publish when your listings are ready",
      icon: Globe,
      actionLabel: activeOrg.site_published ? "Edit Site" : "Preview & Publish",
      onClick: () => onNavigateTab("content"),
    },
  ];

  const coreSteps = steps.filter((s) => !s.optional);
  const completedCore = coreSteps.filter((s) => s.done).length;

  return (
    <div className="mb-6 rounded-3xl border border-sky-500/25 bg-gradient-to-br from-[#0B1426] via-[#09101E] to-[#0D182E] p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
      {/* Top bar: Workspace badge + Trial/Billing pill + Dismiss */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-400/35">
              {isPaidActive ? `${planDef.name} Plan` : `${planDef.name} Trial`}
            </span>
            {isPastDue ? (
              <button
                type="button"
                onClick={onOpenBilling}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/25 text-rose-200 border border-rose-400/50 inline-flex items-center gap-1 cursor-pointer hover:bg-rose-500/35"
              >
                <AlertTriangle size={11} className="text-rose-300" />
                <span>Payment Past Due · Update Card →</span>
              </button>
            ) : isTrialExpired ? (
              <button
                type="button"
                onClick={onOpenBilling}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/25 text-rose-200 border border-rose-400/50 inline-flex items-center gap-1 cursor-pointer hover:bg-rose-500/35"
              >
                <AlertTriangle size={11} className="text-rose-300" />
                <span>14-Day Trial Ended · Choose a Plan →</span>
              </button>
            ) : !isPaidActive ? (
              <button
                type="button"
                onClick={onOpenBilling}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Clock size={11} className="text-cyan-400" />
                <span>
                  {daysLeft} day{daysLeft === 1 ? "" : "s"} left in free trial · Ends {trialEndDateLabel}
                </span>
              </button>
            ) : null}
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Get Started with {activeOrg.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {counts.loaded
              ? `${completedCore} of ${coreSteps.length} core setup steps complete — jump into any step below or hide this guide anytime.`
              : "Set up your properties, rent roll, and monthly ledger in a few minutes."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            type="button"
            onClick={onOpenIntake}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-sm"
          >
            <Sparkles size={13} />
            <span>AI Spreadsheet / Lease Import</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            title="Dismiss setup checklist"
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <X size={13} />
            <span className="hidden sm:inline">Dismiss</span>
          </button>
        </div>
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 pt-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                step.done
                  ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      step.done
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-sky-500/15 text-sky-400 border border-sky-400/25"
                    }`}
                  >
                    {step.done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {step.optional ? "Optional" : `Step ${idx + 1}`}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-white leading-snug">{step.title}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={step.onClick}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                    step.done
                      ? "bg-white/[0.06] hover:bg-white/[0.12] text-emerald-300 border border-emerald-500/25"
                      : "bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/15"
                  }`}
                >
                  {step.actionLabel}
                </button>
                {step.secondaryLabel && step.onSecondaryClick && (
                  <button
                    type="button"
                    onClick={step.onSecondaryClick}
                    className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30 transition-all cursor-pointer"
                  >
                    {step.secondaryLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
