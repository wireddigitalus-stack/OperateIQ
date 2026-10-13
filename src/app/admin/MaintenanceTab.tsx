"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Wrench, Plus, Phone, Calendar, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, Save, X, Loader2, Building2, User,
  ChevronDown, ChevronUp, Trash2, Edit2, Circle, Flame,
  DollarSign, Timer, MessageSquare, ArrowRight, Sparkles, ShieldAlert,
  Users, Camera,
} from "lucide-react";
import PrintButton from "./PrintButton";
import MicButton from "@/components/MicButton";
import FilterChangesTab from "./FilterChangesTab";
import BuildingInspectionsTab from "./BuildingInspectionsTab";
import SubcontractorContactsTab from "./SubcontractorContactsTab";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  title: string;
  description: string;
  building: string;
  unit: string;
  tenant: string;
  category: string;
  priority: 1 | 2 | 3 | 4;
  status: "open" | "scheduled" | "in_progress" | "complete" | "cancelled" | "draft";
  assignedTo: string;
  reportedBy: string;
  estimatedCost: number;
  actualCost: number;
  estimatedHours: number;
  scheduledDate: string | null;
  completedDate: string | null;
  notes: string;
  source: string;
  createdAt: string;
  firstResponseAt?: string | null;
  completedAt?: string | null;
  billable?: boolean;
  materialAmount?: number;
  photoUrl?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["HVAC", "Plumbing", "Water", "Sprinkler", "Electrical", "Elevator", "Door/Lock", "Security/Fire", "Appliance", "Structural", "Cleaning", "Pest", "Landscaping", "Damage", "Other"];

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; icon: string; response: string; description: string }> = {
  1: { label: "P1 – Emergency (Critical)", color: "#EF4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.4)",  icon: "🔴", response: "Immediate", description: "Flooding, power outage, security issue" },
  2: { label: "P2 – Urgent",               color: "#F97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.35)", icon: "🟠", response: "Same day", description: "HVAC down, plumbing leak" },
  3: { label: "P3 – Routine",              color: "#FACC15", bg: "rgba(250,204,21,0.1)", border: "rgba(250,204,21,0.3)",  icon: "🟡", response: "1–7 days", description: "Repairs, lighting, adjustments" },
  4: { label: "P4 – Planned",              color: "#4ADE80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", icon: "🟢", response: "Planned", description: "Improvements, upgrades, PM" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:       { label: "Draft",        color: "#A78BFA", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.3)" },
  open:        { label: "Open",         color: "#94A3B8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
  scheduled:   { label: "Scheduled",   color: "#60A5FA", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.25)" },
  in_progress: { label: "In Progress", color: "#FACC15", bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.25)" },
  complete:    { label: "Complete",     color: "#4ADE80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.3)" },
  cancelled:   { label: "Cancelled",   color: "#6B7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToTicket(r: Record<string, unknown>): Ticket {
  return {
    id: r.id as string,
    title: (r.title as string) || "",
    description: (r.description as string) || "",
    building: (r.building as string) || "",
    unit: (r.unit as string) || "",
    tenant: (r.tenant as string) || "",
    category: (r.category as string) || "Other",
    priority: (Number(r.priority) || 3) as 1 | 2 | 3 | 4,
    status: (r.status as Ticket["status"]) || "open",
    assignedTo: (r.assigned_to as string) || "",
    reportedBy: (r.reported_by as string) || "",
    estimatedCost: Number(r.estimated_cost) || 0,
    actualCost: Number(r.actual_cost) || 0,
    estimatedHours: Number(r.estimated_hours) || 0,
    scheduledDate: (r.scheduled_date as string) || null,
    completedDate: (r.completed_date as string) || null,
    notes: (r.notes as string) || "",
    source: (r.source as string) || "admin",
    createdAt: (r.created_at as string) || new Date().toISOString(),
    firstResponseAt: (r.first_response_at as string) || null,
    completedAt: (r.completed_at as string) || null,
    billable: !!(r.billable),
    materialAmount: Number(r.material_amount) || 0,
    photoUrl: (r.photo_url as string) || null,
  };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const LABEL = "text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1";
const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none placeholder:text-gray-600";
const BLANK_TICKET = (): Partial<Ticket> => ({
  title: "", description: "", building: "", unit: "", tenant: "",
  category: "Other", priority: 3, status: "open",
  assignedTo: "", reportedBy: "", estimatedCost: 0,
  estimatedHours: 0, scheduledDate: "", completedDate: "", notes: "",
  billable: false, materialAmount: 0,
});

// ─── DEMO DATA — remove before go-live ───────────────────────────────────────
// To remove: delete the DEMO_TICKETS array and the `if (data.tickets.length === 0)` block in fetch_

function demoDates() {
  const t = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
  return { yesterday: t(-1), today: t(0), tomorrow: t(1), nextWeek: t(7), twoWks: t(14) };
}

function getDemoTickets(): Ticket[] {
  const d = demoDates();
  return [
    { id: "demo_1", title: "HVAC not cooling — Suite 301", description: "Tenant reports unit blowing warm air. Thermostat set to 68°F but room holds at 78°F.", building: "Main Street Plaza", unit: "Suite 301", tenant: "Executive Suites", category: "HVAC", priority: 1, status: "in_progress", assignedTo: "Mike D.", reportedBy: "Property Manager", estimatedCost: 650, actualCost: 0, estimatedHours: 4, scheduledDate: d.today, completedDate: null, notes: "[Apr 17 — Mike D.] Compressor cycling on and off. Ordered capacitor. Parts arrive tomorrow.", source: "admin", createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },
    { id: "demo_2", title: "Water leak under sink — Unit 112", description: "Tenant reported active drip pooling under kitchen sink cabinet. Possible P-trap failure.", building: "Sample Office Building", unit: "Unit 112", tenant: "Jane Doe", category: "Plumbing", priority: 1, status: "open", assignedTo: "Carlos M.", reportedBy: "Tenant", estimatedCost: 180, actualCost: 0, estimatedHours: 2, scheduledDate: d.today, completedDate: null, notes: "", source: "staff", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: "demo_3", title: "Electrical outlet sparking — Boardroom", description: "Receptionist noticed sparking from outlet near window. Outlet taken offline. Licensed electrician needed.", building: "Sample Retail Center", unit: "Boardroom", tenant: "OperateIQ", category: "Electrical", priority: 2, status: "scheduled", assignedTo: "James R.", reportedBy: "Property Manager", estimatedCost: 320, actualCost: 0, estimatedHours: 3, scheduledDate: d.tomorrow, completedDate: null, notes: "[Apr 17 — Property Manager] Contacted the electrician. Coming tomorrow 9am.", source: "admin", createdAt: new Date(Date.now() - 3600000 * 14).toISOString() },
    { id: "demo_4", title: "Lobby door lock not responding", description: "Main entrance keypad intermittently fails. Tenants having to use side entrance.", building: "Main Street Plaza", unit: "Main Lobby", tenant: "Common Area", category: "Door/Lock", priority: 2, status: "in_progress", assignedTo: "Mike D.", reportedBy: "Front Desk", estimatedCost: 220, actualCost: 0, estimatedHours: 1.5, scheduledDate: d.today, completedDate: null, notes: "", source: "admin", createdAt: new Date(Date.now() - 3600000 * 28).toISOString() },
    { id: "demo_5", title: "Parking lot light out — Section B", description: "Three LED fixtures in Section B are dark. Likely a tripped breaker or ballast issue.", building: "Sample Office Building", unit: "Parking Lot", tenant: "Common Area", category: "Electrical", priority: 3, status: "scheduled", assignedTo: "Carlos M.", reportedBy: "Property Manager", estimatedCost: 140, actualCost: 0, estimatedHours: 2, scheduledDate: d.nextWeek, completedDate: null, notes: "", source: "admin", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: "demo_6", title: "Refrigerator not cooling — Break Room", description: "Staff fridge holding at 52°F. Contents may be unsafe. Needs service call or replacement.", building: "Sample Retail Center", unit: "Break Room", tenant: "Common Area", category: "Appliance", priority: 3, status: "open", assignedTo: "", reportedBy: "Staff", estimatedCost: 280, actualCost: 0, estimatedHours: 2, scheduledDate: d.nextWeek, completedDate: null, notes: "", source: "staff", createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: "demo_7", title: "Paint scuff in hallway — 2nd floor", description: "5-ft scuff along north wall. Low priority. Touch-up paint on hand in maintenance closet.", building: "Main Street Plaza", unit: "2nd Floor Hallway", tenant: "Common Area", category: "Damage", priority: 4, status: "open", assignedTo: "James R.", reportedBy: "Cleaning Staff", estimatedCost: 40, actualCost: 0, estimatedHours: 1, scheduledDate: d.twoWks, completedDate: null, notes: "", source: "cleaning", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: "demo_8", title: "HVAC filter replacement — Suite 105", description: "Quarterly filter swap completed. New MERV-11 filters installed. Next due in 90 days.", building: "Sample Office Building", unit: "Suite 105", tenant: "OperateIQ", category: "HVAC", priority: 4, status: "complete", assignedTo: "Mike D.", reportedBy: "Property Manager", estimatedCost: 60, actualCost: 55, estimatedHours: 0.5, scheduledDate: d.yesterday, completedDate: d.yesterday, notes: "[Apr 16 — Mike D.] Done. Used two 16x20x1 MERV-11s. Disposed of old filters.", source: "admin", createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];
}

// ─── Summary Banner ───────────────────────────────────────────────────────────

function SummaryBanner({ tickets, onSelectTicket }: { tickets: Ticket[]; onSelectTicket?: (ticket: Ticket) => void }) {
  const [expandedNotice, setExpandedNotice] = useState<"cat1" | "cat2" | "overdue" | null>(null);

  const open = tickets.filter(t => t.status !== "complete" && t.status !== "cancelled" && !t.completedDate);
  const cat1 = open.filter(t => t.priority === 1);
  const cat2 = open.filter(t => t.priority === 2);
  const totalEstCost = open.reduce((s, t) => s + (t.estimatedCost || 0), 0);
  const overdue = open.filter(t => t.scheduledDate && new Date(t.scheduledDate) < new Date());

  const checkIsBreached = (t: Ticket) => {
    if (t.priority === 4) return false;
    const created = new Date(t.createdAt).getTime();
    const limit = t.priority === 1 ? 2 * 3600000 // 2 hours
                : t.priority === 2 ? 24 * 3600000 // 24 hours
                : 7 * 24 * 3600000; // 7 days
    
    if (t.firstResponseAt) {
      const resp = new Date(t.firstResponseAt).getTime();
      return (resp - created) > limit;
    }
    if (t.status === "open") {
      return (Date.now() - created) > limit;
    }
    return false;
  };

  const slaEligible = tickets.filter(t => t.priority <= 3);
  const slaBreached = slaEligible.filter(checkIsBreached);
  const slaCompliantCount = slaEligible.length - slaBreached.length;
  const slaCompliancePct = slaEligible.length > 0
    ? Math.round((slaCompliantCount / slaEligible.length) * 100)
    : 100;

  const respondedTickets = tickets.filter(t => t.firstResponseAt);
  const avgResponseTimeMin = respondedTickets.length > 0 
    ? respondedTickets.reduce((acc, t) => {
        const diff = new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime();
        return acc + diff;
      }, 0) / (respondedTickets.length * 60000)
    : 0;
  
  const avgResponseStr = avgResponseTimeMin > 60
    ? `${Math.round(avgResponseTimeMin / 60)}h ${Math.round(avgResponseTimeMin % 60)}m`
    : avgResponseTimeMin > 0
    ? `${Math.round(avgResponseTimeMin)}m`
    : "—";

  return (
    <div className="rounded-2xl border border-[rgba(250,204,21,0.2)] bg-gradient-to-br from-[rgba(250,204,21,0.05)] via-transparent to-transparent p-5 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#FACC15] opacity-[0.03] blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.25)]">
            <Wrench size={14} className="text-black" />
          </div>
          <div>
            <p className="text-xs font-black text-[#FACC15] uppercase tracking-widest">Maintenance Control</p>
            <p className="text-[11px] text-gray-500">{open.length} active ticket{open.length !== 1 ? "s" : ""} · {tickets.filter(t => t.status === "complete" || !!t.completedDate).length} completed</p>
          </div>
        </div>
        <a
          href="/staff/maintenance"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:opacity-75 flex-shrink-0"
          style={{ background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)", color: "#FACC15" }}
        >
          🔧 Crew Portal ↗
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { label: "Active Tickets", value: String(open.length), color: "#94A3B8" },
          { label: "SLA Compliance", value: `${slaCompliancePct}%`, color: slaCompliancePct >= 90 ? "#4ADE80" : slaCompliancePct >= 75 ? "#FACC15" : "#EF4444" },
          { label: "Avg Response", value: avgResponseStr, color: "#60A5FA" },
          { label: "Est. Cost", value: totalEstCost > 0 ? `$${totalEstCost.toLocaleString()}` : "—", color: "#FACC15" },
        ].map(s => (
          <div key={s.label} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3">
            <p className="text-[10px] text-gray-600 mb-0.5">{s.label}</p>
            <p className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alert rows with dropdowns */}
      <div className="space-y-2">
        {cat1.length > 0 && (
          <div className="rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setExpandedNotice(prev => prev === "cat1" ? null : "cat1")}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[rgba(239,68,68,0.05)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Flame size={12} className="text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400 truncate">
                  <span className="font-black">{cat1.length} P1 Emergency</span> ticket{cat1.length !== 1 ? "s" : ""} require attention
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-red-400 ml-2">
                <span className="text-[10px] font-semibold text-red-400/80">{expandedNotice === "cat1" ? "Hide" : "View"}</span>
                {expandedNotice === "cat1" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            </button>
            {expandedNotice === "cat1" && (
              <div className="px-3 pb-2 pt-1 border-t border-[rgba(239,68,68,0.15)] space-y-1">
                {cat1.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTicket?.(t)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-[rgba(0,0,0,0.3)] hover:bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.2)] text-left transition-all group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white group-hover:text-red-300 transition-colors truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {[t.building, t.unit].filter(Boolean).join(" · ") || "No unit"} · {t.assignedTo ? `Assigned: ${t.assignedTo}` : "Unassigned"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                      Open <ArrowRight size={10} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {cat2.length > 0 && (
          <div className="rounded-xl bg-[rgba(249,115,22,0.07)] border border-[rgba(249,115,22,0.2)] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setExpandedNotice(prev => prev === "cat2" ? null : "cat2")}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[rgba(249,115,22,0.05)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={12} className="text-orange-400 flex-shrink-0" />
                <span className="text-xs text-orange-400 truncate">
                  <span className="font-bold">{cat2.length} P2 Urgent</span> ticket{cat2.length !== 1 ? "s" : ""} need attention
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-orange-400 ml-2">
                <span className="text-[10px] font-semibold text-orange-400/80">{expandedNotice === "cat2" ? "Hide" : "View"}</span>
                {expandedNotice === "cat2" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            </button>
            {expandedNotice === "cat2" && (
              <div className="px-3 pb-2 pt-1 border-t border-[rgba(249,115,22,0.15)] space-y-1">
                {cat2.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTicket?.(t)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-[rgba(0,0,0,0.3)] hover:bg-[rgba(249,115,22,0.15)] border border-[rgba(249,115,22,0.2)] text-left transition-all group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {[t.building, t.unit].filter(Boolean).join(" · ") || "No unit"} · {t.assignedTo ? `Assigned: ${t.assignedTo}` : "Unassigned"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                      Open <ArrowRight size={10} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {overdue.length > 0 && (
          <div className="rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.18)] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setExpandedNotice(prev => prev === "overdue" ? null : "overdue")}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[rgba(239,68,68,0.05)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Clock size={12} className="text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400 truncate">
                  <span className="font-bold">{overdue.length} ticket{overdue.length !== 1 ? "s" : ""} past schedule date</span> — follow up required
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-red-400 ml-2">
                <span className="text-[10px] font-semibold text-red-400/80">{expandedNotice === "overdue" ? "Hide" : "View"}</span>
                {expandedNotice === "overdue" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            </button>
            {expandedNotice === "overdue" && (
              <div className="px-3 pb-2 pt-1 border-t border-[rgba(239,68,68,0.15)] space-y-1">
                {overdue.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTicket?.(t)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-[rgba(0,0,0,0.3)] hover:bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.2)] text-left transition-all group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white group-hover:text-red-300 transition-colors truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {[t.building, t.unit].filter(Boolean).join(" · ") || "No unit"} · Due: {t.scheduledDate || "Past"} · {t.assignedTo ? `Assigned: ${t.assignedTo}` : "Unassigned"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                      Open <ArrowRight size={10} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ticket Form ──────────────────────────────────────────────────────────────

const MAINT_DRAFT_KEY = "oiq_draft_maintenance_new";

function TicketForm({ initial, onSave, onSaveDraft, onCancel, currentUserName, buildings = [] }:
  { initial: Partial<Ticket>; onSave: (d: Partial<Ticket>) => Promise<void>; onSaveDraft: (d: Partial<Ticket>) => Promise<void>; onCancel: () => void; currentUserName?: string; buildings?: string[] }) {
  const isNew = !initial.id;
  const [form, setForm] = useState<Partial<Ticket>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [knownStaff, setKnownStaff] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [restoredDraftTime, setRestoredDraftTime] = useState("");
  const set = (k: keyof Ticket, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // Load real maintenance staff names for autocomplete
  useEffect(() => {
    fetch("/api/allowed-users?role=maintenance")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.users)) setKnownStaff(d.users.map((u: { name: string }) => u.name).filter(Boolean)); })
      .catch(() => {});
  }, []);

  // On mount: check for stored localStorage draft (new tickets only)
  useEffect(() => {
    if (!isNew) return;
    try {
      const raw = localStorage.getItem(MAINT_DRAFT_KEY);
      if (raw) {
        const { data, savedAt } = JSON.parse(raw);
        if (data && savedAt) {
          const mins = Math.round((Date.now() - new Date(savedAt).getTime()) / 60000);
          const timeStr = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
          setRestoredDraftTime(timeStr);
          setShowDraftRestore(true);
        }
      }
    } catch { /* ignore */ }
  }, [isNew]);

  // Auto-save to localStorage whenever form changes (new tickets only)
  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(MAINT_DRAFT_KEY, JSON.stringify({ data: form, savedAt: new Date().toISOString() }));
      } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(t);
  }, [form, isNew]);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(MAINT_DRAFT_KEY);
      if (raw) {
        const { data } = JSON.parse(raw);
        if (data) setForm(data);
      }
    } catch { /* ignore */ }
    setShowDraftRestore(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(MAINT_DRAFT_KEY);
    setShowDraftRestore(false);
  };

  const clearLocalDraft = () => {
    try { localStorage.removeItem(MAINT_DRAFT_KEY); } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    try {
      await onSave({ ...form, status: form.status === "draft" ? "open" : form.status });
      clearLocalDraft();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true); setError("");
    try {
      await onSaveDraft({ ...form, status: "draft", title: form.title?.trim() || `Draft — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` });
      clearLocalDraft();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const buildingList = Array.from(new Set([...buildings, ...(form.building ? [form.building] : [])])).filter(Boolean);

  return (
    <div className="bg-[rgba(0,0,0,0.4)] border border-[rgba(250,204,21,0.2)] rounded-2xl p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2">
          <Wrench size={12} />{initial.id && initial.status !== "draft" ? "Edit Ticket" : initial.status === "draft" ? "✏️ Continue Draft" : "New Work Order"}
        </p>
        <button onClick={() => { clearLocalDraft(); onCancel(); }} className="text-gray-600 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      {/* Draft restore banner */}
      {showDraftRestore && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.35)]">
          <p className="text-xs text-[#A78BFA] font-bold flex items-center gap-2">
            📝 You have an unsaved draft from {restoredDraftTime} — restore it?
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={restoreDraft} className="px-3 py-1 rounded-lg bg-[#A78BFA] text-black text-xs font-black hover:opacity-90 transition-opacity">Restore</button>
            <button onClick={discardDraft} className="px-3 py-1 rounded-lg border border-[rgba(255,255,255,0.1)] text-gray-500 text-xs hover:text-white transition-colors">Discard</button>
          </div>
        </div>
      )}

      {/* Title + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>Issue Title *</label>
          <div className="flex gap-1.5 items-center"><input value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="HVAC not cooling Suite 301" className={FIELD + " flex-1"} spellCheck /><MicButton onResult={(t) => set("title", (form.title || "") + (form.title ? " " : "") + t)} /></div>
        </div>
        <div>
          <label className={LABEL}>Category</label>
          <select value={form.category || "Other"} onChange={e => set("category", e.target.value)} className={FIELD}>
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0A0F1A]">{c}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={LABEL}>Description</label>
        <div className="flex gap-1.5 items-center"><textarea spellCheck={true} value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} className={FIELD + " text-xs py-1.5 resize-none flex-1"} placeholder="Describe the issue in detail…" /><MicButton onResult={(t) => set("description", (form.description || "") + (form.description ? " " : "") + t)} /></div>
      </div>

      {/* Building / Unit / Priority */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>Building / Property</label>
          {buildingList.length > 0 ? (
            <select value={form.building || ""} onChange={e => set("building", e.target.value)} className={FIELD}>
              <option value="" className="bg-[#0A0F1A]">Select property…</option>
              {buildingList.map(b => (
                <option key={b} value={b} className="bg-[#0A0F1A]">{b}</option>
              ))}
              {!buildingList.includes("General / Unassigned") && (
                <option value="General / Unassigned" className="bg-[#0A0F1A]">General / Unassigned</option>
              )}
            </select>
          ) : (
            <>
              <input
                list="maint-building-fallback"
                value={form.building || ""}
                onChange={e => set("building", e.target.value)}
                placeholder="Type building name or select General / Unassigned…"
                className={FIELD}
              />
              <datalist id="maint-building-fallback">
                <option value="General / Unassigned" />
              </datalist>
            </>
          )}
        </div>
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL}>Unit / Suite</label>
              <div className="flex gap-1 items-center">
                <input value={form.unit || ""} onChange={e => set("unit", e.target.value)} placeholder="301" className={FIELD + " flex-1 text-xs"} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Tenant</label>
              <div className="flex gap-1 items-center">
                <input value={form.tenant || ""} onChange={e => set("tenant", e.target.value)} placeholder="ABC Corp" className={FIELD + " flex-1 text-xs"} />
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className={LABEL}>Priority</label>
          <select value={form.priority || 3} onChange={e => set("priority", Number(e.target.value))} className={FIELD}>
            {[1, 2, 3, 4].map(p => (
              <option key={p} value={p} className="bg-[#0A0F1A]">{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Assigned To</label>
          <div className="flex gap-1.5 items-center"><input value={form.assignedTo || ""} onChange={e => set("assignedTo", e.target.value)}
            placeholder="Technician name" list="maint-staff-list" className={FIELD + " flex-1"} /><MicButton onResult={(t) => set("assignedTo", (form.assignedTo || "") + (form.assignedTo ? " " : "") + t)} /></div>
          <datalist id="maint-staff-list">
            {knownStaff.map(n => <option key={n} value={n} />)}
          </datalist>
        </div>
        <div>
          <label className={LABEL}>Reported By</label>
          <div className="flex gap-1.5 items-center"><input value={form.reportedBy || ""} onChange={e => set("reportedBy", e.target.value)} placeholder={currentUserName || "Your name"} className={FIELD + " flex-1"} /><MicButton onResult={(t) => set("reportedBy", (form.reportedBy || "") + (form.reportedBy ? " " : "") + t)} /></div>
        </div>
        <div>
          <label className={LABEL}>Status</label>
          <select
            value={form.status || "open"}
            onChange={e => {
              const nextStatus = e.target.value as Ticket["status"];
              const updates: Partial<Ticket> = { status: nextStatus };
              if (nextStatus === "complete" && !form.completedDate) {
                updates.completedDate = new Date().toISOString().split("T")[0];
              } else if (nextStatus !== "complete" && form.status === "complete") {
                updates.completedDate = null;
              }
              setForm(prev => ({ ...prev, ...updates }));
            }}
            className={FIELD}
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#0A0F1A]">{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Costs + Dates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={LABEL}>Est. Cost ($)</label>
          <input type="number" value={form.estimatedCost || ""} onChange={e => set("estimatedCost", Number(e.target.value))} placeholder="350" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Est. Hours</label>
          <input type="number" step="0.5" value={form.estimatedHours || ""} onChange={e => set("estimatedHours", Number(e.target.value))} placeholder="3" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Scheduled Date</label>
          <input type="date" value={form.scheduledDate || ""} onChange={e => set("scheduledDate", e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Completed Date</label>
          <input
            type="date"
            value={form.completedDate || ""}
            onChange={e => {
              const val = e.target.value;
              const updates: Partial<Ticket> = { completedDate: val || null };
              if (val && form.status !== "complete") {
                updates.status = "complete";
              } else if (!val && form.status === "complete") {
                updates.status = "open";
              }
              setForm(prev => ({ ...prev, ...updates }));
            }}
            className={FIELD}
          />
        </div>
      </div>

      {/* Billing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">💰 Billable Item?</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Toggle yes if tenant should be charged</p>
          </div>
          <button
            type="button"
            onClick={() => set("billable", !form.billable)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${form.billable ? "bg-[#4ADE80]" : "bg-[rgba(255,255,255,0.15)]"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-[#0D1117] transition-transform duration-200 ${form.billable ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>
        {form.billable && (
          <div>
            <label className={LABEL}>Material Cost ($)</label>
            <input type="number" value={form.materialAmount || ""} onChange={e => set("materialAmount", Number(e.target.value))} placeholder="150" className={FIELD} />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className={LABEL}>Notes / Resolution</label>
        <div className="flex gap-1.5 items-center"><textarea spellCheck={true} value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} className={FIELD + " text-xs py-1.5 resize-none flex-1"} placeholder="Parts needed, access details, resolution notes…" /><MicButton onResult={(t) => set("notes", (form.notes || "") + (form.notes ? " " : "") + t)} /></div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className={LABEL}>Photo / Attachment</label>
        {form.photoUrl ? (
          <div className="flex items-start gap-3">
            <a href={form.photoUrl} target="_blank" rel="noopener noreferrer" className="block flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.photoUrl} alt="Ticket photo" className="w-24 h-24 object-cover rounded-xl border border-[rgba(255,255,255,0.1)] hover:opacity-80 transition-opacity" />
            </a>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-gray-500">Photo attached — click to view full size</p>
              <button
                type="button"
                onClick={() => set("photoUrl", null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-red-400 border border-[rgba(239,68,68,0.25)] hover:bg-[rgba(239,68,68,0.08)] transition-colors w-fit"
              >
                <X size={11} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${photoUploading ? "border-[rgba(250,204,21,0.3)] bg-[rgba(250,204,21,0.04)]" : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(250,204,21,0.35)] hover:bg-[rgba(250,204,21,0.03)]"}`}>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={photoUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPhotoUploading(true);
                setPhotoError("");
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/maintenance/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  if (data.url) {
                    set("photoUrl", data.url);
                  } else {
                    setPhotoError("Upload failed — please try again.");
                  }
                } catch {
                  setPhotoError("Upload failed — please try again.");
                } finally {
                  setPhotoUploading(false);
                }
              }}
            />
            {photoUploading ? (
              <><Loader2 size={16} className="animate-spin text-[#FACC15]" /><span className="text-xs text-[#FACC15]">Uploading…</span></>
            ) : (
              <><Camera size={16} className="text-gray-500" /><span className="text-xs text-gray-500">Click to attach a photo</span></>
            )}
          </label>
        )}
        {photoError && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertTriangle size={10} />{photoError}</p>}
      </div>

      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={handleSave} disabled={saving || savingDraft || photoUploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-xs font-black hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? "Saving…" : form.status === "draft" ? "Publish Ticket" : "Save Ticket"}
        </button>
        <button onClick={handleSaveDraft} disabled={saving || savingDraft || photoUploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgba(167,139,250,0.4)] text-[#A78BFA] bg-[rgba(167,139,250,0.08)] text-xs font-bold hover:bg-[rgba(167,139,250,0.15)] transition-colors disabled:opacity-50">
          {savingDraft ? <Loader2 size={12} className="animate-spin" /> : <span className="text-sm leading-none">📝</span>}
          {savingDraft ? "Saving…" : "Save Draft"}
        </button>
        <button onClick={() => { clearLocalDraft(); onCancel(); }} className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors">Cancel</button>
        {form.status === "draft" && (
          <span className="text-[10px] text-gray-600 italic">Draft — click "Publish Ticket" when ready</span>
        )}
      </div>
    </div>
  );
}

// ─── Status Picker ─────────────────────────────────────────────────────────────

function StatusPicker({ ticket, onUpdate }: { ticket: Ticket; onUpdate: (id: string, patch: Partial<Ticket>) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

  const handleChange = async (newStatus: Ticket["status"]) => {
    if (newStatus === ticket.status) return;
    setLoading(true);
    const patch: Partial<Ticket> = { status: newStatus };
    if (newStatus === "complete") {
      patch.completedDate = new Date().toISOString().split("T")[0];
    } else if (ticket.status === "complete") {
      patch.completedDate = null;
    }
    await onUpdate(ticket.id, patch);
    setLoading(false);
  };

  return (
    <div className="relative inline-flex items-center">
      {loading ? (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
          style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
          <Loader2 size={11} className="animate-spin" /> {cfg.label}
        </span>
      ) : (
        <div className="relative flex items-center">
          <select
            value={ticket.status}
            onChange={(e) => handleChange(e.target.value as Ticket["status"])}
            className="cursor-pointer pl-3 pr-7 py-1.5 rounded-lg border text-xs font-bold outline-none transition-all hover:opacity-80 appearance-none bg-transparent"
            style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
          >
            <option value="open" className="bg-[#0D1117] text-gray-300">Open</option>
            <option value="scheduled" className="bg-[#0D1117] text-blue-400">Scheduled</option>
            <option value="in_progress" className="bg-[#0D1117] text-yellow-400">In Progress</option>
            <option value="complete" className="bg-[#0D1117] text-[#4ADE80]">✓ Completed</option>
            <option value="cancelled" className="bg-[#0D1117] text-gray-500">Cancelled</option>
          </select>
          <ChevronDown size={11} className="absolute right-2 pointer-events-none opacity-60" style={{ color: cfg.color }} />
        </div>
      )}
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, onEdit, onDelete, onUpdate, currentUserName }:
  { ticket: Ticket; onEdit: (t: Ticket) => void; onDelete: (id: string) => void; onUpdate: (id: string, patch: Partial<Ticket>) => Promise<void>; currentUserName?: string }) {
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [localNotes, setLocalNotes] = useState(ticket.notes || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setLocalNotes(ticket.notes || "");
  }, [ticket.notes]);

  const p = PRIORITY_CONFIG[ticket.priority];
  const isOverdue = ticket.scheduledDate && new Date(ticket.scheduledDate) < new Date() && ticket.status !== "complete" && ticket.status !== "cancelled";
  const noteLines = localNotes ? localNotes.split("\n").filter(Boolean).reverse() : [];

  const checkIsBreached = (t: Ticket) => {
    if (t.status === "complete" || t.status === "cancelled" || t.status === "draft") return false;
    if (t.priority === 4) return false;
    const created = new Date(t.createdAt).getTime();
    const limit = t.priority === 1 ? 2 * 3600000 // 2 hours
                : t.priority === 2 ? 24 * 3600000 // 24 hours
                : 7 * 24 * 3600000; // 7 days
    
    if (t.firstResponseAt) {
      const resp = new Date(t.firstResponseAt).getTime();
      return (resp - created) > limit;
    }
    if (t.status === "open") {
      return (Date.now() - created) > limit;
    }
    return false;
  };
  const isSlaBreached = checkIsBreached(ticket);

  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const author = currentUserName || "Staff";
    const newEntry = `[${timestamp} — ${author}] ${note.trim()}`;
    const updated = localNotes ? `${localNotes}\n${newEntry}` : newEntry;
    await onUpdate(ticket.id, { notes: updated });
    setLocalNotes(updated); setNote("");
    setSavingNote(false);
  };

  return (
    <div id={`ticket-card-${ticket.id}`}
      className={`glass rounded-2xl border transition-all p-5 ${
        ticket.status === "complete" ? "border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.02)] opacity-85"
        : ticket.status === "cancelled" ? "border-[rgba(107,114,128,0.2)] opacity-50"
        : isSlaBreached ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.07)] animate-pulse-subtle"
        : isOverdue ? "border-[rgba(239,68,68,0.3)]"
        : ticket.priority === 1 ? "border-[rgba(239,68,68,0.4)] shadow-[0_0_20px_rgba(239,68,68,0.07)]"
        : ticket.priority === 2 ? "border-[rgba(249,115,22,0.35)]"
        : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(250,204,21,0.2)]"
      }`}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Priority badge / Completion icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl border transition-all"
            style={{
              backgroundColor: ticket.status === "complete" ? "rgba(74,222,128,0.12)" : p.bg,
              borderColor: ticket.status === "complete" ? "rgba(74,222,128,0.35)" : p.border,
            }}>
            {ticket.status === "complete" ? <CheckCircle2 size={20} className="text-[#4ADE80]" /> : p.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h3 className={`font-bold text-sm ${ticket.status === "complete" ? "text-gray-300 line-through decoration-[rgba(74,222,128,0.4)]" : "text-white"}`}>{ticket.title}</h3>
              {ticket.status === "draft" && (
                <span className="text-[10px] font-black text-[#A78BFA] bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.35)] px-2 py-0.5 rounded-lg">📝 DRAFT</span>
              )}
              {ticket.status === "complete" && (
                <span className="text-[10px] font-black text-[#4ADE80] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <CheckCircle2 size={10} /> COMPLETED
                </span>
              )}
              {isSlaBreached && (
                <span className="text-[10px] font-black text-amber-400 bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.4)] px-2 py-0.5 rounded-lg animate-pulse flex items-center gap-1">
                  ⚠️ NEEDS ATTENTION
                </span>
              )}
              {isOverdue && !isSlaBreached && <span className="text-[10px] font-black text-red-400 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] px-2 py-0.5 rounded-lg">OVERDUE</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              <span className="font-mono">{[ticket.building, ticket.unit, ticket.tenant].filter(Boolean).join(" · ") || "Unassigned"}</span>
              <span className="flex items-center gap-1"><Clock size={9} /> {timeAgo(ticket.createdAt)}</span>
              {ticket.reportedBy && <span className="flex items-center gap-1"><User size={9} /> {ticket.reportedBy}</span>}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <StatusPicker ticket={ticket} onUpdate={onUpdate} />
          <button onClick={() => onEdit(ticket)} className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-[#FACC15] hover:border-[rgba(250,204,21,0.3)] transition-all"><Edit2 size={12} /></button>
          {confirmDelete ? (
            <div className="flex gap-1 items-center">
              <span className="text-[10px] text-red-400">Sure?</span>
              <button onClick={() => onDelete(ticket.id)} className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 text-[10px]">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-red-400 hover:border-[rgba(239,68,68,0.3)] transition-all"><Trash2 size={12} /></button>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-2.5 py-1 rounded-lg border font-semibold" style={{ color: p.color, backgroundColor: p.bg, borderColor: p.border }}>{p.label}</span>
        <span className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-gray-400">{ticket.category}</span>
        {ticket.assignedTo && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[rgba(96,165,250,0.07)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA]">
            <User size={9} /> {ticket.assignedTo}
          </span>
        )}
      </div>

      {/* Description */}
      {ticket.description && (
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{ticket.description}</p>
      )}

      {/* Photo */}
      {ticket.photoUrl && (
        <a href={ticket.photoUrl} target="_blank" rel="noopener noreferrer" className="block mb-3 w-fit group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ticket.photoUrl}
            alt="Ticket photo"
            className="h-32 w-auto max-w-full object-cover rounded-xl border border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(250,204,21,0.35)] group-hover:opacity-90 transition-all"
          />
          <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1"><Camera size={9} /> View full size</p>
        </a>
      )}

      {/* Financials grid */}
      {(ticket.estimatedCost > 0 || ticket.estimatedHours > 0 || ticket.scheduledDate) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {ticket.estimatedCost > 0 && (
            <div className="bg-[rgba(250,204,21,0.04)] rounded-xl p-2.5 border border-[rgba(250,204,21,0.1)]">
              <p className="text-[10px] text-gray-600 mb-0.5">Est. Cost</p>
              <p className="text-sm font-black text-[#FACC15]">${ticket.estimatedCost.toLocaleString()}</p>
            </div>
          )}
          {ticket.actualCost > 0 && (
            <div className="bg-[rgba(74,222,128,0.04)] rounded-xl p-2.5 border border-[rgba(74,222,128,0.1)]">
              <p className="text-[10px] text-gray-600 mb-0.5">Actual Cost</p>
              <p className="text-sm font-black text-[#4ADE80]">${ticket.actualCost.toLocaleString()}</p>
            </div>
          )}
          {ticket.estimatedHours > 0 && (
            <div className="bg-[rgba(96,165,250,0.04)] rounded-xl p-2.5 border border-[rgba(96,165,250,0.1)]">
              <p className="text-[10px] text-gray-600 mb-0.5">Est. Hours</p>
              <p className="text-sm font-black text-[#60A5FA]">{ticket.estimatedHours}h</p>
            </div>
          )}
          {ticket.scheduledDate && (
            <div className={`rounded-xl p-2.5 border ${isOverdue ? "bg-[rgba(239,68,68,0.07)] border-[rgba(239,68,68,0.2)]" : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]"}`}>
              <p className="text-[10px] text-gray-600 mb-0.5">Scheduled</p>
              <p className={`text-xs font-bold ${isOverdue ? "text-red-400" : "text-white"}`}>{fmtDate(ticket.scheduledDate)}</p>
            </div>
          )}
        </div>
      )}

      {/* Completed date */}
      {ticket.completedDate && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#4ADE80] mb-3">
          <CheckCircle2 size={11} />
          Completed {fmtDate(ticket.completedDate)}
        </div>
      )}

      {/* Activity thread */}
      <div className="border-t border-[rgba(255,255,255,0.05)] pt-3">
        <button onClick={() => setShowNotes(n => !n)}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all ${noteLines.length > 0 ? "text-[#FACC15]" : "text-gray-500 hover:text-[#FACC15]"}`}>
          <MessageSquare size={13} />
          Notes {noteLines.length > 0 ? `(${noteLines.length})` : ""}
          {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showNotes && (
          <div className="mt-3 space-y-2">
            {noteLines.map((line, i) => {
              const m = line.match(/^\[(.+?)\] (.+)$/);
              return (
                <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2">
                  {m && <p className="text-[10px] text-gray-600 mb-0.5">{m[1]}</p>}
                  <p className="text-xs text-gray-300">{m ? m[2] : line}</p>
                </div>
              );
            })}
            <div className="flex gap-2">
              <textarea spellCheck={true} value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(); } }}
                rows={2} placeholder="Add a note… (Enter to post)"
                className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[rgba(250,204,21,0.35)] outline-none placeholder:text-gray-700 resize-none transition-colors" />
              <button onClick={saveNote} disabled={savingNote || !note.trim()}
                className="px-3 py-1.5 rounded-lg bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] text-xs font-bold hover:bg-[rgba(250,204,21,0.2)] transition-colors disabled:opacity-40">
                {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main MaintenanceTab ──────────────────────────────────────────────────────

export default function MaintenanceTab({ currentUserName, currentUserEmail }: { currentUserName?: string; currentUserEmail?: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orgProperties, setOrgProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | Ticket["status"] | "billable_complete">("active");
  const [priorityFilter, setPriorityFilter] = useState<"all" | 1 | 2 | 3 | 4>("all");
  const [sortBy, setSortBy] = useState<"priority" | "date" | "building">("priority");
  const [searchQuery, setSearchQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [newPinInfo, setNewPinInfo] = useState<{ name: string; pin: string } | null>(null);
  const [filterChangesOpen, setFilterChangesOpen] = useState(false);
  const [buildingInspectionsOpen, setBuildingInspectionsOpen] = useState(false);
  const [subcontractorContactsOpen, setSubcontractorContactsOpen] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const [res, propRes] = await Promise.all([
        fetch("/api/maintenance"),
        fetch("/api/properties-list").catch(() => null),
      ]);
      if (propRes?.ok) {
        const pList = await propRes.json().catch(() => []);
        if (Array.isArray(pList)) {
          setOrgProperties(pList.map((p: { name?: string }) => p.name || "").filter(Boolean));
        }
      }
      const data = await res.json();
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets.map(rowToTicket));
        setSetupError(false);
      } else { setSetupError(true); }
    } catch { setSetupError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleSaveNew = async (form: Partial<Ticket>) => {
    const res = await fetch("/api/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description, building: form.building, unit: form.unit, tenant: form.tenant,
        category: form.category, priority: form.priority, status: form.status,
        assignedTo: form.assignedTo, reportedBy: form.reportedBy || currentUserName,
        estimatedCost: form.estimatedCost, estimatedHours: form.estimatedHours,
        scheduledDate: form.scheduledDate || null, completedDate: form.completedDate || null,
        notes: form.notes,
        billable: form.billable ?? false,
        materialAmount: form.materialAmount || 0,
        photoUrl: form.photoUrl || null,
        actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
        actorEmail: currentUserEmail || "",
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to submit ticket.");
    }
    // Auto-provision the assigned technician in allowed_users
    if (form.assignedTo?.trim()) {
      try {
        const staffRes = await fetch("/api/ensure-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.assignedTo.trim(), role: "maintenance" }),
        });
        const staffData = await staffRes.json();
        if (staffData.isNew && staffData.pin) {
          setNewPinInfo({ name: form.assignedTo.trim(), pin: staffData.pin });
        }
      } catch { /* non-critical */ }
    }
    setShowForm(false); await fetch_();
  };

  const handleSaveEdit = async (form: Partial<Ticket>) => {
    if (!editingTicket) return;
    const res = await fetch(`/api/maintenance?id=${editingTicket.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description, building: form.building, unit: form.unit, tenant: form.tenant,
        category: form.category, priority: form.priority, status: form.status,
        assignedTo: form.assignedTo, reportedBy: form.reportedBy,
        estimatedCost: form.estimatedCost, actualCost: form.actualCost,
        estimatedHours: form.estimatedHours,
        scheduledDate: form.scheduledDate || null, completedDate: form.completedDate || null,
        notes: form.notes,
        billable: form.billable,
        materialAmount: form.materialAmount,
        photoUrl: form.photoUrl ?? null,
        actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
        actorEmail: currentUserEmail || "",
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update ticket.");
    }
    setEditingTicket(null); await fetch_();
  };

  const handleSaveDraftNew = async (form: Partial<Ticket>) => {
    const res = await fetch("/api/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description, building: form.building, unit: form.unit, tenant: form.tenant,
        category: form.category, priority: form.priority, status: "draft",
        assignedTo: form.assignedTo, reportedBy: form.reportedBy || currentUserName,
        estimatedCost: form.estimatedCost, estimatedHours: form.estimatedHours,
        scheduledDate: form.scheduledDate || null, completedDate: form.completedDate || null,
        notes: form.notes,
        billable: form.billable ?? false,
        materialAmount: form.materialAmount || 0,
        photoUrl: form.photoUrl || null,
        actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
        actorEmail: currentUserEmail || "",
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to save draft.");
    }
    setShowForm(false); await fetch_();
  };

  const handleSaveDraftEdit = async (form: Partial<Ticket>) => {
    if (!editingTicket) return;
    const res = await fetch(`/api/maintenance?id=${editingTicket.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description, building: form.building, unit: form.unit, tenant: form.tenant,
        category: form.category, priority: form.priority, status: "draft",
        assignedTo: form.assignedTo, reportedBy: form.reportedBy,
        estimatedCost: form.estimatedCost, actualCost: form.actualCost,
        estimatedHours: form.estimatedHours,
        scheduledDate: form.scheduledDate || null, completedDate: form.completedDate || null,
        notes: form.notes,
        billable: form.billable,
        materialAmount: form.materialAmount,
        photoUrl: form.photoUrl ?? null,
        actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
        actorEmail: currentUserEmail || "",
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to save draft.");
    }
    setEditingTicket(null); await fetch_();
  };

  const handleUpdate = async (id: string, patch: Partial<Ticket>) => {
    await fetch(`/api/maintenance?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/maintenance?id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff", actorEmail: currentUserEmail || "" }),
    });
    if (!res.ok) {
      console.error("[MaintenanceTab] Delete failed:", await res.text());
      return;
    }
    // Re-fetch from DB to ensure admin view reflects true state
    await fetch_();
  };

  const handleSelectTicket = (t: Ticket) => {
    // If ticket is completed, switch to complete / all so it is visible
    const isDone = t.status === "complete" || !!t.completedDate;
    if (isDone) {
      setStatusFilter("all");
    } else if (statusFilter !== "all" && statusFilter !== "active" && statusFilter !== t.status) {
      setStatusFilter("active");
    }
    if (priorityFilter !== "all" && priorityFilter !== t.priority) {
      setPriorityFilter("all");
    }
    if (buildingFilter !== "all" && buildingFilter !== t.building) {
      setBuildingFilter("all");
    }
    if (assignedFilter !== "all" && assignedFilter !== t.assignedTo) {
      setAssignedFilter("all");
    }
    setSearchQuery("");

    setTimeout(() => {
      const el = document.getElementById(`ticket-card-${t.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-4", "ring-[#FACC15]", "shadow-[0_0_30px_rgba(250,204,21,0.5)]");
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-[#FACC15]", "shadow-[0_0_30px_rgba(250,204,21,0.5)]");
        }, 2500);
      }
    }, 120);
  };

  // Unique values for dropdowns — derived from org properties + all tickets
  const uniqueBuildings = Array.from(new Set([...orgProperties, ...tickets.map(t => t.building).filter(Boolean)])).sort();
  const uniqueAssigned  = Array.from(new Set(tickets.map(t => t.assignedTo).filter(Boolean))).sort();

  const q = searchQuery.trim().toLowerCase();

  const displayed = tickets
    .filter(t => {
      const isComplete = t.status === "complete" || !!t.completedDate;
      if (statusFilter === "active") return !isComplete && t.status !== "cancelled" && t.status !== "draft";
      if (statusFilter === "all") return t.status !== "draft";
      if (statusFilter === "open") return t.status === "open" && !t.completedDate;
      if (statusFilter === "scheduled") return t.status === "scheduled" && !t.completedDate;
      if (statusFilter === "in_progress") return t.status === "in_progress" && !t.completedDate;
      if (statusFilter === "complete") return isComplete && !t.billable;
      if (statusFilter === "billable_complete") return isComplete && !!t.billable;
      return t.status === statusFilter;
    })
    .filter(t => priorityFilter === "all" || t.priority === priorityFilter)
    .filter(t => buildingFilter === "all" || t.building === buildingFilter)
    .filter(t => assignedFilter === "all" || t.assignedTo === assignedFilter)
    .filter(t => {
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.building.toLowerCase().includes(q) ||
        t.tenant.toLowerCase().includes(q) ||
        t.assignedTo.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Completed and cancelled tickets sink to the bottom
      const aDone = a.status === "complete" || a.status === "cancelled" || !!a.completedDate;
      const bDone = b.status === "complete" || b.status === "cancelled" || !!b.completedDate;
      if (aDone !== bDone) return aDone ? 1 : -1;

      if (sortBy === "priority") return a.priority !== b.priority ? a.priority - b.priority : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "building") return a.building.localeCompare(b.building);
      return 0;
    });

  return (
    <div className="mt-6">
      <SummaryBanner tickets={tickets} onSelectTicket={handleSelectTicket} />

      {/* ═══ Filter Changes — collapsible panel ═══ */}
      <div className="mb-6 mt-4">
        <button
          onClick={() => setFilterChangesOpen(prev => !prev)}
          className={`w-full group flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 ${
            filterChangesOpen
              ? "bg-[rgba(250,204,21,0.06)] border-[rgba(250,204,21,0.25)]"
              : "bg-[rgba(250,204,21,0.03)] border-[rgba(250,204,21,0.12)] hover:border-[rgba(250,204,21,0.3)] hover:bg-[rgba(250,204,21,0.06)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                filterChangesOpen ? "shadow-lg" : "group-hover:shadow-md"
              }`}
              style={{
                background: "linear-gradient(135deg, rgba(250,204,21,0.2), rgba(249,115,22,0.15))",
                border: "1px solid rgba(250,204,21,0.35)",
                boxShadow: filterChangesOpen ? "0 0 20px rgba(250,204,21,0.2)" : undefined,
              }}
            >
              <Sparkles size={18} className="text-[#FACC15]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-white">Filter Changes Ledger</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">HVAC filter replacements</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-bold text-[#FACC15]/60 uppercase tracking-widest">
              {filterChangesOpen ? "Collapse" : "Open"}
            </span>
            <ChevronDown
              size={16}
              className={`text-[#FACC15] transition-transform duration-300 ${
                filterChangesOpen ? "rotate-180" : "group-hover:translate-y-0.5"
              }`}
            />
          </div>
        </button>

        {filterChangesOpen && (
          <div className="mt-2" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
            <FilterChangesTab currentUserName={currentUserName} />
          </div>
        )}
      </div>

      {/* ═══ Building Inspections — collapsible panel ═══ */}
      <div className="mb-6">
        <button
          onClick={() => setBuildingInspectionsOpen(prev => !prev)}
          className={`w-full group flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 ${
            buildingInspectionsOpen
              ? "bg-[rgba(96,165,250,0.06)] border-[rgba(96,165,250,0.25)]"
              : "bg-[rgba(96,165,250,0.03)] border-[rgba(96,165,250,0.12)] hover:border-[rgba(96,165,250,0.3)] hover:bg-[rgba(96,165,250,0.06)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                buildingInspectionsOpen ? "shadow-lg" : "group-hover:shadow-md"
              }`}
              style={{
                background: "linear-gradient(135deg, rgba(96,165,250,0.2), rgba(37,99,235,0.15))",
                border: "1px solid rgba(96,165,250,0.35)",
                boxShadow: buildingInspectionsOpen ? "0 0 20px rgba(96,165,250,0.2)" : undefined,
              }}
            >
              <ShieldAlert size={18} className="text-[#60A5FA]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-white">Building Inspections Ledger</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Fire, HVAC, Sprinkler, Security Logs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-bold text-[#60A5FA]/60 uppercase tracking-widest">
              {buildingInspectionsOpen ? "Collapse" : "Open"}
            </span>
            <ChevronDown
              size={16}
              className={`text-[#60A5FA] transition-transform duration-300 ${
                buildingInspectionsOpen ? "rotate-180" : "group-hover:translate-y-0.5"
              }`}
            />
          </div>
        </button>

        {buildingInspectionsOpen && (
          <div className="mt-2" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
            <BuildingInspectionsTab currentUserName={currentUserName} />
          </div>
        )}
      </div>

      {/* ═══ Subcontractor Contacts — collapsible panel ═══ */}
      <div className="mb-6">
        <button
          onClick={() => setSubcontractorContactsOpen(prev => !prev)}
          className={`w-full group flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 ${
            subcontractorContactsOpen
              ? "bg-[rgba(192,132,252,0.06)] border-[rgba(192,132,252,0.25)]"
              : "bg-[rgba(192,132,252,0.03)] border-[rgba(192,132,252,0.12)] hover:border-[rgba(192,132,252,0.3)] hover:bg-[rgba(192,132,252,0.06)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                subcontractorContactsOpen ? "shadow-lg" : "group-hover:shadow-md"
              }`}
              style={{
                background: "linear-gradient(135deg, rgba(192,132,252,0.2), rgba(168,85,247,0.15))",
                border: "1px solid rgba(192,132,252,0.35)",
                boxShadow: subcontractorContactsOpen ? "0 0 20px rgba(192,132,252,0.2)" : undefined,
              }}
            >
              <Users size={18} className="text-[#C084FC]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-white">Subcontractor Contacts</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Electrical, Plumbing, HVAC, Painting & More</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-bold text-[#C084FC]/60 uppercase tracking-widest">
              {subcontractorContactsOpen ? "Collapse" : "Open"}
            </span>
            <ChevronDown
              size={16}
              className={`text-[#C084FC] transition-transform duration-300 ${
                subcontractorContactsOpen ? "rotate-180" : "group-hover:translate-y-0.5"
              }`}
            />
          </div>
        </button>

        {subcontractorContactsOpen && (
          <div className="mt-2" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
            <SubcontractorContactsTab currentUserName={currentUserName} />
          </div>
        )}
      </div>

      {newPinInfo && (
        <div className="flex items-start gap-3 mb-4 p-3 rounded-xl bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.3)]">
          <span className="text-lg leading-none">🔐</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-[#FACC15]">New staff portal access created for {newPinInfo.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              PIN: <span className="font-mono font-black text-white tracking-widest">{newPinInfo.pin}</span>
              <span className="text-gray-600 ml-2">— share this with them to log into the staff portal</span>
            </p>
          </div>
          <button onClick={() => setNewPinInfo(null)} className="text-gray-600 hover:text-white transition-colors flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Setup error */}
      {setupError && !loading && (
        <div className="mb-6 p-4 rounded-xl border border-[rgba(250,204,21,0.3)] bg-[rgba(250,204,21,0.05)]">
          <p className="text-xs font-bold text-[#FACC15] mb-2 flex items-center gap-1.5"><AlertTriangle size={12} />Database table not found — one-time setup required</p>
          <p className="text-xs text-gray-400 mb-2">Run this SQL in your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#4ADE80] underline">Supabase SQL Editor</a>, then click Refresh:</p>
          <pre className="text-[10px] text-gray-300 bg-[rgba(0,0,0,0.4)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  building TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  tenant TEXT DEFAULT '',
  category TEXT DEFAULT 'Other',
  priority INTEGER DEFAULT 3,
  status TEXT DEFAULT 'open',
  assigned_to TEXT DEFAULT '',
  reported_by TEXT DEFAULT '',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  estimated_hours NUMERIC DEFAULT 0,
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT DEFAULT '',
  parts_needed BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'admin',
  first_response_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;`}</pre>
        </div>
      )}

      {/* ─── Search bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, building, tenant, assigned to…"
            className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-gray-600 focus:border-[rgba(250,204,21,0.4)] outline-none transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <select
          value={buildingFilter}
          onChange={e => setBuildingFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-gray-300 outline-none focus:border-[rgba(250,204,21,0.4)] transition-colors min-w-[140px]"
        >
          <option value="all">All Buildings</option>
          {uniqueBuildings.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={assignedFilter}
          onChange={e => setAssignedFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-gray-300 outline-none focus:border-[rgba(250,204,21,0.4)] transition-colors min-w-[140px]"
        >
          <option value="all">All Assigned To</option>
          {uniqueAssigned.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(searchQuery || buildingFilter !== "all" || assignedFilter !== "all") && (
          <button
            onClick={() => { setSearchQuery(""); setBuildingFilter("all"); setAssignedFilter("all"); }}
            className="px-3 py-2 rounded-xl text-xs border border-[rgba(239,68,68,0.25)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {/* Status filters */}
          {(["active", "open", "scheduled", "in_progress", "complete", "billable_complete", "draft", "all"] as const).map(s => {
            const activeCount = tickets.filter(t => t.status !== "complete" && t.status !== "cancelled" && t.status !== "draft" && !t.completedDate).length;
            const draftCount = tickets.filter(t => t.status === "draft").length;
            const openCount = tickets.filter(t => t.status === "open" && !t.completedDate).length;
            const schedCount = tickets.filter(t => t.status === "scheduled" && !t.completedDate).length;
            const inProgCount = tickets.filter(t => t.status === "in_progress" && !t.completedDate).length;
            const compCount = tickets.filter(t => (t.status === "complete" || !!t.completedDate) && !t.billable).length;
            const billCompCount = tickets.filter(t => (t.status === "complete" || !!t.completedDate) && t.billable).length;
            const allCount = tickets.filter(t => t.status !== "draft").length;

            const count = s === "active" ? activeCount
                        : s === "open" ? openCount
                        : s === "scheduled" ? schedCount
                        : s === "in_progress" ? inProgCount
                        : s === "complete" ? compCount
                        : s === "billable_complete" ? billCompCount
                        : s === "draft" ? draftCount
                        : allCount;

            const label = s === "active" ? `Active (${count})`
                        : s === "open" ? `Open (${count})`
                        : s === "scheduled" ? `Scheduled (${count})`
                        : s === "in_progress" ? `In Progress (${count})`
                        : s === "complete" ? `Completed (${count})`
                        : s === "billable_complete" ? `Billable Completed (${count})`
                        : s === "draft" ? `📝 Drafts (${count})`
                        : `All (${count})`;

            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  s === "draft" && statusFilter === s ? "bg-[rgba(167,139,250,0.15)] border-[rgba(167,139,250,0.5)] text-[#A78BFA]" :
                  s === "draft" ? "border-[rgba(167,139,250,0.25)] text-[#A78BFA] hover:bg-[rgba(167,139,250,0.08)]" :
                  statusFilter === s ? "bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.35)] text-[#FACC15]" : "border-[rgba(255,255,255,0.07)] text-gray-500 hover:text-gray-300"
                }`}>
                {label}
              </button>
            );
          })}
          {/* Priority quick filter */}
          {([1,2,3,4] as const).map(p => (
            <button key={p} onClick={() => setPriorityFilter(prev => prev === p ? "all" : p)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${priorityFilter === p ? "bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.2)] text-white" : "border-[rgba(255,255,255,0.06)] text-gray-600 hover:text-gray-400"}`}>
              {PRIORITY_CONFIG[p].icon} {p}
            </button>
          ))}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 rounded-xl text-xs border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-gray-400 outline-none">
            <option value="priority">Sort: Priority</option>
            <option value="date">Sort: Newest</option>
            <option value="building">Sort: Building</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetch_} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(250,204,21,0.06)] border border-[rgba(250,204,21,0.2)] text-[#FACC15] text-xs hover:bg-[rgba(250,204,21,0.12)] transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <PrintButton zoneId="print-maintenance" label="Print / PDF" title="Maintenance Work Orders" />
          <button onClick={() => { setEditingTicket(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-xs font-black hover:opacity-90 transition-opacity">
            <Plus size={13} /> New Ticket
          </button>
        </div>
      </div>

      {/* Forms */}
      {showForm && !editingTicket && <TicketForm initial={BLANK_TICKET()} onSave={handleSaveNew} onSaveDraft={handleSaveDraftNew} onCancel={() => setShowForm(false)} currentUserName={currentUserName} buildings={uniqueBuildings} />}
      {editingTicket && <TicketForm initial={editingTicket} onSave={handleSaveEdit} onSaveDraft={handleSaveDraftEdit} onCancel={() => setEditingTicket(null)} currentUserName={currentUserName} buildings={uniqueBuildings} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[#FACC15]" />
          <span className="ml-2 text-sm text-gray-500">Loading tickets…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !setupError && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wrench size={36} className="text-gray-700 mb-3" />
          <p className="text-gray-500 font-bold">{tickets.length === 0 ? "No tickets yet" : "No tickets match your filters"}</p>
          <p className="text-xs text-gray-600 mt-1 mb-4">{tickets.length === 0 ? "Create your first work order to start tracking maintenance." : "Try clearing the filters."}</p>
          {tickets.length === 0 && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-sm font-black hover:opacity-90 transition-opacity">
              <Plus size={14} /> Create First Ticket
            </button>
          )}
        </div>
      )}

      {/* Ticket cards — wrapped in print zone */}
      <div id="print-maintenance" className="space-y-4">
        {/* Print-only summary header */}
        <div className="print-only" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #ccc", fontSize: 12 }}>
          Filters: Status = {statusFilter} · Priority = {priorityFilter === "all" ? "All" : `CAT ${priorityFilter}`} · Showing {displayed.length} of {tickets.length} tickets
        </div>
        {displayed.map((t, idx) => {
          const isFirstDone = (t.status === "complete" || t.status === "cancelled") &&
            idx > 0 &&
            !(displayed[idx - 1].status === "complete" || displayed[idx - 1].status === "cancelled");

          return (
            <React.Fragment key={t.id}>
              {isFirstDone && (
                <div className="pt-6 pb-2 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400">
                    <CheckCircle2 size={15} className="text-[#4ADE80]" />
                    Completed & Resolved Work Orders
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {displayed.filter(item => item.status === "complete" || item.status === "cancelled").length} finished
                  </span>
                </div>
              )}
              <TicketCard ticket={t}
                onEdit={t => { setEditingTicket(t); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                currentUserName={currentUserName}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
