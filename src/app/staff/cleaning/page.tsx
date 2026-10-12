"use client";
import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Clock, X, Loader2,
  MapPin, AlertTriangle, Sparkles, RefreshCw, ArrowLeft,
} from "lucide-react";
import CompletionSheet from "@/components/crew/CompletionSheet";
import SpeechTextarea from "@/components/crew/SpeechTextarea";
import PhotoCapture from "@/components/crew/PhotoCapture";
import MicButton from "@/components/MicButton";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Checklist Config ─────────────────────────────────────────────────────────

function getChecklist(area: string): string[] {
  const a = area.toLowerCase();
  if (a.includes("bath") || a.includes("restroom") || a.includes("toilet"))
    return ["🚽 Toilet", "🚿 Shower/Tub", "🪥 Sink & Mirror", "🧴 Restock Supplies", "🗑 Trash"];
  if (a.includes("kitchen") || a.includes("break"))
    return ["🍽 Counters", "🚰 Sink", "🗑 Trash", "🧹 Sweep/Mop", "🧼 Appliances"];
  if (a.includes("office") || a.includes("suite"))
    return ["🗑 Trash", "🧹 Vacuum", "🪟 Windows/Glass", "🖥 Wipe Surfaces", "🚪 Doors"];
  if (a.includes("lobby") || a.includes("entry") || a.includes("hall"))
    return ["🧹 Sweep/Mop", "🪟 Glass/Windows", "🗑 Trash", "🪑 Furniture", "🚪 Doors"];
  if (a.includes("common") || a.includes("shared"))
    return ["🧹 Sweep/Mop", "🗑 Trash", "🪟 Windows", "🪑 Furniture", "🚪 Entry"];
  return ["🗑 Trash", "🧹 Floors", "🪟 Glass/Surfaces", "🧼 Wipe Down", "✅ Final Check"];
}

// (Staff names are now resolved server-side via PIN auth)
const ISSUE_TYPES = ["Damage", "Biohazard", "Equipment", "Pest", "Plumbing", "Other"];

// ─── Report Issue Modal ───────────────────────────────────────────────────────

