"use client";
import React, { useState, useId } from "react";
import {
  ChevronDown, Globe, UserCog, Wrench, Sparkles,
  Database, LayoutDashboard, ArrowRight, Cpu,
} from "lucide-react";

// ── Domain definitions ────────────────────────────────────────────────────────

interface Domain {
  id: string;
  label: string;
  color: string;
  emoji: string;
}

const DOMAINS: Domain[] = [
  { id: "leads",      label: "Leads Pipeline",  color: "#4ADE80", emoji: "🟢" },
  { id: "tenants",    label: "Tenant Mgmt",     color: "#60A5FA", emoji: "🔵" },
  { id: "properties", label: "Properties",       color: "#A78BFA", emoji: "🟣" },
  { id: "finance",    label: "Finance",          color: "#F97316", emoji: "🟠" },
  { id: "operations", label: "Operations",       color: "#22D3EE", emoji: "🩵" },
  { id: "analytics",  label: "Analytics",        color: "#F472B6", emoji: "🩷" },
  { id: "content",    label: "Content",          color: "#FACC15", emoji: "🟡" },
];

// ── Node definitions ──────────────────────────────────────────────────────────

type NodeType = "source" | "api" | "db" | "tab";

interface FlowNode {
  id: string;
  label: string;
  type: NodeType;
  domain: string;       // primary domain
  x: number;
  y: number;
  sub?: string;          // subtitle
}

