"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity, Users, Wrench, Sparkles, Trash2, PenLine,
  Plus, RefreshCw, X, Clock, User, LogIn, DollarSign,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityLog {
  id: string;
  actor_email: string;
  actor_name: string;
  action: "created" | "updated" | "deleted" | "admin_login";
  resource_type: "tenant" | "lead" | "maintenance" | "cleaning" | "auth" | "rent_ledger";
  resource_name: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Props {
  onClose: () => void;
}

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  tenant:      { label: "Tenant",      icon: Users,       color: "#60A5FA", bg: "rgba(96,165,250,0.1)"  },
  lead:        { label: "Lead",        icon: Sparkles,    color: "#FACC15", bg: "rgba(250,204,21,0.1)"  },
  maintenance: { label: "Maintenance", icon: Wrench,      color: "#F97316", bg: "rgba(249,115,22,0.1)"  },
  cleaning:    { label: "Cleaning",    icon: Activity,    color: "#4ADE80", bg: "rgba(74,222,128,0.1)"  },
  auth:        { label: "System",      icon: LogIn,       color: "#A78BFA", bg: "rgba(167,139,250,0.1)" },
  rent_ledger: { label: "Rent Ledger", icon: DollarSign,  color: "#34D399", bg: "rgba(52,211,153,0.1)"  },
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  created:     { label: "added",     icon: Plus,    color: "#4ADE80" },
  updated:     { label: "updated",   icon: PenLine, color: "#60A5FA" },
  deleted:     { label: "removed",   icon: Trash2,  color: "#EF4444" },
  admin_login: { label: "logged in", icon: LogIn,   color: "#A78BFA" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityFeedPanel({ onClose }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ActivityLog["resource_type"]>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");   // ← NEW: filter by actor email
  const [migrationSql, setMigrationSql] = useState<string | null>(null);

  // Derive unique actors from loaded logs for the actor-filter pills
  const uniqueActors = React.useMemo(() => {
    const map = new Map<string, string>(); // email → display name
    logs.forEach(l => {
      if (l.actor_email && l.actor_email !== "unknown") {
        map.set(l.actor_email, l.actor_name || l.actor_email);
      }
    });
    return Array.from(map.entries()); // [[email, name], ...]
  }, [logs]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/activity-log?limit=80";
      if (filter !== "all") url += `&resource_type=${filter}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.migrationSql) setMigrationSql(data.migrationSql);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset actor filter when type filter changes
  useEffect(() => { setActorFilter("all"); }, [filter]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteLog = useCallback(async (id: string) => {
    setDeletingId(id);
    setLogs(prev => prev.filter(l => l.id !== id));
    try {
      await fetch(`/api/activity-log?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      fetchLogs();
    } finally {
      setDeletingId(null);
    }
  }, [fetchLogs]);

  // Apply actor filter client-side (logs already fetched)
  const visibleLogs = actorFilter === "all"
    ? logs
    : logs.filter(l => l.actor_email === actorFilter);

  const typeFilters: Array<{ key: "all" | ActivityLog["resource_type"]; label: string }> = [
    { key: "all",         label: "All"         },
    { key: "tenant",      label: "Tenants"     },
    { key: "lead",        label: "Leads"       },
    { key: "maintenance", label: "Maintenance" },
    { key: "cleaning",    label: "Cleaning"    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-md h-full bg-[#080C14] border-l border-[rgba(255,255,255,0.06)] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: "slideInRight 0.22s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[rgba(96,165,250,0.12)] border border-[rgba(96,165,250,0.2)] flex items-center justify-center">
              <Activity size={14} className="text-[#60A5FA]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Activity Log</h2>
              <p className="text-[11px] text-gray-400">Who did what &amp; when</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] flex items-center justify-center transition-colors"
              title="Refresh"
            >
              <RefreshCw size={12} className={`text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-md"
              title="Close"
            >
              <X size={13} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 px-5 py-3 border-b border-[rgba(255,255,255,0.04)] overflow-x-auto scrollbar-hide">
          {typeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={filter === f.key ? {
                background: "rgba(96,165,250,0.15)",
                border: "1px solid rgba(96,165,250,0.3)",
                color: "#60A5FA",
              } : {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#6b7280",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Actor filter chips — only shown when there are multiple actors */}
        {uniqueActors.length > 1 && (
          <div className="flex gap-1.5 px-5 py-2.5 border-b border-[rgba(255,255,255,0.04)] overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 flex-shrink-0 mr-1">
              <User size={9} className="text-gray-600" />
              <span className="text-[10px] text-gray-700 font-bold uppercase tracking-wider">Admin</span>
            </div>
            <button
              onClick={() => setActorFilter("all")}
              className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full transition-all"
              style={actorFilter === "all" ? {
                background: "rgba(167,139,250,0.15)",
                border: "1px solid rgba(167,139,250,0.3)",
                color: "#A78BFA",
              } : {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#6b7280",
              }}
            >
              Everyone
            </button>
            {uniqueActors.map(([email, name]) => (
              <button
                key={email}
                onClick={() => setActorFilter(email)}
                className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full transition-all truncate max-w-[120px]"
                title={email}
                style={actorFilter === email ? {
                  background: "rgba(167,139,250,0.15)",
                  border: "1px solid rgba(167,139,250,0.3)",
                  color: "#A78BFA",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#6b7280",
                }}
              >
                {name.split(" ")[0] || email.split("@")[0]}
              </button>
            ))}
          </div>
        )}

        {/* Migration warning */}
        {migrationSql && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-yellow-950/30 border border-yellow-900/40">
            <p className="text-xs text-yellow-400 font-bold mb-1">⚠️ Table not created yet</p>
            <p className="text-[10px] text-yellow-600">Run the SQL migration in Supabase to enable activity logging.</p>
          </div>
        )}

        {/* Log list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={20} className="text-gray-700 animate-spin" />
            </div>
          ) : visibleLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Activity size={28} className="text-gray-700 mb-3" />
              <p className="text-sm text-gray-600 font-bold">No activity yet</p>
              <p className="text-xs text-gray-700 mt-1">Actions will appear here as the team works.</p>
            </div>
          ) : (
            visibleLogs.map(log => {
              const typeCfg   = TYPE_CONFIG[log.resource_type] ?? TYPE_CONFIG.tenant;
              const actionCfg = ACTION_CONFIG[log.action]      ?? ACTION_CONFIG.created;
              const TypeIcon   = typeCfg.icon;
              const ActionIcon = actionCfg.icon;

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-all group overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  {/* Type icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: typeCfg.bg, border: `1px solid ${typeCfg.color}25` }}
                  >
                    <TypeIcon size={14} style={{ color: typeCfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {/* Actor + action + resource type badge */}
                    <p className="text-sm text-white leading-snug">
                      <span className="font-black">{log.actor_name}</span>
                      <span className="text-gray-400"> </span>
                      <span className="font-bold" style={{ color: actionCfg.color }}>
                        {actionCfg.label}
                      </span>
                      <span className="text-gray-400"> </span>
                      <span
                        className="font-semibold text-xs px-1.5 py-0.5 rounded-md"
                        style={{ background: typeCfg.bg, color: typeCfg.color }}
                      >
                        {typeCfg.label}
                      </span>
                    </p>

                    {/* Resource name */}
                    {log.resource_name && (
                      <p className="text-xs text-gray-300 font-medium mt-0.5 truncate max-w-full">
                        {log.resource_name.length > 48
                          ? log.resource_name.slice(0, 48) + "…"
                          : log.resource_name}
                      </p>
                    )}

                    {/* Metadata chips */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 overflow-hidden">
                        {Object.entries(log.metadata).slice(0, 3).map(([k, v]) =>
                          v !== undefined && v !== null && v !== "" && String(v).trim() ? (
                            <span
                              key={k}
                              className="text-[11px] text-gray-400 bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded-md max-w-full truncate"
                              style={{ maxWidth: "100%" }}
                            >
                              {String(k).replace(/_/g, " ")}:{" "}
                              <span className="text-gray-400">
                                {String(v).length > 30 ? String(v).slice(0, 30) + "…" : String(v)}
                              </span>
                            </span>
                          ) : null
                        )}
                      </div>
                    )}

                    {/* Time + actor email */}
                    <div className="flex items-center gap-1 mt-1.5 min-w-0 overflow-hidden">
                      <Clock size={9} className="text-gray-700 flex-shrink-0" />
                      <span className="text-[11px] text-gray-400 flex-shrink-0" title={formatDate(log.created_at)}>
                        {timeAgo(log.created_at)}
                      </span>
                      <span className="text-[11px] text-gray-500 ml-1 truncate" title={log.actor_email}>
                        · {log.actor_email}
                      </span>
                    </div>
                  </div>

                  {/* Right column: action icon + delete on hover */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2 mt-0.5">
                    <ActionIcon size={11} style={{ color: actionCfg.color }} />
                    <button
                      onClick={() => deleteLog(log.id)}
                      disabled={deletingId === log.id}
                      title="Remove this entry"
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] flex items-center justify-center hover:bg-[rgba(239,68,68,0.25)] hover:border-[rgba(239,68,68,0.5)] active:scale-95"
                    >
                      <X size={9} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {visibleLogs.length > 0 && (
          <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.04)]">
            <p className="text-[10px] text-gray-700 text-center">
              Showing {visibleLogs.length} of {logs.length} actions · RLS protected
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
