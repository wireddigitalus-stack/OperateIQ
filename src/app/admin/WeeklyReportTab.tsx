"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Users, Calendar, ShieldAlert, Sparkles, Loader2,
  Building2, CheckCircle2, ArrowRight, Printer, FileSpreadsheet, RefreshCw, Wrench, MessageSquare, Clock,
} from "lucide-react";
import PrintButton from "./PrintButton";

interface TeamActivity {
  name: string;
  notesLogged: number;
  callsScheduled: number;
  otherActions: number;
  ticketsOpened: number;
  ticketsCompleted: number;
}

interface WeeklyStats {
  newLeadsCount: number;
  newTenantsCount: number;
  convertedCount: number;
  directCount: number;
  vacantPropertiesCount: number;
  totalAcquisitionsCount: number;
  propertiesList: string[];
  propertyInterest: Record<string, { buyers: number; value: number; tenants: string[] }>;
  teamActivities: TeamActivity[];
}

export default function WeeklyReportTab() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [daysLookback, setDaysLookback] = useState(7); // default 1 week
  const [loading, setLoading] = useState(true);

  const fetchWeeklyTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch data from endpoints
      const [leadsRes, tenantsRes, salesRes, activityRes, ticketsRes, propsRes, usersRes] = await Promise.all([
        fetch("/api/lease-bot"),
        fetch("/api/tenants"),
        fetch("/api/sales-leads"),
        fetch("/api/activity-log?limit=1000"), // fetch large set of logs for analysis
        fetch("/api/maintenance"),
        fetch("/api/properties-list").catch(() => null),
        fetch("/api/allowed-users").catch(() => null),
      ]);

      const leadsData = await leadsRes.json();
      const tenantsData = await tenantsRes.json();
      const salesData = await salesRes.json();
      const activityData = await activityRes.json();
      const ticketsData = await ticketsRes.json();
      const propsListRaw = propsRes?.ok ? await propsRes.json().catch(() => []) : [];
      const usersData = usersRes?.ok ? await usersRes.json().catch(() => ({})) : {};

      const rawLeads = Array.isArray(leadsData.leads) ? leadsData.leads : [];
      const rawTenants = Array.isArray(tenantsData.tenants) ? tenantsData.tenants : [];
      const rawSales = Array.isArray(salesData.leads) ? salesData.leads : [];
      const rawLogs = Array.isArray(activityData.logs) ? activityData.logs : [];
      const rawTickets = Array.isArray(ticketsData.tickets) ? ticketsData.tickets : [];

      const orgPropertyNames: string[] = Array.isArray(propsListRaw)
        ? propsListRaw.map((p: { name?: string }) => p.name || "").filter(Boolean)
        : [];
      const propertiesList = Array.from(new Set([
        ...orgPropertyNames,
        ...rawTenants.map((t: any) => t.building || "").filter(Boolean),
        ...rawSales.map((s: any) => s.building_interested || "").filter(Boolean),
      ]));

      const rawUsers: { name?: string; email?: string }[] = Array.isArray(usersData.users) ? usersData.users : [];
      const teamMembers = Array.from(new Set(
        rawUsers.map(u => (u.name || u.email?.split("@")[0] || "").trim()).filter(Boolean)
      ));

      // Calculate time boundary
      const boundaryDate = new Date();
      boundaryDate.setDate(boundaryDate.getDate() - daysLookback);

      // Filter leasing leads
      const newLeads = rawLeads.filter((l: any) => {
        const d = new Date(l.created_at || l.timestamp);
        return d >= boundaryDate;
      });

      // Filter new tenants
      const newTenants = rawTenants.filter((t: any) => {
        const d = new Date(t.created_at);
        return d >= boundaryDate;
      });

      const convertedCount = newTenants.filter((t: any) => t.source_lead_id).length;
      const directCount = newTenants.length - convertedCount;

      // Group active tenants by property
      const propertyTenants: Record<string, string[]> = {};
      propertiesList.forEach(p => {
        propertyTenants[p] = [];
      });

      rawTenants.forEach((t: any) => {
        const prop = t.building;
        if (propertiesList.includes(prop) && t.status === "active") {
          propertyTenants[prop].push(t.name);
        }
      });

      // Group sales leads by property
      const propertySales: Record<string, { count: number; value: number }> = {};
      propertiesList.forEach(p => {
        propertySales[p] = { count: 0, value: 0 };
      });

      const activeSales = rawSales.filter((s: any) => s.progress !== "Lost" && s.progress !== "Sold");

      activeSales.forEach((s: any) => {
        const prop = s.building_interested;
        if (propertiesList.includes(prop)) {
          propertySales[prop].count += 1;
          // Valuation priority: counter offer -> quoted -> listing
          propertySales[prop].value += Number(s.counter_offer || s.quoted_price || s.listing_price || s.offer_price || 0);
        }
      });

      // Count unoccupied properties (properties with 0 active tenants)
      let vacantCount = 0;
      const interestMap: Record<string, { buyers: number; value: number; tenants: string[] }> = {};

      propertiesList.forEach(p => {
        const tenants = propertyTenants[p] || [];
        const buyers = propertySales[p]?.count || 0;
        const val = propertySales[p]?.value || 0;

        if (tenants.length === 0) {
          vacantCount += 1;
        }

        interestMap[p] = {
          buyers,
          value: val,
          tenants,
        };
      });

      // ─── Team Audit Log Analytics ───
      const filteredLogs = rawLogs.filter((log: any) => {
        const d = new Date(log.created_at);
        return d >= boundaryDate;
      });

      const filteredTickets = rawTickets.filter((t: any) => {
        const d = new Date(t.created_at);
        return d >= boundaryDate;
      });

      const completedTicketsThisWeek = rawTickets.filter((t: any) => {
        if (t.status !== "complete") return false;
        const d = new Date(t.completed_date || t.completed_at || t.created_at);
        return d >= boundaryDate;
      });

      const teamActivities: TeamActivity[] = teamMembers.map(name => {
        const lowerName = name.toLowerCase();

        // 1. Logs created by this actor
        const actorLogs = filteredLogs.filter((log: any) => {
          const actor = (log.actor_name || "").toLowerCase();
          return actor && (actor.includes(lowerName) || lowerName.includes(actor));
        });

        // 2. Count specific actions
        // Notes entered under leads or general comments
        const notesLogged = actorLogs.filter((log: any) => {
          const resType = (log.resource_type || "").toLowerCase();
          const action = (log.action || "").toLowerCase();
          const metaStr = JSON.stringify(log.metadata || {}).toLowerCase();
          return (
            (resType === "lead" && action === "updated" && metaStr.includes("note")) ||
            metaStr.includes("comment") ||
            metaStr.includes("notes")
          );
        }).length;

        // Calls rescheduled
        const callsScheduled = actorLogs.filter((log: any) => {
          const metaStr = JSON.stringify(log.metadata || {}).toLowerCase();
          return metaStr.includes("call") || metaStr.includes("reschedule") || metaStr.includes("scheduled");
        }).length;

        // Total other general actions logged
        const otherActions = Math.max(0, actorLogs.length - (notesLogged + callsScheduled));

        // 3. Maintenance ticket counts
        const ticketsOpened = filteredTickets.filter((t: any) => {
          const reporter = (t.reported_by || "").toLowerCase();
          return reporter && (reporter.includes(lowerName) || lowerName.includes(reporter));
        }).length;

        const ticketsCompleted = completedTicketsThisWeek.filter((t: any) => {
          const worker = (t.assigned_to || "").toLowerCase();
          return worker && (worker.includes(lowerName) || lowerName.includes(worker));
        }).length;

        return {
          name,
          notesLogged,
          callsScheduled,
          otherActions,
          ticketsOpened,
          ticketsCompleted,
        };
      });

      setStats({
        newLeadsCount: newLeads.length,
        newTenantsCount: newTenants.length,
        convertedCount,
        directCount,
        vacantPropertiesCount: vacantCount,
        totalAcquisitionsCount: activeSales.length,
        propertiesList,
        propertyInterest: interestMap,
        teamActivities,
      });
    } catch (err) {
      console.error("Telemetry compilation failed:", err);
    } finally {
      setLoading(false);
    }
  }, [daysLookback]);

  useEffect(() => {
    fetchWeeklyTelemetry();
  }, [fetchWeeklyTelemetry]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Tab Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-4 no-print">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="text-[#FACC15]" size={16} /> Weekly Performance & Deals Board
          </h3>
          <p className="text-[10px] text-gray-500">End-of-week snapshot: Tenant onboarding, unoccupied list, and acquisition interest</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setDaysLookback(7)}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${daysLookback === 7 ? "bg-[#FACC15] text-black" : "text-gray-400 hover:text-white"}`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setDaysLookback(14)}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${daysLookback === 14 ? "bg-[#FACC15] text-black" : "text-gray-400 hover:text-white"}`}
            >
              2 Weeks
            </button>
            <button
              type="button"
              onClick={() => setDaysLookback(30)}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${daysLookback === 30 ? "bg-[#FACC15] text-black" : "text-gray-400 hover:text-white"}`}
            >
              This Month
            </button>
          </div>

          <button onClick={handlePrint} className="p-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white transition-colors" title="Print/PDF Report">
            <Printer size={14} />
          </button>
          <button onClick={fetchWeeklyTelemetry} disabled={loading} className="p-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white transition-colors" title="Reload Statistics">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="animate-spin text-[#FACC15]" size={32} />
          <p className="text-xs text-gray-600">Compiling weekly deal stats…</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">New Leasing Leads</span>
              <span className="text-2xl font-black text-[#FACC15]">{stats.newLeadsCount}</span>
              <span className="text-[10px] text-gray-600 block mt-1">Received in last {daysLookback} days</span>
            </div>

            <div className="bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">New Tenants Entered</span>
              <span className="text-2xl font-black text-[#60A5FA]">{stats.newTenantsCount}</span>
              <span className="text-[10px] text-gray-600 block mt-1">
                📈 {stats.convertedCount} from leads · ✏️ {stats.directCount} direct
              </span>
            </div>

            <div className="bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Vacant Properties</span>
              <span className="text-2xl font-black text-[#EF4444]">{stats.vacantPropertiesCount}</span>
              <span className="text-[10px] text-gray-600 block mt-1">Properties with no active lease</span>
            </div>

            <div className="bg-[rgba(255,255,255,0.015)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Buyer Acquisition Deals</span>
              <span className="text-2xl font-black text-[#4ADE80]">{stats.totalAcquisitionsCount}</span>
              <span className="text-[10px] text-gray-600 block mt-1">Active buyer prospects in pipeline</span>
            </div>
          </div>

          {/* User Scorecard Breakdown */}
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={13} className="text-[#FACC15]" /> Weekly Team Performance & Action Scorecard
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)] text-gray-500 font-bold uppercase tracking-widest text-[9px] pb-2">
                    <th className="pb-2 pl-2">Team Member</th>
                    <th className="pb-2 w-[140px] text-center">💬 Lead Notes Logged</th>
                    <th className="pb-2 w-[140px] text-center">📞 Calls Rescheduled</th>
                    <th className="pb-2 w-[140px] text-center">🛠️ Maint Tickets Opened</th>
                    <th className="pb-2 w-[140px] text-center">✅ Tickets Completed</th>
                    <th className="pb-2 w-[120px] text-right pr-2">Other Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-gray-300">
                  {stats.teamActivities.map(user => (
                    <tr key={user.name} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                      <td className="py-3 pl-2 font-bold text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#FACC15] to-[#F97316]" />
                        {user.name}
                      </td>
                      <td className="py-3 text-center font-bold font-mono">
                        {user.notesLogged > 0 ? (
                          <span className="text-[#4ADE80] font-black">{user.notesLogged}</span>
                        ) : (
                          <span className="text-gray-600">0</span>
                        )}
                      </td>
                      <td className="py-3 text-center font-bold font-mono">
                        {user.callsScheduled > 0 ? (
                          <span className="text-[#60A5FA] font-black">{user.callsScheduled}</span>
                        ) : (
                          <span className="text-gray-600">0</span>
                        )}
                      </td>
                      <td className="py-3 text-center font-bold font-mono">
                        {user.ticketsOpened > 0 ? (
                          <span className="text-[#F97316] font-black">{user.ticketsOpened}</span>
                        ) : (
                          <span className="text-gray-600">0</span>
                        )}
                      </td>
                      <td className="py-3 text-center font-bold font-mono">
                        {user.ticketsCompleted > 0 ? (
                          <span className="text-[#4ADE80] bg-[rgba(74,222,128,0.1)] px-2 py-0.5 rounded-lg border border-[rgba(74,222,128,0.25)]">
                            {user.ticketsCompleted} completed
                          </span>
                        ) : (
                          <span className="text-gray-600">0</span>
                        )}
                      </td>
                      <td className="py-3 text-right pr-2 font-mono text-gray-500">
                        {user.otherActions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Property Breakdown Grid */}
          <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Building2 size={13} className="text-[#60A5FA]" /> Property Occupancy & Buyer Interest Status
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)] text-gray-500 font-bold uppercase tracking-widest text-[9px] pb-2">
                    <th className="pb-2">Property Name</th>
                    <th className="pb-2 w-[160px]">Occupancy State</th>
                    <th className="pb-2 w-[220px]">Active Tenants</th>
                    <th className="pb-2 w-[140px] text-center">Interested Buyers</th>
                    <th className="pb-2 w-[140px] text-right">Acquisition Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-gray-300">
                  {stats.propertiesList.map(p => {
                    const info = stats.propertyInterest[p];
                    const isOccupied = info.tenants.length > 0;
                    return (
                      <tr key={p} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                        <td className="py-2.5 font-bold text-white">{p}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isOccupied ? "bg-[rgba(74,222,128,0.1)] text-[#4ADE80]" : "bg-[rgba(239,68,68,0.1)] text-[#EF4444]"}`}>
                            {isOccupied ? "🟢 Lease Active" : "🔴 Vacant / Unoccupied"}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-400 max-w-[200px] truncate">
                          {isOccupied ? info.tenants.join(", ") : "—"}
                        </td>
                        <td className="py-2.5 text-center font-bold text-white">
                          {info.buyers > 0 ? (
                            <span className="bg-[rgba(250,204,21,0.15)] text-[#FACC15] px-2 py-0.5 rounded-lg border border-[rgba(250,204,21,0.3)]">
                              👤 {info.buyers} buyer{info.buyers !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-[#4ADE80]">
                          {info.value > 0 ? `$${info.value.toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">Failed to aggregate telemetry data.</div>
      )}
    </div>
  );
}
