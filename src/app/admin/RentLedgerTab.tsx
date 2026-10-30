"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  DollarSign, Calendar, CheckCircle2, XCircle, Download,
  Printer, ChevronDown, ChevronUp, Loader2, Send, Clock,
  FileSpreadsheet, History, ArrowLeft, Building2, AlertTriangle,
  CreditCard, Banknote, Landmark, StickyNote, RefreshCw, Trash2,
  Bell, Receipt, Mail, Phone, Settings, Check, Copy,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaymentInstructions {
  zelle: string;
  venmo: string;
  cashApp: string;
  checkPayableTo: string;
  checkAddress: string;
  customNote: string;
}

const DEFAULT_INSTRUCTIONS: PaymentInstructions = {
  zelle: "",
  venmo: "",
  cashApp: "",
  checkPayableTo: "",
  checkAddress: "",
  customNote: "",
};

interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  building: string;
  unit: string;
  month: string;
  rentDue: number;
  amountPaid: number;
  paid: boolean;
  paymentType: string;      // "Check" | "Zelle" | "Venmo" | "Cash" | "ACH" | "Cash App" | "Wire" | "Money Order" | "Card" | ""
  paymentDate: string | null;
  lateFee: number;
  nnFee: number;
  nnnFee: number;
  utilityFee: number;
  cleaningFee: number;
  camFee: number;
  notes: string;
  isSubmitted: boolean;
  submittedAt: string | null;
  submittedBy: string;
}

interface MonthSummary {
  month: string;
  submittedAt: string;
  submittedBy: string;
  tenantCount: number;
  totalDue: number;
  totalPaid: number;
  totalLateFees: number;
  rows: Array<Record<string, unknown>>;
}

interface TenantInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  building: string;
  unit: string;
  monthlyRent: number;
  nnFee: number;
  nnnFee: number;
  utilityFee: number;
  cleaningFee: number;
  camFee: number;
  status: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function rowToPayment(r: Record<string, unknown>): RentPayment {
  return {
    id: r.id as string,
    tenantId: (r.tenant_id as string) || "",
    tenantName: (r.tenant_name as string) || "",
    building: (r.building as string) || "",
    unit: (r.unit as string) || "",
    month: (r.month as string) || "",
    rentDue: Number(r.rent_due) || 0,
    amountPaid: Number(r.amount_paid) || 0,
    paid: Boolean(r.paid),
    paymentType: (r.payment_type as string) || "",
    paymentDate: (r.payment_date as string) || null,
    lateFee: Number(r.late_fee) || 0,
    nnFee: Number(r.nn_fee) || 0,
    nnnFee: Number(r.nnn_fee) || 0,
    utilityFee: Number(r.utility_fee) || 0,
    cleaningFee: Number(r.cleaning_fee) || 0,
    camFee: Number(r.cam_fee) || 0,
    notes: (r.notes as string) || "",
    isSubmitted: Boolean(r.is_submitted),
    submittedAt: (r.submitted_at as string) || null,
    submittedBy: (r.submitted_by as string) || "",
  };
}

function fmtMoney(n: number): string {
  // Show cents only when they exist (e.g. $179.95 or $179.50); display whole dollars cleanly otherwise
  const hasDecimals = n % 1 !== 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function fmtMonthFull(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  // 6 months back + 3 months forward
  for (let offset = -6; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: val, label: fmtMonthFull(val) });
  }
  return options;
}

export const PAYMENT_TYPES = [
  "Check",
  "Zelle",
  "Venmo",
  "Cash",
  "ACH",
  "Cash App",
  "Wire",
  "Money Order",
  "Card",
] as const;

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatInstructionsText(inst: PaymentInstructions): string {
  const parts: string[] = [];
  if (inst.zelle.trim()) parts.push(`Zelle: ${inst.zelle.trim()}`);
  if (inst.venmo.trim()) parts.push(`Venmo: ${inst.venmo.trim()}`);
  if (inst.cashApp.trim()) parts.push(`Cash App: ${inst.cashApp.trim()}`);
  if (inst.checkPayableTo.trim() || inst.checkAddress.trim()) {
    const checkStr = [
      inst.checkPayableTo.trim() ? `Checks payable to ${inst.checkPayableTo.trim()}` : "Check",
      inst.checkAddress.trim() ? `(${inst.checkAddress.trim()})` : "",
    ].filter(Boolean).join(" ");
    parts.push(checkStr);
  }
  if (inst.customNote.trim()) parts.push(inst.customNote.trim());
  return parts.length > 0 ? `Payment options — ${parts.join(" · ")}` : "";
}

