"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Receipt,
  Plus,
  Download,
  Printer,
  RefreshCw,
  Trash2,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  ExternalLink,
  Paperclip,
  Building2,
  X,
  CheckCircle2,
} from "lucide-react";
import { downloadWorkbook } from "@/lib/spreadsheet";
import { showToast } from "@/lib/api-client";

export interface ExpenseItem {
  id: string;
  building: string;
  unit: string;
  expenseDate: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  paymentMethod: string;
  taxDeductible: boolean;
  receiptUrl: string;
  receiptName: string;
  sourceTicketId: string | null;
  createdBy: string;
  createdAt: string;
}

export const SCHEDULE_E_CATEGORIES: Array<{
  key: string;
  line: string;
  label: string;
}> = [
  { key: "advertising", line: "Line 5", label: "Advertising" },
  { key: "auto_travel", line: "Line 6", label: "Auto & Travel" },
  { key: "cleaning_maintenance", line: "Line 7", label: "Cleaning & Maintenance" },
  { key: "commissions", line: "Line 8", label: "Commissions" },
  { key: "insurance", line: "Line 9", label: "Insurance" },
  { key: "legal_professional", line: "Line 10", label: "Legal & Professional Fees" },
  { key: "management_fees", line: "Line 11", label: "Management Fees" },
  { key: "mortgage_interest", line: "Line 12", label: "Mortgage Interest" },
  { key: "other_interest", line: "Line 13", label: "Other Interest" },
  { key: "repairs", line: "Line 14", label: "Repairs" },
  { key: "supplies", line: "Line 15", label: "Supplies" },
  { key: "taxes", line: "Line 16", label: "Property & Real Estate Taxes" },
  { key: "utilities", line: "Line 17", label: "Utilities" },
  { key: "other", line: "Line 19", label: "Other Deductible Expenses" },
];

const PAYMENT_METHODS = ["Card", "ACH / Bank", "Check", "Zelle", "Venmo", "Cash", "Invoice"];

