"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2, Plus, Phone, Mail, Calendar, TrendingUp, DollarSign,
  AlertTriangle, ChevronDown, ChevronUp, Edit2, Trash2, Save, X, Search,
  Clock, RefreshCw, CheckCircle2, User, Home, BadgePercent, Loader2,
  MessageSquare, FileSpreadsheet, Camera, FileText, Paperclip,
  Bell, RotateCcw, Sparkles,
} from "lucide-react";
import TenantImporter from "./TenantImporter";
import IntakeStagingModal from "./IntakeStagingModal";
import PrintButton from "./PrintButton";
import MicButton from "@/components/MicButton";
import { supabaseBrowser } from "@/lib/supabase-browser";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  building: string;
  unit: string;
  rep: string;
  monthlyRent: number;
  utilitiesFee: number;
  securityDeposit: number;
  nnnFee: number;
  cleaningFee: number;
  camFee: number;
  nnFee: number;
  leaseStart: string | null;
  leaseEnd: string | null;
  renewalDate: string | null;
  leaseAlertDays: number | null;  // 90 | 60 | 30 | null
  escalationPct: number;
  escalationDate: string | null;
  status: "active" | "pending" | "expired";
  notes: string;
  sourceLeadId: string;
  createdAt: string;
  leaseDocuments?: string;
  secDepReceived?: boolean;
  secDepDate?: string | null;
  secDepStatus?: string;
  secDepNotes?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function rowToTenant(r: Record<string, unknown>): Tenant {
  return {
    id: r.id as string,
    name: r.name as string,
    contactName: (r.contact_name as string) || "",
    email: (r.email as string) || "",
    phone: (r.phone as string) || "",
    building: (r.building as string) || "",
    unit: (r.unit as string) || "",
    rep: (r.rep as string) || "",
    monthlyRent: Number(r.monthly_rent) || 0,
    utilitiesFee: Number(r.utilities_fee) || 0,
    securityDeposit: Number(r.security_deposit) || 0,
    nnnFee: Number(r.nnn_fee) || 0,
    cleaningFee: Number(r.cleaning_fee) || 0,
    camFee: Number(r.cam_fee) || 0,
    nnFee: Number(r.nn_fee) || 0,
    leaseStart: (r.lease_start as string) || null,
    leaseEnd: (r.lease_end as string) || null,
    renewalDate: (r.renewal_date as string) || null,
    leaseAlertDays: r.lease_alert_days !== undefined && r.lease_alert_days !== null ? Number(r.lease_alert_days) : 90,
    escalationPct: Number(r.escalation_pct) || 0,
    escalationDate: (r.escalation_date as string) || null,
    status: (r.status as "active" | "pending" | "expired") || "active",
    notes: (r.notes as string) || "",
    sourceLeadId: (r.source_lead_id as string) || "",
    createdAt: (r.created_at as string) || new Date().toISOString(),
    leaseDocuments: (r.lease_documents as string) || "[]",
    secDepReceived: !!(r.sec_dep_received),
    secDepDate: (r.sec_dep_date as string) || null,
    secDepStatus: (r.sec_dep_status as string) || "no_change",
    secDepNotes: (r.sec_dep_notes as string) || "",
  };
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function renewalUrgency(days: number | null): {
  color: string;
  bg: string;
  border: string;
  glow: string;
  label: string;
  stage: "overdue" | "30d" | "60d" | "90d";
} | null {
  if (days === null) return null;
  if (days <= 0)  return { color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.45)", glow: "rgba(239,68,68,0.35)", label: "Pending Renewal (Overdue)", stage: "overdue" };
  if (days <= 30) return { color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)",  glow: "rgba(239,68,68,0.3)",  label: `Pending Renewal (${days}d left)`, stage: "30d" };
  if (days <= 60) return { color: "#F97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)", glow: "rgba(249,115,22,0.3)", label: `Pending Renewal (${days}d left)`, stage: "60d" };
  if (days <= 90) return { color: "#FACC15", bg: "rgba(250,204,21,0.12)", border: "rgba(250,204,21,0.4)", glow: "rgba(250,204,21,0.25)", label: `Pending Renewal (${days}d left)`, stage: "90d" };
  return null;
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK = (): Partial<Tenant> => ({
  name: "", contactName: "", email: "", phone: "",
  building: "", unit: "", rep: "",
  monthlyRent: 0, utilitiesFee: 0, securityDeposit: 0, nnnFee: 0,
  cleaningFee: 0, camFee: 0, nnFee: 0,
  leaseStart: "", leaseEnd: "", renewalDate: "", leaseAlertDays: 90,
  escalationPct: 0, escalationDate: "",
  status: "active", notes: "",
});

// ─── Tenant Form ─────────────────────────────────────────────────────────────

const LABEL = "text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1";
const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-600 transition-all";
const FIELD_SM = FIELD + " text-xs py-1.5";

function TenantForm({
  initial, onSave, onCancel, currentUserName, buildingOptions = [], leads = [],
}: {
  initial: Partial<Tenant>;
  onSave: (data: Partial<Tenant>) => Promise<void>;
  onCancel: () => void;
  currentUserName?: string;
  buildingOptions?: string[];
  leads?: any[];
}) {
  const [form, setForm] = useState<Partial<Tenant>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customBuilding, setCustomBuilding] = useState(false);

  const set = (k: keyof Tenant, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim()) { setError("Tenant name is required."); return; }
    setSaving(true);
    setError("");
    try { await onSave(form); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  // Check if the current value is in the options list
  const currentVal = form.building || "";
  const isInList = !currentVal || buildingOptions.includes(currentVal);

  return (
    <div className="bg-[rgba(0,0,0,0.4)] border border-white/15 rounded-2xl p-3 sm:p-5 mb-6 space-y-4 shadow-[0_0_24px_rgba(56,189,248,0.08)]">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-black text-sky-400 uppercase tracking-widest">
          {initial.id ? "Edit Tenant" : "Add New Tenant"}
        </p>
        <button onClick={onCancel} className="text-gray-600 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      {form.sourceLeadId && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-sky-400 text-xs font-semibold shadow-[0_0_12px_rgba(56,189,248,0.12)]">
          <Building2 size={14} className="flex-shrink-0" />
          <span>Converting Lead to Tenant — once saved, this lead will be automatically archived.</span>
        </div>
      )}

      {/* Company & Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Company / Tenant Name *</label>
          <input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Acme Tech Co." className={FIELD} spellCheck /></div>
        <div><label className={LABEL}>Primary Contact</label>
          <div className="flex gap-1.5 items-center"><input value={form.contactName || ""} onChange={e => set("contactName", e.target.value)} placeholder="Jane Smith" className={FIELD + " flex-1"} spellCheck /><MicButton onResult={(t) => set("contactName", (form.contactName || "") + (form.contactName ? " " : "") + t)} /></div></div>
        <div><label className={LABEL}>Email</label>
          <input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} placeholder="jane@company.com" className={FIELD} /></div>
        <div><label className={LABEL}>Phone</label>
          <div className="flex gap-1.5 items-center"><input type="tel" value={form.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="(555) 555-0000" className={FIELD + " flex-1"} /><MicButton onResult={(t) => set("phone", (form.phone || "") + (form.phone ? " " : "") + t)} /></div></div>
      </div>

      {/* Property */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2"><label className={LABEL}>Building / Property</label>
          {customBuilding ? (
            <div className="flex gap-1.5 items-center">
              <input
                value={currentVal}
                onChange={e => set("building", e.target.value)}
                placeholder="e.g. 123 Main St"
                className={FIELD + " flex-1"}
              />
              <button
                onClick={() => setCustomBuilding(false)}
                className="text-[10px] text-gray-500 hover:text-white px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-colors whitespace-nowrap"
              >
                ← List
              </button>
            </div>
          ) : (
            <select
              value={isInList ? currentVal : "__custom__"}
              onChange={e => {
                if (e.target.value === "__custom__") {
                  setCustomBuilding(true);
                  set("building", "");
                } else {
                  set("building", e.target.value);
                }
              }}
              className={`${FIELD} ${!isInList ? "border-yellow-500/50" : ""}`}
            >
              <option value="" className="bg-[#0A0F1A]">Select property…</option>
              {!isInList && (
                <option value={currentVal} className="bg-[#0A0F1A]">⚠ {currentVal} (not in list — re-select or keep)</option>
              )}
              {buildingOptions.map(name => (
                <option key={name} value={name} className="bg-[#0A0F1A]">{name}</option>
              ))}
              <option value="__custom__" className="bg-[#0A0F1A]">✏️ Type custom address…</option>
            </select>
          )}</div>
        <div><label className={LABEL}>Unit / Suite</label>
          <div className="flex gap-1.5 items-center"><input value={form.unit || ""} onChange={e => set("unit", e.target.value)} placeholder="204" className={FIELD + " flex-1"} /><MicButton onResult={(t) => set("unit", (form.unit || "") + (form.unit ? " " : "") + t)} /></div></div>
      </div>

      {/* Financials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Monthly Rent ($)</label>
          <input type="number" step="any" value={form.monthlyRent || ""} onChange={e => set("monthlyRent", Number(e.target.value))} placeholder="4200" className={FIELD} /></div>
        <div><label className={LABEL}>Monthly Utilities Fee ($)</label>
          <input type="number" step="any" value={form.utilitiesFee || ""} onChange={e => set("utilitiesFee", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Returnable Deposit ($)</label>
          <input type="number" step="any" value={form.securityDeposit || ""} onChange={e => set("securityDeposit", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
        <div><label className={LABEL}>NNN Fee / Triple Net ($)</label>
          <input type="number" step="any" value={form.nnnFee || ""} onChange={e => set("nnnFee", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className={LABEL}>Cleaning Fee ($)</label>
          <input type="number" step="any" value={form.cleaningFee || ""} onChange={e => set("cleaningFee", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
        <div><label className={LABEL}>CAM Fee ($)</label>
          <input type="number" step="any" value={form.camFee || ""} onChange={e => set("camFee", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
        <div><label className={LABEL}>NN Fee ($)</label>
          <input type="number" step="any" value={form.nnFee || ""} onChange={e => set("nnFee", Number(e.target.value))} placeholder="0" className={FIELD} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Renewal Escalation %</label>
          <input type="number" step="0.1" value={form.escalationPct || ""} onChange={e => set("escalationPct", Number(e.target.value))} placeholder="3" className={FIELD} /></div>
        <div><label className={LABEL}>Next Escalation Date</label>
          <input type="date" value={form.escalationDate || ""} onChange={e => set("escalationDate", e.target.value)} className={FIELD} /></div>
      </div>

      {/* Lease Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className={LABEL}>Lease Start</label>
          <input type="date" value={form.leaseStart || ""} onChange={e => set("leaseStart", e.target.value)} className={FIELD} /></div>
        <div><label className={LABEL}>Lease End / Expiration</label>
          <input type="date" value={form.leaseEnd || ""} onChange={e => set("leaseEnd", e.target.value)} className={FIELD} /></div>
        <div><label className={LABEL}>Auto Renewal Date</label>
          <input type="date" value={form.renewalDate || ""} onChange={e => set("renewalDate", e.target.value)} className={FIELD} /></div>
      </div>

      {/* Lease Renewal Alert */}
      <div>
        <label className={LABEL}>Pending Renewal Alert Window</label>
        <p className="text-[10px] text-gray-500 mb-2">Pulsing "Pending Renewal" alert triggers when lease is within:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { v: 90, l: "90 Days", sub: "Standard notice" },
            { v: 60, l: "60 Days", sub: "60-day notice" },
            { v: 30, l: "30 Days", sub: "Urgent (30-day)" },
            { v: null, l: "Off", sub: "No alerts" },
          ].map(opt => (
            <button
              key={String(opt.v)}
              type="button"
              onClick={() => set("leaseAlertDays", opt.v)}
              className={`py-2 px-2 rounded-xl text-center border transition-all ${
                form.leaseAlertDays === opt.v
                  ? "bg-white/[0.08] border-white/25 text-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.18)]"
                  : "border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-gray-200 hover:border-[rgba(255,255,255,0.2)]"
              }`}
            >
              <p className="text-xs font-black">{opt.l}</p>
              <p className="text-[9px] text-gray-500">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Rep + Status + Source Lead */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className={LABEL}>Assigned Rep</label>
          <div className="flex gap-1.5 items-center"><input value={form.rep || ""} onChange={e => set("rep", e.target.value)}
            placeholder={currentUserName || "Your name"} className={FIELD + " flex-1"} /><MicButton onResult={(t) => set("rep", (form.rep || "") + (form.rep ? " " : "") + t)} /></div></div>
        <div><label className={LABEL}>Status</label>
          <select value={form.status || "active"} onChange={e => set("status", e.target.value as "active"|"pending"|"expired")} className={FIELD}>
            <option value="active" className="bg-[#0A0F1A]">Active</option>
            <option value="pending" className="bg-[#0A0F1A]">Pending</option>
            <option value="expired" className="bg-[#0A0F1A]">Expired</option>
          </select>
        </div>
        <div><label className={LABEL}>Source Lead (Optional)</label>
          <select value={form.sourceLeadId || ""} onChange={e => set("sourceLeadId", e.target.value)} className={FIELD}>
            <option value="" className="bg-[#0A0F1A]">None / Pre-existing</option>
            {leads.map((l: any) => (
              <option key={l.id} value={l.id} className="bg-[#0A0F1A]">
                {l.name} ({l.spaceType || "Lead"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div><label className={LABEL}>Notes</label>
        <div className="flex gap-1.5 items-center"><textarea spellCheck={true} value={form.notes || ""} onChange={e => set("notes", e.target.value)}
          rows={2} className={FIELD_SM + " flex-1"} placeholder="Additional lease terms, special conditions…" /><MicButton onResult={(t) => set("notes", (form.notes || "") + (form.notes ? " " : "") + t)} /></div></div>

      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_14px_rgba(59,130,246,0.35)]">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? "Saving…" : "Save Tenant"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Revenue Intelligence Banner ─────────────────────────────────────────────

function RevenueBanner({ tenants, onTenantClick }: { tenants: Tenant[]; onTenantClick: (id: string) => void }) {
  const active = tenants.filter(t => t.status === "active");
  const totalMonthly = active.reduce((s, t) => s + t.monthlyRent + (t.nnnFee || 0) + (t.nnFee || 0) + (t.camFee || 0) + (t.utilitiesFee || 0) + (t.cleaningFee || 0), 0);
  const totalARR = totalMonthly * 12;

  // Renewal alerts — per-tenant threshold (leaseAlertDays) or default 90
  const renewalAlerts = active
    .filter(t => t.renewalDate || t.leaseEnd)
    .map(t => ({ tenant: t, days: daysUntil(t.renewalDate || t.leaseEnd) }))
    .filter(x => {
      if (x.days === null) return false;
      const threshold = x.tenant.leaseAlertDays ?? 90;
      return x.days <= threshold;
    })
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  // Upcoming escalations
  const escalations = active
    .filter(t => t.escalationDate && t.escalationPct > 0)
    .map(t => ({ tenant: t, days: daysUntil(t.escalationDate) }))
    .filter(x => x.days !== null && x.days > 0 && x.days <= 180)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.04] via-blue-500/[0.03] to-transparent p-3 sm:p-5 mb-6 relative overflow-hidden shadow-[0_0_28px_rgba(56,189,248,0.08)]">
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-blue-500 opacity-[0.06] blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_14px_rgba(59,130,246,0.35)] text-white">
          <DollarSign size={14} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-black text-sky-400 uppercase tracking-widest">Revenue Intelligence</p>
          <p className="text-[11px] text-gray-500">{active.length} active tenant{active.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: "Monthly Revenue", value: fmtMoney(totalMonthly) },
          { label: "Annual ARR", value: fmtMoney(totalARR) },
          { label: "Avg Lease/Tenant", value: active.length ? fmtMoney(Math.round(totalMonthly / active.length)) : "$0" },
        ].map(s => (
          <div key={s.label} className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3 border border-[rgba(255,255,255,0.06)]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className="text-base sm:text-lg font-black text-white tabular-nums truncate">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Renewal Alerts */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
            <AlertTriangle size={10} /> Renewals Requiring Attention
          </p>
          {renewalAlerts.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No renewals due within 90 days ✓</p>
          ) : renewalAlerts.map(({ tenant, days }) => {
            const urg = renewalUrgency(days);
            if (!urg) return null;
            return (
              <button key={tenant.id} onClick={() => onTenantClick(tenant.id)}
                className="w-full text-left flex items-center justify-between gap-2 mb-1.5 px-3 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors group">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: urg.color }} />
                  <span className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">{tenant.name}</span>
                  {tenant.unit && <span className="text-[10px] text-gray-600">· {tenant.unit}</span>}
                </div>
                <span className="text-[10px] font-bold flex-shrink-0 px-2 py-0.5 rounded-lg border"
                  style={{ color: urg.color, backgroundColor: urg.bg, borderColor: urg.border }}>
                  {urg.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Upcoming Escalations */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
            <BadgePercent size={10} /> Upcoming Rent Escalations
          </p>
          {escalations.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No escalations in next 6 months</p>
          ) : escalations.map(({ tenant, days }) => {
            const increase = Math.round(tenant.monthlyRent * (tenant.escalationPct / 100));
            return (
              <button key={tenant.id} onClick={() => onTenantClick(tenant.id)}
                className="w-full text-left flex items-center justify-between gap-2 mb-1.5 px-3 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors group">
                <div className="flex items-center gap-2 min-w-0">
                  <TrendingUp size={10} className="text-[#4ADE80] flex-shrink-0" />
                  <span className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">{tenant.name}</span>
                </div>
                <div className="text-right flex-shrink-0 min-w-0">
                  <span className="text-[10px] text-[#4ADE80] font-bold whitespace-nowrap">+{tenant.escalationPct}% · +{fmtMoney(increase)}/mo</span>
                  <span className="text-[10px] text-gray-600 ml-1 whitespace-nowrap">in {days}d</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tenant Card ──────────────────────────────────────────────────────────────

function TenantCard({
  tenant, onEdit, onDelete, onTenantUpdated, currentUserName, currentUserEmail,
}: {
  tenant: Tenant;
  onEdit: (t: Tenant) => void;
  onDelete: (id: string) => void;
  onTenantUpdated?: (id: string, patch: Partial<Tenant>) => void;
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [localNotes, setLocalNotes] = useState(tenant.notes || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Local state for interactive renewals & alert window adjustment
  const [localAlertDays, setLocalAlertDays] = useState<number | null>(
    tenant.leaseAlertDays !== undefined && tenant.leaseAlertDays !== null ? Number(tenant.leaseAlertDays) : 90
  );
  const [localLeaseEnd, setLocalLeaseEnd] = useState<string | null>(tenant.leaseEnd);
  const [localStatus, setLocalStatus] = useState<"active" | "pending" | "expired">(tenant.status);
  const [localMonthlyRent, setLocalMonthlyRent] = useState<number>(tenant.monthlyRent);
  const [updatingAlert, setUpdatingAlert] = useState(false);

  // Quick Renewal Modal
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewRent, setRenewRent] = useState(String(tenant.monthlyRent));
  const [renewAlertDays, setRenewAlertDays] = useState<number | null>(90);
  const [renewing, setRenewing] = useState(false);

  // Synchronize when tenant prop changes
  useEffect(() => {
    setLocalAlertDays(tenant.leaseAlertDays !== undefined && tenant.leaseAlertDays !== null ? Number(tenant.leaseAlertDays) : 90);
    setLocalLeaseEnd(tenant.leaseEnd);
    setLocalStatus(tenant.status);
    setLocalMonthlyRent(tenant.monthlyRent);
    setLocalNotes(tenant.notes || "");
  }, [tenant.leaseAlertDays, tenant.leaseEnd, tenant.status, tenant.monthlyRent, tenant.notes]);

  const [localDocs, setLocalDocs] = useState<Array<{ name: string; url: string; uploadedAt: string }>>(() => {
    try { return JSON.parse(tenant.leaseDocuments || "[]"); }
    catch { return []; }
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState("");

  useEffect(() => {
    try {
      setLocalDocs(JSON.parse(tenant.leaseDocuments || "[]"));
    } catch {
      setLocalDocs([]);
    }
  }, [tenant.leaseDocuments]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingNote(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tenantId", tenant.id);
    try {
      const res = await fetch("/api/tenant-upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok && d.url) {
        const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        const author = currentUserName || "Staff";
        const newEntry = `[${timestamp} — ${author}] 📸 Photo Attached: ${d.url}`;
        const updated = localNotes ? `${localNotes}\n${newEntry}` : newEntry;
        
        await fetch(`/api/tenants?id=${tenant.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: updated,
            actorName: author,
            actorEmail: currentUserEmail || "",
            name: tenant.name,
          }),
        });
        setLocalNotes(updated);
      }
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setDocUploadError("");
    try {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("File is too large. Maximum size is 50MB.");
      }

      // 1. Request signed upload URL from server (tiny JSON payload, bypasses Vercel 4.5MB limit)
      const signRes = await fetch("/api/tenant-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          tenantId: tenant.id,
        }),
      });

      if (!signRes.ok) {
        const text = await signRes.text().catch(() => "");
        let errMsg = text;
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || text;
        } catch {
          if (signRes.status === 413 || text.toLowerCase().includes("request entity")) {
            errMsg = "File exceeds the allowed size limit.";
          }
        }
        throw new Error(errMsg || `Upload authorization failed (${signRes.status})`);
      }

      const signData = await signRes.json();
      if (!signData.success || !signData.token || !signData.path) {
        throw new Error(signData.error || "Failed to obtain upload authorization.");
      }

      // 2. Upload file directly from browser to Supabase Storage via signed URL
      let uploadSuccess = false;
      try {
        const { error: uploadErr } = await supabaseBrowser.storage
          .from("tenant-assets")
          .uploadToSignedUrl(signData.path, signData.token, file, {
            upsert: true,
            contentType: file.type || "application/pdf",
          });
        if (!uploadErr) {
          uploadSuccess = true;
        } else {
          console.warn("uploadToSignedUrl failed, trying direct PUT fallback:", uploadErr);
        }
      } catch (sdkErr) {
        console.warn("uploadToSignedUrl error, trying direct PUT fallback:", sdkErr);
      }

      // Fallback: direct PUT to signedUrl
      if (!uploadSuccess && signData.signedUrl) {
        const putRes = await fetch(signData.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/pdf",
            "x-upsert": "true",
          },
          body: file,
        });
        if (!putRes.ok) {
          const putErr = await putRes.text().catch(() => "");
          throw new Error(`Direct storage upload failed (${putRes.status}): ${putErr || "Please try again."}`);
        }
        uploadSuccess = true;
      }

      const publicUrl = signData.publicUrl;

      // 3. Save document entry to tenant record in database
      const newDoc = {
        name: file.name,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
      };
      const updated = [...localDocs, newDoc];
      const saveRes = await fetch(`/api/tenants?id=${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseDocuments: JSON.stringify(updated),
          actorName: currentUserName || "Staff",
          actorEmail: currentUserEmail || "",
          name: tenant.name,
        }),
      });
      if (!saveRes.ok) {
        const errText = await saveRes.text().catch(() => "");
        throw new Error(`Failed to save document to tenant record: ${errText}`);
      }
      setLocalDocs(updated);
      onTenantUpdated?.(tenant.id, { leaseDocuments: JSON.stringify(updated) });
    } catch (err: any) {
      console.error("PDF upload failed:", err);
      let msg = err?.message || "Failed to upload document.";
      if (msg.includes("Unexpected token") || msg.toLowerCase().includes("not valid json")) {
        msg = "Upload size exceeded server limit or connection failed. Please ensure file is under 50MB.";
      }
      setDocUploadError(msg);
    } finally {
      setUploadingDoc(false);
      // Reset input value so the same file can be re-selected if needed
      e.target.value = "";
    }
  };

  const leaseEndDays = daysUntil(localLeaseEnd);
  const renewalDays = daysUntil(tenant.renewalDate);
  const effectiveDays = renewalDays ?? leaseEndDays;
  const alertThreshold = localAlertDays;

  // Pending Renewal is active when:
  // - Effective lease end is within configured alert window (90, 60, or 30 days) and alert is not off
  // - OR effective days <= 0 (lease expired/overdue pending renewal)
  // - OR status === "expired"
  const isPendingRenewal = effectiveDays !== null && (
    (alertThreshold !== null && effectiveDays <= alertThreshold) ||
    effectiveDays <= 0 ||
    localStatus === "expired"
  );
  const urgency = isPendingRenewal ? renewalUrgency(effectiveDays) : null;
  const escalationDays = daysUntil(tenant.escalationDate);
  const annualRent = localMonthlyRent * 12;

  const handleUpdateAlertDays = async (days: number | null) => {
    setUpdatingAlert(true);
    try {
      const res = await fetch(`/api/tenants?id=${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseAlertDays: days,
          actorName: currentUserName || "Staff",
          actorEmail: currentUserEmail || "",
          name: tenant.name,
        }),
      });
      if (res.ok) {
        setLocalAlertDays(days);
        onTenantUpdated?.(tenant.id, { leaseAlertDays: days });
      }
    } catch (err) {
      console.error("Failed to update alert days:", err);
    } finally {
      setUpdatingAlert(false);
    }
  };

  const openRenewModal = () => {
    const base = localLeaseEnd ? new Date(localLeaseEnd) : new Date();
    const effectiveBase = isNaN(base.getTime()) || base.getTime() < Date.now() ? new Date() : base;
    const nextYear = new Date(effectiveBase);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setRenewEndDate(nextYear.toISOString().split("T")[0]);
    if (tenant.escalationPct > 0) {
      const escalated = Math.round(localMonthlyRent * (1 + tenant.escalationPct / 100));
      setRenewRent(String(escalated));
    } else {
      setRenewRent(String(localMonthlyRent));
    }
    setRenewAlertDays(localAlertDays ?? 90);
    setShowRenewModal(true);
  };

  const handleConfirmRenew = async () => {
    if (!renewEndDate) return;
    setRenewing(true);
    const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const author = currentUserName || "Staff";
    const rentNum = Number(renewRent) || localMonthlyRent;
    const renewalNote = `[${timestamp} — ${author}] 🔄 Lease Renewed to ${renewEndDate} ($${rentNum}/mo)`;
    const updatedNotes = localNotes ? `${localNotes}\n${renewalNote}` : renewalNote;
    const patchData: Partial<Tenant> = {
      leaseEnd: renewEndDate,
      status: "active",
      monthlyRent: rentNum,
      leaseAlertDays: renewAlertDays,
      notes: updatedNotes,
    };
    try {
      const res = await fetch(`/api/tenants?id=${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...patchData,
          actorName: author,
          actorEmail: currentUserEmail || "",
          name: tenant.name,
        }),
      });
      if (res.ok) {
        setLocalLeaseEnd(renewEndDate);
        setLocalStatus("active");
        setLocalMonthlyRent(rentNum);
        setLocalNotes(updatedNotes);
        setShowRenewModal(false);
        onTenantUpdated?.(tenant.id, patchData);
      }
    } catch (err) {
      console.error("Failed to renew lease:", err);
    } finally {
      setRenewing(false);
    }
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const author = currentUserName || "Staff";
    const newEntry = `[${timestamp} — ${author}] ${note.trim()}`;
    const updated = localNotes ? `${localNotes}\n${newEntry}` : newEntry;
    try {
      await fetch(`/api/tenants?id=${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: updated,
          actorName: currentUserName || "Staff",
          actorEmail: currentUserEmail || "",
          name: tenant.name,
        }),
      });
      setLocalNotes(updated);
      setNote("");
    } finally { setSavingNote(false); }
  };

  const noteLines = localNotes ? localNotes.split("\n").filter(Boolean).reverse() : [];

  return (
    <div id={`tenant-card-${tenant.id}`}
      className={`glass rounded-2xl border transition-all p-3 sm:p-5 ${
        isPendingRenewal && urgency
          ? urgency.stage === "overdue" || urgency.stage === "30d"
            ? "border-[rgba(239,68,68,0.45)] shadow-[0_0_20px_rgba(239,68,68,0.1)]"
            : urgency.stage === "60d"
              ? "border-[rgba(249,115,22,0.4)] shadow-[0_0_18px_rgba(249,115,22,0.08)]"
              : "border-[rgba(250,204,21,0.35)] shadow-[0_0_16px_rgba(250,204,21,0.06)]"
          : "border-white/[0.08] hover:border-white/25 hover:shadow-[0_0_18px_rgba(56,189,248,0.12)]"
      }`}>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.12)]">
            <Building2 size={16} className="text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-white font-bold text-sm">{tenant.name}</h3>
              {/* Pulsing Pending Renewal alert badge */}
              {isPendingRenewal && urgency ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-lg border font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse"
                  style={{
                    color: urgency.color,
                    backgroundColor: urgency.bg,
                    borderColor: urgency.border,
                    boxShadow: `0 0 10px ${urgency.glow}`,
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-ping inline-block" style={{ backgroundColor: urgency.color }} />
                  {urgency.label}
                </span>
              ) : (
                <>
                  {localStatus === "expired" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-red-400 font-bold">EXPIRED</span>
                  )}
                  {localStatus === "pending" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.3)] text-[#FACC15] font-bold">PENDING</span>
                  )}
                </>
              )}
            </div>
            {tenant.contactName && (
              <p className="text-xs text-gray-500 mt-0.5">{tenant.contactName}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-1 text-xs">
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="flex items-center gap-1 text-gray-400 hover:text-[#4ADE80] font-mono transition-colors">
                  <Phone size={10} />{tenant.phone}
                </a>
              )}
              {tenant.email && (
                <a href={`mailto:${tenant.email}`} className="flex items-center gap-1 text-gray-400 hover:text-[#60A5FA] transition-colors">
                  <Mail size={10} />{tenant.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Quick controls: Alert days (90/60/30) + Quick Renew + Edit */}
        <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
          {/* Alert Days Selector (90d / 60d / 30d / Off) */}
          <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-2 py-1">
            <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
              <Bell size={10} className={isPendingRenewal ? "text-amber-400 animate-pulse" : "text-gray-500"} /> Alert:
            </span>
            {([90, 60, 30] as const).map(d => (
              <button
                key={d}
                type="button"
                disabled={updatingAlert}
                onClick={() => handleUpdateAlertDays(d)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all ${
                  localAlertDays === d
                    ? "bg-white/[0.08] text-sky-400 border border-white/20 shadow-[0_0_10px_rgba(56,189,248,0.18)]"
                    : "text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10"
                }`}
                title={`Trigger pending renewal alert ${d} days before lease expiration`}
              >
                {d}d
              </button>
            ))}
            <button
              type="button"
              disabled={updatingAlert}
              onClick={() => handleUpdateAlertDays(null)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                localAlertDays === null
                  ? "bg-gray-700/50 text-gray-300 border border-gray-600"
                  : "text-gray-600 hover:text-gray-400 border border-transparent hover:border-white/10"
              }`}
              title="Turn off renewal alerts for this tenant"
            >
              Off
            </button>
          </div>

          {/* Quick Renew Lease Button */}
          <button
            type="button"
            onClick={openRenewModal}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              isPendingRenewal
                ? "bg-white/[0.08] border border-white/20 text-sky-400 hover:bg-white/[0.12] shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-gray-300 hover:text-white hover:border-white/25 hover:shadow-[0_0_10px_rgba(56,189,248,0.12)]"
            }`}
            title="Renew lease in system (clears pending renewal alert)"
          >
            <RotateCcw size={11} className={isPendingRenewal ? "animate-spin-slow" : ""} />
            Renew Lease
          </button>

          <div className="flex gap-1">
            <button onClick={() => onEdit({ ...tenant, leaseAlertDays: localAlertDays, leaseEnd: localLeaseEnd, status: localStatus, monthlyRent: localMonthlyRent, notes: localNotes })}
              className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-sky-400 hover:border-white/25 transition-all"
              title="Edit tenant">
              <Edit2 size={12} />
            </button>
            {confirmDelete ? (
              <div className="flex gap-1 items-center">
                <span className="text-[10px] text-red-400">Sure?</span>
                <button onClick={() => onDelete(tenant.id)} className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 text-[10px] hover:text-white transition-colors">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-red-400 hover:border-[rgba(239,68,68,0.3)] transition-all">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Property + Rep chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {tenant.building && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400">
            <Home size={10} />{tenant.building}{tenant.unit ? ` · ${tenant.unit}` : ""}
          </span>
        )}
        {tenant.rep && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400">
            <User size={10} />Rep: {tenant.rep}
          </span>
        )}
      </div>

      {/* Financials grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.08]">
          <p className="text-[10px] text-gray-600 mb-0.5">Monthly Rent</p>
          <p className="text-sm font-black text-[#4ADE80]">{fmtMoney(tenant.monthlyRent)}</p>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.08]">
          <p className="text-[10px] text-gray-600 mb-0.5">Annual Value</p>
          <p className="text-sm font-black text-[#4ADE80]">{fmtMoney(annualRent)}</p>
        </div>
        {tenant.utilitiesFee > 0 && (
          <div className="bg-[rgba(96,165,250,0.05)] rounded-xl p-2.5 border border-[rgba(96,165,250,0.12)]">
            <p className="text-[10px] text-gray-600 mb-0.5">Utilities Fee</p>
            <p className="text-sm font-black text-[#60A5FA]">{fmtMoney(tenant.utilitiesFee)}</p>
          </div>
        )}
        {tenant.nnnFee > 0 && (
          <div className="bg-[rgba(168,85,247,0.05)] rounded-xl p-2.5 border border-[rgba(168,85,247,0.12)]">
            <p className="text-[10px] text-gray-600 mb-0.5">NNN / Triple Net</p>
            <p className="text-sm font-black text-[#A855F7]">{fmtMoney(tenant.nnnFee)}</p>
          </div>
        )}
        {tenant.cleaningFee > 0 && (
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5">Cleaning Fee</p>
            <p className="text-sm font-black text-[#F472B6]">{fmtMoney(tenant.cleaningFee)}</p>
          </div>
        )}
        {tenant.camFee > 0 && (
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5">CAM Fee</p>
            <p className="text-sm font-black text-[#22D3EE]">{fmtMoney(tenant.camFee)}</p>
          </div>
        )}
        {tenant.nnFee > 0 && (
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-2.5">
            <p className="text-[10px] text-gray-600 mb-0.5">NN Fee</p>
            <p className="text-sm font-black text-[#FB923C]">{fmtMoney(tenant.nnFee)}</p>
          </div>
        )}
        {tenant.securityDeposit > 0 && (
          <div className="bg-[rgba(250,204,21,0.05)] rounded-xl p-2.5 border border-[rgba(250,204,21,0.12)]">
            <p className="text-[10px] text-gray-600 mb-0.5">Deposit (Returnable)</p>
            <p className="text-sm font-black text-[#FACC15]">{fmtMoney(tenant.securityDeposit)}</p>
          </div>
        )}
        {/* Right column: Lease End with pulsing Pending Renewal indicator */}
        <div className={`rounded-xl p-2.5 border transition-all ${
          isPendingRenewal && urgency
            ? urgency.stage === "overdue" || urgency.stage === "30d"
              ? "border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.08)] shadow-[0_0_14px_rgba(239,68,68,0.18)]"
              : urgency.stage === "60d"
                ? "border-[rgba(249,115,22,0.45)] bg-[rgba(249,115,22,0.08)] shadow-[0_0_14px_rgba(249,115,22,0.18)]"
                : "border-[rgba(250,204,21,0.45)] bg-[rgba(250,204,21,0.08)] shadow-[0_0_14px_rgba(250,204,21,0.18)]"
            : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]"
        }`}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] text-gray-500 font-medium">Lease End</p>
            {isPendingRenewal && urgency && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.2 rounded border animate-pulse"
                style={{ color: urgency.color, backgroundColor: urgency.bg, borderColor: urgency.border }}>
                <span className="w-1.5 h-1.5 rounded-full animate-ping inline-block" style={{ backgroundColor: urgency.color }} />
                Pending Renewal
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-white">{fmtDate(localLeaseEnd)}</p>
          {leaseEndDays !== null && (
            isPendingRenewal && urgency ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: urgency.color }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: urgency.color }} />
                </span>
                <span className="text-[10px] font-black tracking-tight animate-pulse" style={{ color: urgency.color }}>
                  {leaseEndDays <= 0 ? "Pending Renewal · Overdue" : `Pending Renewal (${leaseEndDays}d)`}
                </span>
              </div>
            ) : (
              <p className="text-[10px] mt-0.5 text-gray-500 font-medium">
                {leaseEndDays}d remaining
              </p>
            )
          )}
        </div>
        <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-2.5 border border-[rgba(255,255,255,0.06)]">
          <p className="text-[10px] text-gray-600 mb-0.5">Lease Start</p>
          <p className="text-xs font-bold text-white">{fmtDate(tenant.leaseStart)}</p>
        </div>
      </div>

      {/* Escalation row */}
      {tenant.escalationPct > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 shadow-[0_0_12px_rgba(56,189,248,0.06)]">
          <TrendingUp size={11} className="text-[#4ADE80] flex-shrink-0" />
          <span className="text-xs text-gray-400 break-words min-w-0">
            <span className="text-[#4ADE80] font-bold">+{tenant.escalationPct}% renewal escalation</span>
            {tenant.escalationDate && (
              <> on {fmtDate(tenant.escalationDate)}
                {escalationDays !== null && escalationDays > 0 && (
                  <span className="text-gray-600"> ({escalationDays}d) → +{fmtMoney(Math.round(tenant.monthlyRent * tenant.escalationPct / 100))}/mo</span>
                )}
              </>
            )}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {tenant.phone && (
          <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/15 text-[#4ADE80] text-xs font-bold hover:border-white/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all">
            <Phone size={11} /> Call
          </a>
        )}
        {tenant.email && (
          <a href={`mailto:${tenant.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA] text-xs font-bold hover:bg-[rgba(96,165,250,0.14)] transition-colors">
            <Mail size={11} /> Email
          </a>
        )}
      </div>

      {/* 📄 Documents / Contracts Section */}
      <div className="border-t border-[rgba(255,255,255,0.05)] pt-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <FileText size={14} className="text-[#60A5FA]" /> Lease Documents & Contracts ({localDocs.length})
          </p>
          <label className="cursor-pointer flex items-center gap-1 text-[10px] font-bold text-[#60A5FA] bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.25)] px-2.5 py-1.5 rounded-lg hover:bg-[rgba(96,165,250,0.15)] transition-all">
            {uploadingDoc ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
            Upload lease (PDF)
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" disabled={uploadingDoc} />
          </label>
        </div>

        {docUploadError && (
          <div className="flex items-center justify-between text-[11px] text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-2.5 py-1.5 mb-2">
            <span>⚠️ {docUploadError}</span>
            <button onClick={() => setDocUploadError("")} className="text-red-400 hover:text-white ml-2"><X size={11} /></button>
          </div>
        )}

        {localDocs.length > 0 ? (
          <div className="space-y-1.5 mb-2">
            {localDocs.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] px-3 py-2 text-xs">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white truncate flex-1 mr-4 flex items-center gap-1.5 hover:underline">
                  <span>📄</span> <span className="truncate">{doc.name}</span>
                </a>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this lease agreement?")) return;
                    const updated = localDocs.filter((_, i) => i !== idx);
                    const saveRes = await fetch(`/api/tenants?id=${tenant.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        leaseDocuments: JSON.stringify(updated),
                        actorName: currentUserName || "Staff",
                        actorEmail: currentUserEmail || "",
                        name: tenant.name,
                      }),
                    });
                    if (saveRes.ok) {
                      setLocalDocs(updated);
                      onTenantUpdated?.(tenant.id, { leaseDocuments: JSON.stringify(updated) });
                    }
                  }}
                  className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Delete document"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-700 italic mb-2">No lease agreements uploaded yet.</p>
        )}
      </div>

      {/* Activity / Notes thread */}
      <div className="border-t border-[rgba(255,255,255,0.05)] pt-3">
        <button onClick={() => setShowNotes(n => !n)}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${noteLines.length > 0 ? "text-[#4ADE80] drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]" : "text-gray-500 hover:text-[#4ADE80]"}`}>
          <MessageSquare size={14} className={noteLines.length > 0 ? "fill-[rgba(74,222,128,0.15)]" : ""} />
          Activity {noteLines.length > 0 ? `(${noteLines.length})` : ""}
          {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showNotes && (
          <div className="mt-3 space-y-2">
            {noteLines.map((line, i) => {
              const match = line.match(/^\[(.+?)\] (.+)$/);
              const meta = match?.[1] || "";
              const body = match?.[2] || line;
              const isPhoto = body.includes("📸 Photo Attached: ");
              const photoUrl = isPhoto ? body.replace("📸 Photo Attached: ", "").trim() : "";
              return (
                <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-600 mb-0.5">{meta}</p>
                  {isPhoto ? (
                    <div className="mt-1">
                      <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[200px] overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)] hover:opacity-90 transition-opacity">
                        <img src={photoUrl} alt="Note attachment" className="w-full h-auto object-cover max-h-[140px]" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300">{body}</p>
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 items-center">
              <textarea spellCheck={true} value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(); } }}
                rows={2} placeholder="Add a note… (Enter to post)"
                className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-700 resize-none transition-colors" />
              <label className="cursor-pointer p-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-gray-500 hover:text-white transition-colors flex-shrink-0" title="Attach picture">
                <Camera size={14} />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={savingNote} />
              </label>
              <button onClick={saveNote} disabled={savingNote || !note.trim()}
                className="px-3 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400/30 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)] hover:opacity-90 transition-all disabled:opacity-40 flex-shrink-0">
                {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0B1120] border border-white/15 rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_35px_rgba(56,189,248,0.12)] relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.35)] text-white">
                  <RotateCcw size={16} className="text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Renew Lease</h4>
                  <p className="text-[11px] text-gray-500">{tenant.name}{tenant.unit ? ` · Unit ${tenant.unit}` : ""}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="p-1 rounded-lg text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Current Lease Info */}
              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Current Lease End</span>
                  <span className="font-bold text-white">{fmtDate(localLeaseEnd)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Current Rent</span>
                  <span className="font-bold text-[#4ADE80]">{fmtMoney(localMonthlyRent)}/mo</span>
                </div>
              </div>

              {/* Quick term selector */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Quick Term Extension
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "+1 Year", years: 1, months: 0 },
                    { label: "+2 Years", years: 2, months: 0 },
                    { label: "+6 Months", years: 0, months: 6 },
                    { label: "+1 Month", years: 0, months: 1 },
                  ].map(t => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => {
                        const base = localLeaseEnd ? new Date(localLeaseEnd) : new Date();
                        const effectiveBase = isNaN(base.getTime()) || base.getTime() < Date.now() ? new Date() : base;
                        const newD = new Date(effectiveBase);
                        if (t.years) newD.setFullYear(newD.getFullYear() + t.years);
                        if (t.months) newD.setMonth(newD.getMonth() + t.months);
                        setRenewEndDate(newD.toISOString().split("T")[0]);
                      }}
                      className="py-1.5 px-1 rounded-lg text-xs font-bold bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(74,222,128,0.12)] hover:border-[rgba(74,222,128,0.35)] hover:text-[#4ADE80] text-gray-300 transition-all text-center"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* New Lease Expiration Date */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  New Lease End / Expiration Date *
                </label>
                <input
                  type="date"
                  value={renewEndDate}
                  onChange={e => setRenewEndDate(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none"
                />
              </div>

              {/* New Monthly Rent */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    New Monthly Rent ($)
                  </label>
                  {tenant.escalationPct > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const escalated = Math.round(localMonthlyRent * (1 + tenant.escalationPct / 100));
                        setRenewRent(String(escalated));
                      }}
                      className="text-[10px] text-[#4ADE80] hover:underline"
                    >
                      Apply +{tenant.escalationPct}% escalation (${Math.round(localMonthlyRent * (1 + tenant.escalationPct / 100))})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={renewRent}
                  onChange={e => setRenewRent(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none"
                />
              </div>

              {/* Renewal Alert Window for next term */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Pending Renewal Alert Window for New Term
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { v: 90, l: "90 Days" },
                    { v: 60, l: "60 Days" },
                    { v: 30, l: "30 Days" },
                    { v: null, l: "Off" },
                  ].map(opt => (
                    <button
                      key={String(opt.v)}
                      type="button"
                      onClick={() => setRenewAlertDays(opt.v)}
                      className={`py-1.5 rounded-lg text-xs font-black border transition-all ${
                        renewAlertDays === opt.v
                          ? "bg-white/[0.08] border-white/25 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.18)]"
                          : "border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic">
                ✓ Saving renewal sets status to Active and automatically clears the pending renewal alert.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  type="button"
                  disabled={renewing || !renewEndDate}
                  onClick={handleConfirmRenew}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_14px_rgba(59,130,246,0.35)]"
                >
                  {renewing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Confirm Renewal & Clear Alert
                </button>
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-400 text-xs hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main TenantsTab ──────────────────────────────────────────────────────────

export default function TenantsTab({
  currentUserName,
  currentUserEmail,
  leads = [],
  prepopulatedTenant = null,
  onClearPrepopulated,
  onLeadConverted,
}: {
  currentUserName?: string;
  currentUserEmail?: string;
  leads?: any[];
  prepopulatedTenant?: Partial<Tenant> | null;
  onClearPrepopulated?: () => void;
  onLeadConverted?: (leadId: string) => void;
}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [showIntakeStaging, setShowIntakeStaging] = useState(false);

  useEffect(() => {
    if (prepopulatedTenant) {
      setEditingTenant(null);
      setShowForm(true);
    }
  }, [prepopulatedTenant]);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "renewal" | "expired">("all");
  const [sortBy, setSortBy] = useState<"name" | "rent" | "lease_end">("lease_end");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dynPropertyNames, setDynPropertyNames] = useState<string[]>([]);

  // Unique building names for property filter dropdown
  const propertyNames = Array.from(new Set(tenants.map(t => t.building).filter(Boolean))).sort();

  // Static known properties (matches the list from PropDetailsTab)
  const STATIC_PROPERTIES = [
    "Sample Office Building", "Main Street Plaza",
    "Riverside Commons", "Oak Park Center", "Commercial Warehouse",
    "Westside Commons", "250 Commerce Ave",
    "100 Main Street", "Downtown Center",
  ];

  // Build comprehensive sorted list: static + dynamic DB properties + existing tenant buildings
  const buildingOptions = useMemo(() => {
    const all = new Set<string>(STATIC_PROPERTIES);
    dynPropertyNames.forEach(n => all.add(n));
    tenants.forEach(t => { if (t.building) all.add(t.building); });
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [tenants, dynPropertyNames]);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantRes, propRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/properties-dynamic?admin=1").catch(() => null),
      ]);
      const data = await tenantRes.json();
      if (Array.isArray(data.tenants)) {
        setTenants(data.tenants.map(rowToTenant));
        setSetupError(false);
      } else {
        setSetupError(true);
      }
      // Load dynamic property names for the dropdown
      if (propRes?.ok) {
        const pd = await propRes.json();
        if (Array.isArray(pd.properties)) {
          setDynPropertyNames(pd.properties.map((p: { name?: string }) => p.name).filter(Boolean));
        }
      }
    } catch {
      setSetupError(true);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleSaveNew = async (form: Partial<Tenant>) => {
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, contactName: form.contactName, email: form.email, phone: form.phone,
        building: form.building, unit: form.unit, rep: form.rep,
        monthlyRent: Number(form.monthlyRent) || 0,
        utilitiesFee: Number(form.utilitiesFee) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        nnnFee: Number(form.nnnFee) || 0,
        cleaningFee: Number(form.cleaningFee) || 0,
        camFee: Number(form.camFee) || 0,
        nnFee: Number(form.nnFee) || 0,
        leaseStart: form.leaseStart || null, leaseEnd: form.leaseEnd || null,
        renewalDate: form.renewalDate || null,
        leaseAlertDays: form.leaseAlertDays ?? null,
        escalationPct: form.escalationPct, escalationDate: form.escalationDate || null,
        status: form.status, notes: form.notes,
        sourceLeadId: form.sourceLeadId || "",
        actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
        actorEmail: currentUserEmail || "",
      }),
    });
    if (!res.ok) throw new Error("Save failed");
    if (form.sourceLeadId) {
      if (onLeadConverted) onLeadConverted(form.sourceLeadId);
      // Ensure lead is archived in database
      fetch("/api/admin-lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.sourceLeadId,
          archive: true,
          actorName: currentUserName || "Staff",
          actorEmail: currentUserEmail || "",
          leadName: form.name || form.sourceLeadId,
        }),
      }).catch(() => {});
    }
    setShowForm(false);
    await fetchTenants();
  };

  const handleSaveEdit = async (form: Partial<Tenant>) => {
    if (!editingTenant) return;

    // ── Compute only the fields that actually changed ─────────────────────────
    type FieldKey = keyof Tenant;
    const TRACKED: FieldKey[] = [
      "name", "contactName", "email", "phone",
      "building", "unit", "rep",
      "monthlyRent", "utilitiesFee", "securityDeposit", "nnnFee", "cleaningFee", "camFee", "nnFee",
      "leaseStart", "leaseEnd", "renewalDate", "leaseAlertDays",
      "escalationPct", "escalationDate", "status", "notes", "sourceLeadId",
    ];
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of TRACKED) {
      const oldVal = editingTenant[key];
      const newVal = (form as Record<string, unknown>)[key];
      // Treat null / undefined / "" as the same empty value so untouched
      // fields don't appear as changed
      const norm = (v: unknown): string => {
        if (v === null || v === undefined || v === "") return "";
        return String(v).trim();
      };
      if (norm(oldVal) !== norm(newVal)) {
        const label = String(key).replace(/([A-Z])/g, " $1").toLowerCase().trim();
        changes[label] = { from: oldVal ?? null, to: newVal ?? null };
      }
    }

    const res = await fetch(`/api/tenants?id=${editingTenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, contactName: form.contactName, email: form.email, phone: form.phone,
        building: form.building, unit: form.unit, rep: form.rep,
        monthlyRent: Number(form.monthlyRent) || 0,
        utilitiesFee: Number(form.utilitiesFee) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        nnnFee: Number(form.nnnFee) || 0,
        cleaningFee: Number(form.cleaningFee) || 0,
        camFee: Number(form.camFee) || 0,
        nnFee: Number(form.nnFee) || 0,
        leaseStart: form.leaseStart || null, leaseEnd: form.leaseEnd || null,
        renewalDate: form.renewalDate || null,
        leaseAlertDays: form.leaseAlertDays ?? null,
        escalationPct: form.escalationPct, escalationDate: form.escalationDate || null,
        status: form.status, notes: form.notes,
        sourceLeadId: form.sourceLeadId || "",
        actorName:  currentUserName  || currentUserEmail?.split("@")[0] || "Staff",
        actorEmail: currentUserEmail || "",
        // Pass the diff so the audit log shows what actually changed
        _changes: changes,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setEditingTenant(null);
    await fetchTenants();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/tenants?id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff", actorEmail: currentUserEmail || "" }),
    });
    setTenants(prev => prev.filter(t => t.id !== id));
  };

  const handleBatchImport = async (tenants: Partial<Tenant>[]) => {
    for (const form of tenants) {
      await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, contactName: form.contactName, email: form.email, phone: form.phone,
          building: form.building, unit: form.unit, rep: "",
          monthlyRent: Number(form.monthlyRent) || 0,
          utilitiesFee: 0,
          securityDeposit: 0,
          nnnFee: 0,
          cleaningFee: 0,
          camFee: 0,
          nnFee: 0,
          leaseStart: form.leaseStart || null, leaseEnd: form.leaseEnd || null,
          renewalDate: null, leaseAlertDays: 60,
          escalationPct: 0, escalationDate: null,
          status: form.status ?? "active", notes: form.notes ?? "",
        }),
      });
    }
    await fetchTenants();
  };

  const scrollToTenant = (id: string) => {
    const el = document.getElementById(`tenant-card-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "box-shadow 0.3s";
      el.style.boxShadow = "0 0 0 2px #38BDF8, 0 0 24px rgba(56,189,248,0.45)";
      setTimeout(() => { el.style.boxShadow = ""; }, 1800);
    }
  };

  const isPendingRenewalTenant = (t: Tenant) => {
    const endDays = daysUntil(t.renewalDate || t.leaseEnd);
    if (endDays === null) return false;
    const thresh = t.leaseAlertDays !== undefined && t.leaseAlertDays !== null ? Number(t.leaseAlertDays) : 90;
    return endDays <= thresh || endDays <= 0 || t.status === "expired";
  };

  const handleTenantUpdated = (id: string, patch: Partial<Tenant>) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  // Filter + sort
  const displayed = tenants
    .filter(t => {
      if (filterStatus === "all") return true;
      if (filterStatus === "renewal") return isPendingRenewalTenant(t);
      return t.status === filterStatus;
    })
    .filter(t => filterProperty === "all" || t.building === filterProperty)
    .filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.contactName || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.phone || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "rent") return b.monthlyRent - a.monthlyRent;
      if (sortBy === "lease_end") {
        const ad = daysUntil(a.leaseEnd) ?? 9999;
        const bd = daysUntil(b.leaseEnd) ?? 9999;
        return ad - bd;
      }
      return 0;
    });

  return (
    <div className="mt-6">
      {/* Revenue Intelligence Banner */}
      <RevenueBanner tenants={tenants} onTenantClick={scrollToTenant} />

      {/* SQL Setup Banner — only shown on actual API error */}
      {setupError && !loading && (
        <div className="mb-6 p-4 rounded-xl border border-[rgba(250,204,21,0.3)] bg-[rgba(250,204,21,0.05)]">
          <p className="text-xs font-bold text-[#FACC15] mb-2 flex items-center gap-1.5"><AlertTriangle size={12} />Database table not found — one-time setup required</p>
          <p className="text-xs text-gray-400 mb-2">Run this SQL in your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#4ADE80] underline">Supabase SQL Editor</a>, then click Refresh:</p>
          <pre className="text-[9px] sm:text-[10px] text-gray-300 bg-[rgba(0,0,0,0.4)] rounded-lg p-2 sm:p-3 overflow-x-auto whitespace-pre-wrap break-words">{`-- ① Create table (new install)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  building TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  rep TEXT DEFAULT '',
  monthly_rent NUMERIC DEFAULT 0,
  utilities_fee NUMERIC DEFAULT 0,
  lease_start DATE,
  lease_end DATE,
  renewal_date DATE,
  lease_alert_days INTEGER DEFAULT 60,
  escalation_pct NUMERIC DEFAULT 0,
  escalation_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT DEFAULT '',
  source_lead_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ② Already have the table? Run ONLY these lines instead:
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS utilities_fee NUMERIC DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lease_alert_days INTEGER DEFAULT 60;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS nnn_fee NUMERIC DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cleaning_fee NUMERIC DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cam_fee NUMERIC DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS nn_fee NUMERIC DEFAULT 0;`}</pre>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tenants..."
              className="pl-8 pr-7 py-1.5 w-40 sm:w-48 rounded-xl text-xs border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-white outline-none focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] transition-all placeholder:text-gray-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X size={10} />
              </button>
            )}
          </div>
          {(["all", "active", "pending", "renewal", "expired"] as const).map(s => {
            const count = s === "all"
              ? tenants.length
              : s === "renewal"
                ? tenants.filter(isPendingRenewalTenant).length
                : tenants.filter(t => t.status === s).length;
            const label = s === "all"
              ? "All"
              : s === "renewal"
                ? "Pending Renewal"
                : s.charAt(0).toUpperCase() + s.slice(1);
            const isRenewal = s === "renewal";
            const isActive = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isActive
                    ? isRenewal
                      ? "bg-[rgba(249,115,22,0.15)] border-[rgba(249,115,22,0.5)] text-[#F97316] shadow-[0_0_12px_rgba(249,115,22,0.2)]"
                      : "bg-white/[0.08] border-white/20 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                    : "border-[rgba(255,255,255,0.07)] text-gray-500 hover:text-gray-300"
                }`}
              >
                {isRenewal && count > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping inline-block" />
                )}
                {label} ({count})
              </button>
            );
          })}
          <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-gray-400 outline-none">
            <option value="all">Property: All ({tenants.filter(t => filterStatus === "all" || t.status === filterStatus).length})</option>
            {propertyNames.map(name => (
              <option key={name} value={name}>{name} ({tenants.filter(t => t.building === name && (filterStatus === "all" || t.status === filterStatus)).length})</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 rounded-xl text-xs border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-gray-400 outline-none">
            <option value="lease_end">Sort: Lease Expiry</option>
            <option value="rent">Sort: Rent (High→Low)</option>
            <option value="name">Sort: Name A→Z</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchTenants} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-gray-300 hover:text-white hover:border-white/20 hover:shadow-[0_0_10px_rgba(56,189,248,0.12)] text-xs transition-all">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <PrintButton zoneId="print-tenants" label="Print Roster" title="Tenant Roster" />
          <button
            onClick={() => setShowIntakeStaging(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 border border-sky-400/40 text-sky-300 text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)] hover:shadow-[0_0_22px_rgba(56,189,248,0.35)] transition-all"
            title="Fast intake from Excel, photos of legal pads, or lease documents"
          >
            <Sparkles size={13} className="text-sky-400 animate-pulse" />
            <span>⚡ AI Intake & Scan</span>
          </button>
          <button onClick={() => setShowImporter(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.03] text-gray-300 text-xs font-semibold hover:text-white hover:border-white/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] transition-all">
            <FileSpreadsheet size={13} /> Excel Only
          </button>
          <button onClick={() => { setEditingTenant(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold hover:opacity-90 shadow-[0_0_14px_rgba(59,130,246,0.35)] transition-all">
            <Plus size={13} /> Add Tenant
          </button>
        </div>
      </div>

      {/* AI Intake & Staging Modal */}
      {showIntakeStaging && (
        <IntakeStagingModal
          onClose={() => setShowIntakeStaging(false)}
          onImportSuccess={async () => {
            await fetchTenants();
          }}
          knownBuildings={buildingOptions}
        />
      )}

      {/* Legacy Excel Importer Modal */}
      {showImporter && (
        <TenantImporter
          onImport={handleBatchImport}
          onClose={() => setShowImporter(false)}
        />
      )}

      {/* Add form */}
      {showForm && !editingTenant && (
        <TenantForm
          initial={prepopulatedTenant || BLANK()}
          onSave={async (data) => {
            await handleSaveNew(data);
            if (onClearPrepopulated) onClearPrepopulated();
          }}
          onCancel={() => {
            setShowForm(false);
            if (onClearPrepopulated) onClearPrepopulated();
          }}
          currentUserName={currentUserName}
          buildingOptions={buildingOptions}
          leads={leads}
        />
      )}

      {/* Edit form */}
      {editingTenant && (
        <TenantForm
          initial={editingTenant}
          onSave={handleSaveEdit}
          onCancel={() => setEditingTenant(null)}
          currentUserName={currentUserName}
          buildingOptions={buildingOptions}
          leads={leads}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[#4ADE80]" />
          <span className="ml-2 text-sm text-gray-500">Loading tenants…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && displayed.length === 0 && filterStatus === "all" && tenants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-sky-400 mb-4 shadow-[0_0_24px_rgba(56,189,248,0.1)]">
            <Building2 size={32} />
          </div>
          <p className="text-white text-xl sm:text-2xl font-black tracking-tight">No tenants in this portfolio yet</p>
          <p className="text-sm sm:text-base text-gray-300 mt-2 mb-8 max-w-lg leading-relaxed">
            Onboard new tenants quickly: drop an Excel spreadsheet, upload photos of legal pad notes or lease documents, or manually key in your first tenant.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowIntakeStaging(true)}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white text-sm sm:text-base font-black hover:opacity-95 shadow-[0_0_24px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
            >
              <Sparkles size={18} className="text-white animate-pulse" />
              <span>⚡ Fast Intake (Excel, Legal Pad, Leases)</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-white text-sm sm:text-base font-bold transition-all cursor-pointer"
            >
              <Plus size={18} /> <span>Add Single Tenant</span>
            </button>
          </div>
        </div>
      )}

      {/* Tenant cards — wrapped in print zone */}
      <div id="print-tenants" className="space-y-4">
        {displayed.map(tenant => (
          <TenantCard
            key={tenant.id}
            tenant={tenant}
            onEdit={t => { setEditingTenant(t); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onDelete={handleDelete}
            onTenantUpdated={handleTenantUpdated}
            currentUserName={currentUserName}
            currentUserEmail={currentUserEmail}
          />
        ))}
      </div>
    </div>
  );
}