function ReportIssueModal({ workerName, onClose, onSubmit }: {
  workerName: string; onClose: () => void; onSubmit: () => void;
}) {
  const [type, setType] = useState("Other");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!location.trim()) return;
    setSaving(true);
    await fetch("/api/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${type} — ${location}`, category: type, priority: 2,
        building: location, description: desc, reportedBy: workerName,
        status: "open", source: "cleaning",
        photoUrl: photoUrl || undefined,
      }),
    });
    setSaving(false);
    onSubmit();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="bg-[#0D1117] rounded-t-3xl p-6 overflow-y-auto"
        style={{ maxHeight: "92vh", borderTop: "2px solid rgba(239,68,68,0.4)", paddingBottom: "env(safe-area-inset-bottom,24px)" }}>
        <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.1)] mx-auto mb-5" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-white">🚨 Report Issue</h2>
            <p className="text-xs text-gray-500 mt-0.5">Goes straight to the maintenance queue</p>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-[rgba(255,255,255,0.07)] flex items-center justify-center">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Issue type tiles — big McDonald's buttons */}
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Type of Issue</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {ISSUE_TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className="py-4 rounded-2xl border text-sm font-black transition-all active:scale-95 flex flex-col items-center gap-1"
              style={type === t
                ? { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.5)", color: "#EF4444" }
                : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#6B7280" }
              }>
              {t === "Damage" && "💥"}
              {t === "Biohazard" && "☣️"}
              {t === "Equipment" && "🔧"}
              {t === "Pest" && "🐛"}
              {t === "Plumbing" && "🚰"}
              {t === "Other" && "❓"}
              <span>{t}</span>
            </button>
          ))}
        </div>

        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">📍 Location *</p>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 20 }}>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Building A, Room 102"
            className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-4 text-base text-white outline-none placeholder:text-gray-600"
            style={{ flex: 1, borderColor: location ? "rgba(239,68,68,0.4)" : undefined }}
          />
          <MicButton onResult={(t) => setLocation(prev => prev ? prev + " " + t : t)} size={18} />
        </div>

        <div className="mb-5">
          <SpeechTextarea
            label="📝 Describe the issue (tap 🎤 to speak)"
            value={desc} onChange={setDesc}
            placeholder="What did you find?"
            rows={3} accentColor="#EF4444"
          />
        </div>

        <div className="mb-6">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">📸 Photo (optional)</p>
          <PhotoCapture label="📷 Take a Photo" onPhoto={url => setPhotoUrl(url)} onClear={() => setPhotoUrl(undefined)} />
        </div>

        <button onClick={submit} disabled={saving || !location.trim()}
          className="w-full py-5 rounded-3xl text-lg font-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#EF4444,#F97316)", color: "#fff", boxShadow: "0 4px 20px rgba(239,68,68,0.35)" }}>
          {saving ? <Loader2 size={22} className="animate-spin" /> : "🚨"}
          {saving ? "Sending…" : "Send to Maintenance"}
        </button>
      </div>
    </div>
  );
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({ a, savedChecks, onSaveChecks, onComplete }: {
  a: Assignment;
  savedChecks: string[];
  onSaveChecks: (id: string, checks: string[]) => void;
  onComplete: (id: string, data: { notes: string; photoUrl?: string }) => Promise<void>;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(savedChecks));
  const [showSheet, setShowSheet] = useState(false);
  const isDone = a.status === "done";
  const checklist = getChecklist(a.area);
  const allChecked = checklist.every(item => checked.has(item));

  const toggle = (item: string) => {
    const next = new Set(checked);
    if (next.has(item)) next.delete(item); else next.add(item);
    setChecked(next);
    onSaveChecks(a.id, [...next]);
  };

  const handleComplete = async (data: { notes: string; photoUrl?: string }) => {
    await onComplete(a.id, data);
    setShowSheet(false);
  };

  const completedTime = a.completedAt
    ? new Date(a.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <>
      <div
        className="rounded-3xl border overflow-hidden transition-all"
        style={isDone
          ? { background: "rgba(74,222,128,0.05)", borderColor: "rgba(74,222,128,0.25)" }
          : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }
        }
      >
        {/* Card Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={15} className={isDone ? "text-[#4ADE80] flex-shrink-0" : "text-[#60A5FA] flex-shrink-0"} />
              <span className="text-white font-black text-base truncate">{a.property}</span>
            </div>
            {isDone && <CheckCircle2 size={24} className="text-[#4ADE80] flex-shrink-0" />}
          </div>
          <p className="text-gray-400 text-sm ml-5 font-semibold">{a.area}</p>
          {(a.startTime || a.endTime) && (
            <p className="text-gray-600 text-xs ml-5 mt-1 flex items-center gap-1">
              <Clock size={10} /> {fmtTime(a.startTime) || "—"}{a.endTime ? ` → ${fmtTime(a.endTime)}` : ""}
            </p>
          )}
          {isDone && completedTime && (
            <p className="text-[#4ADE80] text-xs ml-5 mt-1 font-bold">✓ Done at {completedTime}</p>
          )}
        </div>

        {/* Checklist — only if not done */}
        {!isDone && (
          <>
            <div className="px-4 pb-3">
              <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest mb-2">Checklist</p>
              <div className="grid grid-cols-2 gap-2">
                {checklist.map(item => {
                  const isChecked = checked.has(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggle(item)}
                      className="flex items-center gap-2 px-3 py-3 rounded-2xl border text-sm font-bold transition-all active:scale-95 text-left"
                      style={isChecked
                        ? { background: "rgba(74,222,128,0.1)", borderColor: "rgba(74,222,128,0.4)", color: "#4ADE80" }
                        : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#6B7280" }
                      }
                    >
                      <span className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? "bg-[#4ADE80] border-[#4ADE80]" : "border-[rgba(255,255,255,0.15)]"}`}>
                        {isChecked && <span className="text-black text-xs font-black">✓</span>}
                      </span>
                      <span className="truncate">{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress mini-bar */}
            <div className="px-4 pb-3">
              <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4ADE80] to-[#22C55E] transition-all duration-300"
                  style={{ width: `${Math.round((checked.size / checklist.length) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-700 mt-1">{checked.size}/{checklist.length} tasks</p>
            </div>

            {/* Mark Done Button */}
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowSheet(true)}
                disabled={!allChecked}
                className="w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={allChecked
                  ? { background: "linear-gradient(135deg,#4ADE80,#22C55E)", color: "#000", boxShadow: "0 4px 16px rgba(74,222,128,0.3)" }
                  : { background: "rgba(255,255,255,0.06)", color: "#4B5563", cursor: "not-allowed" }
                }
              >
                <CheckCircle2 size={20} />
                {allChecked ? "✓ Mark Cleaned" : `Complete all ${checklist.length - checked.size} remaining`}
              </button>
            </div>
          </>
        )}
      </div>

      <CompletionSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        onSubmit={handleComplete}
        title="✓ Mark as Cleaned"
        subtitle={`${a.property} — ${a.area}`}
        accentColor="#4ADE80"
        submitLabel="✓ Done — Mark Cleaned"
      />
    </>
  );
}

// ─── PIN Keypad ───────────────────────────────────────────────────────────────

function PinKeypad({ onAuth }: { onAuth: (name: string) => void }) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const [welcome, setWelcome] = useState("");

  const handleDigit = (d: string) => {
    if (digits.length >= 6) return;
    const next = digits + d;
    setDigits(next);
    setError("");
    if (next.length === 6) submitPin(next);
  };

  const handleBackspace = () => {
    setDigits(d => d.slice(0, -1));
    setError("");
  };

  const submitPin = async (pin: string) => {
    setChecking(true);
    try {
      const res = await fetch("/api/staff-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWelcome(data.name);
        setTimeout(() => onAuth(data.name), 1200);
      } else {
        setShake(true);
        setError("Invalid PIN");
        setDigits("");
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError("Network error");
      setDigits("");
    } finally {
      setChecking(false);
    }
  };

  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  // Welcome state
  if (welcome) {
    return (
      <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center mb-6 animate-bounce">
          <Sparkles size={36} className="text-black" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Welcome, {welcome}!</h1>
        <p className="text-gray-500">Loading your assignments…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center mb-6">
        <Sparkles size={28} className="text-black" />
      </div>
      <h1 className="text-3xl font-black text-white text-center mb-1">Cleaning Portal</h1>
      <p className="text-gray-500 text-center mb-8">Enter your 6-digit PIN</p>

      {/* PIN dots */}
      <div className={`flex gap-3 mb-8 ${shake ? "animate-shake" : ""}`}
        style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-4 h-4 rounded-full transition-all duration-200"
            style={{
              backgroundColor: i < digits.length ? "#4ADE80" : "rgba(255,255,255,0.1)",
              boxShadow: i < digits.length ? "0 0 12px rgba(74,222,128,0.4)" : "none",
              transform: i < digits.length ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm font-bold mb-4 animate-pulse">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "⌫") {
            return (
              <button key={i} onClick={handleBackspace} disabled={checking || digits.length === 0}
                className="h-16 rounded-2xl flex items-center justify-center text-2xl text-gray-500 active:bg-[rgba(255,255,255,0.05)] transition-all disabled:opacity-30">
                <ArrowLeft size={24} />
              </button>
            );
          }
          return (
            <button key={i} onClick={() => handleDigit(k)} disabled={checking}
              className="h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white active:scale-90 transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
              {k}
            </button>
          );
        })}
      </div>

      {checking && (
        <div className="mt-6 flex items-center gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Verifying…</span>
        </div>
      )}

      {/* Shake keyframe */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const CHECKLIST_KEY = "oiq_cleaning_checks";

function loadChecks(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "{}"); } catch { return {}; }
}
function saveChecks(data: Record<string, string[]>) {
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(data));
}

