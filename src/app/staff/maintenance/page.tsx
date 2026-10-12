"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Wrench, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Loader2, Plus, X, Send, ArrowLeft, Building2, Flame,
  MessageSquare, Package, Sparkles, ShieldAlert,
  Pencil, RotateCcw, Trash2, Users, User, Calendar, DollarSign, Crown, Edit3, Check, Camera
} from "lucide-react";
import CompletionSheet from "@/components/crew/CompletionSheet";
import MicButton from "@/components/MicButton";
import FilterChangesTab from "@/app/admin/FilterChangesTab";
import BuildingInspectionsTab from "@/app/admin/BuildingInspectionsTab";


// ─── Types & Constants ────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  title: string;
  description: string;
  building: string;
  unit: string;
  tenant: string;
  category: string;
  priority: 1 | 2 | 3 | 4;
  status: "open" | "scheduled" | "in_progress" | "complete" | "cancelled";
  assignedTo: string;
  reportedBy: string;
  estimatedCost: number;
  estimatedHours: number;
  scheduledDate: string | null;
  notes: string;
  partsNeeded: boolean;
  createdAt: string;
  actualCost?: number;
  firstResponseAt?: string | null;
  completedAt?: string | null;
  billable?: boolean;
  materialAmount?: number;
  photoUrl?: string | null;
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; icon: string; response: string }> = {
  1: { label: "P1 – EMERGENCY", color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.5)", icon: "🔴", response: "Immediate" },
  2: { label: "P2 – URGENT",    color: "#F97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.45)", icon: "🟠", response: "Same day" },
  3: { label: "P3 – ROUTINE",   color: "#FACC15", bg: "rgba(250,204,21,0.1)",  border: "rgba(250,204,21,0.35)", icon: "🟡", response: "1–7 days" },
  4: { label: "P4 – PLANNED",   color: "#4ADE80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.3)", icon: "🟢", response: "Planned" },
};

