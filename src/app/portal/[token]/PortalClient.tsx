"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Wrench,
  FileText,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Camera,
  Loader2,
  Printer,
  ExternalLink,
  Calendar,
  Home,
  Phone,
  Mail,
  ShieldCheck,
  Send,
  Clock,
} from "lucide-react";
import { compressImageFile } from "@/lib/image-compression";

interface PortalData {
  organization: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  tenant: {
    name: string;
    contactName: string;
    building: string;
    unit: string;
    leaseStart: string | null;
    leaseEnd: string | null;
    status: string;
    securityDeposit: number;
    secDepReceived: boolean;
  };
  billing: {
    currentMonth: string;
    baseRent: number;
    feesTotal: number;
    lateFee: number;
    currentDue: number;
    currentPaid: number;
    currentRemaining: number;
    priorArrears: number;
    totalBalanceDue: number;
    paidInFull: boolean;
    paymentInstructions: {
      zelle?: string;
      venmo?: string;
      cashApp?: string;
      checkPayableTo?: string;
      checkAddress?: string;
      customNote?: string;
    };
  };
  receipts: Array<{
    id: string;
    month: string;
    totalDue: number;
    amountPaid: number;
    paid: boolean;
    paymentType: string;
    paymentDate: string | null;
    lateFee: number;
  }>;
  documents: Array<{
    index: number;
    name: string;
    uploadedAt: string | null;
    downloadUrl: string;
  }>;
  tickets: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: number;
    status: string;
    scheduledDate: string | null;
    completedDate: string | null;
    photoUrl: string | null;
    createdAt: string;
  }>;
}

