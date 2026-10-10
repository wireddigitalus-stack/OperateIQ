"use client";

import { useState } from "react";
import { X, Phone, CheckCircle2, VoicemailIcon, Calendar, Loader2, Trash2, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CallLog {
  id: string;
  lead_id: string;
  lead_name: string;
  called_by: string;
  notes: string;
  outcome: "answered" | "no_answer" | "voicemail" | "scheduled";
  follow_up_date: string | null;
  created_at: string;
}

interface Props {
  leadId: string;
  leadName: string;
  phone: string;
  existingLogs: CallLog[];
  currentUser: string;
  onSave: (log: CallLog) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const OUTCOMES: { value: CallLog["outcome"]; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "answered",  label: "Answered",         icon: <CheckCircle2 size={13} />, color: "#4ADE80" },
  { value: "no_answer", label: "No Answer",         icon: <Phone size={13} />,        color: "#FACC15" },
  { value: "voicemail", label: "Left Voicemail",    icon: <VoicemailIcon size={13} />, color: "#60A5FA" },
  { value: "scheduled", label: "Scheduled Callback",icon: <Calendar size={13} />,     color: "#C084FC" },
];

function formatDate(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export function outcomeColor(outcome: CallLog["outcome"]) {
  return OUTCOMES.find(o => o.value === outcome)?.color || "#9CA3AF";
}

export function outcomeLabel(outcome: CallLog["outcome"]) {
  return OUTCOMES.find(o => o.value === outcome)?.label || outcome;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CallLogModal({
  leadId, leadName, phone, existingLogs, currentUser, onSave, onDelete, onClose,
}: Props) {
  const [outcome, setOutcome] = useState<CallLog["outcome"]>("no_answer");
  const [notes, setNotes]     = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/call-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          lead_name: leadName,
          called_by: currentUser,
          notes: notes.trim(),
          outcome,
          follow_up_date: followUp || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      onSave(d.log);
      setNotes(""); setFollowUp("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLog(id: string) {
    await fetch(`/api/call-logs?id=${id}`, { method: "DELETE" });
    onDelete(id);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg glass rounded-t-3xl sm:rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center">
              <Phone size={14} className="text-black" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Log Call — {leadName}</p>
              <a href={`tel:${phone}`} className="text-[10px] text-[#4ADE80] hover:underline">{phone}</a>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Outcome selector */}
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Call Outcome</p>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  onClick={() => setOutcome(o.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    outcome === o.value
                      ? "bg-[rgba(255,255,255,0.08)] border-opacity-60"
                      : "border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-gray-300"
                  }`}
                  style={outcome === o.value ? { borderColor: `${o.color}60`, color: o.color } : {}}
                >
                  <span style={{ color: o.color }}>{o.icon}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">
              Notes <span className="text-gray-700 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="What happened on the call? Key details, objections, next steps…"
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none resize-none placeholder:text-gray-700"
            />
          </div>

          {/* Follow-up date */}
          {(outcome === "no_answer" || outcome === "voicemail" || outcome === "scheduled") && (
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">
                Follow-up Date & Time
                <span className="text-gray-700 font-normal normal-case ml-1">(schedule a callback reminder)</span>
              </label>
              <input
                type="datetime-local"
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none"
                style={{ colorScheme: "dark" }}
              />
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Save */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black font-black text-sm hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Phone size={14} /> Log This Call</>}
          </button>

          {/* Call history */}
          {existingLogs.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock size={10} /> Call History ({existingLogs.length})
              </p>
              <div className="space-y-2">
                {existingLogs.map(log => (
                  <div key={log.id} className="relative rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 pr-8">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[9px] px-2 py-0.5 rounded-full border font-black uppercase"
                        style={{ color: outcomeColor(log.outcome), borderColor: `${outcomeColor(log.outcome)}40`, backgroundColor: `${outcomeColor(log.outcome)}12` }}
                      >
                        {outcomeLabel(log.outcome)}
                      </span>
                      <span className="text-[10px] text-gray-600">{formatDate(log.created_at)}</span>
                      {log.called_by && <span className="text-[10px] text-gray-700">· {log.called_by}</span>}
                    </div>
                    {log.notes && <p className="text-xs text-gray-400 leading-relaxed">{log.notes}</p>}
                    {log.follow_up_date && (
                      <p className="text-[10px] text-[#60A5FA] mt-1 flex items-center gap-1">
                        <Calendar size={9} /> Follow-up: {formatDate(log.follow_up_date)}
                      </p>
                    )}
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="absolute top-2 right-2 p-1 text-gray-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