const STATUS_CONFIG: Record<Ticket["status"], { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "#FACC15", bg: "rgba(250,204,21,0.12)" },
  scheduled:   { label: "Scheduled",   color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  in_progress: { label: "In Progress", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  complete:    { label: "Complete",    color: "#4ADE80", bg: "rgba(74,222,128,0.12)" },
  cancelled:   { label: "Cancelled",   color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
};

const PROPERTIES = [
  "City Centre",
  "City Central",
  "The Executive",
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
  "1825 Vol Pky",
  "West State Commons",
  "Foundation Event Facility",
  "Commercial Warehouse",
  "Farm",
];

const CATEGORIES = ["HVAC", "Plumbing", "Water", "Sprinkler", "Electrical", "Elevator", "Door/Lock", "Security/Fire", "Appliance", "Structural", "Cleaning", "Pest", "Landscaping", "Damage", "Other"];

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function rowToTicket(r: Record<string, unknown>): Ticket {
  return {
    id: r.id as string,
    title: (r.title as string) || "",
    description: (r.description as string) || "",
    building: (r.building as string) || "",
    unit: (r.unit as string) || "",
    tenant: (r.tenant as string) || "",
    category: (r.category as string) || "Other",
    priority: (Number(r.priority) || 3) as 1 | 2 | 3 | 4,
    status: (r.status as Ticket["status"]) || "open",
    assignedTo: (r.assigned_to as string) || "",
    reportedBy: (r.reported_by as string) || "",
    estimatedCost: Number(r.estimated_cost) || 0,
    estimatedHours: Number(r.estimated_hours) || 0,
    scheduledDate: (r.scheduled_date as string) || null,
    notes: (r.notes as string) || "",
    partsNeeded: !!(r.parts_needed),
    createdAt: (r.created_at as string) || new Date().toISOString(),
    actualCost: Number(r.actual_cost) || 0,
    firstResponseAt: (r.first_response_at as string) || null,
    completedAt: (r.completed_at as string) || null,
    billable: !!(r.billable),
    materialAmount: Number(r.material_amount) || 0,
    photoUrl: (r.photo_url as string) || null,
  };
}

function NotesLogModal({
  ticket,
  workerName,
  isMaintenanceAdmin,
  isOpen,
  onClose,
  onUpdateNotes,
}: {
  ticket: Ticket;
  workerName: string;
  isMaintenanceAdmin?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNotes: (newNotes: string) => Promise<void>;
}) {
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editRawMode, setEditRawMode] = useState(false);
  const [rawNotes, setRawNotes] = useState(ticket.notes || "");

  useEffect(() => {
    setRawNotes(ticket.notes || "");
  }, [ticket.notes, isOpen]);

  if (!isOpen) return null;

  const notesList = ticket.notes
    ? ticket.notes.split("\n").filter((l) => l.trim())
    : [];

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const entry = `[${timestamp} — ${workerName}] ${newNote.trim()}`;
      const updatedNotes = ticket.notes ? `${ticket.notes}\n${entry}` : entry;
      await onUpdateNotes(updatedNotes);
      setNewNote("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRawNotes = async () => {
    setSaving(true);
    try {
      await onUpdateNotes(rawNotes);
      setEditRawMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const p = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG[3];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-[#0D1117] border border-[rgba(255,255,255,0.1)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-start bg-[#080C14]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-base flex items-center gap-1.5">
                <MessageSquare size={16} className="text-[#FACC15]" />
                <span>Notes Log</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
                {p.label}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-gray-400">
                {ticket.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-white font-semibold">{ticket.title}</p>
            {(ticket.building || ticket.unit) && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {[ticket.building, ticket.unit ? `Unit ${ticket.unit}` : "", ticket.tenant].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isMaintenanceAdmin && (
              <button
                onClick={() => setEditRawMode(!editRawMode)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold px-2.5 py-1.5 rounded-xl bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)] transition-all"
                title="Fred / Admin: Edit or clean up notes history"
              >
                {editRawMode ? "View Formatted" : "✏️ Edit Full Log"}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-[rgba(255,255,255,0.06)] rounded-full text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[rgba(0,0,0,0.25)] min-h-[180px]">
          {editRawMode ? (
            <div className="space-y-3">
              <p className="text-xs text-amber-400 font-semibold">
                👑 Admin Notes Editor — directly edit, correct, or clean up the full work order note history:
              </p>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                rows={10}
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(250,204,21,0.3)] rounded-2xl p-3.5 text-xs text-white outline-none focus:border-[#FACC15] resize-y font-mono leading-relaxed"
                placeholder="No notes yet..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setRawNotes(ticket.notes || ""); setEditRawMode(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 bg-[rgba(255,255,255,0.05)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRawNotes}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FACC15] text-black flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Save Changes
                </button>
              </div>
            </div>
          ) : notesList.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-xs flex flex-col items-center gap-2">
              <MessageSquare size={32} className="text-gray-700" />
              <span>No notes logged on this work order yet.</span>
              <span className="text-[11px] text-gray-600">Type below or use the mic to add the first update.</span>
            </div>
          ) : (
            notesList.map((line, idx) => {
              const match = line.match(/^\[(.*?) — (.*?)\] (.*)$/);
              if (match) {
                const [, date, author, text] = match;
                const isAuthorMe = author.toLowerCase().includes(workerName.toLowerCase());
                const isFred = author.toLowerCase().includes("fred");
                return (
                  <div key={idx} className={`border rounded-2xl p-3.5 text-xs transition-all ${
                    isFred
                      ? "bg-[rgba(250,204,21,0.06)] border-[rgba(250,204,21,0.2)]"
                      : isAuthorMe
                      ? "bg-[rgba(96,165,250,0.06)] border-[rgba(96,165,250,0.2)]"
                      : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]"
                  }`}>
                    <div className="flex justify-between items-center mb-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        {isFred ? "👑" : "👤"}
                        <span className={isFred ? "text-amber-400" : isAuthorMe ? "text-blue-400" : "text-gray-300"}>
                          {author}
                        </span>
                      </span>
                      <span className="text-gray-500">📅 {date}</span>
                    </div>
                    <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{text}</p>
                  </div>
                );
              }
              return (
                <div key={idx} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-3.5 text-xs text-gray-300 whitespace-pre-wrap">
                  {line}
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        {!editRawMode && (
          <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#080C14]">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-2xl px-3 py-2 focus-within:border-[rgba(250,204,21,0.4)]">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note to this work order..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none resize-none leading-relaxed"
                  rows={2}
                />
                <MicButton onResult={(t) => setNewNote((prev) => (prev ? prev + " " + t : t))} size={16} />
              </div>
              <button
                onClick={handleAddNote}
                disabled={saving || !newNote.trim()}
                className="h-[58px] px-5 bg-[#FACC15] disabled:bg-gray-800 disabled:text-gray-600 text-black font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Add Note</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Work Order Modal (Admin / Fred) ───────────────────────────────────

function EditTicketModal({
  ticket,
  workerName,
  knownStaff,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: {
  ticket: Ticket;
  workerName: string;
  knownStaff: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Ticket>) => Promise<void>;
  onDelete?: (id: string, title: string) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Ticket>>({ ...ticket });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm({ ...ticket });
  }, [ticket, isOpen]);

  if (!isOpen) return null;

  const set = (k: keyof Ticket, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    try {
      await onSave(ticket.id, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    setSaving(true);
    try {
      await onSave(ticket.id, {
        ...form,
        status: "open",
        completedAt: null,
        scheduledDate: new Date().toISOString().split("T")[0],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (confirm(`Are you sure you want to delete ticket "${ticket.title}"?`)) {
      setDeleting(true);
      try {
        await onDelete(ticket.id, ticket.title);
        onClose();
      } finally {
        setDeleting(false);
      }
    }
  };

  const isComplete = form.status === "complete";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-[#0D1117] border-t sm:border border-[rgba(250,204,21,0.3)] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[rgba(255,255,255,0.07)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                👑 Maintenance Admin
              </span>
              <span className="text-[10px] text-gray-500 font-mono">#{ticket.id.slice(0, 8)}</span>
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">Edit Work Order</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Issue Title *</label>
            <div className="flex gap-1.5 items-center">
              <input
                value={form.title || ""}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Brief summary of issue"
                className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]"
              />
              <MicButton onResult={(t) => set("title", (form.title || "") + (form.title ? " " : "") + t)} size={18} />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([1, 2, 3, 4] as const).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const selected = form.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set("priority", p)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all"
                    style={{
                      backgroundColor: selected ? cfg.bg : "rgba(255,255,255,0.03)",
                      borderColor: selected ? cfg.border : "rgba(255,255,255,0.08)",
                      color: selected ? cfg.color : "#9CA3AF",
                    }}
                  >
                    <span>{cfg.icon}</span> {cfg.label.split(" – ")[1] || cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Assigned To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={form.status || "open"}
                onChange={(e) => set("status", e.target.value as Ticket["status"])}
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#0A0F1A]">
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assigned Technician</label>
              <div className="flex gap-1.5 items-center">
                <input
                  value={form.assignedTo || ""}
                  onChange={(e) => set("assignedTo", e.target.value)}
                  placeholder="Technician name"
                  list="edit-staff-list"
                  className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]"
                />
                <MicButton onResult={(t) => set("assignedTo", (form.assignedTo || "") + (form.assignedTo ? " " : "") + t)} size={18} />
              </div>
              <datalist id="edit-staff-list">
                {knownStaff.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Category & Scheduled Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={form.category || "Other"}
                onChange={(e) => set("category", e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0A0F1A]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Scheduled Date</label>
              <input
                type="date"
                value={form.scheduledDate ? form.scheduledDate.split("T")[0] : ""}
                onChange={(e) => set("scheduledDate", e.target.value || null)}
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]"
              />
            </div>
          </div>

          {/* Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Building / Property</label>
              <select
                value={form.building || ""}
                onChange={(e) => set("building", e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]"
              >
                <option value="" className="bg-[#0A0F1A]">Select building...</option>
                {PROPERTIES.map((p) => (
                  <option key={p} value={p} className="bg-[#0A0F1A]">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Unit / Suite</label>
              <input
                value={form.unit || ""}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="Suite 201"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tenant Name</label>
              <input
                value={form.tenant || ""}
                onChange={(e) => set("tenant", e.target.value)}
                placeholder="Company / Name"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]"
              />
            </div>
          </div>

          {/* Costs & Hours */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Est. Cost ($)</label>
              <input
                type="number"
                value={form.estimatedCost ?? ""}
                onChange={(e) => set("estimatedCost", Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FACC15]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Est. Hours</label>
              <input
                type="number"
                step="0.5"
                value={form.estimatedHours ?? ""}
                onChange={(e) => set("estimatedHours", Number(e.target.value) || 0)}
                placeholder="1"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FACC15]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Actual Cost ($)</label>
              <input
                type="number"
                value={form.actualCost ?? ""}
                onChange={(e) => set("actualCost", Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FACC15]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
            <div className="flex gap-1.5 items-start">
              <textarea
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Describe problem details..."
                className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#FACC15] resize-none"
              />
              <MicButton onResult={(t) => set("description", (form.description || "") + (form.description ? " " : "") + t)} size={18} />
            </div>
          </div>

          {/* Parts Needed & Billable Toggles */}
          <div className="flex flex-wrap gap-4 p-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.partsNeeded}
                onChange={(e) => set("partsNeeded", e.target.checked)}
                className="w-4 h-4 rounded text-amber-400 bg-gray-800 border-gray-600 focus:ring-0"
              />
              <span className="text-xs text-white font-semibold">Parts Needed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.billable}
                onChange={(e) => set("billable", e.target.checked)}
                className="w-4 h-4 rounded text-amber-400 bg-gray-800 border-gray-600 focus:ring-0"
              />
              <span className="text-xs text-white font-semibold">Billable to Tenant</span>
            </label>
          </div>

          {/* Notes Log */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes Log</label>
            <textarea
              value={form.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              placeholder="All notes associated with this ticket..."
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-xs text-white font-mono leading-relaxed outline-none focus:border-[#FACC15] resize-y"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap gap-2.5 pt-5 mt-5 border-t border-[rgba(255,255,255,0.07)]">
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-4 py-3 rounded-2xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-red-400 hover:bg-[rgba(239,68,68,0.2)] text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              <span>Delete</span>
            </button>
          )}

          {isComplete && (
            <button
              type="button"
              onClick={handleReopen}
              disabled={saving}
              className="px-4 py-3 rounded-2xl bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.3)] text-amber-400 hover:bg-[rgba(250,204,21,0.2)] text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw size={14} />
              <span>Reopen Ticket</span>
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-gray-400 hover:text-white text-xs font-bold transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.title?.trim()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report New Issue Modal ───────────────────────────────────────────────────

function ReportModal({
  workerName,
  knownStaff,
  isMaintenanceAdmin,
  onClose,
  onSubmit,
}: {
  workerName: string;
  knownStaff: string[];
  isMaintenanceAdmin: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(3);
  const [building, setBuilding] = useState("");
  const [unit, setUnit] = useState("");
  const [tenant, setTenant] = useState("");
  const [desc, setDesc] = useState("");
  const [assignedTo, setAssignedTo] = useState(isMaintenanceAdmin ? workerName : "");
  const [assignToMe, setAssignToMe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/maintenance/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setPhotoUrl(data.url);
    } catch { /* silently fail */ }
    finally { setPhotoUploading(false); }
  };

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const targetAssigned = isMaintenanceAdmin ? assignedTo : (assignToMe ? workerName : "");
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        priority,
        building,
        unit,
        tenant,
        description: desc,
        reportedBy: workerName,
        status: "open",
        source: "staff",
        assignedTo: targetAssigned,
        photoUrl: photoUrl || null,
      }),
    });
    setSaving(false);
    onSubmit();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-[#0D1117] border-t border-[rgba(250,204,21,0.25)] rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-white">Report New Issue</h2>
            {isMaintenanceAdmin && (
              <p className="text-xs text-amber-400 font-semibold mt-0.5">👑 Maintenance Admin Mode</p>
            )}
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        {/* Priority */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Priority</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {([1, 2, 3, 4] as const).map(p => {
            const cfg = PRIORITY_CONFIG[p];
            return (
              <button key={p} onClick={() => setPriority(p)}
                className="flex items-center gap-2 px-4 py-3.5 rounded-2xl border text-sm font-bold transition-all"
                style={{
                  backgroundColor: priority === p ? cfg.bg : "rgba(255,255,255,0.03)",
                  borderColor: priority === p ? cfg.border : "rgba(255,255,255,0.08)",
                  color: priority === p ? cfg.color : "#6B7280",
                }}>
                <span className="text-xl">{cfg.icon}</span> {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Issue */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">What&apos;s the issue? *</p>
        <div className="flex gap-1.5 items-center mb-4">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. HVAC not cooling in Suite 301"
            className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3.5 text-base text-white outline-none focus:border-[rgba(250,204,21,0.5)] placeholder:text-gray-600" />
          <MicButton onResult={(t) => setTitle(prev => prev ? prev + " " + t : t)} size={18} />
        </div>

        {/* Category */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${category === c ? "bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.4)] text-[#FACC15]" : "border-[rgba(255,255,255,0.08)] text-gray-500"}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Building</p>
            <select value={building} onChange={e => setBuilding(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[rgba(250,204,21,0.4)]">
              <option value="" style={{ background: "#0A0F1A" }}>Select property…</option>
              {PROPERTIES.map(p => (
                <option key={p} value={p} style={{ background: "#0A0F1A" }}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Unit</p>
                <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="301"
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[rgba(250,204,21,0.4)] placeholder:text-gray-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tenant</p>
                <input value={tenant} onChange={e => setTenant(e.target.value)} placeholder="ABC Corp"
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[rgba(250,204,21,0.4)] placeholder:text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Assignment */}
        {isMaintenanceAdmin ? (
          <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(250,204,21,0.2)] mb-5">
            <p className="text-xs font-bold text-[#FACC15] uppercase tracking-widest mb-2">Assign Work Order To</p>
            <div className="flex gap-2 items-center">
              <input
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                placeholder="Select or enter technician name..."
                list="report-staff-list"
                className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FACC15]"
              />
              <datalist id="report-staff-list">
                {knownStaff.map(n => <option key={n} value={n} />)}
              </datalist>
              <button
                type="button"
                onClick={() => setAssignedTo(workerName)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${assignedTo === workerName ? "bg-[#FACC15] text-black border-[#FACC15]" : "bg-[rgba(255,255,255,0.05)] text-gray-400 border-[rgba(255,255,255,0.1)]"}`}
              >
                Myself
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] mb-6">
            <div>
              <p className="text-sm font-bold text-white">Assign to myself</p>
              <p className="text-xs text-gray-500 mt-0.5">Add directly to my personal task list</p>
            </div>
            <button
              onClick={() => setAssignToMe(!assignToMe)}
              className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 focus:outline-none ${assignToMe ? "bg-[#FACC15]" : "bg-[rgba(255,255,255,0.15)]"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-[#0D1117] transition-transform duration-200 ${assignToMe ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        )}

        {/* Details */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Details (optional)</p>
        <div className="flex gap-1.5 items-start mb-5">
          <textarea spellCheck={true} value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Any extra details…"
            className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[rgba(250,204,21,0.4)] placeholder:text-gray-600 resize-none" />
          <MicButton onResult={(t) => setDesc(prev => prev ? prev + " " + t : t)} size={18} />
        </div>

        {/* Photo */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Photo (optional)</p>
        {photoUrl ? (
          <div className="flex items-start gap-3 mb-5">
            <a href={photoUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Ticket photo" className="h-28 w-auto object-cover rounded-2xl border border-[rgba(255,255,255,0.1)]" />
            </a>
            <div className="flex flex-col gap-2 mt-1">
              <p className="text-xs text-gray-500">Photo attached</p>
              <button
                type="button"
                onClick={() => setPhotoUrl(null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-red-400 border border-[rgba(239,68,68,0.25)] hover:bg-[rgba(239,68,68,0.08)] transition-colors w-fit"
              >
                <X size={12} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <label className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl border-2 border-dashed mb-5 cursor-pointer transition-all ${photoUploading ? "border-[rgba(250,204,21,0.4)] bg-[rgba(250,204,21,0.05)]" : "border-[rgba(255,255,255,0.12)] hover:border-[rgba(250,204,21,0.4)] hover:bg-[rgba(250,204,21,0.04)]"}`}>
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={photoUploading} onChange={handlePhotoChange} />
            {photoUploading ? (
              <><Loader2 size={18} className="animate-spin text-[#FACC15]" /><span className="text-sm text-[#FACC15] font-semibold">Uploading…</span></>
            ) : (
              <><Camera size={20} className="text-gray-500" /><span className="text-sm text-gray-500">Take photo or upload from gallery</span></>
            )}
          </label>
        )}

        <button onClick={submit} disabled={saving || photoUploading || !title.trim()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-base font-black flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg active:scale-95 transition-all">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {saving ? "Submitting…" : "Submit Issue"}
        </button>
      </div>
    </div>
  );
}

// ─── Ticket Card (field view) ─────────────────────────────────────────────────

function FieldTicketCard({
  ticket,
  workerName,
  isMaintenanceAdmin,
  knownStaff,
  onUpdate,
  onFullUpdate,
  onDeleteTicket,
}: {
  ticket: Ticket;
  workerName: string;
  isMaintenanceAdmin: boolean;
  knownStaff: string[];
  onUpdate: (id: string, status: Ticket["status"], meta?: { notes?: string; minutes?: number; partsNeeded?: boolean; assignedTo?: string; billable?: boolean; materialAmount?: number }) => Promise<void>;
  onFullUpdate: (id: string, updates: Partial<Ticket>) => Promise<void>;
  onDeleteTicket?: (id: string, title: string) => Promise<void>;
}) {
  const [expandingDesc, setExpandingDesc] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sheetMode, setSheetMode] = useState<"complete" | "parts">("complete");
  const p = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG[3];
  const isComplete = ticket.status === "complete";
  const isInProgress = ticket.status === "in_progress";
  const needsParts = !!ticket.partsNeeded;

  const notesList = ticket.notes ? ticket.notes.split("\n").filter((l) => l.trim()) : [];
  const notesCount = notesList.length;

  const openComplete = () => { setSheetMode("complete"); setShowSheet(true); };
  const openParts = () => { setSheetMode("parts"); setShowSheet(true); };

  const handleSheetSubmit = async (data: any) => {
    if (sheetMode === "complete") {
      await onUpdate(ticket.id, ticket.status === "open" || ticket.status === "scheduled" ? "in_progress" : "complete", data);
    } else {
      // Flag as needing parts — set status back to scheduled with a note prefix
      await onUpdate(ticket.id, "scheduled", { notes: data.notes, partsNeeded: true });
    }
    setShowSheet(false);
  };

  const advance = async () => {
    if (isComplete) return;
    if (ticket.status === "open" || ticket.status === "scheduled") {
      // Start work — no sheet needed
      await onUpdate(ticket.id, "in_progress");
    } else {
      // Mark complete — open sheet
      openComplete();
    }
  };

  const nextLabel = ticket.status === "open" || ticket.status === "scheduled"
    ? "🚀 Start Work"
    : ticket.status === "in_progress"
    ? "✅ Mark Done"
    : "";

  return (
    <>
      <div className={`rounded-3xl border p-5 transition-all ${isComplete ? "opacity-75 border-[rgba(74,222,128,0.25)]" : ""}`}
        style={{ backgroundColor: p.bg, borderColor: p.border }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{p.icon}</span>
          <div>
            <span className="text-xs font-black tracking-widest" style={{ color: p.color }}>{p.label}</span>
            {p.response && <span className="text-[10px] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded text-gray-400 ml-2">SLA: {p.response}</span>}
            <span className="text-xs text-gray-500 ml-2">{ticket.category}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {needsParts && (
              <span title="Parts Needed" className="flex items-center">
                <Package size={16} className="text-orange-400" />
              </span>
            )}
            {isComplete && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#4ADE80] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Done
              </span>
            )}
          </div>
        </div>

        <h3 className="text-white font-bold text-lg leading-snug mb-2">{ticket.title}</h3>

        {(ticket.building || ticket.unit || ticket.tenant) && (
          <div className="flex items-center gap-1.5 text-sm text-gray-300 mb-2 font-medium">
            <Building2 size={14} className="text-gray-400 flex-shrink-0" />
            {[ticket.building, ticket.unit ? `Unit ${ticket.unit}` : "", ticket.tenant].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* Assigned to & Admin quick actions */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 flex-wrap">
          <span className="font-bold text-gray-400">Assigned to:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
            ticket.assignedTo
              ? "bg-[rgba(255,255,255,0.07)] text-gray-200 border border-[rgba(255,255,255,0.1)]"
              : "bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.25)] text-[#FACC15]"
          }`}>
            {ticket.assignedTo || "Unassigned"}
          </span>
          {isMaintenanceAdmin && (
            <button
              onClick={() => setShowEditModal(true)}
              className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold ml-1"
            >
              Reassign
            </button>
          )}
        </div>

        {ticket.scheduledDate && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <Clock size={13} className="text-gray-500" /> Scheduled {fmtDate(ticket.scheduledDate)}
          </div>
        )}

        {ticket.description && (
          <button onClick={() => setExpandingDesc(e => !e)} className="text-xs text-gray-400 mb-3 flex items-center gap-1 text-left w-full hover:text-gray-200 transition-colors">
            <span className="text-gray-500 font-bold">Details:</span> {expandingDesc ? ticket.description : ticket.description.slice(0, 90) + (ticket.description.length > 90 ? "…" : "")}
          </button>
        )}

        {/* Photo */}
        {ticket.photoUrl && (
          <a href={ticket.photoUrl} target="_blank" rel="noopener noreferrer" className="block mb-3 w-fit group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ticket.photoUrl}
              alt="Ticket photo"
              className="h-28 w-auto object-cover rounded-2xl border border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(250,204,21,0.35)] transition-all"
            />
            <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1"><Camera size={9} /> Tap to view full size</p>
          </a>
        )}

        {/* Notes Log Section — Always visible & clear */}
        {ticket.notes && (
          <div className="mb-3 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <button
                onClick={() => setShowNotesModal(true)}
                className="text-[10px] font-black uppercase tracking-wider text-[#FACC15] flex items-center gap-1.5 hover:underline"
              >
                <MessageSquare size={12} /> Notes Log ({notesCount})
              </button>
              <button
                onClick={() => setShowNotesModal(true)}
                className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] transition-all"
              >
                + Add / View All
              </button>
            </div>
            <p className="text-xs text-gray-300 italic line-clamp-2 leading-relaxed">
              {notesList[notesList.length - 1]}
            </p>
          </div>
        )}

        {needsParts && (
          <div className="text-xs text-orange-400 bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.3)] rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
            <Package size={13} /> Parts needed — {ticket.notes || "awaiting parts"}
          </div>
        )}

        {/* Action Bar — Always accessible for all tickets */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
          {!isComplete ? (
            <>
              {/* Primary Claim / Start / Done button */}
              {!ticket.assignedTo ? (
                <button
                  onClick={() => onUpdate(ticket.id, ticket.status, { assignedTo: workerName })}
                  className="flex-1 py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 bg-[rgba(250,204,21,0.12)] border border-[rgba(250,204,21,0.3)] text-[#FACC15] hover:bg-[rgba(250,204,21,0.18)] min-w-[130px]"
                >
                  🔒 Claim Ticket
                </button>
              ) : (
                <button
                  onClick={advance}
                  className="flex-1 py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 min-w-[130px]"
                  style={{ backgroundColor: p.color, color: ticket.priority <= 2 ? "#fff" : "#000" }}
                >
                  <ChevronRight size={18} />
                  {nextLabel}
                </button>
              )}

              {/* Add note / need parts */}
              {isInProgress && (
                <button
                  onClick={openParts}
                  title="Flag parts needed"
                  className="h-[48px] px-3.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-90 bg-[rgba(249,115,22,0.12)] border border-[rgba(249,115,22,0.35)] text-orange-400 text-xs font-bold"
                >
                  <Package size={17} />
                  <span className="hidden sm:inline">Parts</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-[140px]">
              <span className="text-xs text-[#4ADE80] font-bold flex items-center gap-1.5 py-2">
                <CheckCircle2 size={16} /> Work Completed
              </span>
              {isMaintenanceAdmin && (
                <button
                  onClick={() => onUpdate(ticket.id, "open")}
                  title="Reopen ticket"
                  className="ml-auto px-3 py-2 rounded-xl text-xs font-bold text-amber-400 bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.25)] hover:bg-[rgba(250,204,21,0.15)] flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <RotateCcw size={13} /> Reopen
                </button>
              )}
            </div>
          )}

          {/* Notes Log button — ALWAYS VISIBLE on all tickets */}
          <button
            onClick={() => setShowNotesModal(true)}
            title="View & add notes"
            className="h-[48px] px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-90 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] text-gray-200 text-xs font-bold"
          >
            <MessageSquare size={16} className={notesCount > 0 ? "text-[#FACC15]" : "text-gray-400"} />
            <span>Notes{notesCount > 0 ? ` (${notesCount})` : ""}</span>
          </button>

          {/* Admin Edit button — Fred / Maintenance Admin */}
          {isMaintenanceAdmin && (
            <button
              onClick={() => setShowEditModal(true)}
              title="Admin: Edit Work Order"
              className="h-[48px] px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-90 bg-[rgba(250,204,21,0.1)] hover:bg-[rgba(250,204,21,0.2)] border border-[rgba(250,204,21,0.35)] text-[#FACC15] text-xs font-bold"
            >
              <Pencil size={15} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      <CompletionSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        onSubmit={handleSheetSubmit}
        showTime={sheetMode === "complete" && isInProgress}
        accentColor={sheetMode === "parts" ? "#F97316" : p.color}
        title={sheetMode === "parts" ? "🔧 Flag Parts Needed" : isInProgress ? "✅ Mark Job Done" : "📝 Add Note"}
        subtitle={ticket.title}
        submitLabel={sheetMode === "parts" ? "⚙️ Flag — Awaiting Parts" : isInProgress ? "✅ Complete Job" : "💾 Save Note"}
      />

      <NotesLogModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        ticket={ticket}
        workerName={workerName}
        isMaintenanceAdmin={isMaintenanceAdmin}
        onUpdateNotes={async (newNotes) => {
          await onUpdate(ticket.id, ticket.status, { notes: newNotes });
        }}
      />

      {showEditModal && (
        <EditTicketModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          ticket={ticket}
          workerName={workerName}
          knownStaff={knownStaff}
          onSave={async (id, updates) => {
            await onFullUpdate(id, updates);
          }}
          onDelete={onDeleteTicket}
        />
      )}
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
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center mb-6 animate-bounce">
          <Wrench size={36} className="text-black" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Welcome, {welcome}!</h1>
        <p className="text-gray-500">Loading your portal…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center px-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center mb-6">
        <Wrench size={28} className="text-black" />
      </div>
      <h1 className="text-3xl font-black text-white text-center mb-1">Maintenance Portal</h1>
      <p className="text-gray-500 text-center mb-8">Enter your 6-digit PIN</p>

      {/* PIN dots */}
      <div className={`flex gap-3 mb-8 ${shake ? "animate-shake" : ""}`}
        style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-4 h-4 rounded-full transition-all duration-200"
            style={{
              backgroundColor: i < digits.length ? "#FACC15" : "rgba(255,255,255,0.1)",
              boxShadow: i < digits.length ? "0 0 12px rgba(250,204,21,0.4)" : "none",
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

export default function MaintenanceStaffPage() {
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [ticketView, setTicketView] = useState<"mine" | "all" | "completed">("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [knownStaff, setKnownStaff] = useState<string[]>(["Fred", "Mike D.", "Carlos M.", "James R."]);
  const [submitted, setSubmitted] = useState(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"tickets" | "filters" | "inspections">("tickets");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  const isMaintenanceAdmin = Boolean(
    workerName && (
      workerName.toLowerCase().includes("fred") ||
      workerName.toLowerCase().includes("admin") ||
      workerName.toLowerCase().includes("allen")
    )
  );

  useEffect(() => {
    const saved = localStorage.getItem("oiq_staff_name");
    if (saved) setWorkerName(saved);
    // Crew sessions expire after a shift — if the signed session is gone, return to PIN entry.
    fetch("/api/staff-auth")
      .then(r => r.json())
      .then(d => { if (!d.authenticated) { localStorage.removeItem("oiq_staff_name"); setWorkerName(null); } })
      .catch(() => {});
  }, []);

  // Fetch known maintenance staff for assignments and filters
  useEffect(() => {
    fetch("/api/allowed-users?role=maintenance")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.users)) {
          const names = d.users.map((u: { name: string }) => u.name).filter(Boolean);
          setKnownStaff(prev => Array.from(new Set([...prev, ...names, "Fred"])));
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectName = (name: string) => {
    localStorage.setItem("oiq_staff_name", name);
    setWorkerName(name);
  };

  const fetchTickets = useCallback(async () => {
    if (!workerName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance");
      const data = await res.json();
      if (Array.isArray(data.tickets)) {
        const all = data.tickets.map(rowToTicket) as Ticket[];
        const nonCancelled = all.filter(t => t.status !== "cancelled");

        // Merge any technician names found in tickets into knownStaff
        const ticketStaff = nonCancelled.map(t => t.assignedTo).filter(Boolean);
        if (ticketStaff.length > 0) {
          setKnownStaff(prev => Array.from(new Set([...prev, ...ticketStaff, "Fred"])));
        }

        if (ticketView === "completed") {
          setTickets(nonCancelled.filter(t => t.status === "complete"));
        } else if (ticketView === "all") {
          setTickets(nonCancelled);
        } else {
          // My Tickets — case-insensitive match
          const myName = workerName.trim().toLowerCase();
          setTickets(nonCancelled.filter(t => {
            const assigned = t.assignedTo.trim().toLowerCase();
            return assigned === myName || assigned.includes(myName) || myName.includes(assigned);
          }));
        }
      }
    } finally { setLoading(false); }
  }, [workerName, ticketView]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleUpdate = async (id: string, status: Ticket["status"], meta?: { notes?: string; minutes?: number; partsNeeded?: boolean; assignedTo?: string; billable?: boolean; materialAmount?: number }) => {
    const patch: Record<string, unknown> = { status, actorName: workerName };
    if (status === "complete") { patch.completedDate = new Date().toISOString().split("T")[0]; patch.partsNeeded = false; }
    if (meta?.notes !== undefined) patch.notes = meta.notes;
    if (meta?.minutes) patch.actualMinutes = meta.minutes;
    if (meta?.partsNeeded !== undefined) patch.partsNeeded = meta.partsNeeded;
    if (meta?.assignedTo !== undefined) patch.assignedTo = meta.assignedTo;
    if (meta?.billable !== undefined) patch.billable = meta.billable;
    if (meta?.materialAmount !== undefined) patch.materialAmount = meta.materialAmount;

    // Save previous state for rollback on failure
    const prevTickets = tickets;

    // Optimistic local update
    setTickets(prev => prev.map(t => t.id === id ? {
      ...t,
      status,
      notes: meta?.notes ?? t.notes,
      partsNeeded: meta?.partsNeeded ?? (status === "complete" ? false : t.partsNeeded),
      assignedTo: meta?.assignedTo !== undefined ? meta.assignedTo : t.assignedTo,
      billable: meta?.billable !== undefined ? meta.billable : t.billable,
      materialAmount: meta?.materialAmount !== undefined ? meta.materialAmount : t.materialAmount
    } : t));

    try {
      const res = await fetch(`/api/maintenance?id=${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setTickets(prevTickets);
        alert("⚠️ Failed to save — please try again. If this keeps happening, let your manager know.");
        return;
      }
      if (status === "complete") {
        setCompletionToast("✅ Job marked complete and saved!");
        setTimeout(() => setCompletionToast(null), 3000);
      } else if (meta?.notes) {
        setCompletionToast("📝 Note saved!");
        setTimeout(() => setCompletionToast(null), 2500);
      }
    } catch (err) {
      setTickets(prevTickets);
      alert("⚠️ No connection — your update was NOT saved. Check your signal and try again.");
    }
  };

  const handleFullUpdate = async (id: string, updates: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try {
      const res = await fetch(`/api/maintenance?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, actorName: workerName }),
      });
      if (!res.ok) {
        fetchTickets();
        alert("⚠️ Failed to update ticket. Please try again.");
      } else {
        setCompletionToast("✅ Work order updated successfully!");
        setTimeout(() => setCompletionToast(null), 3000);
        fetchTickets();
      }
    } catch {
      fetchTickets();
      alert("⚠️ Network error while saving work order.");
    }
  };

  const handleDeleteTicket = async (id: string, title: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    try {
      const res = await fetch(`/api/maintenance?id=${encodeURIComponent(id)}&actorName=${encodeURIComponent(workerName || "Staff")}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        fetchTickets();
        alert("⚠️ Failed to delete ticket.");
      } else {
        setCompletionToast(`🗑️ Ticket "${title}" deleted.`);
        setTimeout(() => setCompletionToast(null), 3000);
      }
    } catch {
      fetchTickets();
      alert("⚠️ Network error while deleting ticket.");
    }
  };

  if (!workerName) return <PinKeypad onAuth={handleSelectName} />;

  // Filter tickets by technician if admin filter is active
  let displayedTickets = tickets;
  if (isMaintenanceAdmin && staffFilter !== "all" && ticketView !== "mine") {
    if (staffFilter === "unassigned") {
      displayedTickets = displayedTickets.filter(t => !t.assignedTo?.trim());
    } else {
      displayedTickets = displayedTickets.filter(t => t.assignedTo?.toLowerCase().includes(staffFilter.toLowerCase()));
    }
  }

  // Search filter
  const sq = staffSearchQuery.trim().toLowerCase();
  if (sq) {
    displayedTickets = displayedTickets.filter(t =>
      t.title.toLowerCase().includes(sq) ||
      t.building.toLowerCase().includes(sq) ||
      t.tenant.toLowerCase().includes(sq) ||
      t.assignedTo.toLowerCase().includes(sq) ||
      t.description.toLowerCase().includes(sq)
    );
  }

  const open = displayedTickets.filter(t => t.status !== "complete");
  const done = displayedTickets.filter(t => t.status === "complete");
  const emergency = open.filter(t => t.priority === 1);

  return (
    <div className="min-h-screen bg-[#080C14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[rgba(8,12,20,0.95)] backdrop-blur-sm border-b border-[rgba(255,255,255,0.06)] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center shadow-lg">
            {isMaintenanceAdmin ? <Crown size={20} className="text-black" /> : <Wrench size={18} className="text-black" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-400 font-semibold">Maintenance</p>
              {isMaintenanceAdmin && (
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                  👑 Admin
                </span>
              )}
            </div>
            <p className="text-sm font-black text-white flex items-center gap-1.5">
              {workerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { localStorage.removeItem("oiq_staff_name"); setWorkerName(null); fetch("/api/staff-auth", { method: "DELETE" }).catch(() => {}); }}
            className="text-xs text-gray-400 hover:text-white px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.05)] transition-all">
            Switch
          </button>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex border-b border-[rgba(255,255,255,0.06)] bg-[#080C14] sticky top-[73px] z-10">
        <button onClick={() => setActiveSubTab("tickets")}
          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeSubTab === "tickets" ? "border-[#FACC15] text-[#FACC15] bg-[rgba(250,204,21,0.03)]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
          <Wrench size={12} /> Work Orders
        </button>
        <button onClick={() => setActiveSubTab("filters")}
          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeSubTab === "filters" ? "border-[#FACC15] text-[#FACC15] bg-[rgba(250,204,21,0.03)]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
          <Sparkles size={12} /> Filters Log
        </button>
        <button onClick={() => setActiveSubTab("inspections")}
          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeSubTab === "inspections" ? "border-[#FACC15] text-[#FACC15] bg-[rgba(250,204,21,0.03)]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
          <ShieldAlert size={12} /> Inspections Log
        </button>
      </div>

      {activeSubTab === "tickets" && (
        <>
          {/* Emergency banner */}
          {emergency.length > 0 && (
            <div className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.5)] flex items-center gap-3 animate-pulse">
              <Flame size={20} className="text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-black text-red-400">{emergency.length} Emergency Ticket{emergency.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-red-400/70">Requires immediate attention</p>
              </div>
            </div>
          )}

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 px-4 mt-4">
            {[
              { label: "Open", value: open.length, color: "#FACC15" },
              { label: "Done", value: done.length, color: "#4ADE80" },
              { label: "Emergency", value: emergency.length, color: emergency.length > 0 ? "#EF4444" : "#6B7280" },
            ].map(s => (
              <div key={s.label} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-3 text-center">
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Toggle: mine / all / completed */}
          <div className="px-4 mt-4 flex items-center gap-2">
            <button onClick={() => setTicketView("mine")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${ticketView === "mine" ? "bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.4)] text-[#FACC15]" : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300"}`}>
              My Tickets
            </button>
            <button onClick={() => setTicketView("all")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${ticketView === "all" ? "bg-[rgba(250,204,21,0.12)] border-[rgba(250,204,21,0.4)] text-[#FACC15]" : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300"}`}>
              All Open
            </button>
            <button onClick={() => setTicketView("completed")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${ticketView === "completed" ? "bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.4)] text-[#4ADE80]" : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300"}`}>
              Completed
            </button>
          </div>

          {/* Admin Crew Filter Pills (Fred / Maintenance Admin) */}
          {isMaintenanceAdmin && ticketView !== "mine" && (
            <div className="px-4 mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1 mr-1">
                <Users size={11} /> Crew:
              </span>
              {["all", ...knownStaff, "unassigned"].map((staff) => {
                const isSelected = staffFilter === staff;
                const label = staff === "all" ? "All Crew" : staff === "unassigned" ? "Unassigned" : staff;
                return (
                  <button
                    key={staff}
                    onClick={() => setStaffFilter(staff)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      isSelected
                        ? "bg-[#FACC15] text-black border-[#FACC15]"
                        : "bg-[rgba(255,255,255,0.04)] text-gray-400 border-[rgba(255,255,255,0.08)] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search bar */}
          <div className="px-4 mt-3 relative">
            <svg className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              value={staffSearchQuery}
              onChange={e => setStaffSearchQuery(e.target.value)}
              placeholder="Search tickets by title, building, tenant, assigned to…"
              className="w-full pl-8 pr-8 py-2.5 rounded-xl text-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.09)] text-white placeholder:text-gray-600 focus:border-[rgba(250,204,21,0.4)] outline-none transition-colors"
            />
            {staffSearchQuery && (
              <button onClick={() => setStaffSearchQuery("")} className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {/* Ticket list */}
          <div className="px-4 mt-4 pb-32 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-[#FACC15]" />
              </div>
            ) : ticketView === "completed" ? (
              done.length === 0 ? (
                <div className="text-center py-20">
                  <CheckCircle2 size={48} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-white font-bold text-lg">No completed tickets</p>
                  <p className="text-gray-600 text-sm mt-1">
                    {staffFilter !== "all" ? `No completed tickets found for ${staffFilter}.` : "Completed work orders will appear here."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest">{done.length} completed ticket{done.length !== 1 ? "s" : ""}</p>
                  {done.map(t => (
                    <FieldTicketCard
                      key={t.id}
                      ticket={t}
                      workerName={workerName}
                      isMaintenanceAdmin={isMaintenanceAdmin}
                      knownStaff={knownStaff}
                      onUpdate={handleUpdate}
                      onFullUpdate={handleFullUpdate}
                      onDeleteTicket={handleDeleteTicket}
                    />
                  ))}
                </>
              )
            ) : open.length === 0 ? (
              <div className="text-center py-20">
                <CheckCircle2 size={48} className="text-[#4ADE80] mx-auto mb-3" />
                <p className="text-white font-bold text-lg">{ticketView === "all" ? "Queue is clear!" : "All caught up!"}</p>
                <p className="text-gray-600 text-sm mt-1">
                  {ticketView === "all" ? "No open tickets matching the current view." : "No open tickets assigned to you. Switch to \"All Open\" to see the full queue."}
                </p>
              </div>
            ) : (
              <>
                {/* Open tickets */}
                {open.sort((a, b) => a.priority - b.priority).map(t => (
                  <FieldTicketCard
                    key={t.id}
                    ticket={t}
                    workerName={workerName}
                    isMaintenanceAdmin={isMaintenanceAdmin}
                    knownStaff={knownStaff}
                    onUpdate={handleUpdate}
                    onFullUpdate={handleFullUpdate}
                    onDeleteTicket={handleDeleteTicket}
                  />
                ))}
                {/* Completed today shown under open tickets */}
                {done.length > 0 && (
                  <>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest pt-4">Completed ({done.length})</p>
                    {done.map(t => (
                      <FieldTicketCard
                        key={t.id}
                        ticket={t}
                        workerName={workerName}
                        isMaintenanceAdmin={isMaintenanceAdmin}
                        knownStaff={knownStaff}
                        onUpdate={handleUpdate}
                        onFullUpdate={handleFullUpdate}
                        onDeleteTicket={handleDeleteTicket}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-[rgba(8,12,20,0.97)] border-t border-[rgba(255,255,255,0.07)] p-4 pb-8 flex gap-3">
            <button onClick={fetchTickets}
              className="flex-1 py-4 rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white font-bold flex items-center justify-center gap-2 hover:bg-[rgba(255,255,255,0.1)] transition-all active:scale-95">
              <Loader2 size={16} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={() => setShowReport(true)}
              className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-base font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
              <Plus size={18} /> Report Issue
            </button>
          </div>
        </>
      )}

      {activeSubTab === "filters" && (
        <div className="px-4 mt-6 pb-20">
          <FilterChangesTab currentUserName={workerName} />
        </div>
      )}

      {activeSubTab === "inspections" && (
        <div className="px-4 mt-6 pb-20">
          <BuildingInspectionsTab currentUserName={workerName} />
        </div>
      )}

      {/* Submitted toast */}
      {submitted && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-[#4ADE80] text-black rounded-2xl px-5 py-3 font-bold text-center text-sm shadow-xl">
          ✅ Issue submitted to maintenance queue
        </div>
      )}

      {/* Completion / Save saved toast */}
      {completionToast && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-[#4ADE80] text-black rounded-2xl px-5 py-3 font-bold text-center text-sm shadow-xl">
          {completionToast}
        </div>
      )}

      {showReport && (
        <ReportModal
          workerName={workerName}
          knownStaff={knownStaff}
          isMaintenanceAdmin={isMaintenanceAdmin}
          onClose={() => setShowReport(false)}
          onSubmit={() => {
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}