export function printRentReceipt(params: {
  tenantName: string;
  building: string;
  unit: string;
  monthLabel: string;
  amountPaid: number;
  paymentType: string;
  paymentDate: string | null;
  notes?: string;
}) {
  const dateFormatted = params.paymentDate
    ? new Date(params.paymentDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const win = window.open("", "_blank", "width=680,height=640");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Rent Receipt — ${params.tenantName} (${params.monthLabel})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 40px; max-width: 580px; margin: 0 auto; }
    .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 32px; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px; }
    h1 { margin: 0 0 4px 0; font-size: 22px; font-weight: 900; }
    .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
    .amount-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .amount-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; font-weight: 700; }
    .amount-val { font-size: 28px; font-weight: 900; color: #059669; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .row strong { color: #0f172a; }
    .row span { color: #64748b; }
    .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓ Paid in Full</div>
    <h1>Official Rent Receipt</h1>
    <div class="sub">Billing Period: ${params.monthLabel}</div>
    <div class="amount-box">
      <div class="amount-label">Amount Received</div>
      <div class="amount-val">${fmtMoney(params.amountPaid)}</div>
    </div>
    <div class="row"><span>Tenant</span><strong>${params.tenantName}</strong></div>
    <div class="row"><span>Property / Unit</span><strong>${params.building}${params.unit ? " · Unit " + params.unit : ""}</strong></div>
    <div class="row"><span>Payment Method</span><strong>${params.paymentType || "Recorded Payment"}</strong></div>
    <div class="row"><span>Date Received</span><strong>${dateFormatted}</strong></div>
    ${params.notes ? `<div class="row"><span>Reference / Memo</span><strong>${params.notes}</strong></div>` : ""}
    <div class="row"><span>Remaining Balance (${params.monthLabel})</span><strong style="color:#059669">$0.00</strong></div>
    <div class="footer">Generated via PropOpsIQ Property Operations Platform · ${new Date().toLocaleDateString()}</div>
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
  win.document.close();
}

// ─── Style constants (consistent with TenantsTab) ───────────────────────────
const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-600 transition-all";
const FIELD_SM = FIELD + " text-xs py-1.5";
const FEE_INPUT = "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1 text-xs text-white focus:border-blue-400/60 focus:shadow-[0_0_8px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-700 w-16 tabular-nums text-center transition-all";
const TH_CLASS = "text-left text-[10px] font-black text-gray-500 uppercase tracking-tight px-3 py-3 whitespace-nowrap";
const TD_CLASS = "px-3 py-3 transition-all duration-150";

// ─── Summary Card ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div
      className="relative rounded-2xl p-4 sm:p-5 overflow-hidden border border-white/10 transition-all duration-300 shadow-[0_0_20px_rgba(56,189,248,0.06)] hover:border-white/20"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.03), ${color}06)`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl sm:text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
          {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function RentLedgerTab({ currentUserName, currentUserEmail }: {
  currentUserName?: string; currentUserEmail?: string;
}) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<"entry" | "history">("entry");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [history, setHistory] = useState<MonthSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [migrationSql, setMigrationSql] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  // Payment instructions (Zelle / Venmo / Cash App / Check drop-off)
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState<PaymentInstructions>(DEFAULT_INSTRUCTIONS);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [instructionsSaved, setInstructionsSaved] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // Track pending saves to avoid racing
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const savePatches = useRef<Record<string, Record<string, unknown>>>({});

  // ─── Load saved payment instructions ───────────────────────────────────
  useEffect(() => {
    try {
      const cached = localStorage.getItem("oiq_payment_instructions");
      if (cached) setInstructions({ ...DEFAULT_INSTRUCTIONS, ...JSON.parse(cached) });
    } catch { /* ignore */ }
    fetch("/api/site-content")
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data?.items) ? data.items : [];
        const match = items.find((it: { section: string; key: string; value: string }) => it.section === "rent_ledger" && it.key === "payment_instructions");
        if (match?.value) {
          const parsed = typeof match.value === "string" ? JSON.parse(match.value) : match.value;
          setInstructions({ ...DEFAULT_INSTRUCTIONS, ...parsed });
          try { localStorage.setItem("oiq_payment_instructions", JSON.stringify(parsed)); } catch { /* ignore */ }
        }
      })
      .catch(() => {});
  }, []);

  const savePaymentInstructions = async () => {
    setSavingInstructions(true);
    try {
      try { localStorage.setItem("oiq_payment_instructions", JSON.stringify(instructions)); } catch { /* ignore */ }
      await fetch("/api/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "rent_ledger",
          key: "payment_instructions",
          value: JSON.stringify(instructions),
        }),
      });
      setInstructionsSaved(true);
      setTimeout(() => setInstructionsSaved(false), 2500);
    } catch {
      /* ignore */
    } finally {
      setSavingInstructions(false);
    }
  };

  // ─── Fetch tenants for auto-population ──────────────────────────────────
  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (Array.isArray(data.tenants)) {
        setTenants(data.tenants.filter((t: Record<string, unknown>) => t.status === "active").map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: (t.name as string) || "",
          email: (t.email as string) || "",
          phone: (t.phone as string) || "",
          building: (t.building as string) || "",
          unit: (t.unit as string) || "",
          monthlyRent: Number(t.monthly_rent) || 0,
          nnFee: Number(t.nn_fee) || 0,
          nnnFee: Number(t.nnn_fee) || 0,
          utilityFee: Number(t.utilities_fee) || 0,
          cleaningFee: Number(t.cleaning_fee) || 0,
          camFee: Number(t.cam_fee) || 0,
          status: (t.status as string) || "active",
        })));
      }
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
    }
  }, []);

  // ─── Fetch payments for a month ─────────────────────────────────────────
  const fetchPayments = useCallback(async (month: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rent-payments?month=${encodeURIComponent(month)}`);
      const data = await res.json();
      if (data.migrationSql) {
        setMigrationSql(data.migrationSql);
        setPayments([]);
      } else if (Array.isArray(data.payments)) {
        setMigrationSql(null);
        setPayments(data.payments.map(rowToPayment));
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch history ──────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/rent-payments?history=true");
      const data = await res.json();
      setHistory(data.months || []);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);
  useEffect(() => { if (view === "entry") fetchPayments(selectedMonth); }, [selectedMonth, view, fetchPayments]);
  useEffect(() => { if (view === "history") fetchHistory(); }, [view, fetchHistory]);

  // Refresh ledger immediately when a payment is logged from a TenantCard's "$ Log Rent" button
  useEffect(() => {
    const onPaymentLogged = (e: Event) => {
      const detail = (e as CustomEvent<{ month?: string }>).detail;
      const targetMonth = detail?.month || selectedMonth;
      if (targetMonth === selectedMonth) {
        fetchPayments(selectedMonth);
      }
    };
    window.addEventListener("oiq-rent-payment-logged", onPaymentLogged);
    return () => window.removeEventListener("oiq-rent-payment-logged", onPaymentLogged);
  }, [selectedMonth, fetchPayments]);

  // Auto-sync fees from tenant cards when payments load (fixes stale fee data)
  useEffect(() => {
    if (tenants.length === 0 || payments.length === 0) return;
    // Only sync non-submitted payments
    const drafts = payments.filter(p => !p.isSubmitted);
    if (drafts.length === 0) return;

    let changed = false;
    const updated = payments.map(p => {
      if (p.isSubmitted) return p;
      const t = tenants.find(tx => tx.id === p.tenantId);
      if (!t) return p;

      const newNn = Math.round((t.nnFee || 0) * 100) / 100;
      const newNnn = Math.round((t.nnnFee || 0) * 100) / 100;
      const newUtil = Math.round((t.utilityFee || 0) * 100) / 100;
      const newClean = Math.round((t.cleaningFee || 0) * 100) / 100;
      const newCam = Math.round((t.camFee || 0) * 100) / 100;

      if (p.nnFee === newNn && p.nnnFee === newNnn && p.utilityFee === newUtil && p.cleaningFee === newClean && p.camFee === newCam) {
        return p;
      }

      changed = true;
      const synced = { ...p, nnFee: newNn, nnnFee: newNnn, utilityFee: newUtil, cleaningFee: newClean, camFee: newCam };
      // Recalculate total if it was previously auto-calculated (amountPaid equals sum of old fees)
      const oldTotal = p.rentDue + p.nnFee + p.nnnFee + p.utilityFee + p.cleaningFee + p.camFee;
      if (p.amountPaid === oldTotal || p.amountPaid === 0) {
        synced.amountPaid = synced.rentDue + synced.nnFee + synced.nnnFee + synced.utilityFee + synced.cleaningFee + synced.camFee;
        synced.paid = synced.amountPaid >= synced.rentDue && synced.rentDue > 0;
      }
      return synced;
    });

    if (changed) {
      setPayments(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenants, payments.length]);

  // ─── Generate rows for the selected month ───────────────────────────────
  const generateRows = async () => {
    if (tenants.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/rent-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          tenants: tenants.map(t => ({
            id: t.id,
            name: t.name,
            building: t.building,
            unit: t.unit,
            monthlyRent: t.monthlyRent,
            nnFee: t.nnFee,
            nnnFee: t.nnnFee,
            utilityFee: t.utilityFee,
            cleaningFee: t.cleaningFee,
            camFee: t.camFee,
          })),
          actorEmail: currentUserEmail,
          actorName: currentUserName,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.payments)) {
        setPayments(data.payments.map(rowToPayment));
      }
    } catch (err) {
      console.error("Generate failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Auto-save individual field (debounced + batch merged) ──────────────
  const saveField = useCallback((paymentId: string, field: string, value: unknown) => {
    if (!savePatches.current[paymentId]) {
      savePatches.current[paymentId] = {};
    }
    savePatches.current[paymentId][field] = value;

    if (saveTimeouts.current[paymentId]) {
      clearTimeout(saveTimeouts.current[paymentId]);
    }

    saveTimeouts.current[paymentId] = setTimeout(async () => {
      const patch = savePatches.current[paymentId];
      delete savePatches.current[paymentId];
      delete saveTimeouts.current[paymentId];
      if (!patch) return;

      try {
        await fetch(`/api/rent-payments?id=${encodeURIComponent(paymentId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 400);
  }, []);

  // ─── Update local state + trigger auto-save ─────────────────────────────
  const updatePayment = useCallback((id: string, field: keyof RentPayment, value: unknown) => {
    let updatedPaidVal: boolean | null = null;
    let updatedAmtPaidVal: number | null = null;
    let updatedDateVal: string | null = null;

    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      const fullObligation = (updated.rentDue || 0) + (updated.nnFee || 0) + (updated.nnnFee || 0) + (updated.utilityFee || 0) + (updated.cleaningFee || 0) + (updated.camFee || 0) + (updated.lateFee || 0);
      
      // Auto-calculate amountPaid if any fee or rentDue changed
      if (["rentDue", "nnFee", "nnnFee", "utilityFee", "cleaningFee", "camFee"].includes(field as string)) {
        updated.amountPaid = (updated.rentDue || 0) + (updated.nnFee || 0) + (updated.nnnFee || 0) + (updated.utilityFee || 0) + (updated.cleaningFee || 0) + (updated.camFee || 0);
        updated.paid = updated.amountPaid >= updated.rentDue && updated.rentDue > 0;
      }
      
      // Auto-mark paid if amountPaid >= rentDue
      if (field === "amountPaid") {
        updated.paid = Number(value) >= p.rentDue && p.rentDue > 0;
        if (updated.paid && !p.paymentDate) {
          updated.paymentDate = getTodayISO();
        }
      }
      // 1-Click Mark Paid: auto-fill amountPaid to total due (rent + fees) and paymentDate to Today
      if (field === "paid" && value === true) {
        if (p.amountPaid === 0) {
          updated.amountPaid = fullObligation;
        }
        if (!p.paymentDate) {
          updated.paymentDate = getTodayISO();
        }
      }
      // 1-Click Method Selection: picking Check, Zelle, Venmo, Cash, etc. on an unpaid row auto-marks Paid + fills amount & Today's date
      if (field === "paymentType" && typeof value === "string" && value !== "" && !p.paid) {
        updated.paid = true;
        if (p.amountPaid === 0) {
          updated.amountPaid = fullObligation;
        }
        if (!p.paymentDate) {
          updated.paymentDate = getTodayISO();
        }
      }
      
      updatedPaidVal = updated.paid;
      updatedAmtPaidVal = updated.amountPaid;
      updatedDateVal = updated.paymentDate;
      return updated;
    }));

    // Map field names to API names
    const apiFieldMap: Record<string, string> = {
      amountPaid: "amountPaid",
      paid: "paid",
      paymentType: "paymentType",
      paymentDate: "paymentDate",
      lateFee: "lateFee",
      nnFee: "nnFee",
      nnnFee: "nnnFee",
      utilityFee: "utilityFee",
      cleaningFee: "cleaningFee",
      camFee: "camFee",
      notes: "notes",
      rentDue: "rentDue",
    };

    if (apiFieldMap[field]) {
      saveField(id, apiFieldMap[field], value);
    }

    // Check if auto-calculated fields changed and need to be saved
    const p = payments.find(px => px.id === id);
    if (p) {
      if (updatedPaidVal !== null && updatedPaidVal !== p.paid) {
        saveField(id, "paid", updatedPaidVal);
      }
      if (updatedAmtPaidVal !== null && updatedAmtPaidVal !== p.amountPaid) {
        saveField(id, "amountPaid", updatedAmtPaidVal);
      }
      if (updatedDateVal !== null && updatedDateVal !== p.paymentDate) {
        saveField(id, "paymentDate", updatedDateVal);
      }
    }
  }, [payments, saveField]);

  // ─── Sync fees from tenant card ─────────────────────────────────────────
  const syncFees = useCallback(async (paymentId: string, tenantId: string) => {
    const t = tenants.find(tx => tx.id === tenantId);
    if (!t) return;
    
    setPayments(prev => prev.map(p => {
      if (p.id !== paymentId) return p;
      const updated = {
        ...p,
        nnFee: t.nnFee,
        nnnFee: t.nnnFee,
        utilityFee: t.utilityFee,
        cleaningFee: t.cleaningFee,
        camFee: t.camFee,
      };
      // Recalculate total
      updated.amountPaid = updated.rentDue + updated.nnFee + updated.nnnFee + updated.utilityFee + updated.cleaningFee + updated.camFee;
      updated.paid = updated.amountPaid >= updated.rentDue && updated.rentDue > 0;
      
      // Save all synced fields
      saveField(p.id, "nnFee", updated.nnFee);
      saveField(p.id, "nnnFee", updated.nnnFee);
      saveField(p.id, "utilityFee", updated.utilityFee);
      saveField(p.id, "cleaningFee", updated.cleaningFee);
      saveField(p.id, "camFee", updated.camFee);
      saveField(p.id, "amountPaid", updated.amountPaid);
      saveField(p.id, "paid", updated.paid);
      
      return updated;
    }));
  }, [tenants, saveField]);

  const syncAllFees = useCallback(async () => {
    if (syncingAll || payments.length === 0) return;
    setSyncingAll(true);
    try {
      const updatedPayments = [...payments];
      for (let i = 0; i < updatedPayments.length; i++) {
        const p = updatedPayments[i];
        const t = tenants.find(tx => tx.id === p.tenantId);
        if (t) {
          const updated = {
            ...p,
            nnFee: t.nnFee,
            nnnFee: t.nnnFee,
            utilityFee: t.utilityFee,
            cleaningFee: t.cleaningFee,
            camFee: t.camFee,
          };
          updated.amountPaid = (updated.rentDue || 0) + updated.nnFee + updated.nnnFee + updated.utilityFee + updated.cleaningFee + updated.camFee;
          updated.paid = updated.amountPaid >= updated.rentDue && updated.rentDue > 0;
          
          updatedPayments[i] = updated;

          // Save to DB in one shot
          await fetch(`/api/rent-payments?id=${encodeURIComponent(p.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nnFee: t.nnFee,
              nnnFee: t.nnnFee,
              utilityFee: t.utilityFee,
              cleaningFee: t.cleaningFee,
              camFee: t.camFee,
              amountPaid: updated.amountPaid,
              paid: updated.paid
            }),
          });
        }
      }
      setPayments(updatedPayments);
    } catch (err) {
      console.error("Sync all failed:", err);
    } finally {
      setSyncingAll(false);
    }
  }, [payments, tenants, syncingAll]);

  // ─── Submit Month ───────────────────────────────────────────────────────
  const submitMonth = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/rent-payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          actorEmail: currentUserEmail,
          actorName: currentUserName,
        }),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
        fetchPayments(selectedMonth);
      }
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Reset Month ─────────────────────────────────────────────────────────
  const resetMonth = async () => {
    const label = fmtMonth(selectedMonth);
    if (!confirm(`Are you sure you want to delete and reset all records for ${label}?\n\nThis will unlock the month and permanently delete the current entries so you can generate a fresh ledger.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/rent-payments?month=${encodeURIComponent(selectedMonth)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPayments(selectedMonth);
      } else {
        alert("Failed to reset month.");
      }
    } catch (err) {
      console.error("Reset month failed:", err);
      alert("Failed to reset month.");
    } finally {
      setLoading(false);
    }
  };

  // ─── CSV Export ─────────────────────────────────────────────────────────
  const exportCSV = useCallback((rows: RentPayment[], month: string) => {
    const header = ["Tenant", "Building", "Unit", "Rent Due", "NN Fee", "NNN Fee", "Util Fee", "Clean Fee", "CAM Fee", "Total Paid", "Paid", "Type", "Payment Date", "Late Fee", "Notes"];
    const csvRows = rows.map(r => [
      `"${r.tenantName}"`, `"${r.building}"`, `"${r.unit}"`,
      r.rentDue, r.nnFee, r.nnnFee, r.utilityFee, r.cleaningFee, r.camFee, r.amountPaid, r.paid ? "Yes" : "No",
      `"${r.paymentType}"`, r.paymentDate || "", r.lateFee, `"${r.notes}"`,
    ]);
    // Totals: sum every fee column so the exported total matches the on-screen Total Due
    const totalRentDue   = rows.reduce((s, r) => s + (r.rentDue     || 0), 0);
    const totalNNFee     = rows.reduce((s, r) => s + (r.nnFee       || 0), 0);
    const totalNNNFee    = rows.reduce((s, r) => s + (r.nnnFee      || 0), 0);
    const totalUtilFee   = rows.reduce((s, r) => s + (r.utilityFee  || 0), 0);
    const totalCleanFee  = rows.reduce((s, r) => s + (r.cleaningFee || 0), 0);
    const totalCAMFee    = rows.reduce((s, r) => s + (r.camFee      || 0), 0);
    const totalPaid      = rows.reduce((s, r) => s + (r.amountPaid  || 0), 0);
    const totalLateFees  = rows.reduce((s, r) => s + (r.lateFee     || 0), 0);
    csvRows.push([
      "TOTALS", "", "",
      totalRentDue  as unknown as string,
      totalNNFee    as unknown as string,
      totalNNNFee   as unknown as string,
      totalUtilFee  as unknown as string,
      totalCleanFee as unknown as string,
      totalCAMFee   as unknown as string,
      totalPaid     as unknown as string,
      "", "", "",
      totalLateFees as unknown as string,
      "",
    ] as unknown as string[]);

    const csv = [header.join(","), ...csvRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rent-ledger-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ─── Computed totals ────────────────────────────────────────────────────
  const totals = useMemo(() => {
    // Rent Due = base rent only (matches QuickBooks / lease amounts)
    const totalDue = payments.reduce((s, p) => s + (p.rentDue || 0), 0);
    // Fees = NN + NNN + Utility + Cleaning + CAM — shown in their own columns, not added to Rent Due
    const totalFees = payments.reduce((s, p) =>
      s + (p.nnFee || 0) + (p.nnnFee || 0) + (p.utilityFee || 0) + (p.cleaningFee || 0) + (p.camFee || 0), 0);
    // Total obligations = rent + fees — used for Outstanding calculation
    const totalObligations = totalDue + totalFees;
    const totalPaid = payments.reduce((s, p) => s + (p.amountPaid || 0), 0);
    const totalLateFees = payments.reduce((s, p) => s + (p.lateFee || 0), 0);
    const outstanding = totalObligations - totalPaid;
    const paidCount = payments.filter(p => p.paid).length;
    return { totalDue, totalFees, totalObligations, totalPaid, totalLateFees, outstanding, paidCount };
  }, [payments]);

  const isMonthSubmitted = payments.length > 0 && payments.every(p => p.isSubmitted);
  const hasDraftRows = payments.length > 0 && payments.some(p => !p.isSubmitted);

  const monthOptions = getMonthOptions();

  const filteredPayments = useMemo(() => {
    if (statusFilter === "unpaid") return payments.filter(p => !p.paid);
    if (statusFilter === "paid") return payments.filter(p => p.paid);
    return payments;
  }, [payments, statusFilter]);

  const buildReminderMessage = useCallback((p: RentPayment) => {
    const totalObligation = (p.rentDue || 0) + (p.nnFee || 0) + (p.nnnFee || 0) + (p.utilityFee || 0) + (p.cleaningFee || 0) + (p.camFee || 0) + (p.lateFee || 0);
    const instStr = formatInstructionsText(instructions);
    const unitLabel = p.building ? `${p.building}${p.unit ? ` (Unit ${p.unit})` : ""}` : "your unit";
    return `Hi ${p.tenantName}, friendly reminder that ${fmtMonthFull(selectedMonth)} rent for ${unitLabel} (${fmtMoney(totalObligation)}) is due.${instStr ? ` ${instStr}.` : ""} Thank you!`;
  }, [instructions, selectedMonth]);

  const buildReceiptMessage = useCallback((p: RentPayment) => {
    const unitLabel = p.building ? `${p.building}${p.unit ? ` (Unit ${p.unit})` : ""}` : "your unit";
    const dateStr = p.paymentDate
      ? new Date(p.paymentDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `RENT RECEIPT (${fmtMonthFull(selectedMonth)}): Received ${fmtMoney(p.amountPaid)} via ${p.paymentType || "Payment"} on ${dateStr} for ${unitLabel}.${p.notes ? ` Ref: ${p.notes}.` : ""} Balance due: $0.00. Thank you!`;
  }, [selectedMonth]);

  const handleRemindTenant = useCallback((p: RentPayment) => {
    const t = tenants.find(tx => tx.id === p.tenantId);
    const msg = buildReminderMessage(p);
    if (t?.phone) {
      window.location.href = `sms:${t.phone}?body=${encodeURIComponent(msg)}`;
      return;
    }
    if (t?.email) {
      const subj = `Rent Reminder — ${fmtMonthFull(selectedMonth)} (${p.building}${p.unit ? ` Unit ${p.unit}` : ""})`;
      window.location.href = `mailto:${t.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(msg)}`;
      return;
    }
    navigator.clipboard.writeText(msg).catch(() => {});
    showToast(`Copied rent reminder for ${p.tenantName}!`);
  }, [tenants, buildReminderMessage, selectedMonth, showToast]);

  const handleReceiptAction = useCallback((p: RentPayment, mode: "sms" | "email" | "print") => {
    if (mode === "print") {
      printRentReceipt({
        tenantName: p.tenantName,
        building: p.building,
        unit: p.unit,
        monthLabel: fmtMonthFull(selectedMonth),
        amountPaid: p.amountPaid,
        paymentType: p.paymentType,
        paymentDate: p.paymentDate,
        notes: p.notes,
      });
      return;
    }
    const t = tenants.find(tx => tx.id === p.tenantId);
    const msg = buildReceiptMessage(p);
    if (mode === "sms" && t?.phone) {
      window.location.href = `sms:${t.phone}?body=${encodeURIComponent(msg)}`;
      return;
    }
    if (mode === "email" && t?.email) {
      const subj = `Paid Rent Receipt — ${fmtMonthFull(selectedMonth)} (${p.building}${p.unit ? ` Unit ${p.unit}` : ""})`;
      window.location.href = `mailto:${t.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(msg)}`;
      return;
    }
    navigator.clipboard.writeText(msg).catch(() => {});
    showToast(`Copied rent receipt for ${p.tenantName}!`);
  }, [tenants, buildReceiptMessage, selectedMonth, showToast]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center">
            <DollarSign size={18} className="text-[#10B981]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Rent Ledger</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Monthly Payment Tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("entry")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              view === "entry"
                ? "bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]"
                : "text-gray-500 hover:text-gray-300 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"
            }`}
          >
            <FileSpreadsheet size={13} /> Monthly Entry
          </button>
          <button
            onClick={() => setView("history")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              view === "history"
                ? "bg-[rgba(96,165,250,0.15)] text-[#60A5FA] border border-[rgba(96,165,250,0.3)]"
                : "text-gray-500 hover:text-gray-300 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"
            }`}
          >
            <History size={13} /> Payment Records
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MONTHLY ENTRY VIEW                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {view === "entry" && (
        <>
          {/* Month selector + Generate */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Select Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className={FIELD}
              >
                {monthOptions.map(o => (
                  <option key={o.value} value={o.value} style={{ background: "#0D1117" }}>{o.label}</option>
                ))}
              </select>
            </div>
            {payments.length === 0 && !loading && (
              <button
                onClick={generateRows}
                disabled={generating || tenants.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-40 shadow-lg"
                style={{ boxShadow: "0 0 24px rgba(16,185,129,0.2)" }}
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                {generating ? "Generating…" : `Generate for ${tenants.length} Tenants`}
              </button>
            )}
            {payments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInstructions(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    showInstructions
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : "text-emerald-400 hover:text-white border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.05]"
                  }`}
                >
                  <Settings size={12} />
                  <span>Payment Instructions (Zelle / Venmo / Check)</span>
                </button>
                <button
                  onClick={syncAllFees}
                  disabled={syncingAll || isMonthSubmitted}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#60A5FA] hover:text-white border border-[rgba(96,165,250,0.1)] hover:border-[rgba(96,165,250,0.3)] transition-all disabled:opacity-30"
                >
                  {syncingAll ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Sync All Fees
                </button>
                <button
                  onClick={() => exportCSV(payments, selectedMonth)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all"
                >
                  <Download size={12} /> CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all"
                >
                  <Printer size={12} /> Print
                </button>
                <button
                  onClick={resetMonth}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#EF4444] hover:text-white border border-[rgba(239,68,68,0.15)] hover:border-[rgba(239,68,68,0.35)] hover:bg-[rgba(239,68,68,0.06)] transition-all"
                >
                  <Trash2 size={12} /> Reset Month
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Payment Instructions Setup (Zelle / Venmo / Cash App / Check) */}
          {showInstructions && (
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.07] via-sky-500/[0.04] to-transparent p-4 sm:p-5 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>💳 Your Rent Payment Instructions (Zero-Fee Direct P2P &amp; Check)</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Save your Zelle, Venmo, Cash App, or Check drop-off details once — they are automatically included whenever you send a 1-tap Rent Reminder to an unpaid tenant.
                  </p>
                </div>
                <button onClick={() => setShowInstructions(false)} className="text-gray-500 hover:text-white p-1">
                  <XCircle size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Zelle (Email or Phone)</label>
                  <input
                    value={instructions.zelle}
                    onChange={e => setInstructions(prev => ({ ...prev, zelle: e.target.value }))}
                    placeholder="e.g. rent@yourcompany.com"
                    className={FIELD_SM}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Venmo Handle</label>
                  <input
                    value={instructions.venmo}
                    onChange={e => setInstructions(prev => ({ ...prev, venmo: e.target.value }))}
                    placeholder="e.g. @YourPropertyCo"
                    className={FIELD_SM}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Cash App / PayPal</label>
                  <input
                    value={instructions.cashApp}
                    onChange={e => setInstructions(prev => ({ ...prev, cashApp: e.target.value }))}
                    placeholder="e.g. $YourCashTag"
                    className={FIELD_SM}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Checks Payable To</label>
                  <input
                    value={instructions.checkPayableTo}
                    onChange={e => setInstructions(prev => ({ ...prev, checkPayableTo: e.target.value }))}
                    placeholder="e.g. Acme Properties LLC"
                    className={FIELD_SM}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Check Drop-Off / Mailing Address</label>
                  <input
                    value={instructions.checkAddress}
                    onChange={e => setInstructions(prev => ({ ...prev, checkAddress: e.target.value }))}
                    placeholder="e.g. Drop box at Suite 100 or PO Box 412"
                    className={FIELD_SM}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-gray-400 truncate">
                  {formatInstructionsText(instructions) || "Fill in any methods you accept above."}
                </p>
                <button
                  type="button"
                  onClick={savePaymentInstructions}
                  disabled={savingInstructions}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all cursor-pointer flex-shrink-0"
                >
                  {savingInstructions ? <Loader2 size={13} className="animate-spin" /> : instructionsSaved ? <Check size={13} /> : <DollarSign size={13} />}
                  <span>{instructionsSaved ? "Saved!" : "Save Instructions"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {payments.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard
                label="Rent Due"
                value={fmtMoney(totals.totalDue)}
                icon={DollarSign}
                color="#60A5FA"
                sub={`+ ${fmtMoney(totals.totalFees)} fees`}
              />
              <SummaryCard
                label="Collected"
                value={fmtMoney(totals.totalPaid)}
                icon={CheckCircle2}
                color="#10B981"
                sub={`${totals.paidCount} of ${payments.length} paid`}
              />
              <SummaryCard
                label="Outstanding"
                value={fmtMoney(totals.outstanding)}
                icon={totals.outstanding > 0 ? AlertTriangle : CheckCircle2}
                color={totals.outstanding > 0 ? "#F59E0B" : "#10B981"}
                sub={totals.outstanding > 0 ? `${payments.length - totals.paidCount} unpaid` : "All collected!"}
              />
              <SummaryCard
                label="Late Fees"
                value={fmtMoney(totals.totalLateFees)}
                icon={Clock}
                color={totals.totalLateFees > 0 ? "#EF4444" : "#6B7280"}
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-[#10B981]" />
              <span className="ml-2 text-sm text-gray-500">Loading payments…</span>
            </div>
          )}

          {/* Migration needed banner */}
          {!loading && migrationSql && (
            <div className="bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.25)] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#F97316]" />
                <p className="text-sm font-black text-[#F97316]">Database Setup Required</p>
              </div>
              <p className="text-xs text-gray-400">
                The <code className="bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded text-[#F97316]">rent_payments</code> table needs to be created in Supabase.
                Copy the SQL below and run it in your{" "}
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#60A5FA] hover:underline">Supabase SQL Editor</a>.
              </p>
              <pre className="bg-[rgba(0,0,0,0.4)] rounded-xl p-4 text-xs text-gray-300 overflow-x-auto border border-[rgba(255,255,255,0.06)]">
                <code>{migrationSql}</code>
              </pre>
              <button
                onClick={() => { navigator.clipboard.writeText(migrationSql); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(249,115,22,0.15)] text-[#F97316] text-xs font-bold hover:bg-[rgba(249,115,22,0.25)] transition-colors border border-[rgba(249,115,22,0.3)]"
              >
                <Download size={12} /> Copy SQL to Clipboard
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !migrationSql && payments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] flex items-center justify-center mb-4">
                <DollarSign size={28} className="text-[#10B981]/50" />
              </div>
              <p className="text-gray-400 font-bold">No entries for {fmtMonthFull(selectedMonth)}</p>
              <p className="text-xs text-gray-600 mt-1 mb-4 max-w-sm">
                Click &quot;Generate&quot; to auto-populate rent entries for all {tenants.length} active tenants.
                Rent amounts will be pulled from each tenant&apos;s card.
              </p>
            </div>
          )}

          {/* Submitted badge */}
          {isMonthSubmitted && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]">
              <CheckCircle2 size={14} className="text-[#10B981]" />
              <span className="text-xs font-bold text-[#10B981]">
                Submitted {payments[0]?.submittedAt ? `on ${new Date(payments[0].submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}` : ""} by {payments[0]?.submittedBy || "Staff"}
              </span>
            </div>
          )}

          {/* Quick Filter Pills + 1-Click Tip */}
          {payments.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  { key: "all" as const, label: `All (${payments.length})` },
                  { key: "unpaid" as const, label: `Unpaid (${payments.length - totals.paidCount})` },
                  { key: "paid" as const, label: `Paid (${totals.paidCount})` },
                ]).map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      statusFilter === f.key
                        ? f.key === "unpaid"
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                          : f.key === "paid"
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "bg-white/[0.08] border-white/25 text-white"
                        : "border-white/[0.07] text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500">
                ⚡ <strong className="text-gray-300">1-Click Tip:</strong> Selecting a payment method (Zelle, Venmo, Check, Cash) automatically marks Paid, fills the Total Due, and sets Today&apos;s Date.
              </p>
            </div>
          )}

          {/* ─── Payment Table ───────────────────────────────────────────── */}
          {payments.length > 0 && (
            <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)]">
                      <th className={TH_CLASS + " sticky left-0 z-20 bg-[#0A0F1A] border-r border-[rgba(255,255,255,0.06)] shadow-[2px_0_10px_rgba(0,0,0,0.5)] min-w-[140px]"}>Tenant</th>
                      {["Unit", "Total Due", "NN", "NNN", "Util", "Clean", "CAM", "Pd", "Amt", "Type", "Late", "Date", "Notes", "Remind / Receipt"].map(h => (
                        <th key={h} className={TH_CLASS}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`border-b border-[rgba(255,255,255,0.04)] transition-colors duration-150 ${
                          p.paid ? "bg-[rgba(16,185,129,0.04)]" : i % 2 === 0 ? "" : "bg-[rgba(255,255,255,0.01)]"
                        }`}
                      >
                        {/* Tenant Name */}
                        <td className={TD_CLASS + " sticky left-0 z-10 bg-[#0A0F1A] border-r border-[rgba(255,255,255,0.06)] shadow-[2px_0_10px_rgba(0,0,0,0.5)]"}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.paid ? "bg-[#10B981]" : "bg-[rgba(255,255,255,0.15)]"}`} />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-white text-xs truncate leading-tight">{p.tenantName}</span>
                              <button 
                                onClick={() => syncFees(p.id, p.tenantId)}
                                disabled={isMonthSubmitted}
                                className="text-[8px] text-[#60A5FA] hover:text-[#93C5FD] transition-colors flex items-center gap-0.5 mt-0.5 uppercase tracking-tighter font-black disabled:opacity-30"
                              >
                                <RefreshCw size={7} /> Sync
                              </button>
                            </div>
                          </div>
                        </td>
                        {/* Building / Unit */}
                        <td className={TD_CLASS + " text-xs text-gray-400 whitespace-nowrap"}>
                          {p.building}{p.unit ? ` / ${p.unit}` : ""}
                        </td>
                        {/* Rent Due */}
                        <td className={TD_CLASS}>
                          <span className="font-black text-white text-xs tabular-nums">{fmtMoney(p.rentDue)}</span>
                        </td>
                        {/* NN Fee */}
                        <td className={TD_CLASS}>
                          <input type="number" step="any" value={p.nnFee || ""} onChange={e => updatePayment(p.id, "nnFee", Number(e.target.value) || 0)} disabled={isMonthSubmitted} className={FEE_INPUT} placeholder="0" />
                        </td>
                        {/* NNN Fee */}
                        <td className={TD_CLASS}>
                          <input type="number" step="any" value={p.nnnFee || ""} onChange={e => updatePayment(p.id, "nnnFee", Number(e.target.value) || 0)} disabled={isMonthSubmitted} className={FEE_INPUT} placeholder="0" />
                        </td>
                        {/* Utility Fee */}
                        <td className={TD_CLASS}>
                          <input type="number" step="any" value={p.utilityFee || ""} onChange={e => updatePayment(p.id, "utilityFee", Number(e.target.value) || 0)} disabled={isMonthSubmitted} className={FEE_INPUT} placeholder="0" />
                        </td>
                        {/* Cleaning Fee */}
                        <td className={TD_CLASS}>
                          <input type="number" step="any" value={p.cleaningFee || ""} onChange={e => updatePayment(p.id, "cleaningFee", Number(e.target.value) || 0)} disabled={isMonthSubmitted} className={FEE_INPUT} placeholder="0" />
                        </td>
                        {/* CAM Fee */}
                        <td className={TD_CLASS}>
                          <input type="number" step="any" value={p.camFee || ""} onChange={e => updatePayment(p.id, "camFee", Number(e.target.value) || 0)} disabled={isMonthSubmitted} className={FEE_INPUT} placeholder="0" />
                        </td>
                        {/* Paid Toggle */}
                        <td className={TD_CLASS}>
                          <button
                            onClick={() => updatePayment(p.id, "paid", !p.paid)}
                            disabled={isMonthSubmitted}
                            title={p.paid ? "Mark unpaid" : "1-Click Mark Paid (auto-fills total & today's date)"}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                              p.paid
                                ? "bg-[#10B981] border-[#10B981] text-white"
                                : "border-[rgba(255,255,255,0.15)] text-transparent hover:text-gray-600"
                            } ${isMonthSubmitted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        </td>
                        {/* Amount Paid */}
                        <td className={TD_CLASS}>
                          <input type="number" value={p.amountPaid || ""} onChange={e => updatePayment(p.id, "amountPaid", Number(e.target.value) || 0)} disabled={isMonthSubmitted} className={FEE_INPUT + " w-[60px]"} placeholder="0" />
                        </td>
                        {/* Payment Type */}
                        <td className={TD_CLASS}>
                          <select value={p.paymentType} onChange={e => updatePayment(p.id, "paymentType", e.target.value)} disabled={isMonthSubmitted} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg px-1.5 py-1 text-[10px] text-white outline-none w-24">
                            <option value="">Method…</option>
                            {PAYMENT_TYPES.map(t => <option key={t} value={t} className="bg-[#0A0F1A]">{t}</option>)}
                          </select>
                        </td>
                        {/* Late Fee */}
                        <td className={TD_CLASS}>
                          <input type="number" value={p.lateFee || ""} onChange={e => updatePayment(p.id, "lateFee", Number(e.target.value) || 0)} disabled={isMonthSubmitted} className={FEE_INPUT} placeholder="0" />
                        </td>
                        {/* Payment Date */}
                        <td className={TD_CLASS}>
                          <input type="date" value={p.paymentDate || ""} onChange={e => updatePayment(p.id, "paymentDate", e.target.value || null)} disabled={isMonthSubmitted} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg px-1 py-1 text-[10px] text-white outline-none w-24" />
                        </td>
                        {/* Notes */}
                        <td className={TD_CLASS}>
                          <div className="flex items-center gap-1.5">
                            {editingNotesId === p.id ? (
                              <input 
                                type="text" 
                                autoFocus
                                value={p.notes} 
                                onBlur={() => setEditingNotesId(null)}
                                onChange={e => updatePayment(p.id, "notes", e.target.value)} 
                                disabled={isMonthSubmitted} 
                                className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1 text-xs text-white outline-none w-48 shadow-2xl" 
                                placeholder="Check #, Venmo @..." 
                              />
                            ) : (
                              <button
                                onClick={() => setEditingNotesId(p.id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
                                  p.notes 
                                    ? "bg-[rgba(96,165,250,0.1)] text-[#60A5FA] border border-[rgba(96,165,250,0.2)]" 
                                    : "bg-[rgba(255,255,255,0.04)] text-gray-600 hover:text-gray-400"
                                }`}
                              >
                                <StickyNote size={12} />
                                {p.notes && <span className="text-[10px] max-w-[60px] truncate font-medium">{p.notes}</span>}
                              </button>
                            )}
                          </div>
                        </td>
                        {/* 1-Tap Remind / Receipt */}
                        <td className={TD_CLASS + " whitespace-nowrap"}>
                          {p.paid ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleReceiptAction(p, "print")}
                                title="Print or Save Official Rent Receipt PDF"
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                <Receipt size={11} />
                                <span>Receipt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReceiptAction(p, "sms")}
                                title="Text/Email Paid Receipt to Tenant"
                                className="p-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                              >
                                <Send size={10} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemindTenant(p)}
                              title="Send 1-Tap Rent Reminder (with your Zelle/Venmo/Check instructions)"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-[10px] font-bold transition-all cursor-pointer"
                            >
                              <Bell size={11} />
                              <span>Remind</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="border-t-2 border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                      <td className={TD_CLASS + " sticky left-0 z-10 bg-[#161B22] text-[10px] font-black text-gray-400 uppercase tracking-wider min-w-[140px]"} colSpan={1}>
                        Totals ({payments.length} tenants)
                      </td>
                      <td className={TD_CLASS}>-</td>
                      <td className={TD_CLASS}>
                        <span className="font-black text-[#60A5FA] text-xs tabular-nums">{fmtMoney(totals.totalDue)}</span>
                      </td>
                      <td className={TD_CLASS + " text-[10px] font-bold text-gray-500 tabular-nums"}>{fmtMoney(payments.reduce((s, p) => s + (p.nnFee || 0), 0))}</td>
                      <td className={TD_CLASS + " text-[10px] font-bold text-gray-500 tabular-nums"}>{fmtMoney(payments.reduce((s, p) => s + (p.nnnFee || 0), 0))}</td>
                      <td className={TD_CLASS + " text-[10px] font-bold text-gray-500 tabular-nums"}>{fmtMoney(payments.reduce((s, p) => s + (p.utilityFee || 0), 0))}</td>
                      <td className={TD_CLASS + " text-[10px] font-bold text-gray-500 tabular-nums"}>{fmtMoney(payments.reduce((s, p) => s + (p.cleaningFee || 0), 0))}</td>
                      <td className={TD_CLASS + " text-[10px] font-bold text-gray-500 tabular-nums"}>{fmtMoney(payments.reduce((s, p) => s + (p.camFee || 0), 0))}</td>
                      <td className={TD_CLASS}>-</td>
                      <td className={TD_CLASS}>
                        <span className="font-black text-[#10B981] text-xs tabular-nums">{fmtMoney(totals.totalPaid)}</span>
                      </td>
                      <td className={TD_CLASS}>-</td>
                      <td className={TD_CLASS}>
                        <span className="font-black text-[#FACC15] text-xs tabular-nums">{fmtMoney(totals.totalLateFees)}</span>
                      </td>
                      <td className={TD_CLASS}>-</td>
                      <td className={TD_CLASS}>-</td>
                      <td className={TD_CLASS}>-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-[rgba(255,255,255,0.04)]">
                {filteredPayments.map(p => (
                  <MobilePaymentCard
                    key={p.id}
                    payment={p}
                    isSubmitted={isMonthSubmitted}
                    onUpdate={updatePayment}
                    onSync={syncFees}
                    onRemind={() => handleRemindTenant(p)}
                    onReceipt={(mode) => handleReceiptAction(p, mode)}
                  />
                ))}
                {/* Mobile Totals */}
                <div className="px-4 py-4 bg-[rgba(255,255,255,0.02)]">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Totals</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-500">Rent Due:</span> <span className="font-black text-[#60A5FA] tabular-nums">{fmtMoney(totals.totalDue)}</span></div>
                    <div><span className="text-gray-500">Collected:</span> <span className="font-black text-[#10B981] tabular-nums">{fmtMoney(totals.totalPaid)}</span></div>
                    <div><span className="text-gray-500">Outstanding:</span> <span className="font-black text-[#F59E0B] tabular-nums">{fmtMoney(totals.outstanding)}</span></div>
                    <div><span className="text-gray-500">Late Fees:</span> <span className={`font-black tabular-nums ${totals.totalLateFees > 0 ? "text-[#EF4444]" : "text-gray-600"}`}>{fmtMoney(totals.totalLateFees)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toast for copied reminder/receipt */}
          {toastMsg && (
            <div className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 text-black font-black text-xs sm:text-sm shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
              <Check size={15} />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          {hasDraftRows && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-gray-600">
                <Clock size={11} className="inline mr-1" />
                All changes auto-save as you type. Submit locks the month as a permanent record.
              </p>
              <button
                onClick={submitMonth}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-sm font-black hover:opacity-90 transition-all duration-200 shadow-lg disabled:opacity-50"
                style={{ boxShadow: "0 0 30px rgba(16,185,129,0.25)" }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? "Submitting…" : `Submit ${fmtMonth(selectedMonth)}`}
              </button>
            </div>
          )}

          {/* Submit success toast */}
          {submitSuccess && (
            <div className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-xl bg-[#10B981] text-white font-bold text-sm shadow-xl animate-in fade-in slide-in-from-bottom-2 z-50">
              <CheckCircle2 size={16} />
              {fmtMonth(selectedMonth)} submitted successfully!
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PAYMENT RECORDS (HISTORY) VIEW                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {view === "history" && (
        <>
          {/* Year filter */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Year</label>
            <div className="flex gap-1">
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                <button
                  key={y}
                  onClick={() => setHistoryYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    historyYear === y
                      ? "bg-[rgba(96,165,250,0.15)] text-[#60A5FA] border border-[rgba(96,165,250,0.3)]"
                      : "text-gray-500 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {historyLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-[#60A5FA]" />
              <span className="ml-2 text-sm text-gray-500">Loading records…</span>
            </div>
          )}

          {!historyLoading && history.filter(m => m.month.startsWith(String(historyYear))).length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <History size={28} className="text-gray-700 mb-3" />
              <p className="text-gray-500 font-bold">No submitted records for {historyYear}</p>
              <p className="text-xs text-gray-600 mt-1">Submit a month&apos;s rent entries to see them here.</p>
            </div>
          )}

          <div className="space-y-3">
            {history
              .filter(m => m.month.startsWith(String(historyYear)))
              .sort((a, b) => b.month.localeCompare(a.month))
              .map(m => {
                const isExpanded = expandedMonth === m.month;
                const collRate = m.totalDue > 0 ? Math.round((m.totalPaid / m.totalDue) * 100) : 0;
                return (
                  <div key={m.month} className="bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden transition-all duration-300">
                    {/* Collapsed header */}
                    <button
                      onClick={() => setExpandedMonth(isExpanded ? null : m.month)}
                      className="w-full flex items-center justify-between px-4 sm:px-6 py-4 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.2)] flex items-center justify-center">
                          <Calendar size={16} className="text-[#60A5FA]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{fmtMonthFull(m.month)}</p>
                          <p className="text-[10px] text-gray-500">
                            {m.tenantCount} tenants · Submitted {new Date(m.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} by {m.submittedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-4 text-xs tabular-nums">
                          <div className="text-right">
                            <p className="text-gray-500">Due</p>
                            <p className="font-black text-white">{fmtMoney(m.totalDue)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500">Collected</p>
                            <p className="font-black text-[#10B981]">{fmtMoney(m.totalPaid)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500">Rate</p>
                            <p className={`font-black ${collRate >= 100 ? "text-[#10B981]" : collRate >= 80 ? "text-[#F59E0B]" : "text-[#EF4444]"}`}>{collRate}%</p>
                          </div>
                          {m.totalLateFees > 0 && (
                            <div className="text-right">
                              <p className="text-gray-500">Late Fees</p>
                              <p className="font-black text-[#EF4444]">{fmtMoney(m.totalLateFees)}</p>
                            </div>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-[rgba(255,255,255,0.06)]">
                        {/* Mobile summary */}
                        <div className="sm:hidden grid grid-cols-2 gap-2 px-4 py-3 text-xs">
                          <div><span className="text-gray-500">Due:</span> <span className="font-black text-white tabular-nums">{fmtMoney(m.totalDue)}</span></div>
                          <div><span className="text-gray-500">Collected:</span> <span className="font-black text-[#10B981] tabular-nums">{fmtMoney(m.totalPaid)}</span></div>
                          <div><span className="text-gray-500">Rate:</span> <span className={`font-black ${collRate >= 100 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>{collRate}%</span></div>
                          {m.totalLateFees > 0 && <div><span className="text-gray-500">Late Fees:</span> <span className="font-black text-[#EF4444] tabular-nums">{fmtMoney(m.totalLateFees)}</span></div>}
                        </div>
                        {/* Export buttons */}
                        <div className="flex gap-2 px-4 sm:px-6 py-2">
                          <button
                            onClick={() => exportCSV(m.rows.map(rowToPayment), m.month)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all"
                          >
                            <Download size={10} /> Export CSV
                          </button>
                          <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all"
                          >
                            <Printer size={10} /> Print
                          </button>
                        </div>
                        {/* Detail table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                                {["Tenant", "Building / Unit", "Rent Due", "Paid", "Amount", "Type", "Late Fee", "Date", "Notes"].map(h => (
                                  <th key={h} className="text-left text-[9px] font-bold text-gray-600 uppercase tracking-widest px-4 py-2">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.rows.map((r) => {
                                const p = rowToPayment(r);
                                return (
                                  <tr key={p.id} className={`border-b border-[rgba(255,255,255,0.03)] ${p.paid ? "bg-[rgba(16,185,129,0.03)]" : ""}`}>
                                    <td className="px-4 py-2 font-bold text-white">{p.tenantName}</td>
                                    <td className="px-4 py-2 text-gray-400">{p.building}{p.unit ? ` / ${p.unit}` : ""}</td>
                                    <td className="px-4 py-2 font-black text-white tabular-nums">{fmtMoney(p.rentDue)}</td>
                                    <td className="px-4 py-2">{p.paid ? <CheckCircle2 size={14} className="text-[#10B981]" /> : <XCircle size={14} className="text-gray-600" />}</td>
                                    <td className="px-4 py-2 font-bold text-gray-300 tabular-nums">{fmtMoney(p.amountPaid)}</td>
                                    <td className="px-4 py-2 text-gray-400">{p.paymentType || "—"}</td>
                                    <td className="px-4 py-2 tabular-nums">{p.lateFee > 0 ? <span className="text-[#EF4444] font-bold">{fmtMoney(p.lateFee)}</span> : <span className="text-gray-600">—</span>}</td>
                                    <td className="px-4 py-2 text-gray-400">{p.paymentDate ? new Date(p.paymentDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
                                    <td className="px-4 py-2 text-gray-500 max-w-[200px] truncate">{p.notes || "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Mobile Payment Card ────────────────────────────────────────────────────

function MobilePaymentCard({ payment: p, isSubmitted, onUpdate, onSync, onRemind, onReceipt }: {
  payment: RentPayment;
  isSubmitted: boolean;
  onUpdate: (id: string, field: keyof RentPayment, value: unknown) => void;
  onSync: (id: string, tenantId: string) => void;
  onRemind: () => void;
  onReceipt: (mode: "sms" | "email" | "print") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);
  const totalDue = (p.rentDue || 0) + (p.nnFee || 0) + (p.nnnFee || 0) + (p.utilityFee || 0) + (p.cleaningFee || 0) + (p.camFee || 0) + (p.lateFee || 0);

  return (
    <div className={`px-4 py-3 ${p.paid ? "bg-[rgba(16,185,129,0.04)]" : ""}`}>
      {/* Collapsed row */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.paid ? "bg-[#10B981]" : "bg-[rgba(255,255,255,0.15)]"}`} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{p.tenantName}</p>
            <p className="text-[10px] text-gray-500 truncate">{p.building}{p.unit ? ` / ${p.unit}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 tabular-nums">Base Rent: {fmtMoney(p.rentDue)}</p>
            <p className="text-xs font-black text-white tabular-nums">Total Due: {fmtMoney(totalDue)}</p>
            <p className={`text-[10px] font-bold ${p.paid ? "text-[#10B981]" : "text-gray-500"}`}>{p.paid ? "Paid" : "Unpaid"}</p>
          </div>
          {expanded ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />}
        </div>
      </button>

      {/* Expanded fields */}
      {expanded && (
        <div className="mt-3 space-y-2.5 pl-4 border-l-2 border-[rgba(255,255,255,0.06)]">
          {/*Paid toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Paid</span>
            <button
              onClick={() => onUpdate(p.id, "paid", !p.paid)}
              disabled={isSubmitted}
              className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                p.paid ? "bg-[#10B981] border-[#10B981] text-white" : "border-[rgba(255,255,255,0.15)]"
              }`}
            >
              <CheckCircle2 size={14} />
            </button>
          </div>

          {/* Collapsible Monthly Fees (NN / NNN / Util / Clean / CAM) */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
            <button
              type="button"
              onClick={() => setFeesOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 text-left text-[11px] font-bold text-gray-300 hover:text-white transition-colors"
            >
              <span>Monthly Fees (NN / NNN / Util / Clean / CAM)</span>
              {feesOpen ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
            </button>
            {feesOpen && (
              <div className="px-3 pb-3 pt-1.5 border-t border-[rgba(255,255,255,0.06)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Pull current building/tenant fee rates:</span>
                  <button
                    type="button"
                    onClick={() => onSync(p.id, p.tenantId)}
                    disabled={isSubmitted}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#60A5FA] bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.25)] hover:bg-[rgba(96,165,250,0.2)] transition-colors disabled:opacity-40"
                  >
                    <RefreshCw size={10} /> Sync from Property/Tenant
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { field: "nnFee" as const, label: "NN Fee" },
                    { field: "nnnFee" as const, label: "NNN Fee" },
                    { field: "utilityFee" as const, label: "Util Fee" },
                    { field: "cleaningFee" as const, label: "Clean Fee" },
                    { field: "camFee" as const, label: "CAM Fee" },
                  ]).map(({ field, label }) => (
                    <div key={field}>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">{label}</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">$</span>
                        <input
                          type="number"
                          step="any"
                          value={p[field] || ""}
                          onChange={e => onUpdate(p.id, field, Number(e.target.value) || 0)}
                          disabled={isSubmitted}
                          className={FIELD_SM + " pl-6"}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Amount Paid */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Amount Paid</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">$</span>
              <input type="number" value={p.amountPaid || ""} onChange={e => onUpdate(p.id, "amountPaid", Number(e.target.value) || 0)} disabled={isSubmitted} className={FIELD_SM + " pl-6"} placeholder="0" />
            </div>
          </div>
          {/* Payment Type */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Type</label>
            <select value={p.paymentType} onChange={e => onUpdate(p.id, "paymentType", e.target.value)} disabled={isSubmitted} className={FIELD_SM} style={{ background: "rgba(255,255,255,0.04)" }}>
              <option value="" style={{ background: "#0D1117" }}>—</option>
              {PAYMENT_TYPES.map(t => <option key={t} value={t} style={{ background: "#0D1117" }}>{t}</option>)}
            </select>
          </div>
          {/* Late Fee */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Late Fee</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">$</span>
              <input type="number" value={p.lateFee || ""} onChange={e => onUpdate(p.id, "lateFee", Number(e.target.value) || 0)} disabled={isSubmitted} className={FIELD_SM + " pl-6"} placeholder="0" />
            </div>
          </div>
          {/* Payment Date */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Payment Date</label>
            <input
              type="date"
              value={p.paymentDate || ""}
              onChange={e => onUpdate(p.id, "paymentDate", e.target.value || null)}
              disabled={isSubmitted}
              className={FIELD_SM}
              style={{ colorScheme: "dark" }}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
            />
          </div>
          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Notes</label>
            <input type="text" value={p.notes} onChange={e => onUpdate(p.id, "notes", e.target.value)} disabled={isSubmitted} placeholder="Check #, Venmo @, memo…" className={FIELD_SM} />
          </div>
          {/* 1-Tap Remind / Receipt Actions */}
          <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-2">
            {p.paid ? (
              <>
                <button
                  type="button"
                  onClick={() => onReceipt("print")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold"
                >
                  <Receipt size={13} /> Print / PDF Receipt
                </button>
                <button
                  type="button"
                  onClick={() => onReceipt("sms")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.05] border border-white/15 text-gray-200 text-xs font-bold"
                >
                  <Send size={13} /> Text / Email Receipt
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onRemind}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-bold"
              >
                <Bell size={13} /> Send 1-Tap Rent Reminder (Zelle / Venmo / Check)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
