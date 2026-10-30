"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Search, RefreshCw, Loader2, Plus,
  Building2, AlertTriangle, FileSpreadsheet,
} from "lucide-react";
import PrintButton from "./PrintButton";

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
  const [orgProperties, setOrgProperties] = useState<string[]>([]);
  const [newPropertyInput, setNewPropertyInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [savingProperty, setSavingProperty] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, propRes] = await Promise.all([
        fetch("/api/filter-changes"),
        fetch("/api/properties-list").catch(() => null),
      ]);
      if (propRes?.ok) {
        const pList = await propRes.json().catch(() => []);
        if (Array.isArray(pList)) {
          setOrgProperties(pList.map((p: { name?: string }) => p.name || "").filter(Boolean));
        }
      }
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

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const inFlightCreateRef = useRef<Record<string, Promise<string | null> | undefined>>({});
  const recordsRef = useRef<FilterChangeRecord[]>([]);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  const flushPropertySave = async (property: string) => {
    const current = recordsRef.current.find(r => r.property === property);
    if (!current) return;

    setSavingProperty(property);
    const buildPayload = (rec: FilterChangeRecord) => ({
      property,
      lastChanged: rec.lastChanged || null,
      nextDue: rec.nextDue || null,
      notes: rec.notes || "",
      updatedBy: currentUserName || "Staff",
    });

    try {
      let recordId = current.id;

      // Guard initial POST creation with an in-flight promise map so concurrent duplicate POSTs never fire
      const pendingCreate = inFlightCreateRef.current[property];
      if (!recordId && pendingCreate !== undefined) {
        recordId = (await pendingCreate) || undefined;
      }

      const latest = recordsRef.current.find(r => r.property === property) || current;
      const payload = buildPayload(latest);

      if (recordId || latest.id) {
        const targetId = recordId || latest.id!;
        const res = await fetch(`/api/filter-changes?id=${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to save changes");
      } else {
        const snapshotNotes = latest.notes;
        const snapshotLast = latest.lastChanged;
        const snapshotNext = latest.nextDue;

        const createPromise = (async (): Promise<string | null> => {
          const res = await fetch("/api/filter-changes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("Failed to save changes");
          const resData = await res.json();
          const newId: string | undefined = resData?.record?.id;
          if (newId) {
            recordsRef.current = recordsRef.current.map(r =>
              r.property === property
                ? { ...r, id: newId, updatedAt: resData.record.updated_at }
                : r
            );
            setRecords(prev =>
              prev.map(r =>
                r.property === property
                  ? { ...r, id: newId, updatedAt: resData.record.updated_at }
                  : r
              )
            );
          }
          return newId || null;
        })();

        inFlightCreateRef.current[property] = createPromise;
        let createdId: string | null = null;
        try {
          createdId = await createPromise;
        } finally {
          delete inFlightCreateRef.current[property];
        }

        // If the user typed further while POST was in-flight, flush the latest state via PATCH
        const afterCreate = recordsRef.current.find(r => r.property === property);
        if (
          createdId &&
          afterCreate &&
          (afterCreate.notes !== snapshotNotes ||
            afterCreate.lastChanged !== snapshotLast ||
            afterCreate.nextDue !== snapshotNext)
        ) {
          await fetch(`/api/filter-changes?id=${createdId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPayload(afterCreate)),
          });
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSavingProperty(prev => (prev === property ? null : prev));
    }
  };

  const updateField = (property: string, field: keyof FilterChangeRecord, value: any) => {
    const updatedBy = currentUserName || "Staff";
    const normalizedVal =
      field === "lastChanged" || field === "nextDue" ? value || null : field === "notes" ? value || "" : value;

    // 1. Update local state & ref optimistically immediately
    const exists = recordsRef.current.some(r => r.property === property);
    if (exists) {
      recordsRef.current = recordsRef.current.map(r =>
        r.property === property ? { ...r, [field]: normalizedVal, updatedBy } : r
      );
      setRecords(prev =>
        prev.map(r =>
          r.property === property ? { ...r, [field]: normalizedVal, updatedBy } : r
        )
      );
    } else {
      const newRec: FilterChangeRecord = {
        property,
        lastChanged: field === "lastChanged" ? normalizedVal : null,
        nextDue: field === "nextDue" ? normalizedVal : null,
        notes: field === "notes" ? normalizedVal : "",
        updatedBy,
      };
      recordsRef.current = [...recordsRef.current, newRec];
      setRecords(prev => [...prev, newRec]);
    }

    // 2. Debounce network saves by 450ms per propertyName
    if (timersRef.current[property]) {
      clearTimeout(timersRef.current[property]);
    }
    timersRef.current[property] = setTimeout(() => {
      delete timersRef.current[property];
      void flushPropertySave(property);
    }, 450);
  };

  const handleAddPropertyEntry = async () => {
    const trimmed = newPropertyInput.trim();
    if (!trimmed) return;
    setNewPropertyInput("");
    if (!orgProperties.includes(trimmed)) {
      setOrgProperties(prev => [...prev, trimmed]);
    }
    await updateField(trimmed, "notes", "");
  };

  const propertiesList = useMemo(() => {
    return Array.from(new Set([...orgProperties, ...records.map(r => r.property).filter(Boolean)]));
  }, [orgProperties, records]);

  const displayRows = propertiesList.map(property => {
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
          {/* Add custom property entry */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Add property filter row…"
              value={newPropertyInput}
              onChange={e => setNewPropertyInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddPropertyEntry(); }}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-1.5 text-xs text-white focus:border-[rgba(250,204,21,0.4)] outline-none placeholder:text-gray-700 w-44"
            />
            <button
              onClick={handleAddPropertyEntry}
              disabled={!newPropertyInput.trim()}
              className="px-2.5 py-1.5 rounded-xl bg-[rgba(250,204,21,0.12)] border border-[rgba(250,204,21,0.3)] text-[#FACC15] text-xs font-bold hover:bg-[rgba(250,204,21,0.2)] disabled:opacity-40 transition-colors flex items-center gap-1"
              title="Add property filter entry"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
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
      ) : propertiesList.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto text-gray-600 mb-2" size={28} />
          <p className="text-sm font-bold text-gray-300">No properties in your portfolio yet</p>
          <p className="text-xs text-gray-500 mt-1">Add properties in the Property Details tab or use the input above to add a property filter entry.</p>
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
