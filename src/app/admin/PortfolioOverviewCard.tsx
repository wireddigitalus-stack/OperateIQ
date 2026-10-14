"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Building2, DollarSign, Users, BarChart3,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";
import type { Tenant } from "./TenantsTab";
import type { PropertyItem, AvailableSpace } from "./PropDetailsTab";

// ── Types ────────────────────────────────────────────────────────────────────

interface PropDetail {
  property_id: string;
  total_units: number;
  taxes_annual: number;
  taxes_county_annual?: number;
  taxes_city_annual?: number;
  insurance_annual: number;
  fire_security_annual?: number;
  gas_annual?: number;
  internet_annual?: number;
  electric_annual?: number;
  water_annual?: number;
  electric_monthly: number;
  water_monthly: number;
  other_monthly: number;
  trend: "up" | "stable" | "down";
  notes: string;
  display_name?: string | null;
}

interface Props {
  properties?: PropertyItem[];
  tenants: Tenant[];
  details: PropDetail[];
  availableSpaces?: AvailableSpace[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Must match the same dropdown names used in PropDetailsTab ─────────────────
const PROPERTY_DROPDOWN_NAMES: Record<string, string[]> = {
  "sample-office": ["Sample Office Building"],
  "sample-retail": ["Sample Retail Center"],
};

function exactBuildingMatch(tenantBuilding: string, propertyId: string, displayName: string, originalName?: string): boolean {
  if (!tenantBuilding) return false;
  const b = tenantBuilding.trim().toLowerCase();
  // Match against display name (custom rename)
  if (displayName && b === displayName.trim().toLowerCase()) return true;
  // Match against original property name (before custom display_name rename)
  if (originalName && b === originalName.trim().toLowerCase()) return true;
  // Match against property ID
  if (propertyId && b === propertyId.trim().toLowerCase()) return true;
  // Match against known dropdown values for this property
  const names = PROPERTY_DROPDOWN_NAMES[propertyId];
  if (names && names.some(n => b === n.toLowerCase())) return true;
  return false;
}

function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtK(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return v ? `$${Math.round(v)}` : "—";
}

const TREND_MAP = {
  up:     { label: "Improving", icon: TrendingUp,   color: "#4ADE80" },
  stable: { label: "Stable",    icon: Minus,        color: "#FACC15" },
  down:   { label: "Declining", icon: TrendingDown, color: "#EF4444" },
};

// ── Full-Width CSS Bar Chart (analytics-page style) ───────────────────────────

interface BarDatum {
  label: string;
  fullLabel: string;
  revenue: number;
  expenses: number;
}

function BarChart({ data }: { data: BarDatum[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.expenses]), 1);

  return (
    <div className="w-full">
      {/* Bars — flex row fills 100% width */}
      <div className="flex items-end gap-2 h-40 mb-3 w-full">
        {data.map((d, i) => {
          const rh = maxVal === 0 ? 0 : Math.max(3, Math.round((d.revenue / maxVal) * 160));
          const eh = maxVal === 0 ? 0 : Math.max(d.expenses > 0 ? 3 : 0, Math.round((d.expenses / maxVal) * 160));
          const profit = d.revenue - d.expenses;
          const isHovered = hoveredIdx === i;

          return (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Hover tooltip */}
              {isHovered && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 w-44 bg-[#0A0F1A] border border-[rgba(255,255,255,0.12)] rounded-xl p-3 shadow-2xl pointer-events-none">
                  <p className="text-sm font-black text-white mb-1.5">{d.fullLabel}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Gross Revenue</span>
                      <span className="text-xs font-bold text-[#4ADE80]">${d.revenue.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Expenses</span>
                      <span className="text-xs font-bold text-[#F97316]">
                        {d.expenses ? `$${Math.round(d.expenses).toLocaleString()}/mo` : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[rgba(255,255,255,0.06)]">
                      <span className="text-xs text-gray-400">Net Profit</span>
                      <span className="text-xs font-black" style={{ color: profit >= 0 ? "#4ADE80" : "#EF4444" }}>
                        {profit >= 0 ? "+" : ""}${Math.round(profit).toLocaleString()}/mo
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bar pair */}
              <div className="flex items-end gap-0.5 w-full justify-center">
                {/* Revenue bar */}
                <div
                  className="flex-1 rounded-t-md transition-all duration-500 relative overflow-hidden"
                  style={{
                    height: `${rh}px`,
                    backgroundColor: "#4ADE80",
                    opacity: isHovered ? 1 : 0.75,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-10" />
                </div>
                {/* Expenses bar */}
                <div
                  className="flex-1 rounded-t-md transition-all duration-500"
                  style={{
                    height: `${eh}px`,
                    backgroundColor: "#F97316",
                    opacity: isHovered ? 0.9 : d.expenses > 0 ? 0.6 : 0.12,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 w-full">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center">
            <span className="text-xs text-gray-300 font-medium leading-tight block truncate px-0.5">
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-sm bg-[#4ADE80]" /> Revenue
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-sm bg-[#F97316]" /> Expenses
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PortfolioOverviewCard({ properties: propProperties, tenants, details, availableSpaces }: Props) {
  const [fetchedProperties, setFetchedProperties] = useState<PropertyItem[]>([]);

  useEffect(() => {
    if (propProperties !== undefined) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/properties-list").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/platform/session", { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([list, sess]) => {
      if (cancelled) return;
      const s = sess as { impersonatingOrg?: { id?: string }; activeOrg?: { id?: string } };
      const orgId = s?.impersonatingOrg?.id || s?.activeOrg?.id || null;
      const isDemo = orgId === "00000000-0000-0000-0000-000000000001";
      const dynList: PropertyItem[] = Array.isArray(list)
        ? list.map((p: any) => ({
            id: String(p.id),
            name: p.name || "Untitled",
            type: p.type || "Commercial",
            city: p.city || "",
            sqft: p.sqft || "TBD",
            isDynamic: true,
          }))
        : [];
      if (isDemo) {
        const staticProps: PropertyItem[] = PROPERTIES.map(p => ({
          id: p.id, name: p.name, type: p.type, city: p.city, address: p.address, sqft: p.sqft,
        }));
        const staticIds = new Set(staticProps.map(p => p.id));
        setFetchedProperties([...staticProps, ...dynList.filter(p => !staticIds.has(p.id))]);
      } else {
        setFetchedProperties(dynList);
      }
    });
    return () => { cancelled = true; };
  }, [propProperties]);

  const properties = propProperties ?? fetchedProperties;

  const detailMap = useMemo(() =>
    Object.fromEntries(details.map(d => [d.property_id, d])), [details]);

  const missedRevenue = useMemo(() => {
    return (availableSpaces || []).reduce((s, space) => {
      const rent = space.monthly_rent || 0;
      const nnn = space.nnn_fee || 0;
      const nn = space.nn_fee || 0;
      const util = space.utility_fee || 0;
      return s + rent + nnn + nn + util;
    }, 0);
  }, [availableSpaces]);

  // Per-property derived data
  const propData = useMemo(() => properties.map(p => {
    const d = detailMap[p.id];
    const displayName = d?.display_name || p.name;
    const pts = tenants.filter(t => exactBuildingMatch(t.building || "", p.id, displayName, p.name));
    const activePts = pts.filter(t => t.status === "active");
    const revenue = activePts.reduce((s, t) =>
      s + (t.monthlyRent || 0) + (t.nnnFee || 0) + (t.nnFee || 0) + (t.camFee || 0) + (t.utilitiesFee || 0) + (t.cleaningFee || 0), 0);
    const taxCounty = d?.taxes_county_annual || 0;
    const taxCity = d?.taxes_city_annual || 0;
    const totalTaxAnnual = (taxCounty === 0 && taxCity === 0) ? (d?.taxes_annual || 0) : (taxCounty + taxCity);
    const taxMo = totalTaxAnnual / 12;
    const insMo = (d?.insurance_annual || 0) / 12;
    const fireMo = (d?.fire_security_annual || 0) / 12;
    const gasMo = (d?.gas_annual || 0) / 12;
    const internetMo = (d?.internet_annual || 0) / 12;
    const electricMo = d?.electric_annual ? (d.electric_annual / 12) : (d?.electric_monthly || 0);
    const waterMo = d?.water_annual ? (d.water_annual / 12) : (d?.water_monthly || 0);
    const otherMo = d?.other_monthly || 0;
    
    const expenses = taxMo + insMo + fireMo + gasMo + internetMo + electricMo + waterMo + otherMo;
    const totalUnits = d?.total_units || activePts.length || 1;
    const occupancy = Math.min(100, Math.round((activePts.length / totalUnits) * 100));
    const expiringTenants = pts.filter(t => {
      const days = daysUntil(t.leaseEnd || t.renewalDate);
      return days !== null && days <= 90;
    });
    const alerts = expiringTenants.length;

    const propMissedRevenue = (availableSpaces || [])
      .filter(space => space.property_id === p.id)
      .reduce((s, space) => {
        const rent = space.monthly_rent || 0;
        const nnn = space.nnn_fee || 0;
        const nn = space.nn_fee || 0;
        const util = space.utility_fee || 0;
        return s + rent + nnn + nn + util;
      }, 0);

    return {
      property: p,
      pts: activePts,
      revenue,
      expenses,
      profit: revenue - expenses,
      occupancy,
      totalUnits,
      occupiedUnits: activePts.length,
      alerts,
      trend: (d?.trend || "stable") as "up" | "stable" | "down",
      missedRevenue: propMissedRevenue,
      expiringTenants,
    };
  }), [properties, tenants, detailMap, availableSpaces]);

  // Portfolio KPIs
  const totalRevenue  = propData.reduce((s, p) => s + p.revenue, 0);
  const totalExpenses = propData.reduce((s, p) => s + p.expenses, 0);
  const netPL         = totalRevenue - totalExpenses;
  const totalTenants  = tenants.length;
  // Actual portfolio-wide occupancy: total occupied units / total units (weighted, not averaged)
  const portfolioUnits    = propData.reduce((s, p) => s + p.totalUnits, 0);
  const portfolioOccupied = propData.reduce((s, p) => s + p.occupiedUnits, 0);
  const occupancy         = portfolioUnits > 0 ? Math.min(100, Math.round((portfolioOccupied / portfolioUnits) * 100)) : 0;
  const totalAlerts   = propData.reduce((s, p) => s + p.alerts, 0);

  const kpis = [
    { label: "Total Portfolio Revenue",  value: `$${totalRevenue.toLocaleString()}/mo`,  color: "#4ADE80", icon: DollarSign  },
    { label: "Total Expenses",     value: totalExpenses ? `$${Math.round(totalExpenses).toLocaleString()}/mo` : "Not set", color: "#F97316", icon: BarChart3   },
    { label: "Net Profit",            value: totalExpenses ? `${netPL >= 0 ? "+" : ""}$${Math.round(netPL).toLocaleString()}/mo` : "—", color: netPL >= 0 ? "#4ADE80" : "#EF4444", icon: TrendingUp  },
    { label: "Missed Revenue",     value: missedRevenue > 0 ? `$${missedRevenue.toLocaleString()}/mo` : "$0/mo", color: missedRevenue > 0 ? "#EF4444" : "#6B7280", icon: TrendingDown },
    { label: "Occupancy",          value: `${occupancy}%`,                           color: occupancy >= 80 ? "#4ADE80" : occupancy >= 50 ? "#FACC15" : "#EF4444", icon: Building2  },
    { label: "Active Tenants",     value: totalTenants,                             color: "#60A5FA", icon: Users       },
  ];

  const chartData: BarDatum[] = propData.map(p => ({
    label: p.property.name.length > 10 ? p.property.name.split(" ").slice(0, 2).join(" ") : p.property.name,
    fullLabel: p.property.name,
    revenue: p.revenue,
    expenses: p.expenses,
  }));

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <BarChart3 size={17} className="text-[#A78BFA]" /> Executive Overview
          </h2>
          <p className="text-xs text-gray-400 mt-1">Portfolio-wide snapshot · live data</p>
        </div>
        {totalAlerts > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-950/30 border border-yellow-900/40 px-3 py-1.5 rounded-full">
            <AlertTriangle size={11} /> {totalAlerts} lease alert{totalAlerts > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-[rgba(255,255,255,0.04)]">
        {kpis.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center justify-center py-5 px-3 bg-[#080C14] text-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-lg font-black text-white leading-none">{value}</p>
            <p className="text-xs text-gray-400 font-semibold mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="px-6 pt-5 pb-4 border-t border-[rgba(255,255,255,0.04)]">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Revenue vs Expenses by Property</p>
        <BarChart data={chartData} />
      </div>

      {/* Property Health Strip */}
      <div className="border-t border-[rgba(255,255,255,0.04)] px-6 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Property Health</p>
        <div className="space-y-2.5">
          {propData.map(({ property, occupancy, revenue, profit, trend, alerts, expenses, missedRevenue: propMissed, expiringTenants }) => {
            const trendCfg = TREND_MAP[trend];
            const TrendIcon = trendCfg.icon;
            const occColor = occupancy >= 80 ? "#4ADE80" : occupancy >= 40 ? "#FACC15" : "#EF4444";

            return (
              <div key={property.id} className="flex items-center gap-3">
                {/* Name + trend */}
                <div className="w-44 flex-shrink-0 flex items-center gap-1.5 min-w-0">
                  <TrendIcon size={12} style={{ color: trendCfg.color, flexShrink: 0 }} />
                  <span className="text-sm font-semibold text-white truncate">{property.name}</span>
                </div>

                {/* Occupancy bar */}
                <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${occupancy}%`, background: occColor }} />
                </div>

                {/* Occ % */}
                <span className="w-10 text-right text-xs font-bold flex-shrink-0" style={{ color: occColor }}>
                  {occupancy}%
                </span>

                {/* P&L chip */}
                <div className="w-28 text-right flex-shrink-0">
                  <p className="text-xs font-bold leading-none"
                    style={{ color: (revenue === 0 && expenses === 0) ? "#94A3B8" : profit >= 0 ? "#4ADE80" : "#EF4444" }}>
                    {(revenue === 0 && expenses === 0) ? "No data" : `${profit >= 0 ? "+" : ""}${fmtK(profit)}/mo`}
                  </p>
                  {propMissed > 0 && (
                    <p className="text-xs font-semibold text-red-400 mt-1">
                      -${propMissed.toLocaleString()} vacant
                    </p>
                  )}
                </div>

                {/* Alert badge */}
                {alerts > 0 ? (
                  <span className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-yellow-400 cursor-help"
                    title={`Expiring Lease(s):\n${expiringTenants.map(t => `• ${t.name} (ends ${t.leaseEnd || t.renewalDate || "TBD"})`).join("\n")}`}>
                    <AlertTriangle size={11} />{alerts}
                  </span>
                ) : (
                  <span className="w-5 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
