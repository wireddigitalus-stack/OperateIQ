"use client";
import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  Landmark, CheckCircle2, XCircle, Search, RefreshCw, Loader2, Save,
  Building2, AlertTriangle, FileSpreadsheet, Printer,
} from "lucide-react";
import { Tenant, rowToTenant } from "./TenantsTab";
import PrintButton from "./PrintButton";

const STATUS_OPTIONS = [
  { value: "no_change", label: "No Change" },
  { value: "used_repairs", label: "Used for Repairs" },
  { value: "used_rent", label: "Used for Last Month Rent" },
  { value: "transferred", label: "Transferred" },
  { value: "returned", label: "Returned" },
  { value: "other", label: "Other" },
];

export default function SecurityDepositLedgerTab({
  currentUserName,
  currentUserEmail,
}: {
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants");
      if (!res.ok) throw new Error("Failed to fetch tenants");
      const d = await res.json();
      if (Array.isArray(d.tenants)) {
        setTenants(d.tenants.map(rowToTenant));
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const updateField = async (id: string, field: keyof Tenant, value: any) => {
    setSavingId(id);
    const tenantName = tenants.find(t => t.id === id)?.name || "";

    const payload: Record<string, any> = {
      actorName: currentUserName || "Staff",
      actorEmail: currentUserEmail || "",
      name: tenantName,
    };

    if (field === "securityDeposit") payload.securityDeposit = Number(value) || 0;
    else if (field === "secDepReceived") payload.secDepReceived = !!value;
    else if (field === "secDepDate") payload.secDepDate = value || null;
    else if (field === "secDepStatus") payload.secDepStatus = value;
    else if (field === "secDepNotes") payload.secDepNotes = value;

    try {
      const res = await fetch(`/api/tenants?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update field");
      
      // Update local state
      setTenants(prev =>
        prev.map(t => (t.id === id ? { ...t, [field]: value } : t))
      );
    } catch (err: any) {
      console.error(err);
      alert("Error saving: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const filtered = tenants
    .filter(t => t.status === "active")
    .filter(t => {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.building.toLowerCase().includes(q) ||
        t.unit.toLowerCase().includes(q)
      );
    });

  const totalDeposits = filtered.reduce((acc, t) => acc + (t.securityDeposit || 0), 0);
  const totalReceived = filtered.reduce((acc, t) => acc + (t.secDepReceived ? (t.securityDeposit || 0) : 0), 0);

  const exportCSV = () => {
    const headers = ["Tenant", "Property", "Unit", "Deposit Amount", "Received", "Received Date", "Status", "Notes"];
    const rows = filtered.map(t => [
      t.name,
      t.building,
      t.unit,
      t.securityDeposit || 0,
      t.secDepReceived ? "Yes" : "No",
      t.secDepDate || "",
      STATUS_OPTIONS.find(o => o.value === t.secDepStatus)?.label || t.secDepStatus || "No Change",
      t.secDepNotes || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `security_deposit_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass rounded-2xl border border-white/12 bg-[rgba(10,15,30,0.5)] p-4 sm:p-6 shadow-[0_0_24px_rgba(56,189,248,0.06)]">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400">
            <Landmark size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Security Deposit Ledger</h3>
            <p className="text-[10px] text-gray-500">Track and manage tenant escrow funds</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-xs shadow-[0_0_16px_rgba(56,189,248,0.04)]">
          <div>
            <span className="text-gray-500 uppercase tracking-widest text-[9px] block">Total Held</span>
            <span className="text-white font-black">${totalDeposits.toLocaleString()}</span>
          </div>
          <div className="border-l border-[rgba(255,255,255,0.06)] pl-6">
            <span className="text-gray-500 uppercase tracking-widest text-[9px] block">Total Received</span>
            <span className="text-[#4ADE80] font-black">${totalReceived.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search ledger…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl pl-8 pr-4 py-1.5 text-xs text-white focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] outline-none placeholder:text-gray-700"
            />
          </div>

          <button onClick={exportCSV} className="p-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white transition-colors" title="Export CSV">
            <FileSpreadsheet size={14} />
          </button>

          <PrintButton
            label="Print"
            title="Security Deposit Ledger"
            buildHTML={() => {
              const rows = filtered.map((t, idx) => `
                <tr style="background:${idx % 2 === 0 ? "#fff" : "#f7f7f7"}">
                  <td style="border:1px solid #bbb;padding:6px 8px"><strong>${t.name}</strong></td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${t.building} ${t.unit}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">$${(t.securityDeposit || 0).toLocaleString()}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px;text-align:center">${t.secDepReceived ? "✓ Yes" : "✗ No"}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${t.secDepDate || "—"}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${STATUS_OPTIONS.find(o => o.value === t.secDepStatus)?.label || "No Change"}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${t.secDepNotes || ""}</td>
                </tr>
              `).join("");
              return `
                <table style="width:100%;border-collapse:collapse;font-size:9.5pt;color:#000">
                  <thead>
                    <tr style="background:#f0f0f0">
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Tenant</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Property</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Deposit Amount</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:center">Received</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Received Date</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Status</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              `;
            }}
          />

          <button onClick={fetchTenants} disabled={loading} className="p-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white transition-colors" title="Reload Ledger">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="animate-spin text-[#60A5FA]" size={24} />
          <p className="text-xs text-gray-600">Loading ledger rows…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto text-gray-700 mb-2" size={24} />
          <p className="text-xs text-gray-500">No active tenants match search.</p>
        </div>
      ) : (
        <div className="divide-y divide-[rgba(255,255,255,0.04)]">
          {/* Desktop Column Header — Zero Horizontal Scroll */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-3 pb-3 px-2 border-b border-[rgba(255,255,255,0.06)] text-gray-500 font-bold uppercase tracking-widest text-[9px]">
            <div className="col-span-3">Tenant &amp; Property</div>
            <div className="col-span-2">Deposit ($)</div>
            <div className="col-span-1 text-center">Received</div>
            <div className="col-span-2">Received Date</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Escrow / Notes</div>
          </div>

          {filtered.map(t => {
            const isSaving = savingId === t.id;
            return (
              <div
                key={t.id}
                className="py-3 px-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 lg:gap-3 items-center text-xs hover:bg-[rgba(255,255,255,0.015)] transition-colors"
              >
                <div className="sm:col-span-2 lg:col-span-3 min-w-0 relative">
                  <div className="font-bold text-white truncate flex items-center gap-1.5">
                    <span className="truncate">{t.name}</span>
                    {isSaving && <Loader2 size={11} className="animate-spin text-[#60A5FA] flex-shrink-0" />}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                    <Building2 size={11} className="text-gray-600 flex-shrink-0" />
                    <span className="truncate">
                      {t.building} {t.unit ? `· Unit ${t.unit}` : ""}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="lg:hidden block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Deposit Amount
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-gray-500 text-[10px] font-black">$</span>
                    <input
                      type="number"
                      value={t.securityDeposit || ""}
                      onChange={e => updateField(t.id, "securityDeposit", e.target.value)}
                      className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-lg pl-6 pr-2 py-1.5 text-xs text-white tabular-nums focus:border-blue-400/60 outline-none"
                    />
                  </div>
                </div>

                <div className="lg:col-span-1 flex items-center lg:justify-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!t.secDepReceived}
                    onChange={e => updateField(t.id, "secDepReceived", e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-sky-400 bg-[rgba(255,255,255,0.02)] focus:ring-0 cursor-pointer"
                  />
                  <span className="lg:hidden text-[11px] text-gray-400">Deposit Received</span>
                </div>

                <div className="lg:col-span-2">
                  <label className="lg:hidden block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Received Date
                  </label>
                  <input
                    type="date"
                    value={t.secDepDate || ""}
                    onChange={e => updateField(t.id, "secDepDate", e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-lg px-2 py-1.5 text-xs text-white focus:border-blue-400/60 outline-none [color-scheme:dark]"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="lg:hidden block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Status
                  </label>
                  <select
                    value={t.secDepStatus || "no_change"}
                    onChange={e => updateField(t.id, "secDepStatus", e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-lg px-2 py-1.5 text-xs text-white focus:border-blue-400/60 outline-none"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="bg-[#0D1117]">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="lg:hidden block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Escrow account, damages..."
                    value={t.secDepNotes || ""}
                    onChange={e => updateField(t.id, "secDepNotes", e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-400/60 outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
