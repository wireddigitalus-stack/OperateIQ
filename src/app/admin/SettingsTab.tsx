"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  RefreshCw, Plus, Trash2, Save, CheckCircle2, Loader2,
  Mail, Shield, X, Smartphone, Lock, BellRing, Moon,
  Sparkles, MessageSquare, BarChart3, Wrench,
  FileSpreadsheet, Download, Upload, AlertCircle,
  ChevronRight, Zap, Share2, Clock, Monitor, Globe,
} from "lucide-react";
import CustomDomainManager from "@/components/admin/CustomDomainManager";

// ─── Types (shared with page.tsx) ─────────────────────────────────────────────

interface MatchedProperty {
  id: string; name: string; type: string;
  sqft: string; location: string; matchReason: string;
}

export interface Lead {
  id: string; timestamp: string; name: string; email: string;
  phone: string; spaceType: string; budget: string; timeline: string;
  teamSize: string; score: number;
  scoreLabel: "Verified Lead" | "MQL" | "Prospect Lead" | "Potential Spam";
  reasoning: string; matchedProperties: MatchedProperty[];
  isWhale?: boolean;
  whaleTier?: "gold" | "silver" | null;
  whaleKeywords?: string[];
  source?: string;
  medium?: string;
  campaign?: string;
  additionalInfo?: string;
  followUpDate?: string | null;
  createdByEmployee?: string;
}

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "maintenance" | "cleaning";
  active: boolean;
  pin?: string;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameToSlug(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/);
  return parts.find(p => p.length > 2) ?? parts[0];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Export Button ───────────────────────────────────────────────────────────

