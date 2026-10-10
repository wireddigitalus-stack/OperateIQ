"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Plus, X, Save, Loader2, RefreshCw, Trash2,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Building2,
  User, Calendar, AlertTriangle, Circle,
} from "lucide-react";
import PrintButton from "./PrintButton";
import MicButton from "@/components/MicButton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Assignment {
  id: string;
  workerName: string;
  property: string;
  area: string;
  scheduledDate: string;
  startTime: string | null;
  endTime: string | null;
  completedAt: string | null;
  notes: string;
  status: "pending" | "in_progress" | "done";
  estimatedCost?: number;
  actualCost?: number;
}

// ─── DEMO DATA — remove before go-live ───────────────────────────────────────
// To remove: delete getDemoAssignments() and the `if (data.assignments.length === 0)` block in fetchAssignments

function weekDay(offset: number): string {
  const d = new Date();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  mon.setDate(mon.getDate() + offset);
  return mon.toISOString().split("T")[0];
}

function getDemoAssignments(): Assignment[] {
  const mon = weekDay(0), tue = weekDay(1), wed = weekDay(2),
        thu = weekDay(3), fri = weekDay(4);
  return [
    { id: "dc_1",  workerName: "Sarah M.", property: "The Executive",  area: "Common Areas & Lobby",    scheduledDate: mon, startTime: "08:00", endTime: "10:00", completedAt: new Date().toISOString(), notes: "", status: "done" },
    { id: "dc_2",  workerName: "Sarah M.", property: "The Executive",  area: "Suites 101-110",          scheduledDate: mon, startTime: "10:00", endTime: "13:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_3",  workerName: "Sarah M.", property: "The Executive",  area: "Common Areas & Lobby",    scheduledDate: wed, startTime: "08:00", endTime: "10:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_4",  workerName: "Sarah M.", property: "The Executive",  area: "Suites 201-210",          scheduledDate: wed, startTime: "10:00", endTime: "13:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_5",  workerName: "Sarah M.", property: "The Executive",  area: "Full Building Deep Clean", scheduledDate: fri, startTime: "08:00", endTime: "14:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_6",  workerName: "Linda K.", property: "City Centre",    area: "Lobby & Reception",       scheduledDate: tue, startTime: "09:00", endTime: "11:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_7",  workerName: "Linda K.", property: "City Centre",    area: "Suites 101-112",          scheduledDate: tue, startTime: "11:00", endTime: "15:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_8",  workerName: "Linda K.", property: "City Centre",    area: "Restrooms & Corridors",   scheduledDate: thu, startTime: "09:00", endTime: "12:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_9",  workerName: "Priya R.", property: "Bristol Commons", area: "Restrooms (All Floors)",  scheduledDate: mon, startTime: "07:30", endTime: "10:30", completedAt: new Date().toISOString(), notes: "", status: "done" },
    { id: "dc_10", workerName: "Priya R.", property: "Bristol Commons", area: "Restrooms (All Floors)",  scheduledDate: tue, startTime: "07:30", endTime: "10:30", completedAt: null, notes: "", status: "pending" },
    { id: "dc_11", workerName: "Priya R.", property: "Bristol Commons", area: "Lobby & Break Room",      scheduledDate: wed, startTime: "07:30", endTime: "10:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_12", workerName: "Priya R.", property: "Bristol Commons", area: "Restrooms (All Floors)",  scheduledDate: thu, startTime: "07:30", endTime: "10:30", completedAt: null, notes: "", status: "pending" },
    { id: "dc_13", workerName: "Priya R.", property: "Bristol Commons", area: "Full Building Clean",     scheduledDate: fri, startTime: "07:30", endTime: "13:00", completedAt: null, notes: "", status: "pending" },
    { id: "dc_14", workerName: "Jess T.",  property: "City Centre",    area: "Executive Suites 201-205",scheduledDate: mon, startTime: "10:00", endTime: "13:00", completedAt: null, notes: "", status: "pending" },
  ];
}

// ─── Worker color palette ─────────────────────────────────────────────────────