function fmtMoney(n: number): string {
  const hasCents = n % 1 !== 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] || ym} ${y || ""}`.trim();
}

export default function PortalClient({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"rent" | "maintenance" | "receipts" | "lease">("rent");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Payment notice state
  const [showPayNotice, setShowPayNotice] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Zelle");
  const [payRef, setPayRef] = useState("");
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeSent, setNoticeSent] = useState(false);

  // Maintenance form state
  const [maintTitle, setMaintTitle] = useState("");
  const [maintCategory, setMaintCategory] = useState("Plumbing");
  const [maintUrgency, setMaintUrgency] = useState<"normal" | "soon" | "emergency">("normal");
  const [maintDesc, setMaintDesc] = useState("");
  const [permissionToEnter, setPermissionToEnter] = useState(true);
  const [maintPhotoUrl, setMaintPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittingMaint, setSubmittingMaint] = useState(false);
  const [maintFeedback, setMaintFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadPortal = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Unable to load your resident portal.");
        return;
      }
      setData(json as PortalData);
      if (!payAmount && json?.billing?.totalBalanceDue > 0) {
        setPayAmount(String(json.billing.totalBalanceDue));
      }
    } catch {
      setError("Network error loading resident portal. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [token, payAmount]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const copyText = (key: string, val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setMaintFeedback(null);
    try {
      const { file: compressed } = await compressImageFile(file, {
        maxDimension: 1600,
        maxBytes: 900 * 1024,
        quality: 0.82,
      });
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}/upload`, {
        method: "POST",
        body: fd,
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.url) {
        throw new Error(out.error || "Photo upload failed.");
      }
      setMaintPhotoUrl(out.url);
    } catch (err) {
      setMaintFeedback({
        ok: false,
        msg: err instanceof Error ? err.message : "Could not attach photo.",
      });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintTitle.trim() || maintDesc.trim().length < 5) {
      setMaintFeedback({ ok: false, msg: "Please enter a brief title and description of the issue." });
      return;
    }
    setSubmittingMaint(true);
    setMaintFeedback(null);
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "maintenance_request",
          title: maintTitle.trim(),
          category: maintCategory,
          urgency: maintUrgency,
          description: maintDesc.trim(),
          permissionToEnter,
          photoUrl: maintPhotoUrl,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(out.error || "Failed to submit maintenance request.");
      }
      setMaintTitle("");
      setMaintDesc("");
      setMaintPhotoUrl(null);
      setMaintUrgency("normal");
      setMaintFeedback({
        ok: true,
        msg: "Your maintenance request has been sent to management. Track updates below.",
      });
      await loadPortal();
    } catch (err) {
      setMaintFeedback({
        ok: false,
        msg: err instanceof Error ? err.message : "Submission failed.",
      });
    } finally {
      setSubmittingMaint(false);
    }
  };

  const handleSendPaymentNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(payAmount);
    if (!num || num <= 0) return;
    setSendingNotice(true);
    try {
      const res = await fetch(`/api/portal/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment_notice",
          amount: num,
          method: payMethod,
          reference: payRef,
        }),
      });
      if (res.ok) {
        setNoticeSent(true);
        setShowPayNotice(false);
      }
    } finally {
      setSendingNotice(false);
    }
  };

  const printReceipt = (r: PortalData["receipts"][number]) => {
    if (!data) return;
    const esc = (v: unknown) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const win = window.open("", "_blank", "width=640,height=720");
    if (!win) return;
    const unitLabel = `${data.tenant.building}${data.tenant.unit ? ` · Unit ${data.tenant.unit}` : ""}`;
    const html = `<!DOCTYPE html><html><head><title>Rent Receipt — ${esc(fmtMonth(r.month))}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #0f172a; max-width: 560px; margin: 0 auto; }
        .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
        .badge { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .tot { font-size: 18px; font-weight: 800; padding-top: 14px; }
      </style></head><body>
      <div class="hdr">
        <div><h2 style="margin:0">${esc(data.organization.name)}</h2><p style="margin:4px 0 0;color:#64748b;font-size:13px">Official Rent Payment Receipt</p></div>
        <span class="badge">${r.paid ? "PAID IN FULL" : "PARTIAL PAYMENT"}</span>
      </div>
      <div class="row"><span>Resident</span><strong>${esc(data.tenant.name)}</strong></div>
      <div class="row"><span>Property / Unit</span><strong>${esc(unitLabel)}</strong></div>
      <div class="row"><span>Billing Period</span><strong>${esc(fmtMonth(r.month))}</strong></div>
      <div class="row"><span>Payment Date</span><strong>${esc(r.paymentDate || "Recorded")}</strong></div>
      <div class="row"><span>Payment Method</span><strong>${esc(r.paymentType || "Payment")}</strong></div>
      <div class="row"><span>Total Charges</span><span>${esc(fmtMoney(r.totalDue))}</span></div>
      <div class="row tot"><span>Amount Received</span><span style="color:#059669">${esc(fmtMoney(r.amountPaid))}</span></div>
      <p style="margin-top:32px;font-size:12px;color:#94a3b8;text-align:center">Generated via PropOpsIQ Resident Portal</p>
      <script>window.onload = () => window.print();</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C14] text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 size={18} className="animate-spin text-sky-400" />
          <span>Loading your Resident Portal…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#080C14] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#0D1322] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle size={22} />
          </div>
          <h1 className="text-lg font-black text-white">Portal Link Unavailable</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || "This link is invalid or has been rotated by your property manager."}
          </p>
        </div>
      </div>
    );
  }

  const { organization, tenant, billing, receipts, documents, tickets } = data;
  const inst = billing.paymentInstructions || {};
  const hasAnyPaymentInstructions = Boolean(
    inst.zelle || inst.venmo || inst.cashApp || inst.checkPayableTo || inst.checkAddress || inst.customNote
  );

  return (
    <div className="min-h-screen bg-[#080C14] text-white pb-16">
      {/* Top Brand Header */}
      <header className="border-b border-white/[0.08] bg-[#0B101D]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-white truncate">
                {organization.name}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300">
                Resident Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
              <Home size={11} className="text-slate-500 shrink-0" />
              <span>
                {tenant.name} · {tenant.building}
                {tenant.unit ? ` · Unit ${tenant.unit}` : ""}
              </span>
            </p>
          </div>
          {organization.contactPhone && (
            <a
              href={`tel:${organization.contactPhone}`}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 shrink-0"
            >
              <Phone size={12} className="text-sky-400" />
              <span className="hidden sm:inline">Call Office</span>
            </a>
          )}
        </div>

        {/* Navigation Pills */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "rent" as const, label: "Rent & Balance", icon: DollarSign },
            {
              id: "maintenance" as const,
              label: `Maintenance${tickets.filter((t) => t.status !== "complete" && t.status !== "cancelled").length ? ` (${tickets.filter((t) => t.status !== "complete" && t.status !== "cancelled").length})` : ""}`,
              icon: Wrench,
            },
            { id: "receipts" as const, label: `Receipts (${receipts.length})`, icon: Receipt },
            { id: "lease" as const, label: "Lease & Docs", icon: FileText },
          ].map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-[0_0_16px_rgba(56,189,248,0.15)]"
                    : "text-slate-400 hover:text-white bg-white/[0.02] border border-transparent"
                }`}
              >
                <Icon size={13} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* ═══ TAB 1: RENT & BALANCE ═══ */}
        {tab === "rent" && (
          <div className="space-y-5">
            {/* Balance Card */}
            <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-[#0E1628] to-[#0A0F1C] p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {fmtMonth(billing.currentMonth)} Statement
                  </p>
                  <p className="text-3xl sm:text-4xl font-black mt-1 tabular-nums text-white">
                    {fmtMoney(billing.totalBalanceDue)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {billing.paidInFull
                      ? "Your account is paid in full — thank you!"
                      : "Total current balance due"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
                    billing.paidInFull
                      ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-300"
                      : "bg-amber-500/15 border border-amber-400/40 text-amber-300"
                  }`}
                >
                  {billing.paidInFull ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                  {billing.paidInFull ? "Paid in Full" : "Payment Due"}
                </span>
              </div>

              {/* Itemized Breakdown */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Base Monthly Rent ({fmtMonth(billing.currentMonth)})</span>
                  <span className="font-semibold tabular-nums">{fmtMoney(billing.baseRent)}</span>
                </div>
                {billing.feesTotal > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Utilities / CAM / Monthly Fees</span>
                    <span className="font-semibold tabular-nums">{fmtMoney(billing.feesTotal)}</span>
                  </div>
                )}
                {billing.lateFee > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>Late Fee</span>
                    <span className="font-semibold tabular-nums">{fmtMoney(billing.lateFee)}</span>
                  </div>
                )}
                {billing.currentPaid > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Payments Recorded ({fmtMonth(billing.currentMonth)})</span>
                    <span className="font-semibold tabular-nums">-{fmtMoney(billing.currentPaid)}</span>
                  </div>
                )}
                {billing.priorArrears > 0 && (
                  <div className="flex justify-between text-amber-300 pt-1 border-t border-white/[0.05]">
                    <span>Prior Carry-Forward Balance</span>
                    <span className="font-bold tabular-nums">{fmtMoney(billing.priorArrears)}</span>
                  </div>
                )}
              </div>

              {/* Report Payment Sent CTA */}
              {!billing.paidInFull && (
                <div className="mt-5 pt-4 border-t border-white/[0.08]">
                  {noticeSent ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                      <CheckCircle2 size={15} className="shrink-0" />
                      <span>
                        Payment notification sent to {organization.name}. Your balance will update once verified.
                      </span>
                    </div>
                  ) : showPayNotice ? (
                    <form onSubmit={handleSendPaymentNotice} className="space-y-3 bg-white/[0.03] rounded-2xl p-4 border border-white/10">
                      <p className="text-xs font-bold text-white">Notify Management That You Sent Payment</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Amount ($)"
                          className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                        >
                          {["Zelle", "Venmo", "Cash App", "ACH / Wire", "Check", "Cash", "Money Order"].map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          placeholder="Confirmation / Check # (optional)"
                          className="px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={sendingNotice}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5"
                        >
                          {sendingNotice ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          <span>Send Payment Confirmation</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPayNotice(false)}
                          className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPayNotice(true)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle2 size={14} />
                      <span>I Sent My Rent — Notify Management</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Payment Instructions Card */}
            <div className="rounded-3xl border border-white/10 bg-[#0D1322] p-6 space-y-4">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-sky-400" />
                <span>How to Pay Rent</span>
              </h2>
              {hasAnyPaymentInstructions ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inst.zelle && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-purple-300">Zelle</p>
                        <p className="text-xs font-semibold text-white truncate">{inst.zelle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText("zelle", inst.zelle!)}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                        title="Copy Zelle handle"
                      >
                        {copiedKey === "zelle" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  )}
                  {inst.venmo && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-sky-300">Venmo</p>
                        <p className="text-xs font-semibold text-white truncate">{inst.venmo}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText("venmo", inst.venmo!)}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                      >
                        {copiedKey === "venmo" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  )}
                  {inst.cashApp && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-emerald-300">Cash App</p>
                        <p className="text-xs font-semibold text-white truncate">{inst.cashApp}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText("cashapp", inst.cashApp!)}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                      >
                        {copiedKey === "cashapp" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  )}
                  {(inst.checkPayableTo || inst.checkAddress) && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase text-amber-300">Check / Money Order</p>
                      {inst.checkPayableTo && (
                        <p className="text-xs text-white mt-0.5">
                          Payable to: <strong>{inst.checkPayableTo}</strong>
                        </p>
                      )}
                      {inst.checkAddress && (
                        <p className="text-xs text-slate-300 mt-0.5">Mail/Drop: {inst.checkAddress}</p>
                      )}
                    </div>
                  )}
                  {inst.customNote && (
                    <p className="text-xs text-slate-300 sm:col-span-2 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                      {inst.customNote}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Please use the payment method specified in your lease agreement or contact {organization.name} directly.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB 2: MAINTENANCE REQUESTS ═══ */}
        {tab === "maintenance" && (
          <div className="space-y-6">
            <form
              onSubmit={handleMaintenanceSubmit}
              className="rounded-3xl border border-white/12 bg-[#0D1322] p-6 space-y-4"
            >
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Wrench size={16} className="text-orange-400" />
                  <span>Submit a Maintenance Request</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  For {tenant.building}
                  {tenant.unit ? ` · Unit ${tenant.unit}` : ""}. Attach a photo so our crew brings the right parts.
                </p>
              </div>

              {maintFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                    maintFeedback.ok
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                  }`}
                >
                  {maintFeedback.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{maintFeedback.msg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    What needs attention? *
                  </label>
                  <input
                    type="text"
                    required
                    value={maintTitle}
                    onChange={(e) => setMaintTitle(e.target.value)}
                    placeholder="e.g., Kitchen sink slow drain, AC blowing warm air"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={maintCategory}
                    onChange={(e) => setMaintCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none focus:border-sky-400"
                  >
                    {["Plumbing", "HVAC / Heating & Cooling", "Electrical", "Appliance", "Doors / Locks / Windows", "Pest Control", "Exterior / Common Area", "General"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Urgency</label>
                  <select
                    value={maintUrgency}
                    onChange={(e) => setMaintUrgency(e.target.value as "normal" | "soon" | "emergency")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none focus:border-sky-400"
                  >
                    <option value="normal">Routine (Next available)</option>
                    <option value="soon">Urgent (Within 24–48 hrs)</option>
                    <option value="emergency">Emergency (Active leak / No heat / Safety)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Details &amp; Location in Unit *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={maintDesc}
                    onChange={(e) => setMaintDesc(e.target.value)}
                    placeholder="Describe what happened, when it started, and where it is located..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Photo Attachment + Entry Permission */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-xs font-semibold text-slate-200 cursor-pointer flex items-center gap-1.5">
                    {uploadingPhoto ? (
                      <Loader2 size={14} className="animate-spin text-sky-400" />
                    ) : (
                      <Camera size={14} className="text-sky-400" />
                    )}
                    <span>{maintPhotoUrl ? "Replace Photo" : "Attach Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                      disabled={uploadingPhoto}
                    />
                  </label>
                  {maintPhotoUrl && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Photo attached
                    </span>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissionToEnter}
                    onChange={(e) => setPermissionToEnter(e.target.checked)}
                    className="rounded border-white/25 bg-black/50 text-sky-500"
                  />
                  <span>Maintenance crew has permission to enter if I am away</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submittingMaint || uploadingPhoto}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-xs hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingMaint ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Submit Maintenance Request</span>
              </button>
            </form>

            {/* Existing Requests List */}
            <div className="rounded-3xl border border-white/10 bg-[#0D1322] p-6 space-y-3">
              <h3 className="text-sm font-black text-white">Your Maintenance History</h3>
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No maintenance requests on file for your unit.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {tickets.map((t) => {
                    const statusColors: Record<string, string> = {
                      open: "bg-amber-500/15 text-amber-300 border-amber-500/30",
                      in_progress: "bg-sky-500/15 text-sky-300 border-sky-500/30",
                      scheduled: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
                      complete: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                    };
                    const badgeCls =
                      statusColors[t.status] || "bg-white/10 text-slate-300 border-white/15";
                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{t.title}</span>
                            <span className="text-[10px] text-slate-400">{t.category}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>
                          <p className="text-[10px] text-slate-500">
                            Submitted {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "recently"}
                            {t.scheduledDate ? ` · Scheduled: ${t.scheduledDate}` : ""}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border shrink-0 ${badgeCls}`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB 3: PAID RECEIPTS ═══ */}
        {tab === "receipts" && (
          <div className="rounded-3xl border border-white/10 bg-[#0D1322] p-6 space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Receipt size={16} className="text-emerald-400" />
              <span>Rent Payment Receipts</span>
            </h2>
            {receipts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Paid rent receipts will appear here automatically once recorded.
              </p>
            ) : (
              <div className="space-y-2.5">
                {receipts.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{fmtMonth(r.month)}</p>
                      <p className="text-[11px] text-slate-400">
                        {fmtMoney(r.amountPaid)} via {r.paymentType || "Payment"}
                        {r.paymentDate ? ` on ${r.paymentDate}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => printReceipt(r)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                    >
                      <Printer size={12} className="text-emerald-400" />
                      <span>Print / PDF</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 4: LEASE & DOCUMENTS ═══ */}
        {tab === "lease" && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-[#0D1322] p-6 space-y-4">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Calendar size={16} className="text-sky-400" />
                <span>Lease Summary</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] text-slate-500">Property / Unit</p>
                  <p className="font-bold text-white mt-0.5">
                    {tenant.building}
                    {tenant.unit ? ` · ${tenant.unit}` : ""}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] text-slate-500">Lease Term</p>
                  <p className="font-bold text-white mt-0.5">
                    {tenant.leaseStart || "—"} → {tenant.leaseEnd || "Month-to-Month"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] text-slate-500">Security Deposit Held</p>
                  <p className="font-bold text-white mt-0.5">
                    {fmtMoney(tenant.securityDeposit)}{" "}
                    {tenant.secDepReceived && (
                      <span className="text-[10px] text-emerald-400 font-semibold">(On File)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0D1322] p-6 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <span>Signed Lease &amp; Documents</span>
              </h3>
              {documents.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No digital lease documents have been uploaded to your file yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <a
                      key={doc.index}
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={15} className="text-sky-400 shrink-0" />
                        <span className="text-xs font-semibold text-white truncate">{doc.name}</span>
                      </div>
                      <span className="text-xs text-sky-400 font-bold flex items-center gap-1 shrink-0">
                        <span>Open</span>
                        <ExternalLink size={12} />
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {(organization.contactEmail || organization.contactPhone) && (
              <div className="rounded-3xl border border-white/10 bg-[#0D1322] p-6 space-y-2 text-xs text-slate-300">
                <p className="font-black text-white text-sm">Management Contact</p>
                {organization.contactEmail && (
                  <p className="flex items-center gap-2">
                    <Mail size={13} className="text-sky-400" />
                    <a href={`mailto:${organization.contactEmail}`} className="hover:underline">
                      {organization.contactEmail}
                    </a>
                  </p>
                )}
                {organization.contactPhone && (
                  <p className="flex items-center gap-2">
                    <Phone size={13} className="text-sky-400" />
                    <a href={`tel:${organization.contactPhone}`} className="hover:underline">
                      {organization.contactPhone}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
