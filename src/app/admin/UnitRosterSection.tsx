"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  Users,
  Home,
  DollarSign,
  CheckCircle2,
  X,
} from "lucide-react";
import { showToast } from "@/lib/api-client";

export interface UnitRosterProperty {
  id: string;
  name: string;
  displayName?: string;
}

export interface UnitRosterTenant {
  id: string;
  name: string;
  building?: string;
  unit?: string;
  monthly_rent?: number;
  status?: string;
}

export interface PropertyUnitItem {
  id: string;
  propertyId: string;
  building: string;
  unitNumber: string;
  beds: number;
  baths: number;
  sqft: number;
  marketRent: number;
  status: "occupied" | "vacant" | "turnover" | "notice";
  notes: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<PropertyUnitItem["status"], { label: string; cls: string }> = {
  occupied: {
    label: "Occupied",
    cls: "bg-emerald-500/15 border-emerald-500/35 text-emerald-300",
  },
  vacant: {
    label: "Vacant",
    cls: "bg-rose-500/15 border-rose-500/35 text-rose-300",
  },
  turnover: {
    label: "Turnover / Make-Ready",
    cls: "bg-amber-500/15 border-amber-500/35 text-amber-300",
  },
  notice: {
    label: "Notice Given",
    cls: "bg-sky-500/15 border-sky-500/35 text-sky-300",
  },
};

export default function UnitRosterSection({
  properties,
  tenants,
  selectedPropertyName,
  selectedPropertyDisplayName,
}: {
  properties: UnitRosterProperty[];
  tenants: UnitRosterTenant[];
  selectedPropertyName?: string | null;
  selectedPropertyDisplayName?: string | null;
}) {
  const [units, setUnits] = useState<PropertyUnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);