const PALETTE = [
  { bg: "rgba(96,165,250,0.18)",  border: "rgba(96,165,250,0.45)",  text: "#60A5FA" },
  { bg: "rgba(167,139,250,0.18)", border: "rgba(167,139,250,0.45)", text: "#A78BFA" },
  { bg: "rgba(251,146,60,0.18)",  border: "rgba(251,146,60,0.45)",  text: "#FB923C" },
  { bg: "rgba(34,211,238,0.18)",  border: "rgba(34,211,238,0.45)",  text: "#22D3EE" },
  { bg: "rgba(244,114,182,0.18)", border: "rgba(244,114,182,0.45)", text: "#F472B6" },
  { bg: "rgba(163,230,53,0.18)",  border: "rgba(163,230,53,0.45)",  text: "#A3E635" },
  { bg: "rgba(250,204,21,0.18)",  border: "rgba(250,204,21,0.4)",   text: "#FACC15" },
  { bg: "rgba(52,211,153,0.18)",  border: "rgba(52,211,153,0.45)",  text: "#34D399" },
];

function workerColor(name: string, workerIndex: Map<string, number>) {
  if (!workerIndex.has(name)) workerIndex.set(name, workerIndex.size);
  return PALETTE[workerIndex.get(name)! % PALETTE.length];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToAssignment(r: Record<string, unknown>): Assignment {
  return {
    id: r.id as string,
    workerName: (r.worker_name as string) || "",
    property: (r.property as string) || "",
    area: (r.area as string) || "",
    scheduledDate: (r.scheduled_date as string) || "",
    startTime: (r.start_time as string) || null,
    endTime: (r.end_time as string) || null,
    completedAt: (r.completed_at as string) || null,
    notes: (r.notes as string) || "",
    status: (r.status as Assignment["status"]) || "pending",
    estimatedCost: Number(r.estimated_cost) || 0,
    actualCost: Number(r.actual_cost) || 0,
  };
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date) { return d.toISOString().split("T")[0]; }

function fmtDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtShortDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

/** Convert "HH:MM" (24h) → "H:MM AM/PM" */
function fmtTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:     <Circle size={9} className="text-gray-500" />,
  in_progress: <Clock size={9} className="text-[#FACC15]" />,
  done:        <CheckCircle2 size={9} className="text-[#4ADE80]" />,
};

// ─── Summary Banner ───────────────────────────────────────────────────────────

function SummaryBanner({ assignments, today }: { assignments: Assignment[]; today: string }) {
  const todayA = assignments.filter(a => a.scheduledDate === today);
  const done = todayA.filter(a => a.status === "done");
  const pending = todayA.filter(a => a.status === "pending");
  const workers = new Set(todayA.map(a => a.workerName).filter(Boolean));
  const pct = todayA.length > 0 ? Math.round((done.length / todayA.length) * 100) : 0;

  const totalEstCost = assignments.reduce((s, a) => s + (a.estimatedCost || 0), 0);
  const totalActCost = assignments.reduce((s, a) => s + (a.actualCost || 0), 0);

  return (
    <div className="rounded-2xl border border-[rgba(74,222,128,0.2)] bg-gradient-to-br from-[rgba(74,222,128,0.05)] via-transparent to-transparent p-5 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#4ADE80] opacity-[0.03] blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center text-lg shadow-[0_0_12px_rgba(74,222,128,0.3)]">
            🧹
          </div>
          <div>
            <p className="text-xs font-black text-[#4ADE80] uppercase tracking-widest">Cleaning Control</p>
            <p className="text-[11px] text-gray-500">
              {todayA.length} assignments today · {workers.size} worker{workers.size !== 1 ? "s" : ""} active
            </p>
          </div>
        </div>
        <a
          href="/staff/cleaning"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:opacity-75 flex-shrink-0"
          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ADE80" }}
        >
          🧹 Crew Portal ↗
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { label: "Today Total",  value: String(todayA.length), color: "#94A3B8" },
          { label: "Complete",     value: `${pct}%`,             color: pct === 100 ? "#4ADE80" : pct > 50 ? "#FACC15" : "#94A3B8" },
          { label: "Est. Cost (Period)", value: totalEstCost > 0 ? `$${totalEstCost.toLocaleString()}` : "—", color: "#FACC15" },
          { label: "Act. Cost (Period)", value: totalActCost > 0 ? `$${totalActCost.toLocaleString()}` : "—", color: "#4ADE80" },
        ].map(s => (
          <div key={s.label} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3">
            <p className="text-[10px] text-gray-600 mb-0.5">{s.label}</p>
            <p className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {todayA.length > 0 && (
        <div>
          <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.07)] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#4ADE80] to-[#22C55E] transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-600 mt-1">{done.length} of {todayA.length} complete today</p>
        </div>
      )}

      {pct === 100 && todayA.length > 0 && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)]">
          <Sparkles size={12} className="text-[#4ADE80]" />
          <span className="text-xs font-bold text-[#4ADE80]">All properties cleaned for today! 🎉</span>
        </div>
      )}
    </div>
  );
}

