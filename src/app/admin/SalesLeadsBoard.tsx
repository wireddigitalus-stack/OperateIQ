"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Search, RefreshCw, Loader2, Plus, Trash2,
  Building2, AlertTriangle, FileSpreadsheet, Sparkles, MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react";
import PrintButton from "./PrintButton";

const PROPERTIES_LIST = [
  "Sample Office Building",
  "Downtown Center",
  "Mill Building",
  "Riverside Commons",
  "250 Commerce Ave",
  "100 Main St",
  "215 Highway Dr",
  "221 Oak St",
  "142 Main St",
  "134 Main St",
  "720 Main St",
  "209 Park Rd",
  "Farm"
];

const PROGRESS_STAGES = [
  { value: "Inquire", label: "Inquire", color: "#FACC15", bg: "rgba(250,204,21,0.12)" },
  { value: "Showing Scheduled", label: "Showing Scheduled", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  { value: "Showing Completed", label: "Showing Completed", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  { value: "Contract Drafted", label: "Contract Drafted", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  { value: "Contract Sent", label: "Contract Sent", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  { value: "Contract Negotiation", label: "Contract Negotiation", color: "#EC4899", bg: "rgba(236,72,153,0.12)" },
  { value: "Closing Date Scheduled", label: "Closing Date Scheduled", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  { value: "Sold", label: "Sold", color: "#4ADE80", bg: "rgba(74,222,128,0.12)" },
];

export interface SalesLead {
  id: string;
  pocName: string;
  pocPhone: string;
  pocEmail: string;
  buildingInterested: string;
  progress: string;
  dealProgress: string; // '0-25%', '25-50%', '50-75%', '75-100%'
  listingPrice: number;
  quotedPrice: number;
  counterOffer: number;
  offerPrice: number; // fallback
  notes: string;
  createdAt?: string;
}

export default function SalesLeadsBoard({
  currentUserName,
}: {
  currentUserName?: string;
}) {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Activity Log Drawer State
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [authorName, setAuthorName] = useState("");

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formPocName, setFormPocName] = useState("");
  const [formPocPhone, setFormPocPhone] = useState("");
  const [formPocEmail, setFormPocEmail] = useState("");
  const [formBuilding, setFormBuilding] = useState("");
  const [formProgress, setFormProgress] = useState("Inquire");
  const [formDealProgress, setFormDealProgress] = useState("0-25%");
  const [formListingPrice, setFormListingPrice] = useState("");
  const [formQuotedPrice, setFormQuotedPrice] = useState("");
  const [formCounterOffer, setFormCounterOffer] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("oiq_commenter") || currentUserName || "";
    setAuthorName(saved);
  }, [currentUserName]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales-leads");
      if (!res.ok) throw new Error("Failed to fetch sales leads");
      const d = await res.json();
      if (Array.isArray(d.leads)) {
        const mapped = d.leads.map((l: any) => ({
          id: l.id,
          pocName: l.poc_name,
          pocPhone: l.poc_phone,
          pocEmail: l.poc_email,
          buildingInterested: l.building_interested,
          progress: l.progress || "Inquire",
          dealProgress: l.deal_progress || "0-25%",
          listingPrice: Number(l.listing_price) || 0,
          quotedPrice: Number(l.quoted_price) || 0,
          counterOffer: Number(l.counter_offer) || 0,
          offerPrice: Number(l.offer_price) || 0,
          notes: l.notes || "",
          createdAt: l.created_at,
        }));
        setLeads(mapped);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPocName.trim() || !formBuilding) {
      alert("POC Name and Building Interested are required.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        pocName: formPocName.trim(),
        pocPhone: formPocPhone.trim(),
        pocEmail: formPocEmail.trim(),
        buildingInterested: formBuilding,
        progress: formProgress,
        dealProgress: formDealProgress,
        listingPrice: Number(formListingPrice) || 0,
        quotedPrice: Number(formQuotedPrice) || 0,
        counterOffer: Number(formCounterOffer) || 0,
        notes: formNotes.trim(),
      };
      const res = await fetch("/api/sales-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create sales lead");
      const data = await res.json();
      if (data.success && data.lead) {
        const newLead: SalesLead = {
          id: data.lead.id,
          pocName: data.lead.poc_name,
          pocPhone: data.lead.poc_phone,
          pocEmail: data.lead.poc_email,
          buildingInterested: data.lead.building_interested,
          progress: data.lead.progress,
          dealProgress: data.lead.deal_progress || "0-25%",
          listingPrice: Number(data.lead.listing_price) || 0,
          quotedPrice: Number(data.lead.quoted_price) || 0,
          counterOffer: Number(data.lead.counter_offer) || 0,
          offerPrice: Number(data.lead.offer_price) || 0,
          notes: data.lead.notes,
          createdAt: data.lead.created_at,
        };
        setLeads(prev => [newLead, ...prev]);
        setShowAddForm(false);
        // Reset form
        setFormPocName("");
        setFormPocPhone("");
        setFormPocEmail("");
        setFormBuilding("");
        setFormProgress("Inquire");
        setFormDealProgress("0-25%");
        setFormListingPrice("");
        setFormQuotedPrice("");
        setFormCounterOffer("");
        setFormNotes("");
      }
    } catch (err: any) {
      alert("Error adding lead: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = async (id: string, field: keyof SalesLead, value: any) => {
    setSavingId(id);
    const existing = leads.find(l => l.id === id);
    if (!existing) return;

    const payload: Record<string, any> = {
      pocName: existing.pocName,
      pocPhone: existing.pocPhone,
      pocEmail: existing.pocEmail,
      buildingInterested: existing.buildingInterested,
      progress: existing.progress,
      dealProgress: existing.dealProgress,
      listingPrice: existing.listingPrice,
      quotedPrice: existing.quotedPrice,
      counterOffer: existing.counterOffer,
      offerPrice: existing.offerPrice,
      notes: existing.notes,
      [field]: value,
    };

    try {
      const res = await fetch(`/api/sales-leads?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update sales lead");
      setLeads(prev =>
        prev.map(l => (l.id === id ? { ...l, [field]: value } : l))
      );
    } catch (err: any) {
      alert("Error saving: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handlePostNote = async (id: string, currentNotes: string) => {
    if (!newNote.trim() || !authorName.trim()) return;
    const timestamp = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const entry = `[${timestamp} — ${authorName.trim()}] ${newNote.trim()}`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${entry}` : entry;
    
    // Save locally commenter name
    localStorage.setItem("oiq_commenter", authorName.trim());

    await updateField(id, "notes", updatedNotes);
    setNewNote("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sales lead?")) return;
    try {
      const res = await fetch(`/api/sales-leads?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete lead");
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    return (
      l.pocName.toLowerCase().includes(q) ||
      l.buildingInterested.toLowerCase().includes(q) ||
      l.notes.toLowerCase().includes(q)
    );
  });

  const totalDealVolume = filtered.reduce((sum, l) => {
    // Valuation logic: counterOffer if set, else quotedPrice, else listingPrice
    return sum + (l.counterOffer || l.quotedPrice || l.listingPrice || l.offerPrice || 0);
  }, 0);

  const exportCSV = () => {
    const headers = ["POC Name", "POC Phone", "POC Email", "Building Interested", "Progress Stage", "Deal Progress %", "Listing Price", "Quoted Price", "Counter Offer", "Notes", "Created At"];
    const rows = filtered.map(l => [
      l.pocName,
      l.pocPhone,
      l.pocEmail,
      l.buildingInterested,
      l.progress,
      l.dealProgress,
      l.listingPrice,
      l.quotedPrice,
      l.counterOffer,
      l.notes,
      l.createdAt || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_leads_deals_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass rounded-2xl border border-[rgba(250,204,21,0.12)] bg-[rgba(10,15,30,0.4)] p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[rgba(250,204,21,0.15)] border border-[rgba(250,204,21,0.25)] flex items-center justify-center text-[#FACC15]">
            <TrendingUp size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Acquisitions & Sales Leads Board</h3>
            <p className="text-[10px] text-gray-500">Track interested property buyers and progress of deals</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl px-4 py-2 text-xs">
          <div>
            <span className="text-gray-500 uppercase tracking-widest text-[9px] block">Active Deals</span>
            <span className="text-white font-black">{filtered.filter(l => l.progress !== "Sold").length} deals</span>
          </div>
          <div className="border-l border-[rgba(255,255,255,0.06)] pl-6">
            <span className="text-gray-500 uppercase tracking-widest text-[9px] block">Total Deal Volume</span>
            <span className="text-[#4ADE80] font-black">${totalDealVolume.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search sales leads…"
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
            title="Acquisitions & Sales Leads Ledger"
            buildHTML={() => {
              const rows = filtered.map((l, idx) => `
                <tr style="background:${idx % 2 === 0 ? "#fff" : "#f7f7f7"}">
                  <td style="border:1px solid #bbb;padding:6px 8px"><strong>${l.pocName}</strong></td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${l.pocPhone} <br/> ${l.pocEmail}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${l.buildingInterested}</td>
                  <td style="border:1px solid #bbb;padding:6px 8px;font-weight:bold">${l.progress} (${l.dealProgress})</td>
                  <td style="border:1px solid #bbb;padding:6px 8px">
                    L: $${(l.listingPrice || 0).toLocaleString()} <br/>
                    Q: $${(l.quotedPrice || 0).toLocaleString()} <br/>
                    C: $${(l.counterOffer || 0).toLocaleString()}
                  </td>
                  <td style="border:1px solid #bbb;padding:6px 8px">${l.notes}</td>
                </tr>
              `).join("");
              return `
                <table style="width:100%;border-collapse:collapse;font-size:9.5pt;color:#000">
                  <thead>
                    <tr style="background:#f0f0f0">
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">POC</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Contact Details</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Building</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Stage</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Pricing Details</th>
                      <th style="border:1px solid #bbb;padding:6px 8px;text-align:left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              `;
            }}
          />

          <button onClick={() => setShowAddForm(prev => !prev)} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black text-xs font-black hover:opacity-90 transition-opacity flex items-center gap-1">
            <Plus size={12} /> New Deal
          </button>
          <button onClick={fetchLeads} disabled={loading} className="p-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white transition-colors" title="Reload Ledger">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Add Deal Form */}
      {showAddForm && (
        <form onSubmit={handleAddLead} className="mb-6 p-4 rounded-xl border border-[rgba(250,204,21,0.25)] bg-[rgba(250,204,21,0.04)] space-y-3">
          <p className="text-xs font-bold text-white uppercase tracking-wider">➕ Log New Buyer Deal</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="POC Name (e.g. John Doe)*"
              value={formPocName}
              onChange={e => setFormPocName(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              required
            />
            <input
              type="text"
              placeholder="POC Phone"
              value={formPocPhone}
              onChange={e => setFormPocPhone(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            />
            <input
              type="email"
              placeholder="POC Email"
              value={formPocEmail}
              onChange={e => setFormPocEmail(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={formBuilding}
              onChange={e => setFormBuilding(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              required
            >
              <option value="" className="bg-[#0D1117]">Select building interested...*</option>
              {PROPERTIES_LIST.map(p => (
                <option key={p} value={p} className="bg-[#0D1117]">{p}</option>
              ))}
            </select>
            <select
              value={formProgress}
              onChange={e => setFormProgress(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            >
              {PROGRESS_STAGES.map(s => (
                <option key={s.value} value={s.value} className="bg-[#0D1117]">{s.label}</option>
              ))}
            </select>
            <select
              value={formDealProgress}
              onChange={e => setFormDealProgress(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            >
              {["0-25%", "25-50%", "50-75%", "75-100%"].map(tier => (
                <option key={tier} value={tier} className="bg-[#0D1117]">{tier} Probability</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="number"
              placeholder="Listing Price ($)"
              value={formListingPrice}
              onChange={e => setFormListingPrice(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            />
            <input
              type="number"
              placeholder="Quoted Price ($)"
              value={formQuotedPrice}
              onChange={e => setFormQuotedPrice(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            />
            <input
              type="number"
              placeholder="Counter Offer ($)"
              value={formCounterOffer}
              onChange={e => setFormCounterOffer(e.target.value)}
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
          <textarea
            placeholder="Deal notes, requirements, timelines..."
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white outline-none resize-none"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 text-xs font-bold">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 rounded-lg bg-[#FACC15] text-black text-xs font-black disabled:opacity-50">
              {submitting ? "Saving..." : "Log Deal"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="animate-spin text-[#FACC15]" size={24} />
          <p className="text-xs text-gray-600">Loading sales board rows…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto text-gray-700 mb-2" size={24} />
          <p className="text-xs text-gray-500">No sales leads match search query.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full border-collapse text-left text-xs min-w-[950px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.04)] text-gray-500 font-bold uppercase tracking-widest text-[9px]">
                <th className="pb-3 pl-4 w-[160px]">POC Name</th>
                <th className="pb-3 w-[150px]">Phone & Email</th>
                <th className="pb-3 w-[160px]">Building Interested</th>
                <th className="pb-3 w-[185px]">Progress / Stage</th>
                <th className="pb-3 w-[180px]">Deal Progress %</th>
                <th className="pb-3 w-[180px]">Pricing Levels</th>
                <th className="pb-3 w-[100px] text-center">History Log</th>
                <th className="pb-3 w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-gray-300">
              {filtered.flatMap(l => {
                const isSaving = savingId === l.id;
                const activeStage = PROGRESS_STAGES.find(s => s.value === l.progress) || PROGRESS_STAGES[0];
                const noteLines = l.notes ? l.notes.split("\n").filter(Boolean) : [];
                const isExpanded = expandedLogId === l.id;

                return [
                  <tr key={l.id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                    <td className="py-3 pl-4 font-bold text-white relative">
                      <input
                        type="text"
                        value={l.pocName}
                        onChange={e => updateField(l.id, "pocName", e.target.value)}
                        className="bg-transparent border-none p-0 text-xs font-bold text-white outline-none w-full focus:underline"
                      />
                      {isSaving && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[#FACC15]">
                          <Loader2 size={10} className="animate-spin" />
                        </span>
                      )}
                    </td>
                    <td className="py-2 space-y-1">
                      <input
                        type="text"
                        value={l.pocPhone}
                        placeholder="Phone"
                        onChange={e => updateField(l.id, "pocPhone", e.target.value)}
                        className="bg-transparent border-none p-0 text-[10px] text-gray-400 outline-none w-full placeholder:text-gray-700 focus:underline"
                      />
                      <input
                        type="text"
                        value={l.pocEmail}
                        placeholder="Email"
                        onChange={e => updateField(l.id, "pocEmail", e.target.value)}
                        className="bg-transparent border-none p-0 text-[10px] text-gray-400 outline-none w-full placeholder:text-gray-700 focus:underline"
                      />
                    </td>
                    <td className="py-2">
                      <select
                        value={l.buildingInterested}
                        onChange={e => updateField(l.id, "buildingInterested", e.target.value)}
                        className="bg-[rgba(0,0,0,0.15)] border border-[rgba(255,255,255,0.05)] rounded-lg px-2 py-0.5 text-xs text-gray-300 outline-none max-w-[150px]"
                      >
                        {PROPERTIES_LIST.map(p => (
                          <option key={p} value={p} className="bg-[#0D1117]">{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <select
                        value={l.progress}
                        onChange={e => updateField(l.id, "progress", e.target.value)}
                        style={{ color: activeStage.color, backgroundColor: activeStage.bg, borderColor: `${activeStage.color}33` }}
                        className="border rounded-xl px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
                      >
                        {PROGRESS_STAGES.map(s => (
                          <option key={s.value} value={s.value} className="bg-[#0D1117] text-white">{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      {/* Progress button tiers just like in Leads */}
                      <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] max-w-[170px]">
                        {(["0-25%", "25-50%", "50-75%", "75-100%"] as const).map(tier => {
                          const isSelected = (l.dealProgress || "0-25%") === tier;
                          const colors = {
                            "0-25%": { border: "rgba(96,165,250,0.45)", bg: "rgba(96,165,250,0.12)", text: "#60A5FA" },
                            "25-50%": { border: "rgba(167,139,250,0.45)", bg: "rgba(167,139,250,0.12)", text: "#A78BFA" },
                            "50-75%": { border: "rgba(251,146,60,0.45)", bg: "rgba(251,146,60,0.12)", text: "#FB923C" },
                            "75-100%": { border: "rgba(74,222,128,0.45)", bg: "rgba(74,222,128,0.12)", text: "#4ADE80" },
                          };
                          const c = colors[tier];
                          return (
                            <button
                              key={tier}
                              onClick={() => updateField(l.id, "dealProgress", tier)}
                              className={`text-[8px] font-bold py-1 rounded transition-all text-center ${
                                isSelected
                                  ? "shadow-[0_0_8px_rgba(255,255,255,0.03)]"
                                  : "border-transparent bg-transparent text-gray-600 hover:text-gray-400"
                              }`}
                              style={isSelected ? { borderColor: c.border, backgroundColor: c.bg, color: c.text } : {}}
                            >
                              {tier.replace("%", "")}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2 space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-500 w-8 font-black uppercase">List:</span>
                        <input
                          type="number"
                          value={l.listingPrice || ""}
                          placeholder="$"
                          onChange={e => updateField(l.id, "listingPrice", e.target.value)}
                          className="w-full max-w-[90px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-500 w-8 font-black uppercase">Quote:</span>
                        <input
                          type="number"
                          value={l.quotedPrice || ""}
                          placeholder="$"
                          onChange={e => updateField(l.id, "quotedPrice", e.target.value)}
                          className="w-full max-w-[90px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-500 w-8 font-black uppercase">Cntr:</span>
                        <input
                          type="number"
                          value={l.counterOffer || ""}
                          placeholder="$"
                          onChange={e => updateField(l.id, "counterOffer", e.target.value)}
                          className="w-full max-w-[90px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded px-1.5 py-0.5 text-[10px] text-[#4ADE80] outline-none font-bold"
                        />
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      <button onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                          noteLines.length > 0
                            ? "bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.3)] text-[#4ADE80] drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]"
                            : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white"
                        }`}
                      >
                        <MessageSquare size={12} className={noteLines.length > 0 ? "fill-[rgba(74,222,128,0.15)]" : ""} />
                        Log {noteLines.length > 0 ? `(${noteLines.length})` : ""}
                        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </td>
                    <td className="py-2 text-right pr-4">
                      <button onClick={() => handleDelete(l.id)} className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>,

                  // Expanded Activity Notes thread row
                  isExpanded && (
                    <tr key={`${l.id}_log`} className="bg-[rgba(0,0,0,0.15)]">
                      <td colSpan={8} className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                        <div className="space-y-3 max-w-2xl">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles size={11} className="text-[#FACC15]" /> Deal Activity Log
                          </p>

                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {noteLines.length === 0 ? (
                              <p className="text-xs text-gray-600 italic">No notes logged yet. Post an update below.</p>
                            ) : (
                              noteLines.map((line, i) => {
                                const match = line.match(/^\[(.*?)\] (.*)$/);
                                const meta = match?.[1] || "Log Entry";
                                const body = match?.[2] || line;
                                return (
                                  <div key={i} className="bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-2 text-xs">
                                    <p className="text-[10px] text-gray-600 mb-0.5">{meta}</p>
                                    <p className="text-gray-300 font-medium whitespace-pre-wrap">{body}</p>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="border-t border-[rgba(255,255,255,0.04)] pt-3 flex gap-2">
                            <input
                              type="text"
                              value={authorName}
                              onChange={e => setAuthorName(e.target.value)}
                              placeholder="Your Name"
                              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white max-w-[120px] outline-none"
                            />
                            <textarea
                              value={newNote}
                              onChange={e => setNewNote(e.target.value)}
                              placeholder="Add deal update... (e.g. Toured building, LOI submitted at $4.2M)"
                              className="flex-1 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-[rgba(250,204,21,0.3)] resize-none"
                              rows={1}
                            />
                            <button
                              onClick={() => handlePostNote(l.id, l.notes)}
                              disabled={!newNote.trim() || !authorName.trim()}
                              className="px-4 bg-[#FACC15] disabled:bg-gray-800 text-black font-black rounded-xl text-xs hover:opacity-90 transition-opacity"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