  const [form, setForm] = useState({
    building: "",
    unitNumber: "",
    beds: "",
    baths: "",
    sqft: "",
    marketRent: "",
    status: "vacant" as PropertyUnitItem["status"],
    notes: "",
  });

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/property-units");
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.units)) {
        setUnits(data.units);
      }
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const handleSyncFromTenants = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/property-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_from_tenants" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not sync units.");
      if (Array.isArray(data.units)) setUnits(data.units);
      showToast(
        data.addedCount > 0
          ? `Added ${data.addedCount} unit${data.addedCount === 1 ? "" : "s"} from active tenant leases.`
          : "All tenant units are already in your unit roster.",
        data.addedCount > 0 ? "success" : "info"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to sync units.", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.building.trim() || !form.unitNumber.trim()) {
      showToast("Select a property/building and enter a Unit / Suite #.", "warning");
      return;
    }
    setSavingAdd(true);
    try {
      const matchedProp = properties.find((p) => p.name.toLowerCase() === form.building.trim().toLowerCase());
      const res = await fetch("/api/property-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: matchedProp?.id || "",
          building: form.building.trim(),
          unitNumber: form.unitNumber.trim(),
          beds: Number(form.beds) || 0,
          baths: Number(form.baths) || 0,
          sqft: Number(form.sqft) || 0,
          marketRent: Number(form.marketRent) || 0,
          status: form.status,
          notes: form.notes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add unit.");
      if (data.unit) {
        setUnits((prev) =>
          [...prev, data.unit as PropertyUnitItem].sort((a, b) =>
            `${a.building} ${a.unitNumber}`.localeCompare(`${b.building} ${b.unitNumber}`, undefined, { numeric: true })
          )
        );
      }
      setShowAdd(false);
      setForm({
        building: properties[0]?.name || "",
        unitNumber: "",
        beds: "",
        baths: "",
        sqft: "",
        marketRent: "",
        status: "vacant",
        notes: "",
      });
      showToast("Unit added to property roster.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add unit.", "error");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleUpdateStatus = async (unit: PropertyUnitItem, nextStatus: PropertyUnitItem["status"]) => {
    const prevUnits = units;
    setUnits((curr) => curr.map((u) => (u.id === unit.id ? { ...u, status: nextStatus } : u)));
    try {
      const res = await fetch(`/api/property-units?id=${encodeURIComponent(unit.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update unit status.");
    } catch (err) {
      setUnits(prevUnits);
      showToast(err instanceof Error ? err.message : "Could not update unit.", "error");
    }
  };

  const handleUpdateMarketRent = async (unit: PropertyUnitItem, marketRent: number) => {
    const prevUnits = units;
    setUnits((curr) => curr.map((u) => (u.id === unit.id ? { ...u, marketRent } : u)));
    try {
      const res = await fetch(`/api/property-units?id=${encodeURIComponent(unit.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketRent }),
      });
      if (!res.ok) throw new Error("Failed to save market rent.");
    } catch {
      setUnits(prevUnits);
      showToast("Could not save market rent.", "error");
    }
  };

  const handleDeleteUnit = async (unit: PropertyUnitItem) => {
    if (!confirm(`Remove ${unit.building} · Unit ${unit.unitNumber} from unit roster?`)) return;
    const prevUnits = units;
    setUnits((curr) => curr.filter((u) => u.id !== unit.id));
    try {
      const res = await fetch(`/api/property-units?id=${encodeURIComponent(unit.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete unit.");
      showToast("Unit removed from roster.", "info");
    } catch {
      setUnits(prevUnits);
      showToast("Could not delete unit.", "error");
    }
  };

  // Match active tenants to units by (building, unitNumber), honoring custom property displayName renames
  const enrichedUnits = useMemo(() => {
    const activeTenants = tenants.filter((t) => (t.status || "active") === "active");
    const propByLower = new Map<string, UnitRosterProperty>();
    for (const p of properties) {
      propByLower.set(p.name.trim().toLowerCase(), p);
      if (p.displayName) propByLower.set(p.displayName.trim().toLowerCase(), p);
    }
    const sameBuilding = (a: string, b: string) => {
      const al = a.trim().toLowerCase();
      const bl = b.trim().toLowerCase();
      if (!al || !bl) return false;
      if (al === bl) return true;
      const pa = propByLower.get(al);
      const pb = propByLower.get(bl);
      return Boolean(pa && pb && pa.id === pb.id);
    };

    const filterTarget = selectedPropertyName || selectedPropertyDisplayName;
    const filtered = filterTarget
      ? units.filter((u) => sameBuilding(u.building, filterTarget))
      : units;

    return filtered.map((u) => {
      const matchedTenant = activeTenants.find((t) => {
        const tb = (t.building || "").trim();
        const tu = (t.unit || "").trim().toLowerCase() || "main";
        return sameBuilding(tb, u.building) && tu === u.unitNumber.trim().toLowerCase();
      });
      const matchedProp = propByLower.get(u.building.trim().toLowerCase());
      const effectiveStatus: PropertyUnitItem["status"] = matchedTenant ? "occupied" : u.status;
      return {
        ...u,
        displayBuilding: matchedProp?.displayName || u.building,
        matchedTenant,
        effectiveStatus,
        actualRent: matchedTenant ? Number(matchedTenant.monthly_rent) || 0 : 0,
      };
    });
  }, [units, tenants, properties, selectedPropertyName, selectedPropertyDisplayName]);

  const kpis = useMemo(() => {
    const total = enrichedUnits.length;
    const occupied = enrichedUnits.filter((u) => u.effectiveStatus === "occupied").length;
    const vacant = total - occupied;
    const marketRoll = enrichedUnits.reduce((s, u) => s + (u.marketRent || u.actualRent || 0), 0);
    const actualRoll = enrichedUnits.reduce((s, u) => s + (u.actualRent || 0), 0);
    return { total, occupied, vacant, marketRoll, actualRoll };
  }, [enrichedUnits]);

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-[rgba(255,255,255,0.05)]">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Home size={16} className="text-emerald-400" />
            <span>Unit Roster &amp; Rent Roll Inventory</span>
            {(selectedPropertyDisplayName || selectedPropertyName) && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold">
                {selectedPropertyDisplayName || selectedPropertyName}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-gray-500 mt-1">
            Track every apartment, suite, or bay with beds, baths, square footage, market rent, and live tenant occupancy.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSyncFromTenants}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-300 px-3 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            <span>Sync Units from Tenants</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                building: selectedPropertyName || properties[0]?.name || prev.building,
              }));
              setShowAdd(true);
            }}
            className="flex items-center gap-1.5 text-xs font-black text-black px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Bar */}
      {kpis.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[rgba(255,255,255,0.04)] border-b border-[rgba(255,255,255,0.05)]">
          {[
            { icon: Building2, label: "Total Units", value: String(kpis.total), color: "#A78BFA" },
            {
              icon: Users,
              label: "Occupied",
              value: `${kpis.occupied} (${Math.round((kpis.occupied / kpis.total) * 100)}%)`,
              color: "#10B981",
            },
            { icon: Home, label: "Vacant / Turnover", value: String(kpis.vacant), color: kpis.vacant > 0 ? "#F59E0B" : "#10B981" },
            {
              icon: DollarSign,
              label: "Actual vs Market Roll",
              value: `$${kpis.actualRoll.toLocaleString()} / $${kpis.marketRoll.toLocaleString()}`,
              color: "#60A5FA",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5 bg-[#0B111E]">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-xs sm:text-sm font-black text-white truncate tabular-nums">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-500 text-xs">
          <Loader2 size={16} className="animate-spin text-emerald-400 mr-2" />
          Loading unit roster…
        </div>
      ) : enrichedUnits.length === 0 ? (
        <div className="text-center py-10 px-4 space-y-2">
          <CheckCircle2 size={24} className="mx-auto text-emerald-400/40" />
          <p className="text-sm font-bold text-gray-300">No units in your roster yet</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Click <strong>Sync Units from Tenants</strong> to auto-create unit records from your active leases, or click{" "}
            <strong>Add Unit</strong> to register occupied and vacant units with beds, baths, sq ft, and market rent.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {/* Desktop Column Header — Zero Horizontal Scroll */}
          <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-3 border-b border-white/[0.06] bg-black/25 text-[10px] uppercase tracking-wider text-gray-400 font-black">
            <div className="col-span-3">Building · Unit</div>
            <div className="col-span-2">Specs</div>
            <div className="col-span-2">Current Tenant</div>
            <div className="col-span-2">Lease / Market Rent</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {enrichedUnits.map((u) => {
            const badge = STATUS_BADGE[u.effectiveStatus];
            return (
              <div
                key={u.id}
                className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 md:gap-3 items-center text-xs hover:bg-white/[0.02] transition-colors"
              >
                <div className="md:col-span-3 min-w-0">
                  <p className="font-black text-white truncate">{u.unitNumber}</p>
                  <p className="text-[10px] text-gray-500 truncate">{u.displayBuilding}</p>
                </div>

                <div className="md:col-span-2 text-gray-300 text-[11px]">
                  {u.beds || u.baths || u.sqft ? (
                    <span>
                      {u.beds ? `${u.beds} bd` : "—"} · {u.baths ? `${u.baths} ba` : "—"}
                      {u.sqft ? ` · ${u.sqft.toLocaleString()} sf` : ""}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>

                <div className="md:col-span-2 min-w-0">
                  {u.matchedTenant ? (
                    <span className="font-bold text-emerald-300 truncate block">
                      {u.matchedTenant.name}
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">Unassigned / Vacant</span>
                  )}
                </div>

                <div className="md:col-span-2 flex items-center gap-2 flex-wrap">
                  <span className="tabular-nums font-bold text-white">
                    {u.actualRent > 0 ? `$${u.actualRent.toLocaleString()}/mo` : <span className="text-gray-600">—</span>}
                  </span>
                  <div className="relative w-24" title="Market / Asking Rent">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">$</span>
                    <input
                      key={`${u.id}_${u.marketRent}`}
                      type="number"
                      defaultValue={u.marketRent || ""}
                      onBlur={(e) => {
                        const next = Math.max(0, Number(e.target.value) || 0);
                        if (next !== u.marketRent) handleUpdateMarketRent(u, next);
                      }}
                      placeholder="Mkt"
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-5 pr-1.5 py-1 text-xs text-white tabular-nums outline-none focus:border-emerald-400/50"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  {u.matchedTenant ? (
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                      {badge.label}
                    </span>
                  ) : (
                    <select
                      value={u.status}
                      onChange={(e) => handleUpdateStatus(u, e.target.value as PropertyUnitItem["status"])}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border outline-none cursor-pointer ${badge.cls} bg-transparent`}
                    >
                      <option value="vacant" className="bg-[#0A0F1A] text-white">Vacant</option>
                      <option value="turnover" className="bg-[#0A0F1A] text-white">Turnover / Make-Ready</option>
                      <option value="notice" className="bg-[#0A0F1A] text-white">Notice Given</option>
                      <option value="occupied" className="bg-[#0A0F1A] text-white">Occupied</option>
                    </select>
                  )}
                </div>

                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteUnit(u)}
                    title="Remove unit"
                    className="p-1.5 rounded-lg border border-white/[0.06] text-gray-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Unit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#04060A]/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateUnit}
            className="w-full max-w-lg glass rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Add Unit to Roster</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Register an apartment, suite, single-family home, or bay</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Property / Building *
                  </label>
                  {properties.length > 0 ? (
                    <select
                      value={form.building}
                      onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                      required
                    >
                      <option value="" className="bg-[#0A0F1A]">Select property…</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.name} className="bg-[#0A0F1A]">
                          {p.displayName || p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.building}
                      onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
                      placeholder="e.g. 120 Maple Ave"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                      required
                    />
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Unit / Suite # *
                  </label>
                  <input
                    value={form.unitNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, unitNumber: e.target.value }))}
                    placeholder="e.g. 2B, Suite 100, Main"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Beds</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={form.beds}
                    onChange={(e) => setForm((prev) => ({ ...prev, beds: e.target.value }))}
                    placeholder="2"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Baths</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={form.baths}
                    onChange={(e) => setForm((prev) => ({ ...prev, baths: e.target.value }))}
                    placeholder="1.5"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Sq Ft</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sqft}
                    onChange={(e) => setForm((prev) => ({ ...prev, sqft: e.target.value }))}
                    placeholder="950"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Market Rent ($/mo)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.marketRent}
                    onChange={(e) => setForm((prev) => ({ ...prev, marketRent: e.target.value }))}
                    placeholder="1450"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Initial Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PropertyUnitItem["status"] }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="vacant" className="bg-[#0A0F1A]">Vacant</option>
                    <option value="occupied" className="bg-[#0A0F1A]">Occupied</option>
                    <option value="turnover" className="bg-[#0A0F1A]">Turnover / Make-Ready</option>
                    <option value="notice" className="bg-[#0A0F1A]">Notice Given</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional floor, meter #, parking spot, renovation note…"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
              </div>
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
                disabled={savingAdd}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black disabled:opacity-50 cursor-pointer"
              >
                {savingAdd && <Loader2 size={13} className="animate-spin" />}
                <span>Save Unit</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