// ─── Assignment Form ──────────────────────────────────────────────────────────

type RecurringType = "none" | "daily" | "weekdays" | "mwf" | "weekly";

function AssignmentForm({ onSave, onCancel, currentUserName, currentUserEmail }: {
  onSave: () => void;
  onCancel: () => void;
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const today = toISO(new Date());
  const [workerName, setWorkerName] = useState("");
  const [property, setProperty] = useState("");
  const [areas, setAreas] = useState<string[]>([""]);
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurring, setRecurring] = useState<RecurringType>("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [actualCost, setActualCost] = useState<number>(0);
  const [newPinInfo, setNewPinInfo] = useState<{ name: string; pin: string } | null>(null);
  const [knownWorkers, setKnownWorkers] = useState<string[]>([]);

  // Load real cleaning staff names for the datalist autocomplete
  useEffect(() => {
    fetch("/api/allowed-users?role=cleaning")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.users)) {
          setKnownWorkers(d.users.map((u: { name: string }) => u.name).filter(Boolean));
        }
      })
      .catch(() => {});
  }, []);

  const addArea = () => setAreas(a => [...a, ""]);
  const setArea = (i: number, v: string) => setAreas(a => a.map((x, j) => j === i ? v : x));
  const removeArea = (i: number) => setAreas(a => a.filter((_, j) => j !== i));

  const getDates = (): string[] => {
    const start = new Date(date + "T12:00:00");
    if (recurring === "none" || !endDate) return [toISO(start)];
    const end = new Date(endDate + "T12:00:00");
    const dates: string[] = [];
    let cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay(); // 0=Sun,1=Mon,...6=Sat
      if (recurring === "daily") dates.push(toISO(cur));
      else if (recurring === "weekdays" && dow >= 1 && dow <= 5) dates.push(toISO(cur));
      else if (recurring === "mwf" && [1, 3, 5].includes(dow)) dates.push(toISO(cur));
      else if (recurring === "weekly" && toISO(cur).slice(0, 10) === toISO(start).slice(0, 10)) dates.push(toISO(cur));
      cur = addDays(cur, recurring === "weekly" ? 7 : 1);
    }
    return dates.length ? dates : [toISO(start)];
  };

  const submit = async () => {
    if (!workerName.trim() || !property.trim()) { setError("Worker and property are required."); return; }
    const validAreas = areas.filter(a => a.trim());
    if (validAreas.length === 0) { setError("Add at least one area."); return; }
    setSaving(true); setError("");
    const dates = getDates();
    try {
      const responses = await Promise.all(
        dates.flatMap(d =>
          validAreas.map(area =>
            fetch("/api/cleaning", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                workerName: workerName.trim(), property: property.trim(),
                area: area.trim(), scheduledDate: d,
                startTime: startTime || null, endTime: endTime || null,
                actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
                actorEmail: currentUserEmail || "",
                estimatedCost: estimatedCost,
                actualCost: actualCost,
              }),
            })
          )
        )
      );
      const failed = responses.filter(r => !r.ok);
      if (failed.length > 0) {
        const errText = await failed[0].text().catch(() => "Server error");
        setError(`Save failed: ${errText || "check server logs"}`);
        return;
      }
      // Auto-provision this worker in allowed_users if they don't exist yet
      try {
        const staffRes = await fetch("/api/ensure-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: workerName.trim(), role: "cleaning" }),
        });
        const staffData = await staffRes.json();
        if (staffData.isNew && staffData.pin) {
          setNewPinInfo({ name: workerName.trim(), pin: staffData.pin });
        }
      } catch { /* non-critical — job already saved */ }
      onSave();
    } catch (e) { setError(`Failed to save: ${e instanceof Error ? e.message : "Network error"}`); }
    finally { setSaving(false); }
  };

  const [quickMode, setQuickMode] = useState(
    typeof window !== "undefined" && window.innerWidth < 640
  );

  const submitQuick = async () => {
    if (!workerName.trim() || !property.trim()) { setError("Worker and property are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/cleaning", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerName: workerName.trim(), property: property.trim(),
          area: "General", scheduledDate: date,
          startTime: null, endTime: null,
          actorName: currentUserName || currentUserEmail?.split("@")[0] || "Staff",
          actorEmail: currentUserEmail || "",
          estimatedCost: estimatedCost,
          actualCost: actualCost,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "Server error");
        setError(`Save failed: ${errText || "check server logs"}`);
        return;
      }
      // Auto-provision this worker in allowed_users if they don't exist yet
      try {
        const staffRes = await fetch("/api/ensure-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: workerName.trim(), role: "cleaning" }),
        });
        const staffData = await staffRes.json();
        if (staffData.isNew && staffData.pin) {
          setNewPinInfo({ name: workerName.trim(), pin: staffData.pin });
        }
      } catch { /* non-critical */ }
      onSave();
    } catch (e) { setError(`Failed to save: ${e instanceof Error ? e.message : "Network error"}`); }
    finally { setSaving(false); }
  };

  const LABEL = "text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1";
  const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none placeholder:text-gray-600";

  return (
    <div className="bg-[rgba(0,0,0,0.4)] border border-[rgba(74,222,128,0.2)] rounded-2xl p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-[#4ADE80] uppercase tracking-widest flex items-center gap-2">
          <Plus size={12} /> New Assignment
        </p>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div style={{
            display: "flex", background: "rgba(255,255,255,0.05)",
            borderRadius: 8, padding: 2, gap: 2,
          }}>
            {[{k:true,l:"⚡ Quick"},{k:false,l:"Full"}].map(({k,l}) => (
              <button
                key={String(k)}
                onClick={() => setQuickMode(k)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11,
                  fontWeight: 700, border: "none", cursor: "pointer",
                  background: quickMode === k ? "rgba(74,222,128,0.25)" : "transparent",
                  color: quickMode === k ? "#4ADE80" : "#64748B",
                  transition: "all 0.15s",
                }}
              >{l}</button>
            ))}
          </div>
          <button onClick={onCancel} className="text-gray-600 hover:text-white transition-colors"><X size={16} /></button>
        </div>
      </div>

      {/* ── QUICK MODE ── */}
      {quickMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ color: "#64748B", fontSize: 12, margin: 0 }}>
            Tap, fill 3 fields, done. Area defaults to "General".
          </p>
          {/* Cleaner */}
          <div>
            <label style={{ color: "#94A3B8", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Cleaner</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={workerName} onChange={e => setWorkerName(e.target.value)}
                placeholder="Cleaner name"
                list="cleaner-suggestions-q"
                style={{
                  flex: 1, padding: "14px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#F1F5F9", fontSize: 16, outline: "none", boxSizing: "border-box",
                }}
              />
              <MicButton onResult={(t) => setWorkerName(prev => prev ? prev + " " + t : t)} size={18} />
            </div>
            <datalist id="cleaner-suggestions-q">
              {knownWorkers.map(n => <option key={n} value={n}/>)}
            </datalist>
          </div>
          {/* Property */}
          <div>
            <label style={{ color: "#94A3B8", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Property / Building</label>
            <select
              value={property} onChange={e => setProperty(e.target.value)}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#F1F5F9", fontSize: 16, outline: "none", boxSizing: "border-box",
              }}
            >
              <option value="" style={{ background: "#0A0F1A" }}>Select property…</option>
              <option value="City Centre Professional Suites" style={{ background: "#0A0F1A" }}>City Centre Professional Suites</option>
              <option value="Bristol CoWork" style={{ background: "#0A0F1A" }}>Bristol CoWork</option>
              <option value="The Executive" style={{ background: "#0A0F1A" }}>The Executive</option>
              <option value="Centre Point" style={{ background: "#0A0F1A" }}>Centre Point</option>
              <option value="Foundation Event Facility" style={{ background: "#0A0F1A" }}>Foundation Event Facility</option>
              <option value="Commercial Warehouse" style={{ background: "#0A0F1A" }}>Commercial Warehouse</option>
            </select>
          </div>
          {/* Date */}
          <div>
            <label style={{ color: "#94A3B8", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Date</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#F1F5F9", fontSize: 16, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}
          <button
            onClick={submitQuick} disabled={saving}
            style={{
              width: "100%", padding: "16px", borderRadius: 14,
              background: saving ? "rgba(74,222,128,0.2)" : "linear-gradient(135deg,#4ADE80,#22D3EE)",
              border: "none", color: "#0F172A", fontWeight: 800, fontSize: 16,
              cursor: saving ? "wait" : "pointer", transition: "all 0.2s",
            }}
          >
            {saving ? "Saving…" : "✓ Log Job"}
          </button>
        </div>
      )}

      {/* ── FULL MODE ── */}
      {!quickMode && (
        <div className="space-y-4">

      {/* Worker + Property */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Cleaner Name *</label>
          <div className="flex gap-1.5 items-center">
            <input value={workerName} onChange={e => setWorkerName(e.target.value)}
              placeholder="Cleaner name" list="cleaner-suggestions" className={FIELD + " flex-1"} />
            <MicButton onResult={(t) => setWorkerName(prev => prev ? prev + " " + t : t)} />
          </div>
          <datalist id="cleaner-suggestions">
            {knownWorkers.map(n => <option key={n} value={n} />)}
          </datalist>
        </div>
        <div>
          <label className={LABEL}>Property / Building *</label>
          <select value={property} onChange={e => setProperty(e.target.value)} className={FIELD}>
            <option value="" className="bg-[#0A0F1A]">Select property…</option>
            <option value="City Centre Professional Suites" className="bg-[#0A0F1A]">City Centre Professional Suites</option>
            <option value="Bristol CoWork" className="bg-[#0A0F1A]">Bristol CoWork</option>
            <option value="The Executive" className="bg-[#0A0F1A]">The Executive</option>
            <option value="Centre Point" className="bg-[#0A0F1A]">Centre Point</option>
            <option value="Foundation Event Facility" className="bg-[#0A0F1A]">Foundation Event Facility</option>
            <option value="Commercial Warehouse" className="bg-[#0A0F1A]">Commercial Warehouse</option>
          </select>
        </div>
      </div>

      {/* Areas */}
      <div>
        <label className={LABEL}>Areas / Units to Clean</label>
        <div className="space-y-2">
          {areas.map((a, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={a} onChange={e => setArea(i, e.target.value)}
                placeholder={`Area ${i + 1} — e.g. Suite 101, Lobby, Common Areas`} className={FIELD + " flex-1"} />
              <MicButton onResult={(t) => setArea(i, (a || "") + (a ? " " : "") + t)} />
              {areas.length > 1 && (
                <button onClick={() => removeArea(i)} className="text-gray-600 hover:text-red-400 transition-colors"><X size={14} /></button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addArea} className="mt-2 text-xs text-[#4ADE80] hover:underline flex items-center gap-1">
          <Plus size={11} /> Add another area
        </button>
      </div>

      {/* Date + Recurring */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Start Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Recurring</label>
          <select value={recurring} onChange={e => setRecurring(e.target.value as RecurringType)} className={FIELD}>
            <option value="none" className="bg-[#0A0F1A]">One-time</option>
            <option value="daily" className="bg-[#0A0F1A]">Daily</option>
            <option value="weekdays" className="bg-[#0A0F1A]">Weekdays (M–F)</option>
            <option value="mwf" className="bg-[#0A0F1A]">Mon / Wed / Fri</option>
            <option value="weekly" className="bg-[#0A0F1A]">Weekly (same day)</option>
          </select>
        </div>
        {recurring !== "none" && (
          <div>
            <label className={LABEL}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={date} className={FIELD} />
          </div>
        )}
      </div>

      {/* Optional times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Start Time (optional)</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>End Time (optional)</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={FIELD} />
        </div>
      </div>

      {/* Cost / Budgeting */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Est. Cost ($)</label>
          <input type="number" value={estimatedCost || ""} onChange={e => setEstimatedCost(Number(e.target.value))} placeholder="0" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Actual Cost ($)</label>
          <input type="number" value={actualCost || ""} onChange={e => setActualCost(Number(e.target.value))} placeholder="0" className={FIELD} />
        </div>
      </div>

      {/* Recurring preview */}
      {recurring !== "none" && endDate && (
        <p className="text-[11px] text-gray-500 flex items-center gap-1">
          <Calendar size={11} />
          Creates <span className="text-[#4ADE80] font-bold">{getDates().length} dates</span> × {areas.filter(Boolean).length} area{areas.filter(Boolean).length !== 1 ? "s" : ""}
          {" = "}<span className="text-[#4ADE80] font-bold">{getDates().length * areas.filter(Boolean).length} assignments</span>
        </p>
      )}

      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}

      {newPinInfo && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.3)]">
          <span className="text-lg leading-none">🔐</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-[#4ADE80]">New staff portal access created for {newPinInfo.name}</p>
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

      <div className="flex gap-2">
        <button onClick={submit} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-xs font-black hover:opacity-90 disabled:opacity-50 transition-all">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? "Saving…" : "Create Assignment"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors">Cancel</button>
      </div>
        </div>
      )}
    </div>
  );
}

// ─── Week Grid ────────────────────────────────────────────────────────────────

function WeekGrid({ assignments, weekStart, workerIndex, onDelete }:
  { assignments: Assignment[]; weekStart: Date; workerIndex: Map<string, number>; onDelete: (id: string, name: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayISOs = days.map(toISO);

  // Unique properties this week
  const properties = Array.from(new Set(
    assignments.filter(a => dayISOs.includes(a.scheduledDate)).map(a => a.property)
  )).sort();

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-5xl mb-3">📅</span>
        <p className="text-gray-500 font-bold">No assignments this week</p>
        <p className="text-xs text-gray-600 mt-1">Click &ldquo;New Assignment&rdquo; to schedule your cleaning team.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="min-w-[640px]">
        {/* Header row */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `180px repeat(7, 1fr)` }}>
          <div />
          {days.map((d, i) => {
            const iso = toISO(d);
            const isToday = iso === toISO(new Date());
            return (
              <div key={i} className={`text-center py-2 rounded-xl ${isToday ? "bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)]" : ""}`}>
                <p className={`text-[10px] font-black uppercase tracking-wider ${isToday ? "text-[#4ADE80]" : "text-gray-600"}`}>
                  {DAY_NAMES[i]}
                </p>
                <p className={`text-xs font-bold ${isToday ? "text-[#4ADE80]" : "text-gray-500"}`}>
                  {d.getMonth() + 1}/{d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Property rows */}
        {properties.map(prop => (
          <div key={prop} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `180px repeat(7, 1fr)` }}>
            {/* Property label */}
            <div className="flex items-center pr-2 py-2">
              <span className="text-xs font-bold text-gray-300 truncate flex items-center gap-1">
                <Building2 size={10} className="text-gray-600 flex-shrink-0" />
                {prop}
              </span>
            </div>
            {/* Day cells */}
            {dayISOs.map((iso, di) => {
              const cell = assignments.filter(a => a.property === prop && a.scheduledDate === iso);
              const allDone = cell.length > 0 && cell.every(a => a.status === "done");
              return (
                <div key={di}
                  className={`rounded-xl min-h-[52px] p-1.5 border transition-colors ${
                    cell.length === 0 ? "border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)]"
                    : allDone ? "border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.04)]"
                    : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
                  }`}>
                  {cell.map(a => {
                    const c = workerColor(a.workerName, workerIndex);
                    return (
                      <div key={a.id} className="flex items-center gap-1 rounded-lg px-1.5 py-1 mb-0.5 group relative border text-[10px]"
                        style={{ backgroundColor: c.bg, borderColor: c.border }}>
                        {STATUS_ICON[a.status]}
                        <span className="truncate font-semibold flex-1" style={{ color: c.text }}>
                          {a.workerName.split(" ")[0]}
                        </span>
                        <button
                          onClick={() => onDelete(a.id, `${a.property} — ${a.area}`)}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 flex-shrink-0 transition-all">
                          <X size={9} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Today View ───────────────────────────────────────────────────────────────

function TodayView({ assignments, today, workerIndex, onDelete }:
  { assignments: Assignment[]; today: string; workerIndex: Map<string, number>; onDelete: (id: string, name: string) => void }) {
  const todayA = assignments.filter(a => a.scheduledDate === today);
  const byProp = todayA.reduce<Record<string, Assignment[]>>((acc, a) => {
    if (!acc[a.property]) acc[a.property] = [];
    acc[a.property].push(a);
    return acc;
  }, {});

  if (todayA.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-5xl mb-3">☀️</span>
        <p className="text-gray-500 font-bold">No assignments scheduled today</p>
        <p className="text-xs text-gray-600 mt-1">Click &ldquo;New Assignment&rdquo; to schedule cleaning for today.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(byProp).map(([prop, propA]) => {
        const allDone = propA.every(a => a.status === "done");
        const done = propA.filter(a => a.status === "done").length;
        return (
          <div key={prop} className={`rounded-2xl border p-4 transition-all ${
            allDone ? "border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.04)]" : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={13} className={allDone ? "text-[#4ADE80]" : "text-[#60A5FA]"} />
                <h3 className="text-sm font-bold text-white">{prop}</h3>
              </div>
              <div className="flex items-center gap-2">
                {allDone && <CheckCircle2 size={14} className="text-[#4ADE80]" />}
                <span className="text-[11px] text-gray-500">{done}/{propA.length} done</span>
              </div>
            </div>

            <div className="space-y-2">
              {propA.map(a => {
                const c = workerColor(a.workerName, workerIndex);
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border group"
                    style={{ backgroundColor: c.bg, borderColor: c.border }}>
                    <div className="flex-shrink-0">{STATUS_ICON[a.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: c.text }}>{a.workerName}</span>
                        {(a.startTime || a.endTime) && (
                          <span className="text-[10px] text-gray-600">{fmtTime(a.startTime)}–{fmtTime(a.endTime)}</span>
                        )}
                        {(a.estimatedCost !== undefined && a.estimatedCost > 0) && (
                          <span className="text-[10px] text-[#FACC15] font-bold">Est: ${a.estimatedCost}</span>
                        )}
                        {(a.actualCost !== undefined && a.actualCost > 0) && (
                          <span className="text-[10px] text-[#4ADE80] font-bold">Act: ${a.actualCost}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{a.area}</p>
                      {a.completedAt && (
                        <p className="text-[10px] text-[#4ADE80]">
                          ✓ Done {new Date(a.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${
                      a.status === "done" ? "bg-[rgba(74,222,128,0.15)] text-[#4ADE80]"
                      : a.status === "in_progress" ? "bg-[rgba(250,204,21,0.12)] text-[#FACC15]"
                      : "bg-[rgba(255,255,255,0.05)] text-gray-500"
                    }`}>{a.status.replace("_", " ")}</span>
                    <button onClick={() => onDelete(a.id, `${a.property} — ${a.area}`)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 flex-shrink-0 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Worker Legend ────────────────────────────────────────────────────────────

function WorkerLegend({ assignments, workerIndex }: { assignments: Assignment[]; workerIndex: Map<string, number> }) {
  const workers = Array.from(new Set(assignments.map(a => a.workerName).filter(Boolean)));
  if (workers.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {workers.map(w => {
        const c = workerColor(w, workerIndex);
        return (
          <span key={w} className="flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold"
            style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}>
            <User size={10} />{w}
          </span>
        );
      })}
    </div>
  );
}

// ─── Setup SQL Banner ─────────────────────────────────────────────────────────

const SETUP_SQL = `DROP TABLE IF EXISTS cleaning_assignments;

CREATE TABLE cleaning_assignments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_name   TEXT DEFAULT '',
  property      TEXT DEFAULT '',
  area          TEXT DEFAULT '',
  scheduled_date DATE NOT NULL,
  start_time    TEXT,
  end_time      TEXT,
  completed_at  TIMESTAMPTZ,
  notes         TEXT DEFAULT '',
  status        TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cleaning_assignments ENABLE ROW LEVEL SECURITY;`;

// ─── Main CleaningTab ─────────────────────────────────────────────────────────

export default function CleaningTab({ currentUserName, currentUserEmail }: { currentUserName?: string; currentUserEmail?: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState(false);
  const [viewMode, setViewMode] = useState<"today" | "week">("today");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [showForm, setShowForm] = useState(false);
  const today = toISO(new Date());

  // Stable worker color index — persists across re-renders
  const [workerIndex] = useState(() => new Map<string, number>());

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch 6 weeks around current week for smooth navigation
      const from = toISO(addDays(weekStart, -14));
      const to   = toISO(addDays(weekStart, 42));
      const res = await fetch(`/api/cleaning?from=${from}&to=${to}`);
      const data = await res.json();
      if (Array.isArray(data.assignments)) {
        setAssignments(data.assignments.map(rowToAssignment));
        setSetupError(false);
      } else { setSetupError(true); }
    } catch { setSetupError(true); }
    finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const handleDelete = async (id: string, name?: string) => {
    const params = new URLSearchParams({ id });
    if (currentUserName)  params.set("actorName",  currentUserName);
    if (currentUserEmail) params.set("actorEmail", currentUserEmail);
    if (name)             params.set("name",        name);
    await fetch(`/api/cleaning?${params.toString()}`, { method: "DELETE" });
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const isThisWeek = toISO(weekStart) === toISO(getMonday(new Date()));

  return (
    <div className="mt-6">
      <SummaryBanner assignments={assignments} today={today} />

      {/* Setup error */}
      {setupError && !loading && (
        <div className="mb-6 p-4 rounded-xl border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.04)]">
          <p className="text-xs font-bold text-[#4ADE80] mb-2 flex items-center gap-1.5"><AlertTriangle size={12} />Database table not found — one-time setup required</p>
          <p className="text-xs text-gray-400 mb-2">Run this SQL in your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#4ADE80] underline">Supabase SQL Editor</a>, then click Refresh:</p>
          <pre className="text-[10px] text-gray-300 bg-[rgba(0,0,0,0.4)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{SETUP_SQL}</pre>
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
            {(["today", "week"] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-4 py-2 text-xs font-bold capitalize transition-all ${viewMode === v ? "bg-[rgba(74,222,128,0.15)] text-[#4ADE80]" : "text-gray-500 hover:text-gray-300"}`}>
                {v === "today" ? "Today" : "Week View"}
              </button>
            ))}
          </div>

          {/* Week navigation (only in week view) */}
          {viewMode === "week" && (
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekStart(d => addDays(d, -7))}
                className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-gray-400 px-2 min-w-[160px] text-center">{weekLabel}</span>
              <button onClick={() => setWeekStart(d => addDays(d, 7))}
                className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white transition-colors">
                <ChevronRight size={14} />
              </button>
              {!isThisWeek && (
                <button onClick={() => setWeekStart(getMonday(new Date()))}
                  className="text-xs text-[#4ADE80] px-2 hover:underline">Today</button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchAssignments} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] text-xs hover:bg-[rgba(74,222,128,0.12)] transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <PrintButton zoneId="print-cleaning" label="Print Schedule" title={`Cleaning Schedule — ${viewMode === "today" ? "Today" : weekLabel}`} />
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-xs font-black hover:opacity-90 transition-opacity">
            <Plus size={13} /> New Assignment
          </button>
        </div>
      </div>

      {/* Worker legend */}
      <WorkerLegend assignments={assignments} workerIndex={workerIndex} />

      {/* Assignment form */}
      {showForm && (
        <AssignmentForm
          onSave={() => { setShowForm(false); fetchAssignments(); }}
          onCancel={() => setShowForm(false)}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[#4ADE80]" />
          <span className="ml-2 text-sm text-gray-500">Loading schedule…</span>
        </div>
      )}

      {/* Views — wrapped in print zone */}
      {!loading && !setupError && (
        <div id="print-cleaning">
          {viewMode === "today" && (
            <TodayView assignments={assignments} today={today} workerIndex={workerIndex} onDelete={handleDelete} />
          )}
          {viewMode === "week" && (
            <WeekGrid assignments={assignments} weekStart={weekStart} workerIndex={workerIndex} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}
