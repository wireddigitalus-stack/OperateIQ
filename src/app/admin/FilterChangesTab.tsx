"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Search, RefreshCw, Loader2,
  Building2, AlertTriangle, FileSpreadsheet,
} from "lucide-react";
import PrintButton from "./PrintButton";

const PROPERTIES_LIST = [
  "City Centre",
  "City Central",
  "Coke Building",
  "Centerpoint",
  "250 Commonwealth",
  "628 State St",
  "215 Gate City Hwy",
  "221 Moore ST",
  "642 State St",
  "634 State St",
  "720 State St",
  "209 Blackley Rd",
  "Farm"
];

interface FilterChangeRecord {
  id?: string;
  property: string;
  lastChanged: string | null;
  nextDue: string | null;
  notes: string;
  updatedBy?: string;
  updatedAt?: string;
}

export default function FilterChangesTab({
  currentUserName,
}: {
  currentUserName?: string;
}) {
  const [records, setRecords] = useState<FilterChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [savingProperty, setSavingProperty] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/filter-changes");
      if (!res.ok) throw new Error("Failed to fetch filter change records");
      const d = await res.json();
      if (Array.isArray(d.records)) {
        const mapped = d.records.map((r: any) => ({
          id: r.id,
          property: r.property,
          lastChanged: r.last_changed,
          nextDue: r.next_due,
          notes: r.notes || "",
          updatedBy: r.updated_by,
          updatedAt: r.updated_at,
        }));
        setRecords(mapped);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const updateField = async (property: string, field: keyof FilterChangeRecord, value: any) => {
    setSavingProperty(property);
    const existing = records.find(r => r.property === property);

    const payload: Record<string, any> = {
      property,
      updatedBy: currentUserName || "Staff",
    };

    if (field === "lastChanged") payload.lastChanged = value || null;
    else if (field === "nextDue") payload.nextDue = value || null;
    else if (field === "notes") payload.notes = value || "";

    // Fill in other fields if updating an existing record
    if (existing) {
      if (field !== "lastChanged") payload.lastChanged = existing.lastChanged;
      if (field !== "nextDue") payload.nextDue = existing.nextDue;
      if (field !== "notes") payload.notes = existing.notes;
    }

    try {
      let res;
      if (existing?.id) {
        res = await fetch(`/api/filter-changes?id=${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/filter-changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error("Failed to save changes");
      const resData = await res.json();

      // Refresh list from API or update local state
      if (!existing?.id && resData.record) {
        setRecords(prev => [...prev.filter(r => r.property !== property), {
          id: resData.record.id,
          property,
          lastChanged: payload.lastChanged,
          nextDue: payload.nextDue,
          notes: payload.notes,
          updatedBy: payload.updatedBy,
          updatedAt: resData.record.updated_at,
        }]);
      } else {
        setRecords(prev =>
          prev.map(r => (r.property === property ? { ...r, [field]: value, updatedBy: payload.updatedBy } : r))
        );
      }
    } catch (err: any) {
      console.error(err);
      alert("Error saving: " + err.message);
    } finally {
      setSavingProperty(null);
    }
  };

  const displayRows = PROPERTIES_LIST.map(property => {
    const record = records.find(r => r.property === property) || {
      property,
      lastChanged: null,
      nextDue: null,
      notes: "",
      updatedBy: "—",
    };
    return record;
  }).filter(r => {
    const q = search.toLowerCase();
    return r.property.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q);
  });

  const exportCSV = () => {
    const headers = ["Property", "Last Changed", "Next Due", "Notes", "Updated By"];
    const rows = displayRows.map(r => [
      r.property,
      r.lastChanged || "",
      r.nextDue || "",
      r.notes || "",
      r.updatedBy || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `filter_changes_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass rounded-2xl border border-[rgba(250,204,21,0.12)] bg-[rgba(10,15,30,0.4)] p-4 sm:p-6">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[rgba(250,204,21,0.15)] border border-[rgba(250,204,21,0.25)] flex items-center justify-center text-[#FACC15]">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">HVAC Filter Changes Ledger</h3>
            <p className="text-[10px] text-gray-500">Track and schedule HVAC filter replacements across properties</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search properties…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl pl-8 pr-4 py-1.5 text-xs text-white focus:border-[rgba(250,204,21,0.4)] outline-none placeholder:text-gray-700"
            />
          </div>

          <button onClick={exportCSV} className="p-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white transition-colors" title="Export CSV">
            <FileSpreadsheet size={14} />
          </button>

          <PrintButton
            label="Print"
            title="HVAC Filter Changes Ledger"
            buildHTML={() => {
              const rows = displayRows.map((r, idx) => `
                <tr style="background:${idx % 2 === 0 ? "#fff" : "#f7f7f7"}">
                  <td style="border:1px solid #bbb;padding:6px 8px"><strong>${r.property}</strong></td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${r.lastChanged || "—"}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${r.nextDue || "—"}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${r.notes || ""}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${r.updatedBy || "—"}</td>
                </tr>
              `).join("");
              return `
                <table style="width:100%;border-collapse:collapse;font-size:9.5pt;color:#000">
                  <thead>
                    <tr style="background:#f0f0f0">
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Property</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Last Changed</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Next Due</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Notes</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Updated By</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              `;
            }}
          />

          <button onClick={fetchRecords} disabled={loading} className="p-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white transition-colors" title="Reload Ledger">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="animate-spin text-[#FACC15]" size={24} />
          <p className="text-xs text-gray-600">Loading ledger rows…</p>
        </div>
      ) : displayRows.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto text-gray-700 mb-2" size={24} />
          <p className="text-xs text-gray-500">No properties match search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full border-collapse text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.04)] text-gray-500 font-bold uppercase tracking-widest text-[9px]">
                <th className="pb-3 pl-4">Property</th>
                <th className="pb-3 w-[150px]">Last Changed Date</th>
                <th className="pb-3 w-[150px]">Next Due Date</th>
                <th className="pb-3 w-[120px]">Updated By</th>
                <th className="pb-3 pr-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-gray-300">
              {displayRows.map(r => {
                const isSaving = savingProperty === r.property;
                return (
                  <tr key={r.property} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                    <td className="py-3 pl-4 font-bold text-white relative">
                      {r.property}
                      {isSaving && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[#FACC15]">
                          <Loader2 size={10} className="animate-spin" />
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <input
                        type="date"
                        value={r.lastChanged || ""}
                        onChange={e => updateField(r.property, "lastChanged", e.target.value)}
                        className="w-[140px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-2 py-1 text-xs text-white focus:border-[rgba(250,204,21,0.4)] outline-none [color-scheme:dark]"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="date"
                        value={r.nextDue || ""}
                        onChange={e => updateField(r.property, "nextDue", e.target.value)}
                        className="w-[140px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-2 py-1 text-xs text-white focus:border-[rgba(250,204,21,0.4)] outline-none [color-scheme:dark]"
                      />
                    </td>
                    <td className="py-3 text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        👤 {r.updatedBy || "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        placeholder="Filter sizes, count, MERV rating, notes..."
                        value={r.notes}
                        onChange={e => updateField(r.property, "notes", e.target.value)}
                        className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-2.5 py-1 text-xs text-white focus:border-[rgba(250,204,21,0.4)] outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
