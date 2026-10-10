"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Users, Search, RefreshCw, Loader2, Plus, CheckCircle2,
  Phone, X, Trash2, Edit2, Save, Filter, FileSpreadsheet,
  ChevronDown, Star, MessageSquare,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  "Electrical",
  "Drywall",
  "Insulation",
  "Plumbing",
  "HVAC",
  "Landscaping",
  "Painting",
  "Roofing",
  "Concrete",
  "Flooring",
  "General Labor",
  "Other",
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Contact {
  id?: string;
  name: string;
  phone: string;
  service_type: string;
  company?: string;
  email?: string;
  notes: string;
  rating?: number;
  updated_by?: string;
  updated_at?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-white focus:border-[rgba(96,165,250,0.4)] outline-none placeholder:text-gray-600";

const SERVICE_COLORS: Record<string, string> = {
  Electrical: "bg-[rgba(250,204,21,0.12)] text-[#FACC15] border-[rgba(250,204,21,0.25)]",
  Drywall: "bg-[rgba(156,163,175,0.12)] text-[#9CA3AF] border-[rgba(156,163,175,0.25)]",
  Insulation: "bg-[rgba(251,146,60,0.12)] text-[#FB923C] border-[rgba(251,146,60,0.25)]",
  Plumbing: "bg-[rgba(96,165,250,0.12)] text-[#60A5FA] border-[rgba(96,165,250,0.25)]",
  HVAC: "bg-[rgba(52,211,153,0.12)] text-[#34D399] border-[rgba(52,211,153,0.25)]",
  Landscaping: "bg-[rgba(74,222,128,0.12)] text-[#4ADE80] border-[rgba(74,222,128,0.25)]",
  Painting: "bg-[rgba(192,132,252,0.12)] text-[#C084FC] border-[rgba(192,132,252,0.25)]",
  Roofing: "bg-[rgba(239,68,68,0.12)] text-[#EF4444] border-[rgba(239,68,68,0.25)]",
  Concrete: "bg-[rgba(161,161,170,0.12)] text-[#A1A1AA] border-[rgba(161,161,170,0.25)]",
  Flooring: "bg-[rgba(217,119,6,0.12)] text-[#D97706] border-[rgba(217,119,6,0.25)]",
  "General Labor": "bg-[rgba(148,163,184,0.12)] text-[#94A3B8] border-[rgba(148,163,184,0.25)]",
  Other: "bg-[rgba(107,114,128,0.12)] text-[#6B7280] border-[rgba(107,114,128,0.25)]",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function SubcontractorContactsTab({
  currentUserName,
}: {
  currentUserName?: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState<string>("All");

  // Add / Edit form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<Contact>({
    name: "", phone: "", service_type: SERVICE_TYPES[0], company: "", email: "", notes: "", rating: 0,
  });
  const [saving, setSaving] = useState(false);

  // Notes expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // Debounced notes save
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subcontractor-contacts");
      if (!res.ok) throw new Error("Failed to fetch");
      const d = await res.json();
      if (Array.isArray(d.contacts)) setContacts(d.contacts);
      else setContacts([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ─── Add / Edit ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", service_type: SERVICE_TYPES[0], company: "", email: "", notes: "", rating: 0 });
    setShowForm(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ ...c });
    setShowForm(true);
  };

  const saveContact = async () => {
    if (!form.name.trim() || !form.phone.trim()) { alert("Name and phone are required."); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        service_type: form.service_type,
        company: form.company?.trim() || "",
        email: form.email?.trim() || "",
        notes: form.notes?.trim() || "",
        rating: form.rating || 0,
        updatedBy: currentUserName || "Staff",
      };

      let res;
      if (editing?.id) {
        res = await fetch(`/api/subcontractor-contacts?id=${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/subcontractor-contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error("Failed to save");
      setShowForm(false);
      fetchContacts();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────
  const deleteContact = async (id: string) => {
    if (!confirm("Delete this subcontractor?")) return;
    try {
      await fetch(`/api/subcontractor-contacts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error(err); }
  };

  // ─── Inline notes save ────────────────────────────────────────────────
  const saveNotes = async (id: string, notes: string) => {
    if (saveTimeouts.current[id]) clearTimeout(saveTimeouts.current[id]);
    saveTimeouts.current[id] = setTimeout(async () => {
      try {
        await fetch(`/api/subcontractor-contacts?id=${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, updatedBy: currentUserName || "Staff" }),
        });
      } catch { /* silent */ }
    }, 500);
  };

  // ─── CSV export ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Name", "Phone", "Service", "Company", "Email", "Notes", "Rating"];
    const rows = filtered.map(c => [c.name, c.phone, c.service_type, c.company || "", c.email || "", c.notes, String(c.rating || "")]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `subcontractors-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Filtered & sorted ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts
      .filter(c => {
        if (filterService !== "All" && c.service_type !== filterService) return false;
        if (!q) return true;
        return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.service_type.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q) || c.notes.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, search, filterService]);

  // Service type counts for filter badges
  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = { All: contacts.length };
    for (const c of contacts) {
      counts[c.service_type] = (counts[c.service_type] || 0) + 1;
    }
    return counts;
  }, [contacts]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(192,132,252,0.15)] border border-[rgba(192,132,252,0.3)] flex items-center justify-center">
            <Users size={18} className="text-[#C084FC]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Subcontractor Contacts</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Electrical, Plumbing, HVAC, Painting & More</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C084FC] to-[#A855F7] text-white text-xs font-black hover:opacity-90 transition-opacity shadow-lg" style={{ boxShadow: "0 0 20px rgba(192,132,252,0.2)" }}>
            <Plus size={14} /> Add Contact
          </button>
          {contacts.length > 0 && (
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all">
              <FileSpreadsheet size={12} /> CSV
            </button>
          )}
          <button onClick={fetchContacts} disabled={loading} className="p-2 rounded-xl text-gray-500 hover:text-white border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Service type filter pills */}
      {contacts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Filter size={11} className="text-gray-600 flex-shrink-0" />
          {["All", ...SERVICE_TYPES.filter(s => serviceCounts[s])].map(s => (
            <button
              key={s}
              onClick={() => setFilterService(s)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                filterService === s
                  ? "bg-[rgba(192,132,252,0.15)] text-[#C084FC] border border-[rgba(192,132,252,0.3)]"
                  : "text-gray-500 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"
              }`}
            >
              {s} {serviceCounts[s] !== undefined && <span className="opacity-60">({serviceCounts[s]})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      {contacts.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="text" placeholder="Search by name, phone, service, company…" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl pl-8 pr-4 py-2 text-xs text-white focus:border-[rgba(192,132,252,0.4)] outline-none placeholder:text-gray-700" />
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-[rgba(192,132,252,0.06)] border border-[rgba(192,132,252,0.2)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              {editing ? <><Edit2 size={14} className="text-[#C084FC]" /> Edit Contact</> : <><Plus size={14} className="text-[#C084FC]" /> New Subcontractor</>}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" className={FIELD} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Phone *</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(555) 123-4567" className={FIELD} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Service Type</label>
              <select value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} className={FIELD}>
                {SERVICE_TYPES.map(s => <option key={s} value={s} style={{ background: "#0D1117" }}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Company</label>
              <input type="text" value={form.company || ""} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Optional" className={FIELD} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Email</label>
              <input type="email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Optional" className={FIELD} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Job history, quality notes, availability…" className={FIELD} />
            </div>
          </div>
          <button onClick={saveContact} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C084FC] to-[#A855F7] text-white text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : editing ? "Update Contact" : "Add Contact"}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-[#C084FC]" />
          <span className="ml-2 text-sm text-gray-500">Loading contacts…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && contacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(192,132,252,0.08)] border border-[rgba(192,132,252,0.2)] flex items-center justify-center mb-4">
            <Users size={28} className="text-[#C084FC]/50" />
          </div>
          <p className="text-gray-400 font-bold">No subcontractors yet</p>
          <p className="text-xs text-gray-600 mt-1">Click &quot;Add Contact&quot; to start building your subcontractor directory.</p>
        </div>
      )}

      {/* No results */}
      {!loading && contacts.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto text-gray-700 mb-2" size={20} />
          <p className="text-xs text-gray-500">No contacts match your search or filter.</p>
        </div>
      )}

      {/* Contacts list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(c => {
            const colorClass = SERVICE_COLORS[c.service_type] || SERVICE_COLORS.Other;
            const isExpanded = expandedId === c.id;
            const isEditingNote = editingNotes === c.id;

            return (
              <div key={c.id} className="bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] rounded-xl hover:border-[rgba(255,255,255,0.12)] transition-all">
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Name + Company */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">{c.name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold border ${colorClass}`}>{c.service_type}</span>
                    </div>
                    {c.company && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{c.company}</p>}
                  </div>

                  {/* Phone — clickable */}
                  <a href={`tel:${c.phone.replace(/\D/g, "")}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.2)] text-[#60A5FA] text-xs font-bold hover:bg-[rgba(96,165,250,0.15)] transition-all flex-shrink-0">
                    <Phone size={11} /> {c.phone}
                  </a>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setExpandedId(isExpanded ? null : c.id!)} className={`p-1.5 rounded-lg transition-all ${isExpanded ? "text-[#C084FC] bg-[rgba(192,132,252,0.1)]" : "text-gray-600 hover:text-gray-300"}`} title="Notes">
                      <MessageSquare size={13} />
                    </button>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-600 hover:text-[#60A5FA] transition-colors" title="Edit">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteContact(c.id!)} className="p-1.5 rounded-lg text-gray-600 hover:text-[#EF4444] transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded notes */}
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-[rgba(255,255,255,0.04)]">
                    <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block mb-1.5">Job Notes & Performance</label>
                    <textarea
                      value={isEditingNote ? noteDraft : (c.notes || "")}
                      onFocus={() => { setEditingNotes(c.id!); setNoteDraft(c.notes || ""); }}
                      onChange={e => {
                        setNoteDraft(e.target.value);
                        // Optimistic update
                        setContacts(prev => prev.map(x => x.id === c.id ? { ...x, notes: e.target.value } : x));
                        saveNotes(c.id!, e.target.value);
                      }}
                      onBlur={() => setEditingNotes(null)}
                      placeholder="Add notes about their work quality, reliability, pricing, specific jobs done…"
                      rows={3}
                      className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-xs text-white focus:border-[rgba(192,132,252,0.4)] outline-none placeholder:text-gray-700 resize-none"
                    />
                    <p className="text-[9px] text-gray-700 mt-1">Auto-saves as you type</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!loading && contacts.length > 0 && (
        <div className="flex items-center justify-between text-[10px] text-gray-600 pt-2">
          <span>{filtered.length} of {contacts.length} contacts shown</span>
          <span>{Object.keys(serviceCounts).filter(k => k !== "All").length} service types</span>
        </div>
      )}
    </div>
  );
}