export default function CleaningStaffPage() {
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [checkState, setCheckState] = useState<Record<string, string[]>>({});
  const today = new Date().toISOString().split("T")[0];
  const todayFormatted = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    const saved = localStorage.getItem("oiq_cleaning_name");
    if (saved) setWorkerName(saved);
    // Crew sessions expire after a shift — if the signed session is gone, return to PIN entry.
    fetch("/api/staff-auth")
      .then(r => r.json())
      .then(d => { if (!d.authenticated) { localStorage.removeItem("oiq_cleaning_name"); setWorkerName(null); } })
      .catch(() => {});
    setCheckState(loadChecks());
  }, []);

  const handleSelectName = (name: string) => {
    localStorage.setItem("oiq_cleaning_name", name);
    setWorkerName(name);
  };

  const showToast = (msg: string, color = "#4ADE80") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAssignments = useCallback(async () => {
    if (!workerName) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cleaning?date=${today}&worker=${encodeURIComponent(workerName)}`);
      const data = await res.json();
      if (Array.isArray(data.assignments)) {
        setAssignments(data.assignments.map(rowToAssignment));
      }
    } finally { setLoading(false); }
  }, [workerName, today]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const handleSaveChecks = (id: string, checks: string[]) => {
    const next = { ...checkState, [id]: checks };
    setCheckState(next);
    saveChecks(next);
  };

  const handleComplete = async (id: string, data: { notes: string; photoUrl?: string }) => {
    const completedAt = new Date().toISOString();
    const assignment = assignments.find(a => a.id === id);
    await fetch(`/api/cleaning?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "done", completedAt,
        completionNotes: data.notes || undefined,
        photoUrl: data.photoUrl || undefined,
        actorName: workerName,
        resourceName: assignment ? `${assignment.property} — ${assignment.area}` : id,
      }),
    });
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: "done", completedAt } : a));
    // Clear checklist for this assignment
    const next = { ...checkState };
    delete next[id];
    setCheckState(next);
    saveChecks(next);
    showToast("✓ Marked cleaned!");
  };

  if (!workerName) return <PinKeypad onAuth={handleSelectName} />;

  const pending = assignments.filter(a => a.status !== "done");
  const done = assignments.filter(a => a.status === "done");
  const allDone = assignments.length > 0 && pending.length === 0;

  return (
    <div className="min-h-screen bg-[#080C14] text-white">

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center justify-between"
        style={{ background: "rgba(8,12,20,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,#4ADE80,#22C55E)" }}>🧹</div>
          <div>
            <p className="text-[11px] text-gray-500 font-black uppercase tracking-wider">Cleaning</p>
            <p className="text-base font-black text-white leading-none">{workerName}</p>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem("oiq_cleaning_name"); setWorkerName(null); fetch("/api/staff-auth", { method: "DELETE" }).catch(() => {}); }}
          className="text-xs text-gray-600 px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.07)]">Switch</button>
      </div>

      {/* Date + Status */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-gray-500 text-sm mb-1">{todayFormatted}</p>
        {allDone ? (
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-[#4ADE80]" />
            <h1 className="text-2xl font-black text-[#4ADE80]">All done! Great work 🎉</h1>
          </div>
        ) : (
          <h1 className="text-2xl font-black text-white">
            {pending.length > 0
              ? `${pending.length} location${pending.length !== 1 ? "s" : ""} left`
              : "No assignments today"
            }
          </h1>
        )}
      </div>

      {/* Progress bar */}
      {assignments.length > 0 && (
        <div className="px-4 mb-4">
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((done.length / assignments.length) * 100)}%`,
                background: "linear-gradient(90deg,#4ADE80,#22C55E)",
              }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{done.length} of {assignments.length} complete</p>
        </div>
      )}

      {/* Assignment Cards */}
      <div className="px-4 pb-36 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="animate-spin text-[#4ADE80]" />
            <p className="text-gray-600 text-sm">Loading your schedule…</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-white font-black text-xl">No assignments today</p>
            <p className="text-gray-600 text-sm mt-2">Your supervisor will add your schedule here.</p>
          </div>
        ) : (
          <>
            {pending.map(a => (
              <AssignmentCard
                key={a.id} a={a}
                savedChecks={checkState[a.id] || []}
                onSaveChecks={handleSaveChecks}
                onComplete={handleComplete}
              />
            ))}
            {done.length > 0 && (
              <>
                <p className="text-xs font-black text-gray-700 uppercase tracking-widest pt-2">✓ Completed</p>
                {done.map(a => (
                  <AssignmentCard
                    key={a.id} a={a}
                    savedChecks={[]}
                    onSaveChecks={() => {}}
                    onComplete={async () => {}}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 left-4 right-4 z-50 rounded-2xl px-5 py-3 font-black text-center text-base transition-all"
          style={{ background: toast.color, color: "#000", boxShadow: `0 4px 20px ${toast.color}60` }}
        >
          {toast.msg}
        </div>
      )}

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 flex gap-3"
        style={{ background: "rgba(8,12,20,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)", paddingBottom: "env(safe-area-inset-bottom,16px)" }}>
        <button onClick={fetchAssignments}
          className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <RefreshCw size={20} className={`text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={() => setShowReport(true)}
          className="flex-1 h-14 rounded-2xl text-white text-base font-black flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: "linear-gradient(135deg,#EF4444,#F97316)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
          <AlertTriangle size={20} /> 🚨 Report Issue
        </button>
      </div>

      {showReport && (
        <ReportIssueModal
          workerName={workerName}
          onClose={() => setShowReport(false)}
          onSubmit={() => showToast("⚠️ Issue sent to maintenance", "#EF4444")}
        />
      )}
    </div>
  );
}