// viewBox = 1400 x 1140
const NODES: FlowNode[] = [
  // ─── Sources (Column 1 ~x=60) ──────────────────────────────────────────
  { id: "src-web",    label: "Website Visitor",   type: "source", domain: "leads",      x: 60,   y: 100,  sub: "Contact forms, lease-bot" },
  { id: "src-admin",  label: "Admin User",        type: "source", domain: "tenants",    x: 60,   y: 280,  sub: "Dashboard actions" },
  { id: "src-staff",  label: "Staff Member",      type: "source", domain: "operations", x: 60,   y: 460,  sub: "Maintenance & cleaning" },
  { id: "src-ai",     label: "Gemini AI",         type: "source", domain: "content",    x: 60,   y: 640,  sub: "Scoring, briefs, content" },

  // ─── API Layer (Column 2 ~x=370) ───────────────────────────────────────
  { id: "api-leasebot",   label: "/api/lease-bot",       type: "api", domain: "leads",      x: 370, y: 60,   sub: "Lead ingestion + AI scoring" },
  { id: "api-contact",    label: "/api/contact",          type: "api", domain: "leads",      x: 370, y: 150,  sub: "Contact form submissions" },
  { id: "api-tenants",    label: "/api/tenants",          type: "api", domain: "tenants",    x: 370, y: 250,  sub: "Tenant CRUD" },
  { id: "api-props",      label: "/api/properties",       type: "api", domain: "properties", x: 370, y: 340,  sub: "Dynamic properties + details" },
  { id: "api-snapshot",   label: "/api/portfolio",        type: "api", domain: "finance",    x: 370, y: 430,  sub: "P&L snapshots" },
  { id: "api-maint",      label: "/api/maintenance",      type: "api", domain: "operations", x: 370, y: 520,  sub: "Ticket management" },
  { id: "api-cleaning",   label: "/api/cleaning",         type: "api", domain: "operations", x: 370, y: 610,  sub: "Assignment management" },
  { id: "api-analytics",  label: "/api/analytics",        type: "api", domain: "analytics",  x: 370, y: 700,  sub: "Page views, sessions" },
  { id: "api-content",    label: "/api/content-gen",      type: "api", domain: "content",    x: 370, y: 790,  sub: "Blog, social, press releases" },
  { id: "api-activity",   label: "/api/activity-log",     type: "api", domain: "leads",      x: 370, y: 880,  sub: "Audit trail" },
  { id: "api-intel",      label: "/api/market-intel",     type: "api", domain: "content",    x: 370, y: 970,  sub: "AI news radar — TN/VA" },
  { id: "api-askvision",  label: "/api/ask-vision",       type: "api", domain: "leads",      x: 370, y: 1060, sub: "AI chatbot for visitors" },

  // ─── Database Tables (Column 3 ~x=710) ─────────────────────────────────
  { id: "db-leads",        label: "leads",                type: "db", domain: "leads",       x: 710, y: 80,   sub: "Lead records" },
  { id: "db-comments",     label: "lead_comments",        type: "db", domain: "leads",       x: 710, y: 160,  sub: "Lead notes & comments" },
  { id: "db-tenants",      label: "tenants",              type: "db", domain: "tenants",     x: 710, y: 260,  sub: "Tenant records" },
  { id: "db-properties",   label: "properties",           type: "db", domain: "properties",  x: 710, y: 340,  sub: "Dynamic listings" },
  { id: "db-propdetails",  label: "property_details",     type: "db", domain: "properties",  x: 710, y: 420,  sub: "Financials & units" },
  { id: "db-snapshots",    label: "portfolio_snapshots",  type: "db", domain: "finance",     x: 710, y: 500,  sub: "Monthly P&L history" },
  { id: "db-maint",        label: "maintenance_tickets",  type: "db", domain: "operations",  x: 710, y: 580,  sub: "Work orders" },
  { id: "db-cleaning",     label: "cleaning_assignments", type: "db", domain: "operations",  x: 710, y: 660,  sub: "Staff schedules" },
  { id: "db-siteanalytics",label: "site_analytics",       type: "db", domain: "analytics",   x: 710, y: 740,  sub: "Visitor tracking data" },
  { id: "db-blog",         label: "blog_posts",           type: "db", domain: "content",     x: 710, y: 820,  sub: "Published articles" },
  { id: "db-activity",     label: "activity_log",         type: "db", domain: "leads",       x: 710, y: 900,  sub: "All system events" },

  // ─── Dashboard Tabs (Column 4 ~x=1060) ─────────────────────────────────
  { id: "tab-leads",      label: "Leads Tab",        type: "tab", domain: "leads",       x: 1060, y: 100,  sub: "Pipeline management" },
  { id: "tab-tenants",    label: "Tenants Tab",      type: "tab", domain: "tenants",     x: 1060, y: 230,  sub: "Tenant directory" },
  { id: "tab-propdetails",label: "Prop Details",      type: "tab", domain: "properties",  x: 1060, y: 360,  sub: "Executive overview" },
  { id: "tab-analytics",  label: "Analytics Tab",     type: "tab", domain: "analytics",   x: 1060, y: 490,  sub: "Revenue & metrics" },
  { id: "tab-maint",      label: "Maintenance",       type: "tab", domain: "operations",  x: 1060, y: 600,  sub: "Ticket dashboard" },
  { id: "tab-cleaning",   label: "Cleaning",          type: "tab", domain: "operations",  x: 1060, y: 700,  sub: "Staff assignments" },
  { id: "tab-content",    label: "Content Tab",       type: "tab", domain: "content",     x: 1060, y: 810,  sub: "CMS & blog editor" },
  { id: "tab-marketing",  label: "Marketing Tab",     type: "tab", domain: "content",     x: 1060, y: 900,  sub: "AI market intel" },
];

// ── Connections ───────────────────────────────────────────────────────────────

interface Connection {
  from: string;
  to: string;
  domain: string;
}