function ExportButton({ leads }: { leads: Lead[] }) {
  const [exporting, setExporting] = useState(false);

  function doExport() {
    setExporting(true);
    try {
      const rows = leads.map(l => ({
        "Name":       l.name,
        "Phone":      l.phone,
        "Email":      l.email,
        "Space Type": l.spaceType,
        "Budget/mo":  l.budget,
        "Timeline":   l.timeline,
        "Team Size":  l.teamSize,
        "AI Score":   l.score,
        "Label":      l.scoreLabel,
        "Source":     l.source || "organic",
        "Notes":      l.additionalInfo || "",
        "Submitted":  new Date(l.timestamp).toLocaleString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, `operateiq-leads-${new Date().toISOString().slice(0,10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={doExport}
      disabled={exporting || leads.length === 0}
      className="mt-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-[0_0_16px_rgba(59,130,246,0.35)] text-sm font-black hover:opacity-90 disabled:opacity-40 transition-all"
    >
      {exporting ? <><Loader2 size={13} className="animate-spin" /> Exporting…</> : <><Download size={13} /> Download Excel</>}
    </button>
  );
}

// ─── QuickBooks Desktop Export ────────────────────────────────────────────────

interface TenantRow {
  name: string; contactName: string; email: string; phone: string;
  building: string; unit: string; monthlyRent: number;
  utilitiesFee: number; nnnFee: number; camFee: number;
  cleaningFee: number; nnFee: number; securityDeposit: number;
  leaseStart: string | null; leaseEnd: string | null;
  status: string;
}

function QBExportButton() {
  const [exporting, setExporting] = useState(false);
  const [tenantCount, setTenantCount] = useState<number | null>(null);

  // Fetch tenant count on mount for display
  useEffect(() => {
    fetch("/api/tenants")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.tenants)) setTenantCount(d.tenants.length); })
      .catch(() => {});
  }, []);

  async function exportIIF() {
    setExporting(true);
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      const tenants: TenantRow[] = (data.tenants || []).map((r: Record<string, unknown>) => ({
        name: r.name as string || "",
        contactName: (r.contact_name as string) || "",
        email: (r.email as string) || "",
        phone: (r.phone as string) || "",
        building: (r.building as string) || "",
        unit: (r.unit as string) || "",
        monthlyRent: Number(r.monthly_rent) || 0,
        utilitiesFee: Number(r.utilities_fee) || 0,
        nnnFee: Number(r.nnn_fee) || 0,
        camFee: Number(r.cam_fee) || 0,
        cleaningFee: Number(r.cleaning_fee) || 0,
        nnFee: Number(r.nn_fee) || 0,
        securityDeposit: Number(r.security_deposit) || 0,
        leaseStart: (r.lease_start as string) || null,
        leaseEnd: (r.lease_end as string) || null,
        status: (r.status as string) || "active",
      }));

      // ── Build IIF content ──
      const lines: string[] = [];
      const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

      // --- Customer List ---
      lines.push("!CUST\tNAME\tBALFWD\tCONT1\tPHONE1\tEMAIL");
      tenants.forEach(t => {
        const custName = t.unit ? `${t.name} - ${t.building} ${t.unit}` : `${t.name} - ${t.building}`;
        lines.push(`CUST\t${custName}\t0\t${t.contactName || t.name}\t${t.phone}\t${t.email}`);
      });

      lines.push(""); // blank separator

      // --- Invoices (monthly rent roll) ---
      lines.push("!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO");
      lines.push("!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO");
      lines.push("!ENDTRNS");

      tenants.filter(t => t.status === "active").forEach(t => {
        const custName = t.unit ? `${t.name} - ${t.building} ${t.unit}` : `${t.name} - ${t.building}`;
        const totalMonthly = t.monthlyRent + t.utilitiesFee + t.nnnFee + t.camFee + t.cleaningFee + t.nnFee;

        if (totalMonthly <= 0) return;

        // Header line — total receivable
        lines.push(`TRNS\tINVOICE\t${today}\tAccounts Receivable\t${custName}\t${totalMonthly.toFixed(2)}\tMonthly Rent - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`);

        // Split lines — individual income items
        if (t.monthlyRent > 0)
          lines.push(`SPL\tINVOICE\t${today}\tRental Income\t${custName}\t-${t.monthlyRent.toFixed(2)}\tBase Rent`);
        if (t.utilitiesFee > 0)
          lines.push(`SPL\tINVOICE\t${today}\tUtilities Income\t${custName}\t-${t.utilitiesFee.toFixed(2)}\tUtilities`);
        if (t.nnnFee > 0)
          lines.push(`SPL\tINVOICE\t${today}\tNNN Income\t${custName}\t-${t.nnnFee.toFixed(2)}\tNNN Charges`);
        if (t.camFee > 0)
          lines.push(`SPL\tINVOICE\t${today}\tCAM Income\t${custName}\t-${t.camFee.toFixed(2)}\tCAM Charges`);
        if (t.cleaningFee > 0)
          lines.push(`SPL\tINVOICE\t${today}\tCleaning Income\t${custName}\t-${t.cleaningFee.toFixed(2)}\tCleaning`);
        if (t.nnFee > 0)
          lines.push(`SPL\tINVOICE\t${today}\tNN Income\t${custName}\t-${t.nnFee.toFixed(2)}\tNN Charges`);

        lines.push("ENDTRNS");
      });

      // ── Also generate a clean Excel rent roll ──
      const wb = XLSX.utils.book_new();

      // Sheet 1: Rent Roll
      const rentRows = tenants.filter(t => t.status === "active").map(t => ({
        "Tenant": t.name,
        "Contact": t.contactName,
        "Building": t.building,
        "Unit": t.unit,
        "Base Rent": t.monthlyRent,
        "Utilities": t.utilitiesFee,
        "NNN": t.nnnFee,
        "CAM": t.camFee,
        "Cleaning": t.cleaningFee,
        "NN": t.nnFee,
        "Total Monthly": t.monthlyRent + t.utilitiesFee + t.nnnFee + t.camFee + t.cleaningFee + t.nnFee,
        "Annual": (t.monthlyRent + t.utilitiesFee + t.nnnFee + t.camFee + t.cleaningFee + t.nnFee) * 12,
        "Lease Start": t.leaseStart || "",
        "Lease End": t.leaseEnd || "",
        "Status": t.status,
        "Phone": t.phone,
        "Email": t.email,
      }));
      const ws1 = XLSX.utils.json_to_sheet(rentRows);
      XLSX.utils.book_append_sheet(wb, ws1, "Rent Roll");

      // Sheet 2: QB Customer Import
      const custRows = tenants.map(t => ({
        "Customer Name": t.unit ? `${t.name} - ${t.building} ${t.unit}` : `${t.name} - ${t.building}`,
        "Contact": t.contactName || t.name,
        "Phone": t.phone,
        "Email": t.email,
        "Building": t.building,
        "Unit": t.unit,
      }));
      const ws2 = XLSX.utils.json_to_sheet(custRows);
      XLSX.utils.book_append_sheet(wb, ws2, "QB Customers");

      // Download Excel
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `operateiq-qb-export-${dateStr}.xlsx`);

      // Download IIF
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `operateiq-qb-import-${dateStr}.iif`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error("QB export error:", e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={exportIIF}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white text-sm font-black hover:opacity-90 disabled:opacity-40 transition-all"
      >
        {exporting ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Download size={13} /> Export for QuickBooks</>}
      </button>
      {tenantCount !== null && (
        <p className="text-[11px] text-gray-400 text-center">{tenantCount} active tenant{tenantCount !== 1 ? "s" : ""} will be exported</p>
      )}
    </div>
  );
}

// ─── Import Panel ─────────────────────────────────────────────────────────────

type ImportRow = Record<string, string | number>;

function ImportPanel() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setErr(""); setDone(0); setRows([]); setHeaders([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed: ImportRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!parsed.length) { setErr("No rows found in file."); return; }
        setHeaders(Object.keys(parsed[0]));
        setRows(parsed.slice(0, 5)); // preview first 5
      } catch { setErr("Could not read file. Make sure it's .xlsx or .csv."); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function doImport() {
    if (!inputRef.current?.files?.[0]) return;
    setImporting(true); setErr(""); setDone(0);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows: ImportRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        let count = 0;
        for (const row of allRows) {
          const name = String(row["Name"] || row["name"] || row["Contact"] || row["Lead Name"] || "").trim();
          if (!name) continue;
          const body = {
            name,
            phone:          String(row["Phone"] || row["phone"] || ""),
            email:          String(row["Email"] || row["email"] || ""),
            spaceType:      String(row["Space Type"] || row["spaceType"] || row["Type"] || "Office Space"),
            budget:         String(row["Budget/mo"] || row["Budget"] || row["budget"] || ""),
            timeline:       String(row["Timeline"] || row["timeline"] || "Exploring options"),
            teamSize:       String(row["Team Size"] || row["teamSize"] || "Solo"),
            additionalInfo: String(row["Notes"] || row["notes"] || row["Additional Info"] || ""),
            score:          Number(row["AI Score"] || row["Score"] || row["score"] || 50),
            scoreLabel:     String(row["Label"] || row["scoreLabel"] || "Warm Lead"),
            reasoning:      `Imported from spreadsheet on ${new Date().toLocaleDateString()}.`,
            source:         "import",
            medium:         "excel",
          };
          await fetch("/api/admin-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          count++;
        }
        setDone(count); setImporting(false);
      };
      reader.readAsArrayBuffer(inputRef.current.files[0]);
    } catch { setErr("Import failed. Please try again."); setImporting(false); }
  }

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Drop zone */}
      <label
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(96,165,250,0.25)] bg-[rgba(96,165,250,0.04)] p-5 cursor-pointer hover:border-[rgba(96,165,250,0.5)] hover:bg-[rgba(96,165,250,0.07)] transition-all"
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={e => e.preventDefault()}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <Upload size={20} className="text-[#60A5FA] opacity-60" />
        <p className="text-xs text-gray-500 text-center">Drag & drop your <strong className="text-gray-400">.xlsx</strong> or <strong className="text-gray-400">.csv</strong> here<br />or click to browse</p>
      </label>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-auto max-h-40">
          <p className="text-xs text-gray-600 font-bold uppercase tracking-wider px-3 pt-2 pb-1">Preview — first {rows.length} rows</p>
          <table className="w-full text-xs text-gray-400">
            <thead><tr className="border-b border-[rgba(255,255,255,0.05)]">
              {headers.slice(0,5).map(h => <th key={h} className="px-3 py-1 text-left text-[9px] text-gray-600 font-bold uppercase">{h}</th>)}
            </tr></thead>
            <tbody>{rows.map((r,i) => (
              <tr key={i} className="border-b border-[rgba(255,255,255,0.03)]">
                {headers.slice(0,5).map(h => <td key={h} className="px-3 py-1.5 truncate max-w-[80px]">{String(r[h]).slice(0,30)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {err && <p className="text-xs text-red-400">{err}</p>}
      {done > 0 && <p className="text-xs text-[#4ADE80] font-bold">✓ {done} leads imported successfully!</p>}

      {rows.length > 0 && (
        <button
          onClick={doImport}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white text-sm font-black hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {importing ? <><Loader2 size={13} className="animate-spin" /> Importing…</> : <><Upload size={13} /> Import All Rows</>}
        </button>
      )}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
// Hover on desktop · long-press on mobile · zero external deps

function Tooltip({ text, children, wide }: { text: string; children: React.ReactNode; wide?: boolean }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => setVisible(true);
  const hide = () => { setVisible(false); if (timerRef.current) clearTimeout(timerRef.current); };
  const startLong = () => { timerRef.current = setTimeout(() => setVisible(true), 500); };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={show} onMouseLeave={hide}
      onTouchStart={startLong} onTouchEnd={hide} onTouchCancel={hide}
    >
      {children}
      {visible && (
        <span
          className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[999] ${wide ? "w-56" : "w-44"} text-center`}
          role="tooltip"
        >
          <span className="block px-3 py-2 rounded-xl text-xs leading-snug font-medium text-gray-200 bg-[rgba(10,16,26,0.97)] border border-[rgba(255,255,255,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
            {text}
          </span>
          {/* Caret */}
          <span className="block w-2 h-2 mx-auto -mt-1 rotate-45 bg-[rgba(10,16,26,0.97)] border-r border-b border-[rgba(255,255,255,0.1)]" />
        </span>
      )}
    </span>
  );
}

// ─── User Section Component ──────────────────────────────────────────────────

// ─── Owner lock — these emails can never be deleted from the dashboard
const OWNER_EMAILS = new Set([
  "wireddigitalus@gmail.com", // Robert Neilson — developer
]);

function UserSection({ title, role, icon, color, users, onRefresh }: {
  title: string; role: string; icon: React.ReactNode; color: string;
  users: AllowedUser[]; onRefresh: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const isStaffRole = role === "maintenance" || role === "cleaning";

  const [inviteUser, setInviteUser] = useState<AllowedUser | null>(null);
  const [copied, setCopied] = useState(false);

  const getInviteMessage = (u: AllowedUser) => {
    const domain = typeof window !== "undefined" ? window.location.origin : "";
    if (u.role === "admin" || u.role === "manager") {
      return `Hi ${u.name.split(" ")[0] || "there"}, you've been invited to join our team on the OperateIQ workspace:

${domain}/admin/login

Sign in with your work email (${u.email}) using Google or request an Email Magic Link to access the dashboard.`;
    }
    const portalUrl = `${domain}/staff/${u.role}`;
    return `Hi ${u.name.split(" ")[0] || "there"}, here is the link to your OperateIQ ${u.role === "cleaning" ? "Cleaning" : "Maintenance"} Portal:

${portalUrl}

PIN Code: ${u.pin || ""}

Save a shortcut to your phone's Home Screen:
📱 iPhone (Safari): Open link -> Tap Share -> "Add to Home Screen"
🤖 Android (Chrome): Open link -> Tap 3-dots Menu -> "Add to Home Screen"`;
  };

  const handleCopyInvite = (u: AllowedUser) => {
    const msg = getInviteMessage(u);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generatePin = () => {
    const p = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(p);
  };

  const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-600";

  const addUser = async () => {
    if (!isStaffRole && !email.trim()) { setError("Email is required."); return; }
    if (isStaffRole && !name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    try {
      const payload: Record<string, string> = { name: name.trim(), role };
      if (email.trim()) payload.email = email.trim();
      if (isStaffRole && pin.trim()) payload.pin = pin.trim();
      const res = await fetch("/api/allowed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed — email may already exist."); }
      else { setEmail(""); setName(""); setPin(""); setShowAdd(false); onRefresh(); }
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const removeUser = async (id: string) => {
    await fetch(`/api/allowed-users?id=${id}`, { method: "DELETE" });
    onRefresh();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/allowed-users?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    onRefresh();
  };

  // PIN reset state — tracks which user is being edited + new PIN value
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  const startPinEdit = (u: AllowedUser) => {
    setEditingPinId(u.id);
    setNewPin(u.pin || "");
  };

  const resetPin = async (id: string) => {
    if (newPin.length !== 6) return;
    setSavingPin(true);
    await fetch(`/api/allowed-users?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin }),
    });
    setSavingPin(false);
    setEditingPinId(null);
    setNewPin("");
    onRefresh();
  };

  return (
    <div className="rounded-2xl border bg-[rgba(255,255,255,0.02)] p-5"
      style={{ borderColor: `${color}22`, boxShadow: `0 0 20px ${color}10` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18`, border: `1px solid ${color}35` }}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{title}</h3>
            <p className="text-xs text-gray-600">{users.length} user{users.length !== 1 ? "s" : ""} · instant access control</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
          style={{ color, borderColor: `${color}40`, backgroundColor: showAdd ? `${color}15` : "transparent" }}>
          <Plus size={11} /> Add
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.2)] space-y-2">
          <div className={`grid ${isStaffRole ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Full Name {isStaffRole && '*'}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Mike D." className={FIELD} />
            </div>
            {!isStaffRole && (
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Gmail Address *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="mike@gmail.com" type="email" className={FIELD}
                  onKeyDown={e => { if (e.key === "Enter") addUser(); }} />
              </div>
            )}
          </div>
          {isStaffRole && (
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">6-Digit PIN</label>
              <div className="flex gap-2">
                <input value={pin} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setPin(v); }}
                  placeholder="123456" maxLength={6} inputMode="numeric" pattern="[0-9]*"
                  className={FIELD + " font-mono tracking-[0.3em] text-center"}
                  onKeyDown={e => { if (e.key === "Enter") addUser(); }} />
                <button onClick={generatePin} type="button"
                  className="px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-xs font-bold text-gray-400 hover:text-white hover:border-[rgba(255,255,255,0.25)] transition-all whitespace-nowrap">
                  🎲 Random
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">Leave empty for default PIN: 123456</p>
            </div>
          )}
          {isStaffRole && (
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Email (optional)</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="mike@gmail.com" type="email" className={FIELD} />
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addUser} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, color: "#000" }}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saving ? "Adding…" : "Add User"}
            </button>
            <button onClick={() => { setShowAdd(false); setError(""); setEmail(""); setName(""); setPin(""); }}
              className="px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
      {users.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">{isStaffRole ? "No staff yet — add a name and PIN above." : "No users yet — add a Gmail address above."}</p>
        )}
        {users.map(u => {
            const isOwner = u.email ? OWNER_EMAILS.has(u.email.toLowerCase()) : false;
            return (
          <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${u.active ? "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]" : "border-[rgba(255,255,255,0.03)] opacity-40"}`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
              {initials(u.name || u.email || "?")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white truncate">{u.name || "(no name)"}</p>
                {isOwner && (
                  <Tooltip text="Owner account — protected. Can only be removed via Supabase directly.">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-black cursor-help">🔒 Owner</span>
                  </Tooltip>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{u.email || "(PIN-only)"}</p>
              {isStaffRole && u.pin && (
                <div className="mt-1">
                  {editingPinId === u.id ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        value={newPin}
                        onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit PIN"
                        className="w-28 bg-[rgba(255,255,255,0.07)] border border-[rgba(250,204,21,0.4)] rounded-lg px-2 py-1 text-xs font-mono text-white outline-none tracking-widest"
                      />
                      <button
                        onClick={() => setNewPin(Math.floor(100000 + Math.random() * 900000).toString())}
                        className="text-[10px] text-gray-500 hover:text-white px-1.5 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] transition-colors"
                      >Gen</button>
                      <button
                        onClick={() => resetPin(u.id)}
                        disabled={newPin.length !== 6 || savingPin}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[rgba(250,204,21,0.15)] border border-[rgba(250,204,21,0.35)] text-[#FACC15] disabled:opacity-40 transition-all"
                      >{savingPin ? "…" : "Save"}</button>
                      <button onClick={() => setEditingPinId(null)} className="text-gray-600 hover:text-white transition-colors"><X size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startPinEdit(u)}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mt-0.5">
                      <span className="font-mono tracking-wider bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded">PIN: {u.pin}</span>
                      <span className="text-[10px] text-gray-600 hover:text-[#FACC15]" title="Reset PIN">✏️</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
              {!isOwner ? (
                <button onClick={() => toggleActive(u.id, u.active)}
                  title={u.active ? "Suspend access" : "Re-enable access"}
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg border transition-all ${
                    u.active ? "text-[#4ADE80] border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.08)] hover:bg-[rgba(239,68,68,0.08)] hover:text-red-400 hover:border-[rgba(239,68,68,0.3)]"
                    : "text-gray-600 border-[rgba(255,255,255,0.08)] hover:text-[#4ADE80]"
                  }`}>
                  {u.active ? "Active" : "Off"}
                </button>
              ) : (
                <span className="text-xs text-[#4ADE80] font-bold px-2 py-0.5 rounded-lg border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.06)]">Active</span>
              )}
              {isStaffRole && u.active && u.pin && (
                <button onClick={() => setInviteUser(u)}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all px-2 py-1 rounded-md border hover:brightness-110 active:scale-95 whitespace-nowrap"
                  style={{
                    color,
                    borderColor: `${color}40`,
                    backgroundColor: `${color}15`,
                  }}
                  title="Share setup instructions & link">
                  <Share2 size={10} />
                  <span>Invite</span>
                </button>
              )}
            </div>
            {!isOwner && (
              <button onClick={() => removeUser(u.id)} className="flex-shrink-0 text-gray-700 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
            );
          })}
      </div>

      {/* Setup hint (shown only if table doesn't exist yet) */}
      {role === "admin" && users.length === 0 && (
        <p className="text-xs text-gray-700 mt-3">
          💡 First time? Run the SQL setup in the Supabase SQL Editor, then add users here.
        </p>
      )}

      {/* Invite Modal Overlay */}
      {inviteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0D1117] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center animate-pulse" style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
                  <Smartphone size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Share Portal Invite</h3>
                  <p className="text-xs text-gray-500">{inviteUser.name} · {title}</p>
                </div>
              </div>
              <button onClick={() => setInviteUser(null)} className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-wider block mb-1.5">Invite Text Message</label>
                <textarea
                  readOnly
                  rows={8}
                  className="w-full bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 text-xs font-mono text-gray-300 outline-none resize-none leading-relaxed mb-2.5"
                  value={getInviteMessage(inviteUser)}
                />
                <button
                  onClick={() => handleCopyInvite(inviteUser)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black text-black active:scale-95 transition-all shadow-lg hover:brightness-110"
                  style={{ backgroundColor: color }}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={13} /> Message Copied!
                    </>
                  ) : (
                    <>
                      <Share2 size={13} /> Copy Message to Clipboard
                    </>
                  )}
                </button>
                <p className="text-[10px] text-gray-600 mt-1.5">Copy this text and send it to the staff member to help them get set up.</p>
              </div>

              {/* Instructions */}
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-black text-white flex items-center gap-1.5">
                  📌 Saving to Phone's Home Screen
                </p>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-400">
                  <div>
                    <p className="font-bold text-gray-300 mb-0.5">📱 iPhone (Safari):</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Open portal link</li>
                      <li>Tap Share button</li>
                      <li>Tap "Add to Home Screen"</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-bold text-gray-300 mb-0.5">🤖 Android (Chrome):</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Open portal link</li>
                      <li>Tap 3-dot Menu</li>
                      <li>Tap "Add to Home Screen"</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={() => setInviteUser(null)}
                className="px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-400 text-xs font-bold hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Notifications Card (Beta) ────────────────────────────────────────────────

const NOTIF_KEY = "oiq_notif_prefs";

interface NotifPrefs {
  emailEnabled: boolean;
  emailAddress: string;
  smsEnabled: boolean;
  smsPhone: string;
  alerts: {
    newLead: boolean;
    maintenanceEmergency: boolean;
    chatRequest: boolean;
    cleaningComplete: boolean;
    weeklyDigest: boolean;
  };
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

const DEFAULT_PREFS: NotifPrefs = {
  emailEnabled: false,
  emailAddress: "",
  smsEnabled: false,
  smsPhone: "",
  alerts: {
    newLead: true,
    maintenanceEmergency: true,
    chatRequest: false,
    cleaningComplete: false,
    weeklyDigest: true,
  },
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
};

function NotificationsCard() {
  const [prefs, setPrefs] = useState<NotifPrefs>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try {
      const saved = localStorage.getItem(NOTIF_KEY);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleAlert = (key: keyof NotifPrefs["alerts"]) => {
    update({ alerts: { ...prefs.alerts, [key]: !prefs.alerts[key] } });
  };

  const ALERT_TYPES: { key: keyof NotifPrefs["alerts"]; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "newLead", label: "New Lead", icon: <Zap size={14} className="text-[#FACC15]" />, desc: "Instant alert when a prospect submits a form" },
    { key: "maintenanceEmergency", label: "Maintenance Emergency", icon: <AlertCircle size={14} className="text-[#EF4444]" />, desc: "Urgent tickets from maintenance staff" },
    { key: "chatRequest", label: "AI Chat Escalation", icon: <MessageSquare size={14} className="text-[#60A5FA]" />, desc: "When a visitor asks to speak with a person" },
    { key: "cleaningComplete", label: "Cleaning Complete", icon: <Sparkles size={14} className="text-[#4ADE80]" />, desc: "Unit turnovers marked as done" },
    { key: "weeklyDigest", label: "Weekly Digest", icon: <BarChart3 size={14} className="text-[#A78BFA]" />, desc: "Summary of leads, activity & performance" },
  ];

  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {/* Header — clickable to expand/collapse */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-1 group">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#F59E0B] to-[#EF4444] flex items-center justify-center flex-shrink-0">
          <BellRing size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Notifications</h2>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[rgba(250,204,21,0.15)] to-[rgba(245,158,11,0.15)] border border-[rgba(250,204,21,0.3)] text-[#FACC15] font-black tracking-wider">BETA</span>
        <div className="ml-auto w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
          <ChevronRight size={16} className={`text-[#FACC15] transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      <p className="text-xs text-gray-500 mb-3">
        Configure how you get notified about new leads, emergencies, and activity.
      </p>

      {!expanded ? null : (<>

      {/* Saved toast */}
      {saved && (
        <div className="mb-4 flex items-center gap-2 text-xs text-[#4ADE80] font-bold animate-pulse">
          <CheckCircle2 size={12} /> Preferences saved
        </div>
      )}

      <div className="space-y-4">

        {/* ── Active Email Notifications ── */}
        <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4 shadow-[0_0_24px_rgba(56,189,248,0.06)]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Mail size={16} className="text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Email Notifications</p>
              <p className="text-xs text-[#4ADE80] font-bold">Active · Powered by Resend</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
              <span className="text-[10px] font-black text-[#4ADE80] uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Recipients */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Recipients</p>
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-600 px-3 py-2 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">Configure recipients in the LEAD_NOTIFY_TO environment variable.</p>
              {([] as { name: string; email: string }[]).map(r => (
                <div key={r.email} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">
                  <div className="w-6 h-6 rounded-lg bg-[rgba(74,222,128,0.1)] flex items-center justify-center text-[10px] font-black text-[#4ADE80]">
                    {r.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{r.name}</p>
                    <p className="text-[10px] text-gray-600 truncate">{r.email}</p>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* What triggers emails */}
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Triggers</p>
            <div className="space-y-1">
              {[
                { icon: <Zap size={12} className="text-[#FACC15]" />, label: "New Lead (Chatbot)", desc: "Instant email when someone submits via Ask OpsIQ" },
                { icon: <MessageSquare size={12} className="text-[#60A5FA]" />, label: "Contact Form", desc: "Inquiry from the website contact page" },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[rgba(0,0,0,0.15)]">
                  <div className="w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center flex-shrink-0">
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{t.label}</p>
                    <p className="text-[10px] text-gray-600">{t.desc}</p>
                  </div>
                  <span className="text-[9px] font-black text-[#4ADE80] px-2 py-0.5 rounded-md bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)]">ON</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SMS Alerts (Coming Soon) ── */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[rgba(8,12,20,0.6)] backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center mb-2">
              <Lock size={16} className="text-gray-500" />
            </div>
            <p className="text-xs font-black text-gray-400">Coming Soon</p>
            <p className="text-xs text-gray-600 mt-0.5">SMS & Customizable Preferences</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[rgba(74,222,128,0.12)] flex items-center justify-center">
              <Smartphone size={16} className="text-[#4ADE80]" />
            </div>
            <div>
              <p className="text-sm font-black text-white">SMS Alerts & Custom Routing</p>
              <p className="text-xs text-gray-500">Per-user preferences, Twilio SMS, quiet hours</p>
            </div>
          </div>
        </div>

      </div>

      </>)}
    </div>
  );
}


// ─── Social Capture Links Card ──────────────────────────────────────────────

export function SocialLinksCard() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState("");
  const BASE = typeof window !== "undefined" ? window.location.origin : "";

  const LINKS = [
    { slug: "", label: "All Properties", emoji: "🏠", desc: "Default — shows all properties equally" },
    { slug: "admin-login", label: "Admin Portal", emoji: "🔒", desc: "Direct login link for staff & administration", isDirect: true },
  ];

  function copy(platform: "fb" | "ig" | "link", slug: string, isDirect?: boolean) {
    const url = isDirect ? `${BASE}/l/admin` : (slug ? `${BASE}/l/${platform}?feature=${slug}` : `${BASE}/l/${platform}`);
    navigator.clipboard.writeText(url);
    setCopied(`${platform}-${slug}`);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-1 group">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#3B82F6] to-[#EC4899] flex items-center justify-center flex-shrink-0">
          <Share2 size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Social Capture Links</h2>
        <div className="ml-auto w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
          <ChevronRight size={16} className={`text-[#60A5FA] transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      <p className="text-[13px] text-gray-400 mb-3">
        Copy ready-to-use links for Facebook & Instagram posts. Feature a specific property to match your social content.
      </p>

      {!expanded ? null : (<>
        <div className="space-y-2">
          {LINKS.map(({ slug, label, emoji, desc, isDirect }) => (
            <div key={slug || "all"} className="flex items-center gap-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{emoji} {label}</p>
                <p className="text-xs text-gray-400 truncate">{desc}</p>
              </div>
              {isDirect ? (
                <button
                  onClick={() => copy("link", slug, true)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                    copied === `link-${slug}`
                      ? "bg-[#4ADE80] text-black"
                      : "bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.25)] text-[#A78BFA] hover:bg-[rgba(167,139,250,0.2)]"
                  }`}
                >
                  {copied === `link-${slug}` ? "✓ Copied" : "🔗 Copy Link"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => copy("fb", slug)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      copied === `fb-${slug}`
                        ? "bg-[#4ADE80] text-black"
                        : "bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] text-[#60A5FA] hover:bg-[rgba(59,130,246,0.2)]"
                    }`}
                  >
                    {copied === `fb-${slug}` ? "✓ Copied" : "📘 FB"}
                  </button>
                  <button
                    onClick={() => copy("ig", slug)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      copied === `ig-${slug}`
                        ? "bg-[#4ADE80] text-black"
                        : "bg-[rgba(236,72,153,0.12)] border border-[rgba(236,72,153,0.25)] text-[#F472B6] hover:bg-[rgba(236,72,153,0.2)]"
                    }`}
                  >
                    {copied === `ig-${slug}` ? "✓ Copied" : "📷 IG"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-[rgba(74,222,128,0.04)] border border-[rgba(74,222,128,0.12)] px-3 py-2.5">
          <p className="text-[13px] text-gray-400 leading-relaxed">
            <span className="text-[#4ADE80] font-bold">How it works:</span> Paste the link into your Facebook/Instagram post. When someone clicks, they land on a branded page that highlights the featured property with a hero card, photo, and CTA — the rest of your properties show below.
          </p>
        </div>
      </>)}
    </div>
  );
}

// ─── Settings Panel ────────────────────────────────────────────────────────────

// ─── Login History & AI Security Guard ────────────────────────────────────────────

interface LoginEntry {
  id: string;
  actor_name: string;
  actor_email: string;
  action?: string;
  metadata?: { device?: string; reason?: string; simulated?: boolean };
  created_at: string;
}

function LoginHistory() {
  const [logins, setLogins] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    securityScore: number;
    threatLevel: "safe" | "warning" | "threat";
    summary: string;
    anomalies: string[];
  } | null>(null);

  const [simulatedActive, setSimulatedActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("oiq_simulated_threat") === "true";
  });

  const fetchLoginsAndAudit = useCallback(async (isSimulated: boolean) => {
    setLoading(true);
    setAuditing(true);
    try {
      const res = await fetch("/api/activity-log?resource_type=auth&limit=50");
      const data = await res.json();
      let logsList: LoginEntry[] = data.logs || [];
      
      if (isSimulated) {
        const simulatedLog: LoginEntry = {
          id: "sim_threat_123",
          actor_name: "Intruder (Simulated)",
          actor_email: "attacker_root@hacker.io",
          action: "admin_blocked",
          metadata: { device: "linux", reason: "Simulated brute-force credentials from suspicious IP (194.226.154.21 - St. Petersburg, RU)", simulated: true },
          created_at: new Date().toISOString()
        };
        logsList = [simulatedLog, ...logsList];
      }
      
      setLogins(logsList);
      
      // Perform AI audit via our security-audit endpoint
      const auditRes = await fetch("/api/security-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logsList.slice(0, 15) }), // send top 15 logs for efficiency
      });
      const auditData = await auditRes.json();
      setAuditResult(auditData);
    } catch (err) {
      console.error("Failed to fetch logs or audit:", err);
      // Use fallback
      setAuditResult({
        securityScore: isSimulated ? 65 : 98,
        threatLevel: isSimulated ? "threat" : "safe",
        summary: isSimulated 
          ? "Simulated threat evaluation: Detected blocked brute force attempt from unrecognized Russian IP address. Score penalized." 
          : "AI Security Shield active. Analyzed recent logins. System running normally.",
        anomalies: isSimulated ? ["Simulated Brute-Force Attack"] : []
      });
    } finally {
      setLoading(false);
      setAuditing(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) {
      fetchLoginsAndAudit(simulatedActive);
    }
  }, [expanded, fetchLoginsAndAudit]); // Runs when expanded toggles to true

  const toggleSimulation = () => {
    const next = !simulatedActive;
    setSimulatedActive(next);
    localStorage.setItem("oiq_simulated_threat", String(next));
    fetchLoginsAndAudit(next);
  };

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Find the first actual successful login session to mark as current
  const firstRealLogin = logins.find(l => !l.metadata?.simulated && l.action === "admin_login");

  return (
    <div>
      {/* Accordion Trigger button */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-1 group">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center flex-shrink-0">
          <Shield size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          AI Login Guard
          {!expanded && (
            <span className={`w-2 h-2 rounded-full ${
              simulatedActive ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-pulse"
            }`} />
          )}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {!expanded && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
              simulatedActive 
                ? "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.25)] text-red-400 animate-pulse" 
                : "bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.25)] text-[#4ADE80]"
            }`}>
              {simulatedActive ? "Demo Threat" : "Secured"}
            </span>
          )}
          <div className="w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
            <ChevronRight size={16} className={`text-[#60A5FA] transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
      </button>
      <p className="text-xs text-gray-500 mb-3">
        AI-audited authentication sessions and allowlist defense to safeguard the OperateIQ dashboard.
      </p>

      {expanded && (
        <div className="space-y-5">
          {/* AI Security Shield Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Circular Gauge */}
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${
                simulatedActive || auditResult?.threatLevel === "threat"
                  ? "bg-red-500 blur-[80px]"
                  : auditResult?.threatLevel === "warning"
                  ? "bg-yellow-500 blur-[80px]"
                  : "bg-emerald-500 blur-[80px]"
              }`} />
              
              <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke={
                      simulatedActive || auditResult?.threatLevel === "threat"
                        ? "#EF4444"
                        : auditResult?.threatLevel === "warning"
                        ? "#FACC15"
                        : "#4ADE80"
                    }
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * (auditResult?.securityScore ?? 98)) / 100}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                
                <div className="text-center z-10">
                  <p className="text-3xl font-black tracking-tight tabular-nums text-white">
                    {loading && !auditResult ? "--" : (auditResult?.securityScore ?? 98)}
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Score</p>
                </div>
              </div>

              <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                simulatedActive || auditResult?.threatLevel === "threat"
                  ? "bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-red-400 animate-pulse"
                  : auditResult?.threatLevel === "warning"
                  ? "bg-[rgba(250,204,21,0.12)] border border-[rgba(250,204,21,0.3)] text-[#FACC15]"
                  : "bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] text-[#4ADE80]"
              }`}>
                {loading && auditing ? "Auditing…" : simulatedActive ? "Demo Threat" : (auditResult?.threatLevel ?? "secured")}
              </span>
            </div>

            {/* AI Summary and Controls */}
            <div className="md:col-span-2 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={11} className="text-[#4ADE80]" />
                    AI Guard Audit Summary
                  </p>
                  {auditing && <Loader2 size={12} className="animate-spin text-gray-500" />}
                </div>
                
                {loading && !auditResult ? (
                  <div className="space-y-2 py-2">
                    <div className="h-4 bg-gray-800 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-800 rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-gray-800 rounded w-2/3 animate-pulse" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-300 leading-relaxed font-medium mb-3">
                      {auditResult?.summary ?? "OpsIQ Security Guard is active. Logs are scanned for anomalies continuously. No immediate concerns."}
                    </p>

                    {auditResult?.anomalies && auditResult.anomalies.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {auditResult.anomalies.map((a: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-red-400 font-bold bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.15)] rounded-lg px-2.5 py-1">
                            <AlertCircle size={12} className="flex-shrink-0" />
                            {a}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => fetchLoginsAndAudit(simulatedActive)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  <RefreshCw size={12} className={loading && auditing ? "animate-spin" : ""} />
                  Audit Now
                </button>

                <button
                  onClick={toggleSimulation}
                  disabled={loading && auditing}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                    simulatedActive
                      ? "bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-red-400 hover:bg-[rgba(239,68,68,0.18)]"
                      : "bg-[rgba(96,165,250,0.12)] border border-[rgba(96,165,250,0.25)] text-[#60A5FA] hover:bg-[rgba(96,165,250,0.18)]"
                  }`}
                >
                  {simulatedActive ? (
                    <>
                      <X size={12} />
                      Dismiss Demo
                    </>
                  ) : (
                    <>
                      <Zap size={12} />
                      Simulate Login Threat
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sessions Log List */}
          <div className="rounded-2xl border border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.03)] overflow-hidden" style={{ boxShadow: "0 0 22px rgba(96,165,250,0.06)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Sessions & Attempts</p>
              <button 
                onClick={() => fetchLoginsAndAudit(simulatedActive)} 
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-500 hover:text-white transition-colors"
              >
                <RefreshCw size={12} className={loading && auditing ? "animate-spin" : ""} />
              </button>
            </div>

            {loading && logins.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2">
                <Loader2 size={14} className="animate-spin text-[#60A5FA]" />
                <span className="text-xs text-gray-500">Loading session history…</span>
              </div>
            ) : logins.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={24} className="text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-600">No authentication events yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[360px] overflow-y-auto">
                {logins.map((login) => {
                  const isCurrent = firstRealLogin && login.id === firstRealLogin.id;
                  const isBlocked = login.action === "admin_blocked";
                  const isSimulated = login.metadata?.simulated;
                  const device = login.metadata?.device || "desktop";
                  
                  return (
                    <div key={login.id} className={`flex items-start sm:items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors ${
                      isCurrent ? "bg-[rgba(74,222,128,0.03)]" : isBlocked ? "bg-[rgba(239,68,68,0.02)]" : ""
                    }`}>
                      {/* Status dot */}
                      <div className="relative flex-shrink-0 mt-1 sm:mt-0">
                        {isCurrent ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" style={{ boxShadow: "0 0 8px rgba(74,222,128,0.5)" }}>
                            <div className="absolute inset-0 rounded-full bg-[#4ADE80] animate-ping opacity-40" />
                          </div>
                        ) : isBlocked ? (
                          <div className="w-2 h-2 rounded-full bg-[#EF4444]" style={{ boxShadow: "0 0 6px rgba(239,68,68,0.4)" }} />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-700" />
                        )}
                      </div>

                      {/* Name + email + details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-white truncate">{login.actor_name || "Unknown"}</p>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] font-black">
                              CURRENT
                            </span>
                          )}
                          {isBlocked && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-[#EF4444] font-black">
                              BLOCKED
                            </span>
                          )}
                          {isSimulated && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[rgba(167,139,250,0.15)] border border-[rgba(167,139,250,0.25)] text-[#A78BFA] font-black">
                              DEMO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{login.actor_email}</p>
                        {isBlocked && login.metadata?.reason && (
                          <p className="text-[10px] text-red-400 mt-0.5 italic">{login.metadata.reason}</p>
                        )}
                      </div>

                      {/* Device */}
                      <div className="flex-shrink-0 mt-1 sm:mt-0">
                        {device === "mobile" ? (
                          <Smartphone size={13} className="text-gray-600" />
                        ) : (
                          <Monitor size={13} className="text-gray-600" />
                        )}
                      </div>

                      {/* Time */}
                      <div className="flex-shrink-0 text-right min-w-[70px]">
                        <p className="text-xs font-bold text-gray-400 tabular-nums">{timeAgo(login.created_at)}</p>
                        <p className="text-[11px] text-gray-400 tabular-nums">
                          {new Date(login.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Panel ──────────────────────────────────────────────────────

// ─── Data Import/Export (Collapsible) ─────────────────────────────────────────

function DataExportSection({ leads }: { leads: Lead[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-1 group">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Data Import / Export</h2>
        <div className="ml-auto w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
          <ChevronRight size={16} className={`text-[#60A5FA] transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      <p className="text-xs text-gray-500 mb-3">
        Bring in historical leads from Excel, or export your full dashboard data for backup, sharing, or analysis.
      </p>
      {expanded && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-5 flex flex-col gap-3 shadow-[0_0_24px_rgba(56,189,248,0.06)]">
              <div className="flex items-center gap-2">
                <Download size={15} className="text-sky-400" />
                <p className="text-xs font-black text-white uppercase tracking-widest">Export Leads</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Download all active leads as a formatted Excel spreadsheet — names, phones, scores, budgets, timelines and more.
              </p>
              <div className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-3">
                <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-2">Columns included</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Name","Phone","Email","Space Type","Budget/mo","Timeline","Team Size","AI Score","Label","Source","Submitted"].map(c => (
                    <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.12)] text-gray-500">{c}</span>
                  ))}
                </div>
              </div>
              <ExportButton leads={leads} />
            </div>
            <div className="rounded-2xl border border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.03)] p-5 flex flex-col gap-3"
              style={{ boxShadow: "0 0 22px rgba(96,165,250,0.08)" }}>
              <div className="flex items-center gap-2">
                <Upload size={15} className="text-[#60A5FA]" />
                <p className="text-xs font-black text-white uppercase tracking-widest">Import Leads</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Upload an Excel (.xlsx) or CSV file. We&apos;ll map the columns automatically.
              </p>
              <ImportPanel />
            </div>
          </div>

          {/* ── QuickBooks Desktop Export ── */}
          <div className="rounded-2xl border border-[rgba(250,204,21,0.2)] bg-[rgba(250,204,21,0.03)] p-5"
            style={{ boxShadow: "0 0 22px rgba(250,204,21,0.06)" }}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[rgba(250,204,21,0.12)] flex items-center justify-center text-base">📒</div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-widest">QuickBooks Desktop</p>
                    <p className="text-[11px] text-gray-400">Export tenant data for QB Desktop import</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  Downloads <strong className="text-gray-400">two files</strong>: an IIF file (QuickBooks native import format) with your customer list and monthly invoices, plus an Excel workbook with a clean rent roll and customer list.
                </p>
                <div className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-3 mb-3">
                  <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mb-2">What&apos;s included</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
                      Customer list (all tenants)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
                      Monthly invoices per tenant
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
                      Rent, NNN, CAM, utilities, cleaning
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
                      Excel rent roll with annual totals
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[rgba(250,204,21,0.1)] bg-[rgba(0,0,0,0.2)] p-3">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    <strong className="text-[#FACC15]">How to import:</strong> In QuickBooks Desktop → File → Utilities → Import → IIF Files → select the downloaded .iif file. The Excel file is for your reference.
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 sm:pt-8">
                <QBExportButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Danger Zone (Collapsible) ────────────────────────────────────────────────

function DangerZoneSection({ leads, deletingAll, deleteAllConfirm, setDeleteAllConfirm, deleteAllLeads }: {
  leads: Lead[]; deletingAll: boolean; deleteAllConfirm: string;
  setDeleteAllConfirm: (v: string) => void; deleteAllLeads: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 mb-1 group">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#EF4444] to-[#DC2626] flex items-center justify-center flex-shrink-0">
          <AlertCircle size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Danger Zone</h2>
        <div className="ml-auto w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
          <ChevronRight size={16} className={`text-[#EF4444] transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      <p className="text-xs text-gray-500 mb-3">
        Permanently delete all leads from the database. This action cannot be undone.
      </p>
      {expanded && (
        <div className="rounded-2xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)] p-5"
          style={{ boxShadow: "0 0 22px rgba(239,68,68,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 size={15} className="text-red-400" />
            <p className="text-xs font-black text-white uppercase tracking-widest">Clear All Leads</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-red-400 font-bold ml-auto">
              {leads.length} lead{leads.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            This will permanently remove <strong className="text-red-400">{leads.length}</strong> lead{leads.length !== 1 ? "s" : ""} from Supabase.
            Type <code className="text-red-400 bg-[rgba(239,68,68,0.1)] px-1.5 py-0.5 rounded text-xs font-bold">DELETE</code> below to confirm.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={deleteAllConfirm}
              onChange={e => setDeleteAllConfirm(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="flex-1 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(239,68,68,0.15)] text-white text-xs placeholder:text-gray-600 outline-none focus:border-[rgba(239,68,68,0.4)] transition-colors font-mono"
            />
            <button
              onClick={deleteAllLeads}
              disabled={deleteAllConfirm !== "DELETE" || deletingAll || leads.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.35)] text-red-400 text-xs font-bold hover:bg-[rgba(239,68,68,0.25)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {deletingAll ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {deletingAll ? "Deleting…" : "Delete All"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function SettingsPanel({
  leads,
  deletingAll,
  deleteAllConfirm,
  setDeleteAllConfirm,
  deleteAllLeads,
  activeOrg,
}: {
  leads: Lead[];
  deletingAll: boolean;
  deleteAllConfirm: string;
  setDeleteAllConfirm: (v: string) => void;
  deleteAllLeads: () => void;
  activeOrg?: { id: string; name: string; slug: string; tier: string; custom_domain?: string | null } | null;
}) {
  const [adminUsers,  setAdminUsers]  = useState<AllowedUser[]>([]);
  const [maintUsers,  setMaintUsers]  = useState<AllowedUser[]>([]);
  const [cleanUsers,  setCleanUsers]  = useState<AllowedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [setupSQL, setSetupSQL] = useState(false);
  const [editingQR, setEditingQR] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingQR, setDeletingQR] = useState<string | null>(null);
  const [savingQR, setSavingQR] = useState(false);
  const [hiddenQR, setHiddenQR] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("oiq_hidden_qr") || "[]") as string[]); }
    catch { return new Set(); }
  });
  const [showHidden, setShowHidden] = useState(false);

  function hideCard(id: string) {
    const next = new Set(hiddenQR).add(id);
    setHiddenQR(next);
    localStorage.setItem("oiq_hidden_qr", JSON.stringify([...next]));
    setDeletingQR(null);
  }

  function unhideCard(id: string) {
    const next = new Set(hiddenQR);
    next.delete(id);
    setHiddenQR(next);
    localStorage.setItem("oiq_hidden_qr", JSON.stringify([...next]));
  }

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [ar, mr, cr] = await Promise.all([
        fetch("/api/allowed-users?role=admin").then(r => r.json()),
        fetch("/api/allowed-users?role=maintenance&include_pins=true").then(r => r.json()),
        fetch("/api/allowed-users?role=cleaning&include_pins=true").then(r => r.json()),
      ]);
      setAdminUsers(ar.users || []);
      setMaintUsers(mr.users || []);
      setCleanUsers(cr.users || []);
      setSetupSQL(false);
    } catch { setSetupSQL(true); }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  return (
    <div className="space-y-8">
      {/* ── Public Website Custom Domain Manager (GoDaddy & IONOS) ── */}
      <CustomDomainManager
        orgId={activeOrg?.id}
        orgName={activeOrg?.name}
        currentDomain={activeOrg?.custom_domain}
      />

      {/* ─ Portal Access ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={15} className="text-[#4ADE80]" />
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Portal Access</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Admin access uses Gmail sign-in. Staff portals (Maintenance & Cleaning) use a 6-digit PIN — no Gmail required. Changes take effect immediately.
        </p>

        {/* Setup SQL banner */}
        {setupSQL && (
          <div className="mb-5 p-4 rounded-xl border border-white/12 bg-white/[0.02] shadow-[0_0_20px_rgba(56,189,248,0.06)]">
            <p className="text-xs font-bold text-sky-400 mb-2">One-time Supabase setup required</p>
            <p className="text-xs text-gray-400 mb-2">Run this SQL in your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#4ADE80] underline">Supabase SQL Editor</a>, then click Refresh:</p>
            <pre className="text-xs text-gray-300 bg-[rgba(0,0,0,0.5)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS allowed_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'admin',
  pin TEXT DEFAULT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_select_allowed_users" ON allowed_users
  FOR SELECT TO anon, authenticated USING (true);
REVOKE SELECT (pin) ON TABLE allowed_users FROM anon, authenticated;

-- If upgrading from an older schema, add the pin column:
-- ALTER TABLE allowed_users ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT NULL;
-- ALTER TABLE allowed_users ALTER COLUMN email DROP NOT NULL;

-- Seed your own email as first admin:
INSERT INTO allowed_users (id, email, name, role, active)
VALUES ('user_owner', 'you@example.com', 'Your Name', 'admin', true)
ON CONFLICT (email) DO NOTHING;`}</pre>
            <button onClick={loadUsers} className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#4ADE80] hover:underline">
              <RefreshCw size={11} /> Refresh after running SQL
            </button>
          </div>
        )}

        {usersLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Loader2 size={16} className="animate-spin text-[#4ADE80]" />
            <span className="text-sm text-gray-500">Loading users…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <UserSection
              title="Admin Dashboard"
              role="admin"
              icon={<Shield size={13} className="text-[#4ADE80]" />}
              color="#4ADE80"
              users={adminUsers}
              onRefresh={loadUsers}
            />
            <UserSection
              title="Maintenance Staff"
              role="maintenance"
              icon={<Wrench size={13} className="text-[#FACC15]" />}
              color="#FACC15"
              users={maintUsers}
              onRefresh={loadUsers}
            />
            <UserSection
              title="Cleaning Staff"
              role="cleaning"
              icon={<Sparkles size={13} className="text-[#4ADE80]" />}
              color="#34D399"
              users={cleanUsers}
              onRefresh={loadUsers}
            />
          </div>
        )}
      </div>

      {/* ─ Divider */}
      <div className="border-t border-[rgba(255,255,255,0.05)]" />

      {/* ── Notifications (Beta) ── */}
      <NotificationsCard />

      {/* ─ Divider */}
      <div className="border-t border-[rgba(255,255,255,0.05)]" />

      {/* ── Login History ── */}
      <LoginHistory />

      {/* ─ Divider */}
      <div className="border-t border-[rgba(255,255,255,0.05)]" />

      {/* ── Data Import / Export ── */}
      <DataExportSection leads={leads} />

      {/* ─ QR Capture Hub ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.35)]">
            <span className="text-white text-xs font-black">QR</span>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">QR Capture Cards</h2>
            <p className="text-xs text-gray-500">Each admin user gets a unique link — scan to capture leads in-person</p>
          </div>
          {hiddenQR.size > 0 && (
            <button
              onClick={() => setShowHidden(h => !h)}
              className="text-xs font-bold text-gray-500 hover:text-gray-300 border border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1 transition-colors"
            >
              {showHidden ? "Hide hidden" : `Show ${hiddenQR.size} hidden`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {adminUsers.map(admin => {
            const isHidden = hiddenQR.has(admin.id);
            if (isHidden && !showHidden) return null;

            const slug = nameToSlug(admin.name || admin.email);
            const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
            const captureUrl = `${baseUrl}/meet/${slug}`;
            const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=080C14&color=4ADE80&margin=10&data=${encodeURIComponent(captureUrl)}`;
            const qrLeadCount = leads.filter(l => l.source === "qr" && l.campaign === slug).length;
            const isEditing = editingQR === admin.id;
            const isDeleting = deletingQR === admin.id;

            async function saveEdit() {
              if (!editName.trim()) return;
              setSavingQR(true);
              await fetch(`/api/allowed-users?id=${admin.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName.trim() }),
              });
              setSavingQR(false);
              setEditingQR(null);
              loadUsers();
            }

            return (
              <div key={admin.id} className={`rounded-2xl border border-white/12 bg-white/[0.02] p-4 shadow-[0_0_20px_rgba(56,189,248,0.06)] ${isHidden ? "opacity-40" : ""}`}>
                {isHidden && (
                  <div className="flex items-center justify-between mb-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] px-3 py-2">
                    <span className="text-xs text-gray-500">Card hidden — login access unchanged</span>
                    <button onClick={() => unhideCard(admin.id)} className="text-xs font-bold text-[#4ADE80] hover:underline">Restore</button>
                  </div>
                )}
                {/* Header row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/25 flex items-center justify-center text-xs font-black text-sky-400">
                    {initials(admin.name || admin.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingQR(null); }}
                        className="w-full bg-[rgba(255,255,255,0.06)] border border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] rounded-lg px-2 py-1 text-sm text-white outline-none"
                      />
                    ) : (
                      <p className="text-sm font-bold text-white truncate">{admin.name || admin.email}</p>
                    )}
                    <p className="text-xs text-[#4ADE80] font-bold">{qrLeadCount} QR lead{qrLeadCount !== 1 ? "s" : ""}</p>
                  </div>
                  {/* Edit / Delete controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={savingQR}
                          className="px-2 py-1 rounded-lg text-xs font-black bg-blue-500/15 border border-blue-500/30 text-sky-400 hover:bg-blue-500/25 disabled:opacity-50 transition-colors"
                        >
                          {savingQR ? <Loader2 size={10} className="animate-spin" /> : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingQR(null)}
                          className="px-2 py-1 rounded-lg text-xs font-bold border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : isDeleting ? (
                      <>
                        <button
                          onClick={() => hideCard(admin.id)}
                          className="px-2 py-1 rounded-lg text-xs font-black bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.4)] text-red-400 hover:bg-[rgba(239,68,68,0.25)] transition-colors"
                        >
                          Hide Card
                        </button>
                        <button
                          onClick={() => setDeletingQR(null)}
                          className="px-2 py-1 rounded-lg text-xs font-bold border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Tooltip text="Edit display name">
                          <button
                            onClick={() => { setEditingQR(admin.id); setEditName(admin.name || ""); setDeletingQR(null); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white hover:border-[rgba(74,222,128,0.3)] transition-colors"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </Tooltip>
                        <Tooltip text="Hide this card (login stays active)">
                          <button
                            onClick={() => { setDeletingQR(admin.id); setEditingQR(null); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-red-400 hover:border-[rgba(239,68,68,0.3)] transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>

                {isDeleting && (
                  <p className="text-xs text-amber-400 bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.2)] rounded-xl px-3 py-2 mb-3">
                    This hides <strong>{admin.name || admin.email}&apos;s</strong> QR card from this view only. Their login access is <strong>not</strong> affected.
                  </p>
                )}

                <div className="flex justify-center my-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrSrc} alt={`QR for ${admin.name}`} width={120} height={120} className="rounded-xl" />
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-gray-500 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1.5 truncate">
                    /meet/{slug}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(captureUrl).catch(() => {}); }}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/12 text-sky-400 hover:border-white/25 hover:shadow-[0_0_12px_rgba(56,189,248,0.12)] bg-white/[0.02] transition-colors"
                  >
                    Copy
                  </button>
                  <a href={captureUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors"
                  >
                    Preview
                  </a>
                </div>
              </div>
            );
          })}
          {adminUsers.length === 0 && (
            <p className="text-xs text-gray-600 col-span-2 text-center py-6">Add admin users above to generate QR capture cards.</p>
          )}
        </div>
      </div>

      {/* ─ Divider */}
      <div className="border-t border-[rgba(255,255,255,0.05)]" />

      {/* ── Danger Zone: Clear All Leads ── */}
      <DangerZoneSection leads={leads} deletingAll={deletingAll} deleteAllConfirm={deleteAllConfirm} setDeleteAllConfirm={setDeleteAllConfirm} deleteAllLeads={deleteAllLeads} />
    </div>
  );
}

// ─── Default Export ───────────────────────────────────────────────────────────

export default SettingsPanel;
