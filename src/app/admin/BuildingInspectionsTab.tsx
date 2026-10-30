"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ShieldAlert, Search, RefreshCw, Loader2, Plus, Send, CheckCircle2,
  Building2, AlertTriangle, FileSpreadsheet, Calendar, ChevronDown,
  ChevronUp, History, Settings2, X, Clock, Trash2, BarChart3,
} from "lucide-react";
import PrintButton from "./PrintButton";

// ─── Constants ──────────────────────────────────────────────────────────────

const INSPECTION_TYPES = [
  "Fire",
  "HVAC",
  "Sprinkler",
  "Elevator",
  "Structural",
  "Security",
  "Pest Control",
  "Plumbing",
  "Electrical",
  "Roof",
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface InspectionRecord {
  id?: string;
  property: string;
  inspectionType: string;
  inspectionDate: string | null;
  crewType: "internal" | "external";
  notes: string;
  status: string;
  month: string;
  updatedBy?: string;
  updatedAt?: string;
  isSubmitted?: boolean;
  submittedAt?: string | null;
  submittedBy?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  for (let offset = -6; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: val, label: `${months[d.getMonth()]} ${d.getFullYear()}` });
  }
  return options;
}

function fmtMonthFull(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function rowToRecord(r: Record<string, unknown>): InspectionRecord {
  return {
    id: r.id as string,
    property: (r.property as string) || "",
    inspectionType: (r.inspection_type as string) || "",
    inspectionDate: (r.inspection_date as string) || null,
    crewType: (r.crew_type as "internal" | "external") || "internal",
    notes: (r.notes as string) || "",
    status: (r.status as string) || "pending",
    month: (r.month as string) || "",
    updatedBy: (r.updated_by as string) || "",
    updatedAt: (r.updated_at as string) || "",
    isSubmitted: Boolean(r.is_submitted),
    submittedAt: (r.submitted_at as string) || null,
    submittedBy: (r.submitted_by as string) || "",
  };
}

const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-[rgba(96,165,250,0.4)] outline-none placeholder:text-gray-600";
const TH = "text-left text-[9px] font-black text-gray-500 uppercase tracking-wider pb-3";
const TD = "py-2.5";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function BuildingInspectionsTab({
  currentUserName,
  currentUserEmail,
}: {
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const [view, setView] = useState<"entry" | "compliance">("entry");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [orgProperties, setOrgProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    property: "",
    inspectionType: INSPECTION_TYPES[0],
    inspectionDate: new Date().toISOString().split("T")[0],
    crewType: "external" as "internal" | "external",
    notes: "",
  });
  const [adding, setAdding] = useState(false);

  const [complianceYear, setComplianceYear] = useState(new Date().getFullYear());
  const [complianceRecords, setComplianceRecords] = useState<InspectionRecord[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [configMap, setConfigMap] = useState<Record<string, Set<string>>>({});
  const [showConfig, setShowConfig] = useState(false);

  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const savePatches = useRef<Record<string, Record<string, unknown>>>({});
  const inFlightCreateRef = useRef<Record<string, Promise<string | null> | undefined>>({});
  const recordsRef = useRef<InspectionRecord[]>([]);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    fetch("/api/properties-list")
      .then(r => r.ok ? r.json() : [])
      .then(pList => {
        if (Array.isArray(pList)) {
          const names = pList.map((p: { name?: string }) => p.name || "").filter(Boolean);
          setOrgProperties(names);
          if (names.length > 0) {
            setAddForm(f => ({ ...f, property: f.property || names[0] }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const propertiesList = useMemo(() => {
    return Array.from(new Set([
      ...orgProperties,
      ...records.map(r => r.property).filter(Boolean),
      ...complianceRecords.map(r => r.property).filter(Boolean),
      ...Object.keys(configMap).filter(Boolean),
    ]));
  }, [orgProperties, records, complianceRecords, configMap]);

  useEffect(() => {
    if (!addForm.property && propertiesList.length > 0) {
      setAddForm(f => ({ ...f, property: propertiesList[0] }));
    }
  }, [propertiesList, addForm.property]);

  const fetchRecords = useCallback(async (month: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/building-inspections?month=${encodeURIComponent(month)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const d = await res.json();
      if (Array.isArray(d.records)) setRecords(d.records.map(rowToRecord));
      else setRecords([]);
    } catch (err: any) {
      setError(err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/building-inspections?config=true");
      if (!res.ok) return;
      const d = await res.json();
      const map: Record<string, Set<string>> = {};
      if (Array.isArray(d.config)) {
        for (const c of d.config) {
          if (c.enabled) {
            if (!map[c.property]) map[c.property] = new Set();
            map[c.property].add(c.inspection_type);
          }
        }
      }
      setConfigMap(map);
    } catch { /* ignore */ }
  }, []);

  const fetchCompliance = useCallback(async (year: number) => {
    setComplianceLoading(true);
    try {
      const res = await fetch(`/api/building-inspections?compliance=${year}`);
      if (!res.ok) return;
      const d = await res.json();
      if (Array.isArray(d.records)) setComplianceRecords(d.records.map(rowToRecord));
    } catch { /* ignore */ }
    finally { setComplianceLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  useEffect(() => { if (view === "entry") fetchRecords(selectedMonth); }, [selectedMonth, view, fetchRecords]);
  useEffect(() => { if (view === "compliance") fetchCompliance(complianceYear); }, [view, complianceYear, fetchCompliance]);

  // Debounced save (450ms) with in-flight POST creation guard per ${propertyName}__${typeKey}
  const saveField = useCallback((recordKey: string, field: string, value: unknown, meta?: { property?: string; inspectionType?: string; recordId?: string }) => {
    if (!savePatches.current[recordKey]) savePatches.current[recordKey] = {};
    savePatches.current[recordKey][field] = value;
    if (saveTimeouts.current[recordKey]) clearTimeout(saveTimeouts.current[recordKey]);
    saveTimeouts.current[recordKey] = setTimeout(async () => {
      const patch = savePatches.current[recordKey];
      delete savePatches.current[recordKey];
      delete saveTimeouts.current[recordKey];
      if (!patch) return;
      try {
        const currentRec = recordsRef.current.find(r =>
          (meta?.recordId && r.id === meta.recordId) ||
          r.id === recordKey ||
          (meta?.property && meta?.inspectionType && r.property === meta.property && r.inspectionType === meta.inspectionType)
        );
        let targetId = currentRec?.id || meta?.recordId || (!recordKey.includes("__") ? recordKey : undefined);
        const compositeKey =
          meta?.property && meta?.inspectionType
            ? `${meta.property}__${meta.inspectionType}`
            : currentRec
              ? `${currentRec.property}__${currentRec.inspectionType}`
              : recordKey;

        const pendingCreate = inFlightCreateRef.current[compositeKey];
        if (!targetId && pendingCreate !== undefined) {
          targetId = (await pendingCreate) || undefined;
        }

        if (targetId) {
          await fetch(`/api/building-inspections?id=${encodeURIComponent(targetId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...patch, updatedBy: currentUserName || "Staff" }),
          });
        } else if (meta?.property && meta?.inspectionType) {
          const latestRec = recordsRef.current.find(
            r => r.property === meta.property && r.inspectionType === meta.inspectionType
          );
          const createPromise = (async (): Promise<string | null> => {
            const res = await fetch("/api/building-inspections", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                property: meta.property,
                inspectionType: meta.inspectionType,
                inspectionDate: latestRec?.inspectionDate ?? (patch.inspectionDate as string | null) ?? null,
                crewType: latestRec?.crewType ?? (patch.crewType as string) ?? "internal",
                notes: latestRec?.notes ?? (patch.notes as string) ?? "",
                month: selectedMonth,
                updatedBy: currentUserName || "Staff",
              }),
            });
            if (!res.ok) throw new Error("Failed to create inspection record");
            const d = await res.json();
            const createdId: string | undefined = d?.record?.id;
            if (createdId) {
              const mapped = rowToRecord(d.record);
              recordsRef.current = recordsRef.current.map(r =>
                r.property === meta.property && r.inspectionType === meta.inspectionType && !r.id
                  ? { ...mapped, ...r, id: createdId }
                  : r
              );
              setRecords(prev =>
                prev.map(r =>
                  r.property === meta.property && r.inspectionType === meta.inspectionType && !r.id
                    ? { ...mapped, ...r, id: createdId }
                    : r
                )
              );
            }
            return createdId || null;
          })();

          inFlightCreateRef.current[compositeKey] = createPromise;
          try {
            await createPromise;
          } finally {
            delete inFlightCreateRef.current[compositeKey];
          }
        }
      } catch (err) { console.error("Auto-save failed:", err); }
    }, 450);
  }, [currentUserName, selectedMonth]);

  const updateField = useCallback((propertyName: string, typeKey: string, field: keyof InspectionRecord, value: unknown) => {
    const compositeKey = `${propertyName}__${typeKey}`;
    const existing = recordsRef.current.find(
      r => r.property === propertyName && r.inspectionType === typeKey
    );
    if (existing) {
      recordsRef.current = recordsRef.current.map(r =>
        r.property === propertyName && r.inspectionType === typeKey ? { ...r, [field]: value } : r
      );
      setRecords(prev =>
        prev.map(r =>
          r.property === propertyName && r.inspectionType === typeKey ? { ...r, [field]: value } : r
        )
      );
    } else {
      const optimistic: InspectionRecord = {
        property: propertyName,
        inspectionType: typeKey,
        inspectionDate: field === "inspectionDate" ? (value as string | null) : null,
        crewType: field === "crewType" ? (value as "internal" | "external") : "internal",
        notes: field === "notes" ? String(value || "") : "",
        month: selectedMonth,
        status: "draft",
        updatedBy: currentUserName || "Staff",
      };
      recordsRef.current = [...recordsRef.current, optimistic];
      setRecords(prev => [...prev, optimistic]);
    }
    const apiFieldMap: Record<string, string> = { inspectionType: "inspectionType", inspectionDate: "inspectionDate", crewType: "crewType", notes: "notes", status: "status" };
    if (apiFieldMap[field]) {
      saveField(compositeKey, apiFieldMap[field], value, {
        property: propertyName,
        inspectionType: typeKey,
        recordId: existing?.id,
      });
    }
  }, [currentUserName, selectedMonth, saveField]);

  const updateRecord = useCallback((id: string, field: keyof InspectionRecord, value: unknown) => {
    const rec = recordsRef.current.find(r => r.id === id);
    if (rec) {
      updateField(rec.property, rec.inspectionType, field, value);
      return;
    }
    // Optimistic local update — prevents input flicker
    recordsRef.current = recordsRef.current.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    const apiFieldMap: Record<string, string> = { inspectionType: "inspectionType", inspectionDate: "inspectionDate", crewType: "crewType", notes: "notes", status: "status" };
    if (apiFieldMap[field]) saveField(id, apiFieldMap[field], value, { recordId: id });
  }, [saveField, updateField]);

  const addEntry = async () => {
    if (adding) return;
    const compositeKey = `${addForm.property}__${addForm.inspectionType}`;
    if (inFlightCreateRef.current[compositeKey] !== undefined) return;
    setAdding(true);
    try {
      const createPromise = (async (): Promise<string | null> => {
        const res = await fetch("/api/building-inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...addForm, month: selectedMonth, updatedBy: currentUserName || "Staff" }),
        });
        if (!res.ok) throw new Error("Failed to add entry");
        const d = await res.json();
        if (d.record) {
          const mapped = rowToRecord(d.record);
          recordsRef.current = [...recordsRef.current, mapped];
          setRecords(prev => [...prev, mapped]);
          return mapped.id || null;
        } else {
          await fetchRecords(selectedMonth);
          return null;
        }
      })();
      inFlightCreateRef.current[compositeKey] = createPromise;
      try {
        await createPromise;
      } finally {
        delete inFlightCreateRef.current[compositeKey];
      }
      setShowAdd(false);
      setAddForm(prev => ({ ...prev, inspectionType: INSPECTION_TYPES[0], notes: "", inspectionDate: new Date().toISOString().split("T")[0] }));
    } catch (err: any) { alert("Error adding entry: " + err.message); }
    finally { setAdding(false); }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this inspection entry?")) return;
    try {
      await fetch(`/api/building-inspections?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error("Delete failed:", err); }
  };

  const submitMonth = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/building-inspections/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, actorEmail: currentUserEmail, actorName: currentUserName }),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
        fetchRecords(selectedMonth);
      }
    } catch (err) { console.error("Submit failed:", err); }
    finally { setSubmitting(false); }
  };

  const toggleConfig = async (property: string, inspType: string) => {
    const current = configMap[property]?.has(inspType) || false;
    const newEnabled = !current;
    setConfigMap(prev => {
      const next = { ...prev };
      if (!next[property]) next[property] = new Set();
      else next[property] = new Set(next[property]);
      if (newEnabled) next[property].add(inspType);
      else next[property].delete(inspType);
      return next;
    });
    try {
      await fetch("/api/building-inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configUpdate: true, property, inspectionType: inspType, enabled: newEnabled }),
      });
    } catch {
      setConfigMap(prev => {
        const next = { ...prev };
        if (!next[property]) next[property] = new Set();
        else next[property] = new Set(next[property]);
        if (current) next[property].add(inspType);
        else next[property].delete(inspType);
        return next;
      });
    }
  };

  const exportCSV = () => {
    const headers = ["Property", "Inspection Type", "Date", "Crew", "Status", "Notes", "Updated By"];
    const rows = filteredRecords.map(r => [r.property, r.inspectionType, r.inspectionDate || "", r.crewType, r.status, r.notes, r.updatedBy || ""]);
    const csv = [headers.join(","), ...rows.map(row => row.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `inspections-${selectedMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const buildMonthlyReportHTML = () => {
    if (filteredRecords.length === 0) return "";

    const completed = filteredRecords.filter(r => r.inspectionDate);
    const pending = filteredRecords.filter(r => !r.inspectionDate);
    const uniqueBuildings = new Set(filteredRecords.map(r => r.property)).size;
    const internalCrew = filteredRecords.filter(r => r.crewType === "internal").length;
    const externalCrew = filteredRecords.filter(r => r.crewType === "external").length;

    const submissionNotice = isMonthSubmitted
      ? `<div style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:11px;">
          <strong>✔ Officially Submitted & Certified</strong> — ${records[0]?.submittedAt ? new Date(records[0].submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""} by <strong>${records[0]?.submittedBy || "Authorized Staff"}</strong>
        </div>`
      : `<div style="background:#fefce8;border:1px solid #fef08a;color:#854d0e;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:11px;">
          <strong>⚠ Working Inspection Log (In Progress)</strong> — Entries subject to final sign-off for ${fmtMonthFull(selectedMonth)}.
        </div>`;

    const summaryCards = `
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;">
          <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Total Scheduled</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:2px;">${filteredRecords.length}</div>
        </div>
        <div style="flex:1;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:10px 12px;">
          <div style="font-size:10px;text-transform:uppercase;color:#047857;font-weight:700;">Completed</div>
          <div style="font-size:18px;font-weight:800;color:#065f46;margin-top:2px;">${completed.length} <span style="font-size:12px;font-weight:600;">(${filteredRecords.length ? Math.round((completed.length / filteredRecords.length) * 100) : 0}%)</span></div>
        </div>
        <div style="flex:1;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 12px;">
          <div style="font-size:10px;text-transform:uppercase;color:#c2410c;font-weight:700;">Pending</div>
          <div style="font-size:18px;font-weight:800;color:#9a3412;margin-top:2px;">${pending.length}</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;">
          <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Buildings Inspected</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;margin-top:2px;">${uniqueBuildings}</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;">
          <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Crew Assigned</div>
          <div style="font-size:12px;font-weight:700;color:#334155;margin-top:4px;">Internal: ${internalCrew} · External: ${externalCrew}</div>
        </div>
      </div>
    `;

    const tableRows = filteredRecords.map((r, i) => {
      const isDone = Boolean(r.inspectionDate);
      const statusBadge = isDone
        ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-size:9px;font-weight:700;">COMPLETED</span>`
        : `<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;font-size:9px;font-weight:700;">PENDING</span>`;

      return `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
          <td style="border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">${r.property}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;"><span style="font-weight:600;color:#1e40af;">${r.inspectionType}</span></td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${r.inspectionDate ? new Date(r.inspectionDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "<span style='color:#94a3b8;'>—</span>"}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;text-transform:capitalize;">${r.crewType || "internal"}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${statusBadge}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;">${r.notes ? r.notes : "<span style='color:#cbd5e1;'>None logged</span>"}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:10px;color:#475569;">${r.updatedBy || "—"}</td>
        </tr>
      `;
    }).join("");

    const signoffBlock = `
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #cbd5e1;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#64748b;margin-bottom:16px;">
          Record Keeping & Compliance Certification
        </div>
        <div style="display:flex;justify-content:space-between;gap:24px;font-size:11px;">
          <div style="flex:1;border-bottom:1px solid #334155;padding-bottom:4px;">
            <span style="color:#64748b;font-size:10px;">Inspector / Maintenance Lead:</span>
          </div>
          <div style="flex:1;border-bottom:1px solid #334155;padding-bottom:4px;">
            <span style="color:#64748b;font-size:10px;">Authorized Signature:</span>
          </div>
          <div style="flex:0.6;border-bottom:1px solid #334155;padding-bottom:4px;">
            <span style="color:#64748b;font-size:10px;">Audit Date:</span>
          </div>
        </div>
        <p style="font-size:9px;color:#94a3b8;margin-top:10px;font-style:italic;">
          OperateIQ Commercial Property Portfolio · Generated for institutional record keeping, municipal safety records, and risk management insurance compliance.
        </p>
      </div>
    `;

    return `
      ${submissionNotice}
      ${summaryCards}
      <table style="width:100%;border-collapse:collapse;font-size:10.5px;color:#0f172a;margin-top:8px;">
        <thead>
          <tr style="background:#f1f5f9;color:#334155;">
            <th style="border:1px solid #cbd5e1;padding:7px 8px;text-align:left;">Building</th>
            <th style="border:1px solid #cbd5e1;padding:7px 8px;text-align:left;">Type</th>
            <th style="border:1px solid #cbd5e1;padding:7px 8px;text-align:center;">Inspection Date</th>
            <th style="border:1px solid #cbd5e1;padding:7px 8px;text-align:center;">Crew</th>
            <th style="border:1px solid #cbd5e1;padding:7px 8px;text-align:center;">Status</th>
            <th style="border:1px solid #cbd5e1;padding:7px 8px;text-align:left;">Notes / Observations</th>
            <th style="border:1px solid #cbd5e1;padding:7px 8px;text-align:left;">Updated By</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      ${signoffBlock}
    `;
  };

  const buildComplianceReportHTML = () => {
    const tableHeader = `
      <tr style="background:#f1f5f9;color:#334155;">
        <th style="border:1px solid #cbd5e1;padding:6px 8px;text-align:left;">Building</th>
        ${INSPECTION_TYPES.map(t => `<th style="border:1px solid #cbd5e1;padding:6px 4px;text-align:center;font-size:9px;">${t}</th>`).join("")}
        <th style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">Compliance</th>
      </tr>
    `;

    let totalPossible = 0;
    let totalDone = 0;

    const tableRows = propertiesList.map((prop, i) => {
      const applicableTypes = INSPECTION_TYPES.filter(t => configMap[prop]?.has(t));
      const completedCount = applicableTypes.filter(t => complianceMatrix[prop]?.[t]?.done).length;
      const totalApplicable = applicableTypes.length;
      const score = totalApplicable > 0 ? Math.round((completedCount / totalApplicable) * 100) : 0;

      totalPossible += totalApplicable;
      totalDone += completedCount;

      const cells = INSPECTION_TYPES.map(itype => {
        const applicable = configMap[prop]?.has(itype);
        const cell = complianceMatrix[prop]?.[itype];
        if (!applicable) return `<td style="border:1px solid #cbd5e1;padding:6px 4px;text-align:center;color:#cbd5e1;">—</td>`;
        if (cell?.done) {
          const mName = cell.date ? new Date(cell.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" }) : "Done";
          return `<td style="border:1px solid #cbd5e1;padding:6px 4px;text-align:center;background:#ecfdf5;color:#047857;font-weight:700;font-size:9px;">✔ ${mName}</td>`;
        }
        return `<td style="border:1px solid #cbd5e1;padding:6px 4px;text-align:center;background:#fef2f2;color:#dc2626;font-weight:700;font-size:10px;">✕</td>`;
      }).join("");

      const scoreColor = score >= 100 ? "#047857" : score >= 50 ? "#b45309" : "#b91c1c";
      const scoreBg = score >= 100 ? "#ecfdf5" : score >= 50 ? "#fefce8" : "#fef2f2";

      return `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
          <td style="border:1px solid #cbd5e1;padding:6px 8px;font-weight:700;">${prop}</td>
          ${cells}
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;font-weight:800;color:${scoreColor};background:${scoreBg};">
            ${totalApplicable > 0 ? `${score}%` : "—"}
          </td>
        </tr>
      `;
    }).join("");

    const portfolioRate = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

    return `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:12px;font-weight:700;color:#0f172a;">Annual Compliance Overview (${complianceYear})</span>
          <p style="font-size:10px;color:#64748b;margin:2px 0 0 0;">Municipal, structural, fire, HVAC, safety, and operational inspections per building.</p>
        </div>
        <div style="text-align:right;">
          <span style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Portfolio Compliance Rate:</span>
          <span style="font-size:18px;font-weight:800;color:#0f172a;margin-left:8px;">${portfolioRate}%</span>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;color:#0f172a;">
        <thead>${tableHeader}</thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div style="margin-top:24px;display:flex;justify-content:space-between;font-size:10px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:12px;">
        <span>OperateIQ · Property Management Portfolio</span>
        <span>${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
      </div>
    `;
  };

  const isMonthSubmitted = records.length > 0 && records.every(r => r.isSubmitted);
  const hasDraftRows = records.length > 0 && records.some(r => !r.isSubmitted);
  const monthOptions = getMonthOptions();

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return records;
    return records.filter(r => r.property.toLowerCase().includes(q) || r.inspectionType.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q));
  }, [records, search]);

  const complianceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { done: boolean; date?: string; month?: string }>> = {};
    for (const prop of propertiesList) {
      matrix[prop] = {};
      for (const itype of INSPECTION_TYPES) {
        const applicable = configMap[prop]?.has(itype);
        if (!applicable) { matrix[prop][itype] = { done: false }; continue; }
        const match = complianceRecords.find(r => r.property === prop && r.inspectionType === itype && r.inspectionDate);
        matrix[prop][itype] = match ? { done: true, date: match.inspectionDate || undefined, month: match.month } : { done: false };
      }
    }
    return matrix;
  }, [complianceRecords, configMap, propertiesList]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(96,165,250,0.15)] border border-[rgba(96,165,250,0.3)] flex items-center justify-center">
            <ShieldAlert size={18} className="text-[#60A5FA]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Building Inspections</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Fire, HVAC, Sprinkler, Structural & More</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("entry")} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${view === "entry" ? "bg-[rgba(96,165,250,0.15)] text-[#60A5FA] border border-[rgba(96,165,250,0.3)]" : "text-gray-500 hover:text-gray-300 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"}`}>
            <FileSpreadsheet size={13} /> Monthly Entry
          </button>
          <button onClick={() => setView("compliance")} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${view === "compliance" ? "bg-white/[0.08] text-sky-400 border border-white/20 shadow-[0_0_12px_rgba(56,189,248,0.15)]" : "text-gray-500 hover:text-gray-300 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"}`}>
            <BarChart3 size={13} /> Compliance Chart
          </button>
        </div>
      </div>

      {/* ═══ MONTHLY ENTRY VIEW ═══ */}
      {view === "entry" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Select Month</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={FIELD}>
                {monthOptions.map(o => <option key={o.value} value={o.value} style={{ background: "#0D1117" }}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {!isMonthSubmitted && (
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white text-xs font-black hover:opacity-90 transition-opacity shadow-lg" style={{ boxShadow: "0 0 20px rgba(96,165,250,0.2)" }}>
                  <Plus size={14} /> Add Inspection
                </button>
              )}
              {records.length > 0 && (
                <>
                  <PrintButton
                    label="Export PDF"
                    title={`Building Inspections Report — ${fmtMonthFull(selectedMonth)}`}
                    buildHTML={buildMonthlyReportHTML}
                  />
                  <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all">
                    <FileSpreadsheet size={12} /> CSV
                  </button>
                </>
              )}
              <button onClick={() => fetchRecords(selectedMonth)} disabled={loading} className="p-2 rounded-xl text-gray-500 hover:text-white border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] transition-all">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {isMonthSubmitted && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]">
              <CheckCircle2 size={14} className="text-[#10B981]" />
              <span className="text-xs font-bold text-[#10B981]">
                Submitted {records[0]?.submittedAt ? `on ${new Date(records[0].submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}` : ""} by {records[0]?.submittedBy || "Staff"}
              </span>
            </div>
          )}

          {showAdd && !isMonthSubmitted && (
            <div className="bg-[rgba(96,165,250,0.06)] border border-[rgba(96,165,250,0.2)] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2"><Plus size={14} className="text-[#60A5FA]" /> Add Inspection Entry — {fmtMonth(selectedMonth)}</h3>
                <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Building</label>
                  {propertiesList.length > 0 ? (
                    <select value={addForm.property} onChange={e => setAddForm(f => ({ ...f, property: e.target.value }))} className={FIELD}>
                      {propertiesList.map(p => <option key={p} value={p} style={{ background: "#0D1117" }}>{p}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={addForm.property}
                      onChange={e => setAddForm(f => ({ ...f, property: e.target.value }))}
                      placeholder="Enter building name…"
                      className={FIELD}
                    />
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Inspection Type</label>
                  <select value={addForm.inspectionType} onChange={e => setAddForm(f => ({ ...f, inspectionType: e.target.value }))} className={FIELD}>
                    {INSPECTION_TYPES.map(t => <option key={t} value={t} style={{ background: "#0D1117" }}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Date</label>
                  <input type="date" value={addForm.inspectionDate} onChange={e => setAddForm(f => ({ ...f, inspectionDate: e.target.value }))} className={FIELD} style={{ colorScheme: "dark" }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Crew</label>
                  <select value={addForm.crewType} onChange={e => setAddForm(f => ({ ...f, crewType: e.target.value as "internal" | "external" }))} className={FIELD}>
                    <option value="internal" style={{ background: "#0D1117" }}>Internal</option>
                    <option value="external" style={{ background: "#0D1117" }}>External</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Notes</label>
                  <input type="text" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" className={FIELD} />
                </div>
              </div>
              <button onClick={addEntry} disabled={adding || !addForm.property.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-40">
                {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {adding ? "Adding…" : "Add Entry"}
              </button>
            </div>
          )}

          {records.length > 0 && (
            <div className="relative max-w-xs">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="text" placeholder="Search entries…" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl pl-8 pr-4 py-2 text-xs text-white focus:border-[rgba(96,165,250,0.4)] outline-none placeholder:text-gray-700" />
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-[#60A5FA]" />
              <span className="ml-2 text-sm text-gray-500">Loading inspections…</span>
            </div>
          )}

          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.2)] flex items-center justify-center mb-4">
                <ShieldAlert size={28} className="text-[#60A5FA]/50" />
              </div>
              <p className="text-gray-400 font-bold">No inspections for {fmtMonthFull(selectedMonth)}</p>
              <p className="text-xs text-gray-600 mt-1 mb-4 max-w-sm">Click &quot;Add Inspection&quot; to log completed inspections for this month.</p>
            </div>
          )}

          {!loading && records.length > 0 && (
            <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)]">
                      <th className={`${TH} pl-4 min-w-[140px]`}>Building</th>
                      <th className={TH}>Type</th>
                      <th className={TH}>Date</th>
                      <th className={TH}>Crew</th>
                      <th className={TH}>Notes</th>
                      <th className={`${TH} pr-4 w-[60px]`}>Updated By</th>
                      {!isMonthSubmitted && <th className={`${TH} w-[40px]`}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(r => (
                      <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className={`${TD} pl-4`}>
                          <div className="flex items-center gap-2">
                            <Building2 size={12} className="text-[#60A5FA] flex-shrink-0" />
                            <span className="font-bold text-white text-xs">{r.property}</span>
                          </div>
                        </td>
                        <td className={TD}>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[rgba(96,165,250,0.1)] text-[#60A5FA] border border-[rgba(96,165,250,0.2)]">{r.inspectionType}</span>
                        </td>
                        <td className={TD}>
                          <input type="date" value={r.inspectionDate || ""} onChange={e => updateRecord(r.id!, "inspectionDate", e.target.value || null)} disabled={isMonthSubmitted} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1 text-xs text-white focus:border-[rgba(96,165,250,0.4)] outline-none w-[120px] [color-scheme:dark] disabled:opacity-50" />
                        </td>
                        <td className={TD}>
                          <select value={r.crewType} onChange={e => updateRecord(r.id!, "crewType", e.target.value)} disabled={isMonthSubmitted} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1 text-xs text-white focus:border-[rgba(96,165,250,0.4)] outline-none w-[90px] disabled:opacity-50">
                            <option value="internal" className="bg-[#0D1117]">Internal</option>
                            <option value="external" className="bg-[#0D1117]">External</option>
                          </select>
                        </td>
                        <td className={TD}>
                          <input type="text" value={r.notes} onChange={e => updateRecord(r.id!, "notes", e.target.value)} disabled={isMonthSubmitted} placeholder="Notes…" className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2.5 py-1 text-xs text-white focus:border-[rgba(96,165,250,0.4)] outline-none disabled:opacity-50" />
                        </td>
                        <td className={`${TD} pr-4 text-[10px] text-gray-500`}>{r.updatedBy || "—"}</td>
                        {!isMonthSubmitted && (
                          <td className={TD}>
                            <button onClick={() => deleteEntry(r.id!)} className="text-gray-600 hover:text-[#EF4444] transition-colors p-1"><Trash2 size={12} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{records.length} inspection{records.length !== 1 ? "s" : ""} · {new Set(records.map(r => r.property)).size} buildings</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]" /> {records.filter(r => r.inspectionDate).length} completed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.15)]" /> {records.filter(r => !r.inspectionDate).length} pending</span>
                </div>
              </div>
            </div>
          )}

          {hasDraftRows && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-gray-600"><Clock size={11} className="inline mr-1" />All changes auto-save as you type. Submit locks the month as a permanent record.</p>
              <button onClick={submitMonth} disabled={submitting} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-sm font-black hover:opacity-90 transition-all duration-200 shadow-lg disabled:opacity-50" style={{ boxShadow: "0 0 30px rgba(16,185,129,0.25)" }}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? "Submitting…" : `Submit ${fmtMonth(selectedMonth)}`}
              </button>
            </div>
          )}

          {submitSuccess && (
            <div className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-xl bg-[#10B981] text-white font-bold text-sm shadow-xl z-50">
              <CheckCircle2 size={16} /> {fmtMonth(selectedMonth)} inspections submitted!
            </div>
          )}
        </>
      )}

      {/* ═══ COMPLIANCE CHART VIEW ═══ */}
      {view === "compliance" && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Year</label>
              <div className="flex gap-1">
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                  <button key={y} onClick={() => setComplianceYear(y)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${complianceYear === y ? "bg-white/[0.08] text-sky-400 border border-white/20 shadow-[0_0_10px_rgba(56,189,248,0.15)]" : "text-gray-500 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"}`}>{y}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PrintButton
                label="Compliance PDF"
                title={`Annual Building Inspection Compliance Report — ${complianceYear}`}
                buildHTML={buildComplianceReportHTML}
              />
              <button onClick={() => setShowConfig(!showConfig)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${showConfig ? "bg-[rgba(96,165,250,0.15)] text-[#60A5FA] border border-[rgba(96,165,250,0.3)]" : "text-gray-500 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"}`}>
                <Settings2 size={12} /> Configure Types
              </button>
            </div>
          </div>

          {propertiesList.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)]">
              <Building2 className="mx-auto text-gray-600 mb-2" size={28} />
              <p className="text-sm font-bold text-gray-300">No properties in your portfolio yet</p>
              <p className="text-xs text-gray-500 mt-1">Add properties in the Property Details tab or log an inspection entry to populate the compliance matrix.</p>
            </div>
          ) : (
            <>
              {showConfig && (
                <div className="bg-[rgba(96,165,250,0.04)] border border-[rgba(96,165,250,0.15)] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-white flex items-center gap-2"><Settings2 size={14} className="text-[#60A5FA]" /> Applicable Inspection Types Per Building</h3>
                    <p className="text-[10px] text-gray-500">Toggle which inspection types apply to each building</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                          <th className="text-left text-[9px] font-black text-gray-500 uppercase tracking-wider pb-2 pr-4 min-w-[130px]">Building</th>
                          {INSPECTION_TYPES.map(t => <th key={t} className="text-center text-[8px] font-bold text-gray-500 uppercase tracking-wider pb-2 px-1 min-w-[50px]">{t}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {propertiesList.map(prop => (
                          <tr key={prop} className="border-b border-[rgba(255,255,255,0.03)]">
                            <td className="py-2 pr-4 font-bold text-white text-xs">{prop}</td>
                            {INSPECTION_TYPES.map(itype => {
                              const enabled = configMap[prop]?.has(itype) || false;
                              return (
                                <td key={itype} className="py-2 text-center">
                                  <button onClick={() => toggleConfig(prop, itype)} className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${enabled ? "bg-[#60A5FA] border-[#60A5FA] text-white" : "border-[rgba(255,255,255,0.12)] text-transparent hover:border-[rgba(255,255,255,0.3)]"}`}>
                                    <CheckCircle2 size={10} />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {complianceLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={20} className="animate-spin text-[#4ADE80]" />
                  <span className="ml-2 text-sm text-gray-500">Loading compliance data…</span>
                </div>
              ) : (
                <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)]">
                          <th className="text-left text-[9px] font-black text-gray-500 uppercase tracking-wider py-3 pl-4 min-w-[140px] sticky left-0 z-10 bg-[rgba(10,15,26,0.99)]">Building</th>
                          {INSPECTION_TYPES.map(t => <th key={t} className="text-center text-[8px] font-bold text-gray-500 uppercase tracking-wider py-3 px-2 min-w-[65px]">{t}</th>)}
                          <th className="text-center text-[8px] font-bold text-gray-500 uppercase tracking-wider py-3 px-3">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertiesList.map((prop, i) => {
                          const applicableTypes = INSPECTION_TYPES.filter(t => configMap[prop]?.has(t));
                          const completedCount = applicableTypes.filter(t => complianceMatrix[prop]?.[t]?.done).length;
                          const totalApplicable = applicableTypes.length;
                          const score = totalApplicable > 0 ? Math.round((completedCount / totalApplicable) * 100) : 0;
                          return (
                            <tr key={prop} className={`border-b border-[rgba(255,255,255,0.04)] ${i % 2 === 1 ? "bg-[rgba(255,255,255,0.01)]" : ""}`}>
                              <td className="py-3 pl-4 font-bold text-white text-xs sticky left-0 z-10 bg-[rgba(10,15,26,0.99)] border-r border-[rgba(255,255,255,0.06)]">{prop}</td>
                              {INSPECTION_TYPES.map(itype => {
                                const applicable = configMap[prop]?.has(itype);
                                const cell = complianceMatrix[prop]?.[itype];
                                if (!applicable) return <td key={itype} className="py-3 text-center"><span className="text-gray-700 text-[10px]">—</span></td>;
                                return (
                                  <td key={itype} className="py-3 text-center">
                                    {cell?.done ? (
                                      <div className="flex flex-col items-center" title={cell.date ? `Completed ${cell.date}` : "Completed"}>
                                        <div className="w-5 h-5 rounded-md bg-[rgba(16,185,129,0.2)] border border-[rgba(16,185,129,0.4)] flex items-center justify-center"><CheckCircle2 size={10} className="text-[#10B981]" /></div>
                                        {cell.date && <span className="text-[8px] text-gray-500 mt-0.5">{new Date(cell.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}</span>}
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-md bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center mx-auto" title="Not completed"><X size={9} className="text-[#EF4444]" /></div>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-3 text-center">
                                {totalApplicable > 0 ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black ${score >= 100 ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]" : score >= 50 ? "bg-[rgba(250,204,21,0.15)] text-[#FACC15]" : "bg-[rgba(239,68,68,0.15)] text-[#EF4444]"}`}>{score}%</span>
                                ) : <span className="text-gray-700 text-[10px]">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                          <td className="py-3 pl-4 text-[10px] font-black text-gray-400 uppercase tracking-wider sticky left-0 z-10 bg-[rgba(22,27,34,0.99)] border-r border-[rgba(255,255,255,0.06)]">Totals</td>
                          {INSPECTION_TYPES.map(itype => {
                            const applicable = propertiesList.filter(p => configMap[p]?.has(itype));
                            const completed = applicable.filter(p => complianceMatrix[p]?.[itype]?.done);
                            if (applicable.length === 0) return <td key={itype} className="py-3 text-center text-[9px] text-gray-700">—</td>;
                            return <td key={itype} className="py-3 text-center"><span className={`text-[9px] font-bold ${completed.length === applicable.length ? "text-[#10B981]" : "text-gray-500"}`}>{completed.length}/{applicable.length}</span></td>;
                          })}
                          <td className="py-3 text-center">
                            {(() => {
                              const tA = propertiesList.reduce((s, p) => s + INSPECTION_TYPES.filter(t => configMap[p]?.has(t)).length, 0);
                              const tD = propertiesList.reduce((s, p) => s + INSPECTION_TYPES.filter(t => configMap[p]?.has(t) && complianceMatrix[p]?.[t]?.done).length, 0);
                              const o = tA > 0 ? Math.round((tD / tA) * 100) : 0;
                              return <span className={`text-[10px] font-black ${o >= 100 ? "text-[#10B981]" : o >= 50 ? "text-[#FACC15]" : "text-[#EF4444]"}`}>{o}%</span>;
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