function fmtMoney(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCategoryMeta(key: string) {
  return (
    SCHEDULE_E_CATEGORIES.find((c) => c.key === key) || {
      key: "other",
      line: "Line 19",
      label: "Other Deductible Expenses",
    }
  );
}

export default function ExpensesTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [view, setView] = useState<"ledger" | "schedule_e">("ledger");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([]);
  const [totalRentCollected, setTotalRentCollected] = useState<number>(0);
  const [rentCollectedByBuilding, setRentCollectedByBuilding] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [importingMaint, setImportingMaint] = useState<boolean>(false);
  const [exportingXlsx, setExportingXlsx] = useState<boolean>(false);

  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [savingAdd, setSavingAdd] = useState<boolean>(false);
  const [uploadingReceipt, setUploadingReceipt] = useState<boolean>(false);

  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    building: "Portfolio / General",
    unit: "",
    category: "repairs",
    vendor: "",
    description: "",
    amount: "",
    paymentMethod: "Card",
    taxDeductible: true,
    receiptUrl: "",
    receiptName: "",
  });

  const loadExpenses = useCallback(async (targetYear: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?year=${targetYear}`);
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (Array.isArray(data.properties)) setProperties(data.properties);
      setTotalRentCollected(Number(data.totalRentCollected) || 0);
      setRentCollectedByBuilding(
        data.rentCollectedByBuilding && typeof data.rentCollectedByBuilding === "object"
          ? (data.rentCollectedByBuilding as Record<string, number>)
          : {}
      );
    } catch {
      showToast("Failed to load expenses.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses(year);
  }, [year, loadExpenses]);

  const allBuildings = useMemo(() => {
    const names = new Set<string>(["Portfolio / General"]);
    for (const p of properties) {
      if (p.name) names.add(p.name);
    }
    for (const e of expenses) {
      if (e.building) names.add(e.building);
    }
    for (const b of Object.keys(rentCollectedByBuilding)) {
      if (b) names.add(b);
    }
    return Array.from(names);
  }, [properties, expenses, rentCollectedByBuilding]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (buildingFilter !== "all" && e.building !== buildingFilter) return false;
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      return true;
    });
  }, [expenses, buildingFilter, categoryFilter]);

  const summary = useMemo(() => {
    const grossRent =
      buildingFilter === "all" ? totalRentCollected : rentCollectedByBuilding[buildingFilter] || 0;
    const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const deductibleExp = filteredExpenses
      .filter((e) => e.taxDeductible)
      .reduce((s, e) => s + e.amount, 0);
    const receiptsCount = filteredExpenses.filter((e) => Boolean(e.receiptUrl)).length;
    const noi = grossRent - totalExp;

    const byCategory: Record<string, number> = {};
    for (const cat of SCHEDULE_E_CATEGORIES) byCategory[cat.key] = 0;
    for (const e of filteredExpenses) {
      if (!e.taxDeductible) continue;
      byCategory[e.category] = Math.round(((byCategory[e.category] || 0) + e.amount) * 100) / 100;
    }

    // Per-building NOI breakdown
    const bNames = new Set<string>();
    Object.keys(rentCollectedByBuilding).forEach((b) => bNames.add(b));
    expenses.forEach((e) => bNames.add(e.building || "Portfolio / General"));
    const byBuilding = Array.from(bNames)
      .map((b) => {
        const rent = rentCollectedByBuilding[b] || 0;
        const exp = expenses
          .filter((e) => (e.building || "Portfolio / General") === b)
          .reduce((s, e) => s + e.amount, 0);
        return {
          building: b,
          rent: Math.round(rent * 100) / 100,
          expenses: Math.round(exp * 100) / 100,
          noi: Math.round((rent - exp) * 100) / 100,
        };
      })
      .sort((a, b) => b.rent - a.rent || b.expenses - a.expenses);

    return { grossRent, totalExp, deductibleExp, receiptsCount, noi, byCategory, byBuilding };
  }, [filteredExpenses, expenses, buildingFilter, totalRentCollected, rentCollectedByBuilding]);

  const handleUploadReceipt = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/expenses/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Receipt upload failed.");
      setForm((prev) => ({
        ...prev,
        receiptUrl: String(data.url || ""),
        receiptName: String(data.name || file.name),
      }));
      showToast("Receipt attached.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not upload receipt.", "error");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      showToast("Enter an expense amount greater than $0.", "warning");
      return;
    }
    setSavingAdd(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseDate: form.expenseDate,
          building: form.building,
          unit: form.unit,
          category: form.category,
          vendor: form.vendor,
          description: form.description,
          amount: amt,
          paymentMethod: form.paymentMethod,
          taxDeductible: form.taxDeductible,
          receiptUrl: form.receiptUrl,
          receiptName: form.receiptName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save expense.");
      setShowAdd(false);
      setForm({
        expenseDate: new Date().toISOString().slice(0, 10),
        building: properties[0]?.name || "Portfolio / General",
        unit: "",
        category: "repairs",
        vendor: "",
        description: "",
        amount: "",
        paymentMethod: "Card",
        taxDeductible: true,
        receiptUrl: "",
        receiptName: "",
      });
      showToast("Expense logged.", "success");
      await loadExpenses(year);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save expense.", "error");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleImportMaintenance = async () => {
    setImportingMaint(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_maintenance_costs", year }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to import maintenance costs.");
      await loadExpenses(year);
      showToast(
        data.importedCount > 0
          ? `Imported ${data.importedCount} completed maintenance repair expense${data.importedCount === 1 ? "" : "s"}.`
          : `No new completed maintenance tickets with costs found for ${year}.`,
        data.importedCount > 0 ? "success" : "info"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to sync maintenance costs.", "error");
    } finally {
      setImportingMaint(false);
    }
  };

  const handleDeleteExpense = async (item: ExpenseItem) => {
    if (!confirm(`Delete expense "${item.vendor || getCategoryMeta(item.category).label}" (${fmtMoney(item.amount)})?`)) {
      return;
    }
    const prev = expenses;
    setExpenses((curr) => curr.filter((e) => e.id !== item.id));
    try {
      const res = await fetch(`/api/expenses?id=${encodeURIComponent(item.id)}&year=${year}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete expense.");
      showToast("Expense deleted.", "info");
    } catch {
      setExpenses(prev);
      showToast("Could not delete expense.", "error");
    }
  };

  const handleExportScheduleEXlsx = async () => {
    setExportingXlsx(true);
    try {
      const scheduleERows = [
        {
          "IRS Schedule E Line": "Line 3",
          Category: "Rents Received (Gross Rent Collected)",
          Amount: summary.grossRent,
        },
        ...SCHEDULE_E_CATEGORIES.map((c) => ({
          "IRS Schedule E Line": c.line,
          Category: c.label,
          Amount: summary.byCategory[c.key] || 0,
        })),
        {
          "IRS Schedule E Line": "Line 20",
          Category: "Total Deductible Expenses",
          Amount: summary.deductibleExp,
        },
        {
          "IRS Schedule E Line": "Net",
          Category: "Net Operating Cash Flow (Rents - Total Expenses)",
          Amount: summary.noi,
        },
      ];

      const noiByPropertyRows = summary.byBuilding.map((b) => ({
        Property: b.building,
        "Gross Rent Collected": b.rent,
        "Total Expenses": b.expenses,
        "Net Operating Income (NOI)": b.noi,
      }));

      const itemizedRows = filteredExpenses.map((e) => {
        const meta = getCategoryMeta(e.category);
        return {
          Date: e.expenseDate,
          Property: e.building,
          Unit: e.unit || "",
          "Schedule E Line": meta.line,
          Category: meta.label,
          Vendor: e.vendor,
          Description: e.description,
          Amount: e.amount,
          "Payment Method": e.paymentMethod,
          "Tax Deductible": e.taxDeductible ? "Yes" : "No",
          "Receipt Attached": e.receiptUrl ? "Yes" : "No",
        };
      });

      await downloadWorkbook(
        [
          { name: `Schedule E (${year})`, rows: scheduleERows },
          { name: "NOI by Property", rows: noiByPropertyRows.length ? noiByPropertyRows : [{ Property: "None", "Gross Rent Collected": 0, "Total Expenses": 0, "Net Operating Income (NOI)": 0 }] },
          { name: "Itemized Expenses", rows: itemizedRows.length ? itemizedRows : [{ Date: "", Property: "", Category: "No expenses recorded", Amount: 0 }] },
        ],
        `PropOpsIQ_Schedule_E_Owner_Statement_${year}.xlsx`
      );
      showToast(`Downloaded ${year} Schedule E & Owner Statement (.xlsx).`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Spreadsheet export failed.", "error");
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleExportCsv = () => {
    const header = ["Date", "Property", "Unit", "Schedule E Line", "Category", "Vendor", "Description", "Amount", "Method", "Deductible"];
    const rows = filteredExpenses.map((e) => {
      const meta = getCategoryMeta(e.category);
      const esc = (s: string) => `"${String(s || "").replace(/"/g, '""')}"`;
      return [
        e.expenseDate,
        esc(e.building),
        esc(e.unit),
        esc(meta.line),
        esc(meta.label),
        esc(e.vendor),
        esc(e.description),
        e.amount.toFixed(2),
        esc(e.paymentMethod),
        e.taxDeductible ? "Yes" : "No",
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-schedule-e-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <Receipt size={18} className="text-purple-300" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Expenses &amp; IRS Schedule E</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              Receipt Vault · Maintenance Cost Sync · Tax-Ready Owner NOI Statement
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView("ledger")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              view === "ledger"
                ? "bg-purple-500/20 text-purple-200 border-purple-400/40"
                : "border-white/[0.08] text-gray-400 hover:text-white"
            }`}
          >
            Itemized Ledger ({filteredExpenses.length})
          </button>
          <button
            type="button"
            onClick={() => setView("schedule_e")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              view === "schedule_e"
                ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                : "border-white/[0.08] text-gray-400 hover:text-white"
            }`}
          >
            IRS Schedule E &amp; Owner NOI
          </button>
        </div>
      </div>

      {/* Filter + Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/25 border border-white/[0.06] rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Tax Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y} className="bg-[#0A0F1A]">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Property</label>
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none max-w-[200px]"
            >
              <option value="all" className="bg-[#0A0F1A]">All Properties</option>
              {allBuildings.map((b) => (
                <option key={b} value={b} className="bg-[#0A0F1A]">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {view === "ledger" && (
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Schedule E Line</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none max-w-[210px]"
              >
                <option value="all" className="bg-[#0A0F1A]">All Categories</option>
                {SCHEDULE_E_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key} className="bg-[#0A0F1A]">
                    {c.line} · {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                building:
                  buildingFilter !== "all"
                    ? buildingFilter
                    : properties[0]?.name || "Portfolio / General",
              }));
              setShowAdd(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Log Expense</span>
          </button>

          <button
            type="button"
            onClick={handleImportMaintenance}
            disabled={importingMaint}
            title="Import completed maintenance ticket labor + material costs into Schedule E Line 14 (Repairs)"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-sky-400/35 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            {importingMaint ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            <span>Sync Maintenance Costs</span>
          </button>

          <button
            type="button"
            onClick={handleExportScheduleEXlsx}
            disabled={exportingXlsx}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-purple-400/35 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            {exportingXlsx ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
            <span>Schedule E (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: `Gross Rent Collected (${year})`,
            value: fmtMoney(summary.grossRent),
            sub: "Schedule E Line 3",
            icon: DollarSign,
            color: "#10B981",
          },
          {
            label: "Total Expenses",
            value: fmtMoney(summary.totalExp),
            sub: `${fmtMoney(summary.deductibleExp)} tax-deductible`,
            icon: TrendingDown,
            color: "#F59E0B",
          },
          {
            label: "Net Operating Income (NOI)",
            value: fmtMoney(summary.noi),
            sub: summary.noi >= 0 ? "Positive net cash flow" : "Net operating loss",
            icon: TrendingUp,
            color: summary.noi >= 0 ? "#4ADE80" : "#EF4444",
          },
          {
            label: "Receipts Vaulted",
            value: `${summary.receiptsCount} / ${filteredExpenses.length}`,
            sub: "Private audit-ready files",
            icon: Paperclip,
            color: "#A78BFA",
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.06] bg-black/30 p-4 flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
              <p className="text-lg sm:text-xl font-black text-white mt-1 tabular-nums truncate">{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18`, border: `1px solid ${color}35` }}
            >
              <Icon size={16} style={{ color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
          <Loader2 size={18} className="animate-spin text-purple-400 mr-2" />
          Loading {year} accounting ledger…
        </div>
      ) : view === "ledger" ? (
        filteredExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center space-y-3">
            <CheckCircle2 size={28} className="mx-auto text-purple-400/50" />
            <p className="text-sm font-black text-white">No expenses recorded for {year} yet</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Click <strong>Log Expense</strong> to record repairs, taxes, insurance, or utilities with a photo/PDF receipt, or click{" "}
              <strong>Sync Maintenance Costs</strong> to pull completed work orders automatically.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-black/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-black/40 text-[10px] uppercase tracking-wider text-gray-400">
                    <th className="text-left px-4 py-3 font-black">Date</th>
                    <th className="text-left px-3 py-3 font-black">Property / Unit</th>
                    <th className="text-left px-3 py-3 font-black">IRS Schedule E Category</th>
                    <th className="text-left px-3 py-3 font-black">Vendor &amp; Memo</th>
                    <th className="text-right px-3 py-3 font-black">Amount</th>
                    <th className="text-center px-3 py-3 font-black">Receipt</th>
                    <th className="text-right px-4 py-3 font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredExpenses.map((e) => {
                    const meta = getCategoryMeta(e.category);
                    return (
                      <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap tabular-nums">
                          {e.expenseDate}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-white">{e.building}</p>
                          {e.unit && <p className="text-[10px] text-gray-500">Unit {e.unit}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/12 border border-purple-400/25 text-purple-200 text-[10px] font-bold">
                            <span>{meta.line}</span>
                            <span>·</span>
                            <span>{meta.label}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-xs">
                          <p className="font-bold text-gray-200 truncate">{e.vendor || "—"}</p>
                          {e.description && (
                            <p className="text-[11px] text-gray-500 truncate">{e.description}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-black text-white tabular-nums whitespace-nowrap">
                          {fmtMoney(e.amount)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {e.receiptUrl ? (
                            <a
                              href={e.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-[10px] font-bold"
                            >
                              <ExternalLink size={10} />
                              <span>Receipt</span>
                            </a>
                          ) : (
                            <span className="text-gray-600 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(e)}
                            title="Delete expense"
                            className="p-1.5 rounded-lg border border-white/[0.06] text-gray-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* IRS Schedule E & Owner NOI Summary View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Official IRS Schedule E Part I Breakdown */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">IRS Form 1040 · Schedule E (Part I)</h3>
                <p className="text-[11px] text-gray-400">
                  Tax Year {year} · {buildingFilter === "all" ? "All Properties" : buildingFilter}
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                CPA-Ready
              </span>
            </div>

            <div className="divide-y divide-white/[0.05] text-xs">
              <div className="flex items-center justify-between px-5 py-3 bg-emerald-500/[0.06]">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase mr-2">Line 3</span>
                  <span className="font-black text-white">Rents Received</span>
                </div>
                <span className="font-black text-emerald-400 tabular-nums">{fmtMoney(summary.grossRent)}</span>
              </div>

              {SCHEDULE_E_CATEGORIES.map((c) => {
                const amt = summary.byCategory[c.key] || 0;
                return (
                  <div key={c.key} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase mr-2">{c.line}</span>
                      <span className={amt > 0 ? "text-gray-200 font-semibold" : "text-gray-500"}>{c.label}</span>
                    </div>
                    <span className={`tabular-nums ${amt > 0 ? "font-bold text-white" : "text-gray-600"}`}>
                      {fmtMoney(amt)}
                    </span>
                  </div>
                );
              })}

              <div className="flex items-center justify-between px-5 py-3 bg-amber-500/[0.06]">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase mr-2">Line 20</span>
                  <span className="font-black text-white">Total Deductible Expenses</span>
                </div>
                <span className="font-black text-amber-300 tabular-nums">{fmtMoney(summary.deductibleExp)}</span>
              </div>

              <div className="flex items-center justify-between px-5 py-4 bg-white/[0.03]">
                <span className="font-black text-white text-sm">Net Operating Cash Flow (NOI)</span>
                <span
                  className={`font-black text-sm tabular-nums ${
                    summary.noi >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {fmtMoney(summary.noi)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Property-by-Property Owner NOI Statement */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Building2 size={15} className="text-sky-400" />
                <span>Owner NOI Statement by Property ({year})</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Collected rent from your Rent Ledger minus recorded expenses per building.
              </p>
            </div>

            {summary.byBuilding.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No rent payments or expenses recorded for {year} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-black/40 text-[10px] uppercase tracking-wider text-gray-400">
                      <th className="text-left px-4 py-3 font-black">Property</th>
                      <th className="text-right px-3 py-3 font-black">Rent Collected</th>
                      <th className="text-right px-3 py-3 font-black">Expenses</th>
                      <th className="text-right px-4 py-3 font-black">Net NOI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {summary.byBuilding.map((row) => (
                      <tr key={row.building} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-white">{row.building}</td>
                        <td className="px-3 py-3 text-right text-emerald-300 font-semibold tabular-nums">
                          {fmtMoney(row.rent)}
                        </td>
                        <td className="px-3 py-3 text-right text-amber-300 font-semibold tabular-nums">
                          {fmtMoney(row.expenses)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-black tabular-nums ${
                            row.noi >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {fmtMoney(row.noi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Expense Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#04060A]/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveExpense}
            className="w-full max-w-lg max-h-[92dvh] overflow-y-auto glass rounded-3xl border border-white/10 shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Log Property Expense</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Categorized to IRS Schedule E with optional receipt upload</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="p-1.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Date *</label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="245.00"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Property / Building</label>
                  <select
                    value={form.building}
                    onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    {allBuildings.map((b) => (
                      <option key={b} value={b} className="bg-[#0A0F1A]">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Unit / Suite (Optional)</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g. 2B"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  IRS Schedule E Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                >
                  {SCHEDULE_E_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key} className="bg-[#0A0F1A]">
                      {c.line} — {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Vendor / Payee</label>
                  <input
                    value={form.vendor}
                    onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))}
                    placeholder="Home Depot, Roto-Rooter, City Tax…"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m} className="bg-[#0A0F1A]">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Memo / Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Water heater element replacement, annual policy renewal…"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Receipt Upload */}
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Paperclip size={13} className="text-purple-300" />
                    <span>{form.receiptName ? form.receiptName : "Attach Receipt Photo or PDF (Optional)"}</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Stored privately in your org&apos;s encrypted vault (max 10 MB)</p>
                </div>
                <label className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/35 text-purple-200 text-xs font-bold hover:bg-purple-500/30 cursor-pointer flex-shrink-0">
                  {uploadingReceipt ? "Uploading…" : form.receiptUrl ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploadingReceipt}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadReceipt(f);
                    }}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.taxDeductible}
                  onChange={(e) => setForm((prev) => ({ ...prev, taxDeductible: e.target.checked }))}
                  className="rounded border-white/20 bg-black/40 accent-emerald-400"
                />
                <span>Include on IRS Schedule E as a deductible rental expense</span>
              </label>
            </div>

            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAdd || uploadingReceipt}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black disabled:opacity-50 cursor-pointer"
              >
                {savingAdd && <Loader2 size={13} className="animate-spin" />}
                <span>Save Expense</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
