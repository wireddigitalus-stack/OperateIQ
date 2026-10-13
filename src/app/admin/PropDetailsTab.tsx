"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2, Users, DollarSign, TrendingUp, AlertTriangle,
  Clock, CheckCircle2, Home, Loader2, RefreshCw, Save,
  ChevronDown, ChevronUp, Zap, Droplets, ShieldCheck, Receipt,
  MoreHorizontal, TrendingDown, Minus, Printer, X, Pencil, Plus, Trash2, Download,
  Landmark, Wrench, Thermometer, Sparkles,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";
import { getOrgProfile } from "@/lib/org-profile";
import { type Tenant, rowToTenant } from "./TenantsTab";
import PortfolioOverviewCard from "./PortfolioOverviewCard";
import PortfolioHistoryChart from "./PortfolioHistoryChart";
import IntakeStagingModal from "./IntakeStagingModal";

// ── Types ────────────────────────────────────────────────────────────────────

interface PropDetail {
  property_id: string;
  total_units: number;
  taxes_annual: number;
  taxes_county_annual?: number;
  taxes_city_annual?: number;
  insurance_annual: number;
  fire_security_annual?: number;
  gas_annual?: number;
  internet_annual?: number;
  electric_annual?: number;
  water_annual?: number;
  trash_annual?: number;
  electric_monthly: number;
  water_monthly: number;
  other_monthly: number;
  trend: "up" | "stable" | "down";
  notes: string;
  display_name: string | null;
}

type Trend = "up" | "stable" | "down";

type DetailForm = {
  totalUnits: string;
  taxesAnnual: string;
  taxesCountyAnnual: string;
  taxesCityAnnual: string;
  insuranceAnnual: string;
  fireSecurityAnnual: string;
  gasAnnual: string;
  internetAnnual: string;
  electricAnnual: string;
  waterAnnual: string;
  trashAnnual: string;
  electricMonthly: string;
  waterMonthly: string;
  otherMonthly: string;
  trend: Trend;
  notes: string;
  displayName: string;
};

// Unified shape used by PropertyCard — works for both static (data.ts) and DB properties
export interface PropertyItem {
  id: string;
  name: string;
  type: string;
  city: string;
  address?: string;
  sqft: string;
  status?: string;
  isDynamic?: boolean; // true if from Supabase properties table
}

export interface AvailableSpace {
  id: string;
  property_id: string;
  name: string;
  monthly_rent: number;
  sqft: string;
  nnn_fee?: number;
  nn_fee?: number;
  utility_fee?: number;
  created_at?: string;
}

interface AddSpaceForm {
  property_id: string;
  name: string;
  monthly_rent: string;
  sqft: string;
  nnn_fee: string;
  nn_fee: string;
  utility_fee: string;
}