const CONNECTIONS: Connection[] = [
  // Leads pipeline
  { from: "src-web",      to: "api-leasebot",   domain: "leads" },
  { from: "src-web",      to: "api-contact",    domain: "leads" },
  { from: "src-web",      to: "api-askvision",  domain: "leads" },
  { from: "api-leasebot", to: "db-leads",       domain: "leads" },
  { from: "api-contact",  to: "db-leads",       domain: "leads" },
  { from: "db-leads",     to: "tab-leads",      domain: "leads" },
  { from: "db-leads",     to: "tab-analytics",  domain: "leads" },
  { from: "db-comments",  to: "tab-leads",      domain: "leads" },

  // Tenants
  { from: "src-admin",    to: "api-tenants",    domain: "tenants" },
  { from: "api-tenants",  to: "db-tenants",     domain: "tenants" },
  { from: "db-tenants",   to: "tab-tenants",    domain: "tenants" },
  { from: "db-tenants",   to: "tab-propdetails",domain: "tenants" },
  { from: "db-tenants",   to: "tab-analytics",  domain: "tenants" },

  // Properties
  { from: "src-admin",    to: "api-props",      domain: "properties" },
  { from: "api-props",    to: "db-properties",  domain: "properties" },
  { from: "api-props",    to: "db-propdetails", domain: "properties" },
  { from: "db-properties",to: "tab-propdetails",domain: "properties" },
  { from: "db-properties",to: "tab-content",    domain: "properties" },
  { from: "db-propdetails",to: "tab-propdetails",domain: "properties" },

  // Finance
  { from: "api-snapshot", to: "db-snapshots",    domain: "finance" },
  { from: "db-snapshots", to: "tab-analytics",   domain: "finance" },

  // Operations
  { from: "src-staff",    to: "api-maint",       domain: "operations" },
  { from: "src-staff",    to: "api-cleaning",    domain: "operations" },
  { from: "api-maint",    to: "db-maint",        domain: "operations" },
  { from: "api-cleaning", to: "db-cleaning",     domain: "operations" },
  { from: "db-maint",     to: "tab-maint",       domain: "operations" },
  { from: "db-cleaning",  to: "tab-cleaning",    domain: "operations" },

  // Analytics
  { from: "src-web",       to: "api-analytics",     domain: "analytics" },
  { from: "api-analytics", to: "db-siteanalytics",  domain: "analytics" },
  { from: "db-siteanalytics",to: "tab-analytics",   domain: "analytics" },

  // Content + AI
  { from: "src-ai",       to: "api-content",    domain: "content" },
  { from: "src-ai",       to: "api-leasebot",   domain: "leads" },
  { from: "src-ai",       to: "api-intel",      domain: "content" },
  { from: "src-ai",       to: "api-askvision",  domain: "leads" },
  { from: "api-content",  to: "db-blog",        domain: "content" },
  { from: "db-blog",      to: "tab-content",    domain: "content" },
  { from: "db-blog",      to: "tab-marketing",  domain: "content" },
  { from: "api-intel",    to: "tab-marketing",  domain: "content" },

  // Activity log cross-cutting (writes flow through /api/activity-log)
  { from: "api-leasebot", to: "api-activity",  domain: "leads" },
  { from: "api-tenants",  to: "api-activity",  domain: "tenants" },
  { from: "api-activity", to: "db-activity",   domain: "leads" },
  { from: "db-activity",  to: "tab-leads",     domain: "leads" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const NODE_W = 190;
const NODE_H_SOURCE = 60;
const NODE_H_API = 44;
const NODE_H_DB = 44;
const NODE_H_TAB = 56;

function nodeHeight(type: NodeType) {
  switch (type) {
    case "source": return NODE_H_SOURCE;
    case "api": return NODE_H_API;
    case "db": return NODE_H_DB;
    case "tab": return NODE_H_TAB;
  }
}

function nodeCenter(n: FlowNode): { cx: number; cy: number } {
  return { cx: n.x + NODE_W / 2, cy: n.y + nodeHeight(n.type) / 2 };
}

function domainColor(id: string): string {
  return DOMAINS.find(d => d.id === id)?.color || "#94A3B8";
}

function nodeIcon(type: NodeType) {
  switch (type) {
    case "source": return Globe;
    case "api": return Cpu;
    case "db": return Database;
    case "tab": return LayoutDashboard;
  }
}

// Smooth bezier path between two nodes
function pathD(from: FlowNode, to: FlowNode): string {
  const { cx: x1, cy: y1 } = nodeCenter(from);
  const { cx: x2, cy: y2 } = nodeCenter(to);
  const dx = Math.abs(x2 - x1);

  // Same-column connections: route out to the left to bypass intermediate cards
  if (dx < 50) {
    const exitX = from.x - 10;          // exit left side of source
    const entryX = to.x - 10;           // enter left side of target
    const arcX = from.x - 80;           // how far left to arc out
    const midY = (y1 + y2) / 2;
    return `M${exitX},${y1} C${arcX},${y1} ${arcX},${midY} ${arcX},${midY} S${arcX},${y2} ${entryX},${y2}`;
  }

  // Cross-column: normal right→left bezier
  const cp = Math.max(dx * 0.45, 60);
  return `M${x1 + NODE_W / 2},${y1} C${x1 + NODE_W / 2 + cp},${y1} ${x2 - NODE_W / 2 - cp},${y2} ${x2 - NODE_W / 2},${y2}`;
}

// ── FlowPath ──────────────────────────────────────────────────────────────────

function FlowPath({ from, to, color, active, pathId }: {
  from: FlowNode; to: FlowNode; color: string; active: boolean; pathId: string;
}) {
  const d = pathD(from, to);
  // Evenly space 3 dots across the loop duration for seamless cycling
  const dur = 4;
  const dotDelays = [0, dur / 3, (dur * 2) / 3];
  const dotSizes = [2.8, 3.2, 2.5];

  return (
    <g style={{ opacity: active ? 1 : 0.06, transition: "opacity 0.5s ease" }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2.5 : 1.5}
        strokeOpacity={active ? 0.3 : 0.12}
        style={active ? { filter: `drop-shadow(0 0 6px ${color}60)` } : undefined}
      />
      <path
        id={pathId}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={active ? 1.5 : 0.8}
        strokeOpacity={active ? 0.6 : 0.25}
        strokeDasharray={active ? "none" : "4 4"}
      />
      {active && dotDelays.map((delay, i) => (
        <circle key={i} r={dotSizes[i]} fill={color} opacity="0.85" style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
          <animateMotion
            dur={`${dur}s`}
            repeatCount="indefinite"
            begin={`${delay}s`}
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.42 0 0.58 1"
          >
            <mpath xlinkHref={`#${pathId}`} />
          </animateMotion>
        </circle>
      ))}
    </g>
  );
}

// ── GlassNode ─────────────────────────────────────────────────────────────────

function GlassNode({ node, active }: { node: FlowNode; active: boolean }) {
  const color = domainColor(node.domain);
  const h = nodeHeight(node.type);
  const Icon = nodeIcon(node.type);
  const isSmall = node.type === "api" || node.type === "db";

  // Source icons
  const srcIcons: Record<string, React.ElementType> = {
    "src-web": Globe,
    "src-admin": UserCog,
    "src-staff": Wrench,
    "src-ai": Sparkles,
  };
  const ResolvedIcon = srcIcons[node.id] || Icon;

  return (
    <foreignObject x={node.x} y={node.y} width={NODE_W} height={h}
      style={{ opacity: active ? 1 : 0.12, transition: "opacity 0.5s ease" }}
    >
      <div
        style={{
          width: NODE_W,
          height: h,
          background: active
            ? `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${active ? color + "40" : "rgba(255,255,255,0.06)"}`,
          borderRadius: isSmall ? 10 : 14,
          padding: isSmall ? "6px 10px" : "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: active ? `0 0 16px ${color}18, inset 0 1px 0 rgba(255,255,255,0.04)` : "none",
          backdropFilter: "blur(8px)",
          cursor: "default",
        }}
      >
        <div style={{
          width: isSmall ? 24 : 30,
          height: isSmall ? 24 : 30,
          borderRadius: isSmall ? 6 : 8,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <ResolvedIcon size={isSmall ? 11 : 13} style={{ color }} />
        </div>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <p style={{
            fontSize: isSmall ? 10 : 11,
            fontWeight: 900,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
            fontFamily: "inherit",
          }}>
            {node.label}
          </p>
          {node.sub && (
            <p style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.35)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
              marginTop: 1,
              fontFamily: "inherit",
            }}>
              {node.sub}
            </p>
          )}
        </div>
      </div>
    </foreignObject>
  );
}

// ── Column Headers ────────────────────────────────────────────────────────────

function ColumnHeader({ x, label, icon: Icon }: { x: number; label: string; icon: React.ElementType }) {
  return (
    <foreignObject x={x} y={10} width={NODE_W} height={30}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        paddingLeft: 4,
      }}>
        <Icon size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
        <span style={{
          fontSize: 9,
          fontWeight: 900,
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          fontFamily: "inherit",
        }}>
          {label}
        </span>
      </div>
    </foreignObject>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SystemArchitectureMap() {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const uid = useId().replace(/:/g, "");

  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  const isActive = (domain: string) => !activeDomain || activeDomain === domain;

  // Also activate nodes that have cross-domain connections
  const activeNodeIds = new Set<string>();
  if (activeDomain) {
    CONNECTIONS.filter(c => c.domain === activeDomain).forEach(c => {
      activeNodeIds.add(c.from);
      activeNodeIds.add(c.to);
    });
  }
  const isNodeActive = (node: FlowNode) => {
    if (!activeDomain) return true;
    return node.domain === activeDomain || activeNodeIds.has(node.id);
  };

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveDomain(null)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
            !activeDomain
              ? "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] text-white"
              : "bg-transparent border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white hover:border-[rgba(255,255,255,0.15)]"
          }`}
        >
          All Flows
        </button>
        {DOMAINS.map(d => (
          <button
            key={d.id}
            onClick={() => setActiveDomain(activeDomain === d.id ? null : d.id)}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border"
            style={{
              background: activeDomain === d.id ? `${d.color}18` : "transparent",
              borderColor: activeDomain === d.id ? `${d.color}50` : "rgba(255,255,255,0.06)",
              color: activeDomain === d.id ? d.color : "rgba(255,255,255,0.4)",
              boxShadow: activeDomain === d.id ? `0 0 12px ${d.color}20` : "none",
            }}
          >
            {d.emoji} {d.label}
          </button>
        ))}
      </div>

      {/* Flow direction indicator */}
      <div className="flex items-center gap-2 text-[9px] text-gray-600 px-1">
        <span>Data flows left → right</span>
        <ArrowRight size={10} />
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          Animated dots show flow direction
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)] overflow-x-auto"
        style={{ backdropFilter: "blur(12px)" }}
      >
        <svg
          viewBox="0 0 1320 1140"
          className="w-full"
          style={{ minWidth: 900, minHeight: 500 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grid dots background */}
          <defs>
            <pattern id={`grid-${uid}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="0.6" fill="rgba(255,255,255,0.05)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${uid})`} />

          {/* Column headers */}
          <ColumnHeader x={60} label="Sources" icon={Globe} />
          <ColumnHeader x={370} label="API Layer" icon={Cpu} />
          <ColumnHeader x={710} label="Database" icon={Database} />
          <ColumnHeader x={1060} label="Dashboard" icon={LayoutDashboard} />

          {/* Column separator lines */}
          {[290, 640, 990].map(x => (
            <line key={x} x1={x} y1={40} x2={x} y2={940} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
          ))}

          {/* Connections */}
          {CONNECTIONS.map((conn, i) => {
            const from = nodeMap[conn.from];
            const to = nodeMap[conn.to];
            if (!from || !to) return null;
            return (
              <FlowPath
                key={i}
                from={from}
                to={to}
                color={domainColor(conn.domain)}
                active={isActive(conn.domain)}
                pathId={`path-${uid}-${i}`}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map(node => (
            <GlassNode key={node.id} node={node} active={isNodeActive(node)} />
          ))}
        </svg>
      </div>

      {/* Stats footer */}
      <div className="flex flex-wrap gap-4 text-[10px] text-gray-600 px-1">
        <span>17 Supabase tables</span>
        <span>·</span>
        <span>34 API routes</span>
        <span>·</span>
        <span>10 dashboard tabs</span>
        <span>·</span>
        <span>Gemini AI integration</span>
        <span>·</span>
        <span className="text-gray-500 italic">Read-only visualization — no data access</span>
      </div>
    </div>
  );
}