function AddSpaceModal({ properties, onAdd, onClose }: {
  properties: PropertyItem[];
  onAdd: (form: AddSpaceForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AddSpaceForm>({
    property_id: properties[0]?.id || "",
    name: "",
    monthly_rent: "",
    sqft: "",
    nnn_fee: "",
    nn_fee: "",
    utility_fee: "",
  });
  const [saving, setSaving] = useState(false);
  const valid = form.name.trim().length >= 1 && form.property_id !== "";

  const handle = async () => {
    setSaving(true);
    await onAdd(form);
    setSaving(false);
  };

  const F = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white px-3 py-2.5 outline-none focus:border-[rgba(167,139,250,0.5)] transition-colors";
  const L = "text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl border border-[rgba(167,139,250,0.2)] w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Plus size={14} className="text-[#A78BFA]" /> Add Unleased Space
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-colors">
            <X size={12} className="text-gray-500" />
          </button>
        </div>

        <div>
          <label className={L}>Parent Property *</label>
          <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className={F}>
            {properties.map(p => (
              <option key={p.id} value={p.id} className="bg-gray-900">{p.name} ({p.city})</option>
            ))}
          </select>
        </div>

        <div>
          <label className={L}>Space / Unit Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Suite 205, Building B" className={F} autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={L}>Potential Rent ($ / mo)</label>
            <input type="number" min={0} value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} placeholder="e.g. 1500" className={F} />
          </div>
          <div>
            <label className={L}>Sq Ft</label>
            <input value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))} placeholder="e.g. 750" className={F} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={L}>NNN Fee ($)</label>
            <input type="number" min={0} value={form.nnn_fee} onChange={e => setForm(f => ({ ...f, nnn_fee: e.target.value }))} placeholder="0" className={F} />
          </div>
          <div>
            <label className={L}>NN Fee ($)</label>
            <input type="number" min={0} value={form.nn_fee} onChange={e => setForm(f => ({ ...f, nn_fee: e.target.value }))} placeholder="0" className={F} />
          </div>
          <div>
            <label className={L}>Utility Fee ($)</label>
            <input type="number" min={0} value={form.utility_fee} onChange={e => setForm(f => ({ ...f, utility_fee: e.target.value }))} placeholder="0" className={F} />
          </div>
        </div>

        <button onClick={handle} disabled={!valid || saving}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${valid ? "bg-[rgba(167,139,250,0.2)] text-[#A78BFA] hover:bg-[rgba(167,139,250,0.3)] border border-[rgba(167,139,250,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-gray-700 border border-[rgba(255,255,255,0.05)] cursor-not-allowed"}`}>
          {saving ? <><Loader2 size={12} className="animate-spin" /> Adding…</> : <><Plus size={12} /> Add Space</>}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }
function fmt(n: number) { return n ? `$${n.toLocaleString()}` : "—"; }
function n(s: string) { return parseFloat(s) || 0; }

// Exact property name map — matches the dropdown values used in tenant forms
const PROPERTY_DROPDOWN_NAMES: Record<string, string[]> = {
  "sample-office": ["Sample Office Building"],
  "sample-retail": ["Sample Retail Center"],
};

function exactBuildingMatch(tenantBuilding: string, propertyId: string, displayName: string): boolean {
  if (!tenantBuilding) return false;
  const b = tenantBuilding.trim().toLowerCase();
  // Match against display name (custom rename)
  if (displayName && b === displayName.trim().toLowerCase()) return true;
  // Match against known dropdown values for this property
  const names = PROPERTY_DROPDOWN_NAMES[propertyId];
  if (names && names.some(n => b === n.toLowerCase())) return true;
  // Also match dynamic properties by exact name
  return false;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Ring({ value, color }: { value: number; color: string }) {
  const r = 28, c = 2 * Math.PI * r;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={c} strokeDashoffset={c - (value / 100) * c}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x={36} y={41} textAnchor="middle" fontSize={13} fontWeight={800} fill="white">{value}%</text>
    </svg>
  );
}

function Pill({ icon: I, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border" style={{ background: `${color}08`, borderColor: `${color}20` }}>
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <I size={13} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-semibold leading-none mb-1">{label}</p>
        <p className="text-sm font-black text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, prefix = "$" }: { label: string; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-400 font-semibold block mb-1">{label}</label>
      <div className="flex items-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] overflow-hidden">
        {prefix && <span className="text-xs text-gray-400 pl-2.5">{prefix}</span>}
        <input
          type="number" min={0} value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-xs text-white px-2 py-2 outline-none w-full"
        />
      </div>
    </div>
  );
}

// ── TrendSelector ─────────────────────────────────────────────────────────────

const TRENDS: { value: Trend; label: string; icon: React.ElementType; color: string }[] = [
  { value: "up",     label: "Improving", icon: TrendingUp,   color: "#4ADE80" },
  { value: "stable", label: "Stable",    icon: Minus,        color: "#FACC15" },
  { value: "down",   label: "Declining", icon: TrendingDown, color: "#EF4444" },
];

function TrendSelector({ value, onChange }: { value: Trend; onChange: (v: Trend) => void }) {
  return (
    <div className="flex gap-1.5">
      {TRENDS.map(({ value: v, label, icon: Icon, color }) => (
        <button key={v} onClick={() => onChange(v)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
          style={value === v
            ? { background: `${color}18`, color, borderColor: `${color}40` }
            : { background: "transparent", color: "#94A3B8", borderColor: "rgba(255,255,255,0.08)" }}>
          <Icon size={12} />{label}
        </button>
      ))}
    </div>
  );
}

// ── PrintReport ───────────────────────────────────────────────────────────────

interface PrintData {
  property: PropertyItem;
  tenants: Tenant[];
  detail?: PropDetail;
}

function PrintReport({ data, onClose }: { data: PrintData[]; onClose: () => void }) {
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const totalRevenue = data.reduce((s, { tenants: ts }) => s + ts.reduce((a, t) => a + (t.monthlyRent || 0), 0), 0);
  const totalExp = data.reduce((s, { detail: d }) => {
    if (!d) return s;
    const taxMo = (d.taxes_annual || 0) / 12;
    const insMo = (d.insurance_annual || 0) / 12;
    const fireMo = (d.fire_security_annual || 0) / 12;
    const gasMo = (d.gas_annual || 0) / 12;
    const internetMo = (d.internet_annual || 0) / 12;
    const electricMo = d.electric_annual ? (d.electric_annual / 12) : (d.electric_monthly || 0);
    const waterMo = d.water_annual ? (d.water_annual / 12) : (d.water_monthly || 0);
    const otherMo = d.other_monthly || 0;
    return s + taxMo + insMo + fireMo + gasMo + internetMo + electricMo + waterMo + otherMo;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto py-4 sm:py-8 px-2 sm:px-4">
      <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl">
        {/* Print controls — hidden when printing */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
          <span className="text-sm font-bold text-gray-700">Portfolio Report Preview</span>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              <Printer size={13} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-md flex-shrink-0"
              title="Close"
            >
              <X size={14} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Report body */}
        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          {/* Letterhead */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-gray-200 pb-5 gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">Portfolio Report</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Generated {now}</p>
            </div>
            <div className="sm:text-right text-sm">
              <p className="font-bold text-gray-900">{data.length} Properties</p>
              <p className="text-gray-500">{data.reduce((s, d) => s + d.tenants.length, 0)} Active Tenants</p>
            </div>
          </div>

          {/* Portfolio summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Total Revenue",  value: `$${totalRevenue.toLocaleString()}/mo`,             color: "#16a34a" },
              { label: "Total Expenses", value: totalExp ? `$${Math.round(totalExp).toLocaleString()}/mo` : "Not set", color: "#dc2626" },
              { label: "Net P&L",        value: totalExp ? `$${Math.round(totalRevenue - totalExp).toLocaleString()}/mo` : "—", color: totalRevenue > totalExp ? "#16a34a" : "#dc2626" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Per-property tables */}
          {data.map(({ property, tenants: ts, detail: d }) => {
            const rev = ts.reduce((s, t) => s + (t.monthlyRent || 0), 0);
            const taxMo = (d?.taxes_annual || 0) / 12;
            const insMo = (d?.insurance_annual || 0) / 12;
            const fireMo = (d?.fire_security_annual || 0) / 12;
            const gasMo = (d?.gas_annual || 0) / 12;
            const internetMo = (d?.internet_annual || 0) / 12;
            const electricMo = d?.electric_annual ? (d.electric_annual / 12) : (d?.electric_monthly || 0);
            const waterMo = d?.water_annual ? (d.water_annual / 12) : (d?.water_monthly || 0);
            const exp = taxMo + insMo + fireMo + gasMo + internetMo + electricMo + waterMo + (d?.other_monthly || 0);
            const profit = rev - exp;
            const totalUnits = d?.total_units || ts.length;
            const occ = totalUnits ? Math.round((ts.length / totalUnits) * 100) : 0;
            const trend = d?.trend || "stable";
            const trendLabel = TRENDS.find(t => t.value === trend)?.label || "Stable";

            return (
              <div key={property.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 gap-1 sm:gap-0">
                  <div>
                    <h2 className="font-black text-gray-900 text-sm">{d?.display_name || property.name}</h2>
                    <p className="text-xs text-gray-500">{property.city} · {property.type}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 text-sm mt-1 sm:mt-0">
                    <span className="font-bold text-xs sm:text-sm" style={{ color: occ >= 100 ? "#16a34a" : occ > 0 ? "#ca8a04" : "#9ca3af" }}>
                      {ts.length}/{totalUnits} units ({occ}%)
                    </span>
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full border font-bold"
                      style={{ color: trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : "#ca8a04", borderColor: trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : "#ca8a04" }}>
                      {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendLabel}
                    </span>
                  </div>
                </div>

                {/* Financials row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 text-center">
                  {[{ l: "Revenue", v: rev ? `$${rev.toLocaleString()}/mo` : "—" },
                    { l: "Expenses", v: exp ? `$${Math.round(exp).toLocaleString()}/mo` : "—" },
                    { l: "Net P&L", v: exp ? `${profit >= 0 ? "+" : ""}$${Math.round(profit).toLocaleString()}/mo` : "—" },
                    { l: "Avg Rent", v: ts.length ? `$${Math.round(rev / ts.length).toLocaleString()}/mo` : "—" },
                  ].map(({ l, v }) => (
                    <div key={l} className="py-3 px-2">
                      <p className="text-[10px] text-gray-400">{l}</p>
                      <p className="text-sm font-bold text-gray-800">{v}</p>
                    </div>
                  ))}
                </div>

                {/* Tenant list */}
                {ts.length > 0 && (
                  <table className="w-full text-xs border-t border-gray-100">
                    <thead><tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 text-gray-500 font-semibold">Tenant</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-semibold">Unit</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-semibold">Rent/mo</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-semibold">Lease End</th>
                    </tr></thead>
                    <tbody>
                      {ts.map(t => (
                        <tr key={t.id} className="border-t border-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-800">{t.name}</td>
                          <td className="px-4 py-2 text-gray-500">{t.unit || "—"}</td>
                          <td className="px-4 py-2 text-right text-gray-800">{t.monthlyRent ? `$${t.monthlyRent.toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{t.leaseEnd || t.renewalDate || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {d?.notes && <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 italic">{d.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── PropertyCard ──────────────────────────────────────────────────────────────

function PropertyCard({ property, tenants, detail, onSave, onDelete }: {
  property: PropertyItem;
  tenants: Tenant[];
  detail: PropDetail | undefined;
  onSave: (id: string, form: DetailForm) => Promise<void>;
  onDelete?: (id: string) => void;
}) {
  const trend: Trend = detail?.trend || "stable";
  const trendItem = TRENDS.find(t => t.value === trend)!;
  const TrendIcon = trendItem.icon;
  const displayName = detail?.display_name || property.name;
  const propTenants = tenants.filter(t => {
    return exactBuildingMatch(t.building || "", property.id, displayName);
  });

  const [collapsed, setCollapsed] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [form, setForm] = useState<DetailForm>({
    totalUnits: String(detail?.total_units || ""),
    taxesCountyAnnual: String(detail?.taxes_county_annual || ""),
    taxesCityAnnual: String(detail?.taxes_city_annual || ""),
    taxesAnnual: String(detail?.taxes_annual || ""),
    insuranceAnnual: String(detail?.insurance_annual || ""),
    fireSecurityAnnual: String(detail?.fire_security_annual || ""),
    gasAnnual: String(detail?.gas_annual || ""),
    internetAnnual: String(detail?.internet_annual || ""),
    electricAnnual: String(detail?.electric_annual || ""),
    waterAnnual: String(detail?.water_annual || ""),
    trashAnnual: String(detail?.trash_annual || ""),
    electricMonthly: String(detail?.electric_monthly || ""),
    waterMonthly: String(detail?.water_monthly || ""),
    otherMonthly: String(detail?.other_monthly || ""),
    trend: detail?.trend || "stable",
    notes: detail?.notes || "",
    displayName: detail?.display_name || "",
  });

  // Sync form if detail loads after initial render
  useEffect(() => {
    if (detail) setForm({
      totalUnits: String(detail.total_units || ""),
      taxesCountyAnnual: String(detail.taxes_county_annual || ""),
      taxesCityAnnual: String(detail.taxes_city_annual || ""),
      taxesAnnual: String(detail.taxes_annual || ""),
      insuranceAnnual: String(detail.insurance_annual || ""),
      fireSecurityAnnual: String(detail.fire_security_annual || ""),
      gasAnnual: String(detail.gas_annual || ""),
      internetAnnual: String(detail.internet_annual || ""),
      electricAnnual: String(detail.electric_annual || ""),
      waterAnnual: String(detail.water_annual || ""),
      trashAnnual: String(detail.trash_annual || ""),
      electricMonthly: String(detail.electric_monthly || ""),
      waterMonthly: String(detail.water_monthly || ""),
      otherMonthly: String(detail.other_monthly || ""),
      trend: detail.trend || "stable",
      notes: detail.notes || "",
      displayName: detail.display_name || "",
    });
  }, [detail]);

  const set = (k: keyof DetailForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  // Financial calcs — active tenants only for revenue consistency with Tenants tab
  const activePropTenants = propTenants.filter(t => t.status === "active");
  const rented = activePropTenants.length;
  const totalUnits = n(form.totalUnits) || rented;
  const baseRent = activePropTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);
  const totalNNN = activePropTenants.reduce((s, t) => s + (t.nnnFee || 0), 0);
  const totalNN  = activePropTenants.reduce((s, t) => s + (t.nnFee || 0), 0);
  const totalCAM = activePropTenants.reduce((s, t) => s + (t.camFee || 0), 0);
  const totalUtil = activePropTenants.reduce((s, t) => s + (t.utilitiesFee || 0), 0);
  const totalCleaning = activePropTenants.reduce((s, t) => s + (t.cleaningFee || 0), 0);
  const feeIncome = totalNNN + totalNN + totalCAM + totalUtil + totalCleaning;
  const revenue = baseRent + feeIncome; // total income = rent + all fees

  const taxCounty = n(form.taxesCountyAnnual);
  const taxCity = n(form.taxesCityAnnual);
  const totalTaxAnnual = (taxCounty === 0 && taxCity === 0) ? n(form.taxesAnnual) : (taxCounty + taxCity);
  const taxMo = totalTaxAnnual / 12;

  const insMo = n(form.insuranceAnnual) / 12;
  const fireMo = n(form.fireSecurityAnnual) / 12;
  const gasMo = n(form.gasAnnual) / 12;
  const internetMo = n(form.internetAnnual) / 12;
  const electricMo = n(form.electricAnnual) ? (n(form.electricAnnual) / 12) : n(form.electricMonthly);
  const waterMo = n(form.waterAnnual) ? (n(form.waterAnnual) / 12) : n(form.waterMonthly);
  const trashMo = n(form.trashAnnual) / 12;
  
  const expenses = taxMo + insMo + fireMo + gasMo + internetMo + electricMo + waterMo + trashMo + n(form.otherMonthly);
  const profit = revenue - expenses;
  const occupancy = pct(rented, totalUnits);
  const occColor = rented === 0 ? "#6B7280" : occupancy >= 100 ? "#4ADE80" : "#FACC15";

  const expiring = propTenants.filter(t => { const d = daysUntil(t.leaseEnd || t.renewalDate); return d !== null && d >= 0 && d <= 90; });
  const expired  = propTenants.filter(t => { const d = daysUntil(t.leaseEnd || t.renewalDate); return d !== null && d < 0; });

  const handleSave = async () => {
    setSaving(true);
    await onSave(property.id, form);
    setSaving(false);
    setSaved(true);
    setEditingName(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">

      {/* Card header — always visible, clickable to expand/collapse */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer select-none hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <Ring value={occupancy} color={occColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={form.displayName || displayName}
                onChange={e => set("displayName")(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") setEditingName(false); if (e.key === "Enter") handleSave(); }}
                onClick={e => e.stopPropagation()}
                className="text-sm font-black text-white leading-tight bg-[rgba(255,255,255,0.06)] border border-[rgba(167,139,250,0.4)] rounded-lg px-2 py-1 outline-none w-full max-w-[260px]"
                placeholder={property.name}
              />
            ) : (
              <h3 className="text-sm font-black text-white leading-tight truncate">{displayName}</h3>
            )}
            <button onClick={(e) => { e.stopPropagation(); setEditingName(ed => !ed); }} title="Rename property"
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-[#A78BFA] hover:bg-[rgba(167,139,250,0.1)] transition-all">
              <Pencil size={11} />
            </button>
            <span className="flex-shrink-0 flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${trendItem.color}15`, color: trendItem.color, border: `1px solid ${trendItem.color}30` }}>
              <TrendIcon size={11} />{trendItem.label}
            </span>
          </div>
          {form.displayName && form.displayName !== property.name && (
            <p className="text-xs text-gray-400 mt-1 truncate italic">System: {property.name}</p>
          )}
          <p className="text-xs text-gray-400 mt-1 truncate">{property.city} · {property.type}</p>
          <span className="mt-1.5 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: `${occColor}18`, color: occColor, border: `1px solid ${occColor}30` }}>
            {rented}/{totalUnits} units · {occupancy}% occupied
          </span>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5 flex-shrink-0 w-full sm:w-auto">
          {revenue > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-0.5">Gross Revenue</p>
              <div className="flex flex-col items-end">
                <p className="text-base font-black text-[#4ADE80] leading-none">${Math.round(revenue).toLocaleString()}<span className="text-[10px] opacity-60 font-medium ml-0.5">/mo</span></p>
                {feeIncome > 0 && (
                  <p className="text-[9px] text-gray-500 font-medium mt-1">
                    ${Math.round(baseRent).toLocaleString()} rent + ${Math.round(feeIncome).toLocaleString()} fees
                  </p>
                )}
              </div>
            </div>
          )}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <ChevronDown size={13} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <>
          {/* Delete button for dynamic props (outside click area) */}
          {property.isDynamic && onDelete && (
            <div className="px-4 pb-1 flex justify-end">
              <button onClick={() => { if (confirm(`Delete "${displayName}"? This cannot be undone.`)) onDelete(property.id); }}
                className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 transition-colors" title="Delete property">
                <Trash2 size={11} /> Remove
              </button>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border-t border-[rgba(255,255,255,0.05)]">
            <Pill icon={Users}       label="Tenants"    value={rented}                                            color="#60A5FA" />
            <Pill icon={Home}        label="Sq Ft"      value={property.sqft}                                    color="#A78BFA" />
            <Pill icon={DollarSign}  label="Base Rent"  value={rented ? `$${Math.round(baseRent).toLocaleString()}/mo` : "—"} color="#4ADE80" />
            {totalCleaning > 0 && <Pill icon={Droplets}  label="Cleaning"   value={`$${Math.round(totalCleaning).toLocaleString()}/mo`} color="#A78BFA" />}
            <Pill icon={Receipt}        label="Monthly Expenses"   value={`$${Math.round(expenses).toLocaleString()}/mo`}   color="#F97316" />
            <Pill
              icon={profit >= 0 ? TrendingUp : AlertTriangle}
              label="Monthly Net"
              value={`${profit >= 0 ? "+" : ""}$${Math.round(profit).toLocaleString()}/mo`}
              color={profit >= 0 ? "#4ADE80" : "#EF4444"}
            />
            {feeIncome > 0 && (
              <Pill
                icon={DollarSign}
                label="Monthly Gross"
                value={`$${Math.round(revenue).toLocaleString()}/mo`}
                color="#4ADE80"
              />
            )}
            {expiring.length > 0 && <Pill icon={Clock}         label="Expiring"  value={`${expiring.length} soon`}                         color="#FACC15" />}
            {expired.length  > 0 && <Pill icon={AlertTriangle} label="Expired"   value={`${expired.length} lease${expired.length > 1 ? "s":""}`} color="#EF4444" />}
          </div>

          {/* Tenant mini-list */}
          {propTenants.length > 0 && (
            <div className="border-t border-[rgba(255,255,255,0.04)] px-4 pb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-3 mb-2">Tenants</p>
              <div className="space-y-1.5">
                {propTenants.map(t => {
                  const d = daysUntil(t.leaseEnd || t.renewalDate);
                  const isExp = d !== null && d < 0;
                  const isSoon = d !== null && d >= 0 && d <= 90;
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2 border"
                      style={{ background: isExp ? "rgba(239,68,68,0.04)" : isSoon ? "rgba(250,204,21,0.04)" : "rgba(255,255,255,0.02)", borderColor: isExp ? "rgba(239,68,68,0.15)" : isSoon ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.05)" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                        style={{ background: "rgba(96,165,250,0.12)", color: "#60A5FA" }}>
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{t.name}</p>
                        <p className="text-xs text-gray-400 truncate">{t.unit ? `Unit ${t.unit} · ` : ""}{t.monthlyRent ? `$${t.monthlyRent.toLocaleString()}/mo` : ""}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {isExp  ? <span className="text-xs font-bold text-red-400">Expired</span>
                        : isSoon ? <span className="text-xs font-bold text-yellow-400">{d}d left</span>
                        : d !== null ? <span className="text-xs text-gray-400">{d}d</span>
                        : <CheckCircle2 size={12} className="text-green-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {propTenants.length === 0 && (
            <div className="px-4 pb-3 flex items-center gap-2 text-gray-700 text-xs">
              <Building2 size={12} /> No tenants linked yet
            </div>
          )}

          {/* Financials accordion */}
          <div className="border-t border-[rgba(255,255,255,0.05)]">
            <button onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-gray-400 hover:text-white transition-colors">
              <span className="flex items-center gap-1.5"><MoreHorizontal size={12} /> Property Financials</span>
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {open && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Total Units"        value={form.totalUnits}       onChange={set("totalUnits")}       prefix="#" />
                  <Field label="Annual Insurance"   value={form.insuranceAnnual}  onChange={set("insuranceAnnual")} />
                  <Field label="Fire & Security / yr" value={form.fireSecurityAnnual} onChange={set("fireSecurityAnnual")} />
                  <Field label="County Taxes / yr"  value={form.taxesCountyAnnual} onChange={set("taxesCountyAnnual")} />
                  <Field label="City Taxes / yr"    value={form.taxesCityAnnual}   onChange={set("taxesCityAnnual")} />
                  <Field label="Electric / yr"      value={form.electricAnnual}   onChange={set("electricAnnual")} />
                  <Field label="Water / yr"         value={form.waterAnnual}      onChange={set("waterAnnual")} />
                  <Field label="Trash / yr"         value={form.trashAnnual}      onChange={set("trashAnnual")} />
                  <Field label="Gas / yr"           value={form.gasAnnual}        onChange={set("gasAnnual")} />
                  <Field label="Internet / yr"      value={form.internetAnnual}   onChange={set("internetAnnual")} />
                  <Field label="Other / mo"         value={form.otherMonthly}     onChange={set("otherMonthly")} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Vacancy Trend</label>
                  <TrendSelector value={form.trend} onChange={v => setForm(f => ({ ...f, trend: v }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => set("notes")(e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-white px-3 py-2 outline-none resize-none"
                    placeholder="Any notes about this property…" />
                </div>

                {/* Expense summary */}
                {expenses > 0 && (
                  <div className="rounded-xl p-3 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-xs space-y-1">
                    {taxCounty > 0      && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><Receipt size={12}/> County Taxes</span><span>{fmt(taxCounty / 12)}/mo</span></div>}
                    {taxCity > 0        && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><Receipt size={12}/> City Taxes</span><span>{fmt(taxCity / 12)}/mo</span></div>}
                    {taxCounty === 0 && taxCity === 0 && taxMo > 0 && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><Receipt size={12}/> Taxes</span><span>{fmt(taxMo)}/mo</span></div>}
                    {insMo > 0          && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><ShieldCheck size={12}/> Insurance</span><span>{fmt(insMo)}/mo</span></div>}
                    {fireMo > 0         && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><ShieldCheck size={12}/> Fire & Security</span><span>{fmt(fireMo)}/mo</span></div>}
                    {electricMo > 0     && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><Zap size={12}/> Electric</span><span>{fmt(electricMo)}/mo</span></div>}
                    {waterMo > 0        && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><Droplets size={12}/> Water</span><span>{fmt(waterMo)}/mo</span></div>}
                    {trashMo > 0        && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><Trash2 size={12}/> Trash</span><span>{fmt(trashMo)}/mo</span></div>}
                    {gasMo > 0          && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><Thermometer size={12}/> Gas</span><span>{fmt(gasMo)}/mo</span></div>}
                    {internetMo > 0     && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><MoreHorizontal size={12}/> Internet</span><span>{fmt(internetMo)}/mo</span></div>}
                    {n(form.otherMonthly) > 0 && <div className="flex justify-between text-gray-300"><span className="flex items-center gap-1"><MoreHorizontal size={12}/> Other</span><span>{fmt(n(form.otherMonthly))}/mo</span></div>}
                    <div className="border-t border-[rgba(255,255,255,0.06)] pt-1 mt-1 flex justify-between font-bold">
                      <span className="text-gray-300">Total Monthly Expenses</span><span className="text-orange-400">{fmt(expenses)}/mo</span>
                    </div>
                    <div className="flex justify-between font-black">
                      <span className="text-gray-300">Net P&amp;L</span>
                      <span style={{ color: profit >= 0 ? "#4ADE80" : "#EF4444" }}>{profit >= 0 ? "+" : ""}{fmt(profit)}/mo</span>
                    </div>
                  </div>
                )}

                <button onClick={handleSave} disabled={saving}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${saved ? "bg-[#4ADE80] text-black" : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.35)] hover:opacity-90"}`}>
                  {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                   : saved ? <><CheckCircle2 size={12} /> Saved!</>
                   : <><Save size={12} /> Save Financials</>}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── AddPropertyForm ───────────────────────────────────────────────────────────

const EMPTY_ADD = { name: "", type: "Office", city: getOrgProfile().location, address: "", sqft: "" };

function AddPropertyForm({ onAdd, onClose }: { onAdd: (p: typeof EMPTY_ADD) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_ADD });
  const [saving, setSaving] = useState(false);
  const s = (k: keyof typeof EMPTY_ADD) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim().length >= 2 && form.city.trim().length >= 2;
  const handle = async () => { setSaving(true); await onAdd(form); setSaving(false); };
  const F = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white px-3 py-2.5 outline-none focus:border-[rgba(167,139,250,0.5)] transition-colors";
  const L = "text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl border border-[rgba(167,139,250,0.2)] w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Plus size={14} className="text-[#A78BFA]" /> Add New Property
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center transition-colors">
            <X size={12} className="text-gray-500" />
          </button>
        </div>

        <div>
          <label className={L}>Property Name *</label>
          <input value={form.name} onChange={s("name")} placeholder="e.g. Warehouse 14B" className={F} autoFocus />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={L}>Type</label>
            <select value={form.type} onChange={s("type")} className={F}>
              {["Office", "Retail", "Warehouse", "Industrial", "Mixed-Use", "Event Space", "CoWorking", "Residential", "Land", "Other"].map(t => (
                <option key={t} value={t} className="bg-gray-900">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={L}>City *</label>
            <input value={form.city} onChange={s("city")} placeholder="Anytown, ST" className={F} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={L}>Address</label>
            <input value={form.address} onChange={s("address")} placeholder="123 Main St" className={F} />
          </div>
          <div>
            <label className={L}>Sq Ft</label>
            <input value={form.sqft} onChange={s("sqft")} placeholder="5,000" className={F} />
          </div>
        </div>

        <button onClick={handle} disabled={!valid || saving}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${valid ? "bg-[rgba(167,139,250,0.2)] text-[#A78BFA] hover:bg-[rgba(167,139,250,0.3)] border border-[rgba(167,139,250,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-gray-700 border border-[rgba(255,255,255,0.05)] cursor-not-allowed"}`}>
          {saving ? <><Loader2 size={12} className="animate-spin" /> Adding…</> : <><Plus size={12} /> Add Property</>}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PropDetailsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [details, setDetails] = useState<PropDetail[]>([]);
  const [dynProps, setDynProps] = useState<PropertyItem[]>([]);
  const [availableSpaces, setAvailableSpaces] = useState<AvailableSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationSql, setMigrationSql] = useState<string | null>(null);
  const [spacesMigrationSql, setSpacesMigrationSql] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [showPrint, setShowPrint] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [showAddParkingLot, setShowAddParkingLot] = useState(false);
  const [parkingLotMigrationSql, setParkingLotMigrationSql] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, dRes, pRes, sRes, plRes, sessRes] = await Promise.all([
      fetch("/api/tenants").catch(() => null),
      fetch("/api/property-details").catch(() => null),
      fetch("/api/properties-dynamic?admin=1").catch(() => null),
      fetch("/api/available-spaces").catch(() => null),
      fetch("/api/parking-lots").catch(() => null),
      fetch("/api/platform/session", { cache: "no-store" }).catch(() => null),
    ]);
    if (sessRes?.ok) {
      const sess = await sessRes.json().catch(() => ({}));
      const activeId = sess?.impersonatingOrg?.id || sess?.activeOrg?.id || null;
      setOrgId(activeId);
    }
    if (tRes?.ok) { const d = await tRes.json(); if (Array.isArray(d.tenants)) setTenants(d.tenants.map(rowToTenant)); }
    if (dRes?.ok) {
      const d = await dRes.json();
      if (d.needsMigration) setMigrationSql(d.sql || "Run migration SQL in Supabase.");
      if (Array.isArray(d.details)) setDetails(d.details);
    }
    if (pRes?.ok) {
      const d = await pRes.json();
      if (Array.isArray(d.properties)) {
        setDynProps(d.properties.map((p: Record<string, unknown>) => ({
          id: String(p.id),
          name: (p.name as string) || "Untitled",
          type: (p.type as string) || "Other",
          city: (p.city as string) || "",
          address: (p.address as string) || "",
          sqft: (p.sqft as string) || "TBD",
          isDynamic: true,
        })));
      }
    }
    if (sRes?.ok) {
      const d = await sRes.json();
      if (d.needsMigration) setSpacesMigrationSql(d.sql || "Run migration SQL in Supabase.");
      if (Array.isArray(d.spaces)) setAvailableSpaces(d.spaces);
    }
    if (plRes?.ok) {
      const d = await plRes.json();
      if (d.needsMigration) setParkingLotMigrationSql(d.sql || "Run migration SQL in Supabase.");
      if (Array.isArray(d.lots)) setParkingLots(d.lots);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");

  const isDemoOrg = orgId === "00000000-0000-0000-0000-000000000001";

  // Merge static + dynamic properties only for the Demo org; real orgs see ONLY their DB properties
  const allProperties: PropertyItem[] = useMemo(() => {
    const staticProps: PropertyItem[] = isDemoOrg
      ? PROPERTIES.map(p => ({
          id: p.id, name: p.name, type: p.type, city: p.city, address: p.address, sqft: p.sqft,
        }))
      : [];
    const staticIds = new Set(staticProps.map(p => p.id));
    const uniqueDyn = dynProps.filter(p => !staticIds.has(p.id));
    return [...staticProps, ...uniqueDyn];
  }, [dynProps, isDemoOrg]);

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      const res = await fetch("/api/properties-dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_demo" }),
      });
      const data = await res.json().catch(() => ({}));
      // Fallback if the endpoint didn't handle seed_demo directly
      if (!res.ok || (!data.seeded && !data.properties && (!data.property || data.property.name === undefined))) {
        for (const p of PROPERTIES) {
          await fetch("/api/properties-dynamic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: p.name,
              type: p.type,
              address: p.address,
              city: p.city,
              sqft: p.sqft,
              lease_status: p.status || "available",
              badge: p.badge || "Available",
              badge_color: p.badgeColor || "#4ADE80",
              description: p.description,
              features: p.features || [],
              images: p.images || [],
              hero_image: p.image || null,
              published: false,
            }),
          });
        }
      }
      setTick(t => t + 1);
    } finally {
      setSeedingDemo(false);
    }
  };

  // Filtered properties based on the scrolling tab selection
  const displayedProperties = useMemo(() => {
    if (selectedPropertyId === "all") return allProperties;
    return allProperties.filter(p => p.id === selectedPropertyId);
  }, [allProperties, selectedPropertyId]);

  const handleSave = async (propertyId: string, form: DetailForm) => {
    const res = await fetch("/api/property-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, ...form }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.error === "migration_required") { setMigrationSql(d.sql); return; }
      setTick(t => t + 1);
    }
  };

  const handleAddProperty = async (form: typeof EMPTY_ADD) => {
    const res = await fetch("/api/properties-dynamic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, published: false }),
    });
    if (res.ok) {
      setShowAdd(false);
      setTick(t => t + 1);
    }
  };

  const handleAddSpace = async (form: AddSpaceForm) => {
    try {
      const res = await fetch("/api/available-spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: form.property_id,
          name: form.name,
          monthlyRent: Number(form.monthly_rent) || 0,
          sqft: form.sqft,
          nnnFee: Number(form.nnn_fee) || 0,
          nnFee: Number(form.nn_fee) || 0,
          utilityFee: Number(form.utility_fee) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowAddSpace(false);
        setTick(t => t + 1);
      } else {
        if (data.error === "migration_required") {
          setSpacesMigrationSql(data.sql || "Run migration SQL in Supabase.");
          alert("Database setup required! Please run the updated SQL migration shown at the top of the page in your Supabase SQL Editor.");
        } else {
          alert(`Error adding space: ${data.error || "Save failed"}`);
        }
      }
    } catch (err) {
      alert("An unexpected error occurred while saving. Please try again.");
    }
  };

  const handleDeleteSpace = async (id: string) => {
    const res = await fetch(`/api/available-spaces?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setTick(t => t + 1);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    // Delete from properties-dynamic (Supabase)
    await fetch(`/api/properties-dynamic?id=${id}`, { method: "DELETE" }).catch(() => null);
    setTick(t => t + 1);
  };

  const handleAddParkingLot = async (form: any) => {
    const res = await fetch("/api/parking-lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAddParkingLot(false);
      setTick(t => t + 1);
    }
  };

  const handleDeleteParkingLot = async (id: string) => {
    const res = await fetch(`/api/parking-lots?id=${id}`, { method: "DELETE" });
    if (res.ok) setTick(t => t + 1);
  };

  const detailMap = useMemo(() =>
    Object.fromEntries(details.map(d => [d.property_id, d])), [details]);

  const activeTenants = useMemo(() => tenants.filter(t => t.status === "active"), [tenants]);
  const totalRevenue = useMemo(() => activeTenants.reduce((s, t) =>
    s + (t.monthlyRent || 0) + (t.nnnFee || 0) + (t.nnFee || 0) + (t.camFee || 0) + (t.utilitiesFee || 0) + (t.cleaningFee || 0), 0), [activeTenants]);
  const totalExpenses = useMemo(() => details.reduce((s, d) => {
    const taxMo = (d.taxes_annual || 0) / 12;
    const insMo = (d.insurance_annual || 0) / 12;
    const fireMo = (d.fire_security_annual || 0) / 12;
    const gasMo = (d.gas_annual || 0) / 12;
    const internetMo = (d.internet_annual || 0) / 12;
    const electricMo = d.electric_annual ? (d.electric_annual / 12) : (d.electric_monthly || 0);
    const waterMo = d.water_annual ? (d.water_annual / 12) : (d.water_monthly || 0);
    const otherMo = d.other_monthly || 0;
    return s + taxMo + insMo + fireMo + gasMo + internetMo + electricMo + waterMo + otherMo;
  }, 0), [details]);
  const alerts = useMemo(() => tenants.filter(t => { const d = daysUntil(t.leaseEnd || t.renewalDate); return d !== null && d <= 90; }).length, [tenants]);

  const printData = useMemo(() => allProperties.map(p => ({
    property: p,
    tenants: tenants.filter(t => {
      const displayName = detailMap[p.id]?.display_name || p.name;
      return exactBuildingMatch(t.building || "", p.id, displayName);
    }),
    detail: detailMap[p.id],
  })), [allProperties, tenants, detailMap]);

  const overviewProperties = useMemo(() => 
    allProperties.filter(() => true), 
  [allProperties]);

  const exportUnleasedSpacesToCSV = () => {
    if (availableSpaces.length === 0) return;
    const headers = ["Property", "Space Name", "Monthly Rent ($)", "Sq Ft", "NNN Fee ($)", "NN Fee ($)", "Utility Fee ($)", "Total Estimated Cost ($/mo)"];
    const rows = availableSpaces.map(sp => {
      const prop = allProperties.find(p => p.id === sp.property_id);
      const propName = prop ? prop.name : "Unknown Property";
      const totalCost = (sp.monthly_rent || 0) + (sp.nnn_fee || 0) + (sp.nn_fee || 0) + (sp.utility_fee || 0);
      return [
        propName,
        sp.name,
        sp.monthly_rent || 0,
        sp.sqft || "TBD",
        sp.nnn_fee || 0,
        sp.nn_fee || 0,
        sp.utility_fee || 0,
        totalCost
      ];
    });
    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Unleased_Spaces_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printUnleasedSpaces = () => {
    if (availableSpaces.length === 0) return;
    const grouped: Record<string, { propertyName: string; spaces: AvailableSpace[] }> = {};
    availableSpaces.forEach(sp => {
      if (!grouped[sp.property_id]) {
        const prop = allProperties.find(p => p.id === sp.property_id);
        grouped[sp.property_id] = { propertyName: prop ? prop.name : "Unknown Property", spaces: [] };
      }
      grouped[sp.property_id].spaces.push(sp);
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print this list.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const totalSpaces = availableSpaces.length;
    const totalRent = availableSpaces.reduce((s, sp) => s + (sp.monthly_rent || 0), 0);
    const totalSqft = availableSpaces.reduce((s, sp) => s + (parseInt(String(sp.sqft)) || 0), 0);

    let htmlContent = `
      <html>
        <head>
          <title>OperateIQ - Unleased Spaces Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 40px; }
            h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; border-bottom: 2px solid #111827; padding-bottom: 10px; }
            .date { font-size: 12px; color: #6B7280; margin-bottom: 20px; }
            .summary { background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin-bottom: 25px; display: flex; justify-content: space-between; }
            .summary-item { font-size: 13px; }
            .summary-item strong { display: block; font-size: 16px; color: #111827; margin-top: 4px; }
            .property-group { margin-bottom: 30px; page-break-inside: avoid; }
            .property-name { font-size: 15px; font-weight: bold; background-color: #E5E7EB; padding: 8px 12px; margin-bottom: 0; border-top-left-radius: 6px; border-top-right-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 0; }
            th { background-color: #F9FAFB; font-size: 11px; text-transform: uppercase; text-align: left; padding: 10px 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563; }
            td { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; font-size: 13px; }
            .total-row { background-color: #F9FAFB; font-weight: bold; }
            .total-row td { border-top: 1px solid #E5E7EB; border-bottom: 2px solid #E5E7EB; }
            @media print {
              body { margin: 20px; }
              @page { size: portrait; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <h1>Unoccupied / Unleased Spaces Report</h1>
          <div class="date">Report generated on ${todayStr}</div>
          
          <div class="summary">
            <div class="summary-item">Total Vacant Spaces: <strong>${totalSpaces}</strong></div>
            <div class="summary-item">Total Missed Revenue: <strong>$${totalRent.toLocaleString()}/mo</strong></div>
            <div class="summary-item">Total Sq Ft Vacant: <strong>${totalSqft > 0 ? totalSqft.toLocaleString() + " sqft" : "TBD"}</strong></div>
            <div class="summary-item">Annualized Value: <strong>$${(totalRent * 12).toLocaleString()}/yr</strong></div>
          </div>
    `;

    Object.values(grouped).forEach(group => {
      const groupRent = group.spaces.reduce((s, sp) => s + (sp.monthly_rent || 0), 0);
      const groupSqft = group.spaces.reduce((s, sp) => s + (parseInt(String(sp.sqft)) || 0), 0);

      htmlContent += `
        <div class="property-group">
          <div class="property-name">${group.propertyName}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Space / Suite</th>
                <th style="width: 20%;">Monthly Rent</th>
                <th style="width: 20%;">Sq Ft</th>
                <th style="width: 20%;">Additional Fees</th>
              </tr>
            </thead>
            <tbody>
      `;

      group.spaces.forEach(sp => {
        let feesStr = "";
        if (sp.nnn_fee) feesStr += `NNN: $${sp.nnn_fee} `;
        if (sp.nn_fee) feesStr += `NN: $${sp.nn_fee} `;
        if (sp.utility_fee) feesStr += `Util: $${sp.utility_fee} `;
        if (!feesStr) feesStr = "—";

        htmlContent += `
          <tr>
            <td><strong>${sp.name}</strong></td>
            <td>$${sp.monthly_rent.toLocaleString()}/mo</td>
            <td>${sp.sqft ? sp.sqft + " sqft" : "—"}</td>
            <td>${feesStr}</td>
          </tr>
        `;
      });

      htmlContent += `
              <tr class="total-row">
                <td>Subtotal (${group.spaces.length} space${group.spaces.length !== 1 ? "s" : ""})</td>
                <td>$${groupRent.toLocaleString()}/mo</td>
                <td>${groupSqft > 0 ? groupSqft.toLocaleString() + " sqft" : "—"}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });

    htmlContent += `
          <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 10px;">
            OperateIQ Property Operations Platform &copy; ${new Date().getFullYear()}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 glass rounded-2xl border border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 size={20} className="text-[#A78BFA]" />
            Property Details
          </h2>
          <p className="text-xs text-gray-500 mt-1">Occupancy, P&amp;L, and financials per property — live from Tenant data.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button onClick={() => setShowIntakeModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 shadow-[0_0_16px_rgba(6,182,212,0.35)] transition-all cursor-pointer">
            <Sparkles size={12} className="text-cyan-200" /> Import Buildings &amp; Tenants
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-[0_0_16px_rgba(59,130,246,0.35)] transition-all cursor-pointer">
            <Plus size={12} /> Add Property
          </button>
          <button onClick={() => setTick(t => t + 1)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setShowPrint(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#A78BFA] px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.25)] hover:bg-[rgba(167,139,250,0.1)] transition-all">
            <Printer size={12} /> Print Report
          </button>
        </div>
      </div>

      {/* Migration banner */}
      {migrationSql && (
        <div className="rounded-xl border border-yellow-800/50 bg-yellow-950/30 p-4">
          <p className="text-xs font-bold text-yellow-400 mb-2">⚠️ One-time setup required — run this SQL in Supabase:</p>
          <pre className="text-[10px] text-yellow-300 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{migrationSql}</pre>
        </div>
      )}

      {/* CEO Overview Card */}
      {!loading && (
        <PortfolioOverviewCard properties={overviewProperties} tenants={tenants} details={details} availableSpaces={availableSpaces} />
      )}

      {/* Portfolio KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Building2,     label: "Properties",  value: allProperties.length,                                    color: "#A78BFA" },
          { icon: Users,         label: "Tenants",     value: `${activeTenants.length} active`,                      color: "#60A5FA" },
          { icon: DollarSign,    label: "Revenue",     value: `$${totalRevenue.toLocaleString()}/mo`,               color: "#4ADE80" },
          { icon: TrendingUp,    label: "Net P&L",     value: totalExpenses ? `$${Math.round(totalRevenue - totalExpenses).toLocaleString()}/mo` : "—", color: totalRevenue > totalExpenses ? "#4ADE80" : "#EF4444" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-[rgba(255,255,255,0.06)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold">{label}</p>
              <p className="text-base font-black text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {alerts > 0 && (
        <a href="/admin?tab=tenants"
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-yellow-900/40 bg-yellow-950/20 text-yellow-400 text-xs hover:bg-yellow-950/40 hover:border-yellow-800/60 transition-all cursor-pointer group">
          <AlertTriangle size={14} /> <span><strong>{alerts} lease{alerts > 1 ? "s" : ""}</strong> expiring within 90 days — <span className="underline underline-offset-2 group-hover:text-yellow-300">go to Tenants tab →</span></span>
        </a>
      )}

      {/* Unassigned tenants warning */}
      {!loading && (() => {
        const assignedIds = new Set(
          allProperties.flatMap(p => {
            const dn = detailMap[p.id]?.display_name || p.name;
            return tenants.filter(t => exactBuildingMatch(t.building || "", p.id, dn)).map(t => t.id);
          })
        );
        const unassigned = tenants.filter(t => !assignedIds.has(t.id));
        if (unassigned.length === 0) return null;
        return (
          <a href="/admin?tab=tenants"
            className="flex items-center gap-3 px-5 py-4 rounded-xl border border-orange-900/40 bg-orange-950/20 text-orange-400 text-xs hover:bg-orange-950/40 hover:border-orange-800/60 transition-all cursor-pointer group">
            <AlertTriangle size={14} />
            <span>
              <strong>{unassigned.length} tenant{unassigned.length > 1 ? "s" : ""}</strong> not assigned to a property
              ({unassigned.slice(0, 3).map(t => t.name).join(", ")}{unassigned.length > 3 ? ` +${unassigned.length - 3} more` : ""})
              — <span className="underline underline-offset-2 group-hover:text-orange-300">fix in Tenants tab →</span>
            </span>
          </a>
        );
      })()}

      {/* P&L History Chart */}
      {!loading && (
        <PortfolioHistoryChart />
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-[#A78BFA]" />
          <span className="ml-3 text-sm text-gray-500">Loading…</span>
        </div>
      ) : allProperties.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[rgba(167,139,250,0.3)] bg-gradient-to-br from-[rgba(167,139,250,0.06)] via-[rgba(56,189,248,0.03)] to-transparent p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.3)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(167,139,250,0.15)]">
            <Building2 size={26} className="text-[#A78BFA]" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white mb-2">Welcome to Your Property Portfolio</h3>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto leading-relaxed mb-6">
            Your workspace currently has 0 properties. Add your first building to start tracking tenants, P&amp;L, expenses, and maintenance — or load editable sample properties to explore the dashboard first.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white text-xs sm:text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-[rgba(167,139,250,0.25)]"
            >
              <Plus size={15} /> + Add Your First Property
            </button>
            <button
              onClick={handleSeedDemo}
              disabled={seedingDemo}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-sky-400/35 bg-sky-500/10 text-sky-300 text-xs sm:text-sm font-bold hover:bg-sky-500/20 transition-all disabled:opacity-50"
            >
              {seedingDemo ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {seedingDemo ? "Loading Sample Properties…" : "Load Sample Demo Properties (Editable)"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Horizontal Scrolling Property Tab Bar */}
          <div className="bg-[rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Building2 size={12} className="text-[#A78BFA]" />
                Property Directory ({allProperties.length})
              </p>
              {selectedPropertyId !== "all" && (
                <button
                  onClick={() => setSelectedPropertyId("all")}
                  className="text-xs text-[#A78BFA] hover:text-white font-bold transition-colors flex items-center gap-1"
                >
                  Show All ({allProperties.length}) →
                </button>
              )}
            </div>

            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* "All Properties" Tab */}
              <button
                onClick={() => setSelectedPropertyId("all")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                  selectedPropertyId === "all"
                    ? "bg-[rgba(167,139,250,0.2)] text-[#A78BFA] border border-[rgba(167,139,250,0.4)] shadow-[0_0_15px_rgba(167,139,250,0.15)]"
                    : "bg-[rgba(255,255,255,0.03)] text-gray-400 border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                }`}
              >
                <Building2 size={13} />
                <span>All Properties</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[rgba(255,255,255,0.06)] text-gray-300">
                  {allProperties.length}
                </span>
              </button>

              {/* Individual Property Tabs */}
              {allProperties.map(p => {
                const isSelected = selectedPropertyId === p.id;
                const displayName = detailMap[p.id]?.display_name || p.name;
                const propTenants = tenants.filter(t => exactBuildingMatch(t.building || "", p.id, displayName));
                const activeCount = propTenants.filter(t => t.status === "active").length;
                const units = Number(detailMap[p.id]?.total_units) || 0;
                const occ = units > 0 ? Math.round((activeCount / units) * 100) : null;

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPropertyId(isSelected ? "all" : p.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                      isSelected
                        ? "bg-[rgba(167,139,250,0.2)] text-[#A78BFA] border border-[rgba(167,139,250,0.4)] shadow-[0_0_15px_rgba(167,139,250,0.15)]"
                        : "bg-[rgba(255,255,255,0.03)] text-gray-400 border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                    }`}
                  >
                    <span>{displayName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        occ !== null && occ >= 90
                          ? "bg-emerald-500/15 text-emerald-400"
                          : occ !== null && occ >= 70
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-[rgba(255,255,255,0.06)] text-gray-400"
                      }`}
                    >
                      {occ !== null ? `${occ}%` : `${activeCount} ${activeCount === 1 ? "tenant" : "tenants"}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {displayedProperties.map(p => (
              <PropertyCard key={p.id} property={p} tenants={tenants} detail={detailMap[p.id]} onSave={handleSave} onDelete={handleDeleteProperty} />
            ))}
          </div>
        </>
      )}

      {/* Available Spaces Migration Banner */}
      {spacesMigrationSql && (
        <div className="rounded-xl border border-yellow-800/50 bg-yellow-950/30 p-4">
          <p className="text-xs font-bold text-yellow-400 mb-2">⚠️ One-time setup required for Available Spaces — run this SQL in Supabase:</p>
          <pre className="text-[10px] text-yellow-300 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{spacesMigrationSql}</pre>
        </div>
      )}

      {/* Available Properties (Unleased Spaces) Section */}
      {!loading && (() => {
        // ── Compute totals ──
        const totalSpaces = availableSpaces.length;
        const totalRent = availableSpaces.reduce((s, sp) => s + (sp.monthly_rent || 0), 0);
        const totalSqft = availableSpaces.reduce((s, sp) => s + (parseInt(String(sp.sqft)) || 0), 0);
        const totalFees = availableSpaces.reduce((s, sp) => s + (sp.nnn_fee || 0) + (sp.nn_fee || 0) + (sp.utility_fee || 0), 0);
        const avgRent = totalSpaces ? Math.round(totalRent / totalSpaces) : 0;

        // ── Group by property ──
        const grouped: Record<string, { property: PropertyItem | undefined; spaces: AvailableSpace[] }> = {};
        availableSpaces.forEach(sp => {
          if (!grouped[sp.property_id]) {
            grouped[sp.property_id] = { property: allProperties.find(p => p.id === sp.property_id), spaces: [] };
          }
          grouped[sp.property_id].spaces.push(sp);
        });
        const groups = Object.values(grouped).sort((a, b) =>
          (a.property?.name || "").localeCompare(b.property?.name || "")
        );

        return (
          <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-[rgba(255,255,255,0.05)]">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Building2 size={16} className="text-[#A78BFA]" />
                  Available Properties (Unleased Spaces)
                </h3>
                <p className="text-[11px] text-gray-500 mt-1">
                  Vacant suites, rooms, and units — potential revenue you{"'"}re missing.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:self-start">
                {totalSpaces > 0 && (
                  <button onClick={exportUnleasedSpacesToCSV}
                    className="flex items-center gap-1.5 text-xs font-bold text-sky-400 px-3 py-2 rounded-lg border border-white/12 bg-white/[0.03] hover:border-white/20 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] transition-all">
                    <Download size={12} /> Export CSV
                  </button>
                )}
                {totalSpaces > 0 && (
                  <button onClick={printUnleasedSpaces}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-300 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] transition-all">
                    <Printer size={12} /> Print List
                  </button>
                )}
                <button onClick={() => setShowAddSpace(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#A78BFA] px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.25)] hover:bg-[rgba(167,139,250,0.1)] transition-all">
                  <Plus size={12} /> Add Unleased Space
                </button>
              </div>
            </div>

            {totalSpaces === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="text-green-500/40" />
                <p className="text-sm font-bold text-gray-300">All Spaces Occupied!</p>
                <p className="text-xs text-gray-500">No unleased spaces registered — add one if a vacancy opens up.</p>
              </div>
            ) : (
              <>
                {/* ── KPI Summary Bar ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px bg-[rgba(255,255,255,0.04)]">
                  {[
                    { icon: Building2,    label: "Vacant Spaces", value: String(totalSpaces),                              color: "#A78BFA", accent: "rgba(167,139,250,0.12)" },
                    { icon: DollarSign,   label: "Missed Revenue", value: `$${totalRent.toLocaleString()}/mo`,             color: "#EF4444", accent: "rgba(239,68,68,0.10)" },
                    { icon: Home,         label: "Total Sq Ft",   value: totalSqft > 0 ? totalSqft.toLocaleString() : "—", color: "#60A5FA", accent: "rgba(96,165,250,0.10)" },
                    { icon: TrendingUp,   label: "Avg Rent",      value: `$${avgRent.toLocaleString()}/mo`,                color: "#FACC15", accent: "rgba(250,204,21,0.10)" },
                    { icon: Receipt,      label: "Est. Fees",     value: totalFees > 0 ? `$${totalFees.toLocaleString()}/mo` : "—", color: "#F97316", accent: "rgba(249,115,22,0.10)" },
                  ].map(({ icon: Icon, label, value, color, accent }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-4" style={{ background: "rgba(17,24,39,0.6)" }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent, border: `1px solid ${color}25` }}>
                        <Icon size={15} style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-black text-white truncate">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Annual Impact Banner ── */}
                <div className="mx-5 mt-4 flex items-center gap-3 rounded-xl px-4 py-3 border"
                  style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.15)" }}>
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-300">
                      Estimated <strong className="text-red-400">${(totalRent * 12).toLocaleString()}/yr</strong> in unrealized revenue
                      {totalFees > 0 && <> plus <strong className="text-orange-400">${(totalFees * 12).toLocaleString()}/yr</strong> in fees</>}
                    </span>
                  </div>
                </div>

                {/* ── Grouped By Property ── */}
                <div className="p-5 space-y-3">
                  {groups.map(({ property, spaces }) => {
                    const groupRent = spaces.reduce((s, sp) => s + (sp.monthly_rent || 0), 0);
                    const groupFees = spaces.reduce((s, sp) => s + (sp.nnn_fee || 0) + (sp.nn_fee || 0) + (sp.utility_fee || 0), 0);
                    const groupSqft = spaces.reduce((s, sp) => s + (parseInt(String(sp.sqft)) || 0), 0);
                    const propName = property?.name || "Unknown Property";

                    return (
                      <div key={property?.id || "unknown"} className="rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                        {/* Property group header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-[rgba(255,255,255,0.02)]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
                              <Building2 size={13} className="text-[#A78BFA]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate">{propName}</p>
                              {property?.city && <p className="text-[10px] text-gray-500">{property.city}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
                              {spaces.length} space{spaces.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs font-bold text-red-400">
                              ${groupRent.toLocaleString()}/mo
                            </span>
                            {groupSqft > 0 && (
                              <span className="text-[10px] text-gray-500">{groupSqft.toLocaleString()} sqft</span>
                            )}
                          </div>
                        </div>

                        {/* Spaces within this property */}
                        <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                          {spaces.map(space => (
                            <div key={space.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                              {/* Icon dot */}
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "rgba(239,68,68,0.5)" }} />

                              {/* Space info */}
                              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                <p className="text-xs font-semibold text-white truncate sm:w-44 flex-shrink-0">{space.name}</p>
                                <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                                  <span className="text-xs font-bold text-red-400">${space.monthly_rent.toLocaleString()}/mo</span>
                                  {space.sqft && <span className="text-[10px] text-gray-500">{space.sqft} sqft</span>}
                                  {(space.nnn_fee || space.nn_fee || space.utility_fee) ? (
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                      <Receipt size={9} className="text-orange-400/60" />
                                      {space.nnn_fee ? `NNN $${space.nnn_fee}` : ""}
                                      {space.nn_fee ? ` NN $${space.nn_fee}` : ""}
                                      {space.utility_fee ? ` Util $${space.utility_fee}` : ""}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {/* Delete */}
                              <button onClick={() => { if (confirm(`Remove unleased space "${space.name}"?`)) handleDeleteSpace(space.id); }}
                                className="w-7 h-7 rounded-lg border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-gray-700 hover:text-red-400 hover:border-red-500/30 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                title="Remove space">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Group subtotal footer (only if > 1 space) */}
                        {spaces.length > 1 && (
                          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.015)]">
                            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Subtotal</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-red-400">${groupRent.toLocaleString()}/mo</span>
                              {groupFees > 0 && <span className="text-[10px] text-orange-400">+${groupFees.toLocaleString()} fees</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Grand Total Footer ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Grand Total — {totalSpaces} Unleased Space{totalSpaces !== 1 ? "s" : ""} across {groups.length} Propert{groups.length !== 1 ? "ies" : "y"}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-red-400">${totalRent.toLocaleString()}/mo</span>
                    {totalFees > 0 && <span className="text-xs font-bold text-orange-400">+${totalFees.toLocaleString()} fees/mo</span>}
                    <span className="text-xs text-gray-500 border-l border-[rgba(255,255,255,0.08)] pl-4">${(totalRent * 12).toLocaleString()}/yr</span>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {showPrint && <PrintReport data={printData} onClose={() => setShowPrint(false)} />}
      {showAdd && <AddPropertyForm onAdd={handleAddProperty} onClose={() => setShowAdd(false)} />}
      {showAddSpace && <AddSpaceModal properties={allProperties} onAdd={handleAddSpace} onClose={() => setShowAddSpace(false)} />}
      {showIntakeModal && (
        <IntakeStagingModal
          isOpen={showIntakeModal}
          onClose={() => setShowIntakeModal(false)}
          onImportSuccess={() => setTick(t => t + 1)}
          knownBuildings={allProperties.map(p => p.name)}
          currentOrgName={getOrgProfile().name}
        />
      )}
      
      {/* ── Parking Lots Section ── */}
      <div className="mt-12 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Building2 size={18} className="text-[#60A5FA]" /> Parking Lot Management
            </h2>
            <p className="text-xs text-gray-500 mt-1">Track taxes, renewals, and leasing costs for parking assets</p>
          </div>
          <button 
            onClick={() => setShowAddParkingLot(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA] text-xs font-black hover:bg-[rgba(96,165,250,0.15)] transition-all"
          >
            <Plus size={14} /> Add Parking Lot
          </button>
        </div>

        {parkingLots.length === 0 ? (
          <div className="glass rounded-2xl border border-dashed border-[rgba(255,255,255,0.06)] p-12 text-center">
            <Building2 size={40} className="mx-auto text-gray-700 opacity-20 mb-4" />
            <p className="text-sm text-gray-500 italic">No parking lots tracked yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parkingLots.map(lot => (
              <ParkingLotCard 
                key={lot.id} 
                lot={lot} 
                properties={allProperties}
                onDelete={handleDeleteParkingLot} 
              />
            ))}
          </div>
        )}
      </div>

      {showAddParkingLot && (
        <ParkingLotModal 
          properties={allProperties} 
          onAdd={handleAddParkingLot} 
          onClose={() => setShowAddParkingLot(false)} 
        />
      )}
    </div>
  );
}

function ParkingLotCard({ lot, properties, onDelete }: { lot: any, properties: any[], onDelete: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const associatedProp = properties.find(p => p.id === lot.associated_property_id);

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 transition-all hover:border-[rgba(96,165,250,0.3)] group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA]">
          <Building2 size={18} />
        </div>
        <div className="flex gap-2">
          {confirmDelete ? (
            <button onClick={() => onDelete(lot.id)} className="text-[10px] font-black text-red-400 bg-red-400/10 px-2 py-1 rounded-lg">Confirm?</button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-2 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
          )}
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <h3 className="text-sm font-bold text-white leading-tight">{lot.address}</h3>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
          {lot.city}, {lot.county} Tax District
        </p>
      </div>

      {associatedProp && (
        <div className="mb-4 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
          <p className="text-[9px] text-gray-600 uppercase tracking-tighter mb-0.5">Associated Property</p>
          <p className="text-[11px] font-bold text-gray-300">{associatedProp.name}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[rgba(255,255,255,0.04)]">
        <div>
          <p className="text-[9px] text-gray-600 uppercase tracking-tighter mb-1">Lease Cost</p>
          <p className="text-xs font-black text-[#4ADE80]">${(lot.price_paid || 0).toLocaleString()}/mo</p>
        </div>
        <div>
          <p className="text-[9px] text-gray-600 uppercase tracking-tighter mb-1">Renewal Date</p>
          <p className="text-xs font-bold text-gray-400">{lot.renewal_date ? new Date(lot.renewal_date).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[9px] text-gray-600 uppercase tracking-tighter mb-1">City & County Tax</p>
          <p className="text-xs font-bold text-gray-300">${(lot.city_tax || 0).toLocaleString()} / ${(lot.county_tax || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function ParkingLotModal({ properties, onAdd, onClose }: { properties: any[], onAdd: (form: any) => void, onClose: () => void }) {
  const [form, setForm] = useState({
    address: "",
    city: "",
    county: "",
    renewal_date: "",
    city_tax: 0,
    county_tax: 0,
    price_paid: 0,
    associated_property_id: ""
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#04060A]/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass rounded-3xl border border-[rgba(255,255,255,0.1)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-gradient-to-r from-[rgba(96,165,250,0.05)] to-transparent">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-widest">Add Parking Lot</h3>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">Enter asset details & tax information</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Lot Address *</label>
            <input 
              value={form.address}
              onChange={e => setForm({...form, address: e.target.value})}
              placeholder="e.g. 123 Shelby St (Lot B)"
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white focus:border-[#60A5FA]/40 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">City</label>
              <input 
                value={form.city}
                onChange={e => setForm({...form, city: e.target.value})}
                placeholder="Nashville"
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white focus:border-[#60A5FA]/40 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">County</label>
              <input 
                value={form.county}
                onChange={e => setForm({...form, county: e.target.value})}
                placeholder="Davidson"
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white focus:border-[#60A5FA]/40 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Renewal Date</label>
              <input 
                type="date"
                value={form.renewal_date}
                onChange={e => setForm({...form, renewal_date: e.target.value})}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white focus:border-[#60A5FA]/40 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Monthly Cost</label>
              <input 
                type="number"
                value={form.price_paid}
                onChange={e => setForm({...form, price_paid: parseFloat(e.target.value) || 0})}
                placeholder="Price we pay to lease"
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white focus:border-[#60A5FA]/40 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">City Tax (Annual)</label>
              <input 
                type="number"
                value={form.city_tax}
                onChange={e => setForm({...form, city_tax: parseFloat(e.target.value) || 0})}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white focus:border-[#60A5FA]/40 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">County Tax (Annual)</label>
              <input 
                type="number"
                value={form.county_tax}
                onChange={e => setForm({...form, county_tax: parseFloat(e.target.value) || 0})}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white focus:border-[#60A5FA]/40 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Assigned Property</label>
            <select 
              value={form.associated_property_id}
              onChange={e => setForm({...form, associated_property_id: e.target.value})}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white focus:border-[#60A5FA]/40 outline-none transition-all"
            >
              <option value="" className="bg-[#0A0F1A]">Select a property...</option>
              {properties.map(p => (
                <option key={p.id} value={p.id} className="bg-[#0A0F1A]">{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 bg-[rgba(255,255,255,0.02)] border-t border-[rgba(255,255,255,0.06)] flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs font-black hover:text-white transition-all uppercase tracking-widest">Cancel</button>
          <button 
            onClick={() => onAdd(form)}
            disabled={!form.address}
            className="px-8 py-2.5 rounded-xl bg-[#60A5FA] text-black text-xs font-black hover:opacity-90 transition-all uppercase tracking-widest disabled:opacity-40"
          >
            Save Parking Lot
          </button>
        </div>
      </div>
    </div>
  );
}
