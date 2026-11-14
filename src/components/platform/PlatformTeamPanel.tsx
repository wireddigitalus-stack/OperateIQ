"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, UserPlus, Trash2, Pause, Play, Loader2, Eye, EyeOff } from "lucide-react";

interface TeamMember {
  email: string;
  name: string;
  role: "tech_support";
  active: boolean;
  canImpersonate: boolean;
  addedBy: string;
  createdAt: string;
}

export default function PlatformTeamPanel() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [canImpersonate, setCanImpersonate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const flash = (text: string, type: "ok" | "err" = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/team", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setMembers(Array.isArray(data.members) ? data.members : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/platform/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", email, name, canImpersonate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add member.");
      setMembers(data.members || []);
      setEmail("");
      setName("");
      flash("Tech Support access granted.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to add member.", "err");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: "toggle_active" | "toggle_impersonate" | "remove", targetEmail: string) => {
    if (action === "remove" && !confirm(`Remove Tech Support access for ${targetEmail}?`)) return;
    const res = await fetch("/api/platform/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email: targetEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setMembers(data.members || []);
      flash(action === "remove" ? `Removed ${targetEmail}` : "Updated permissions.");
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold ${
            msg.type === "ok"
              ? "bg-emerald-950/90 border-emerald-400/40 text-emerald-200"
              : "bg-rose-950/90 border-rose-400/40 text-rose-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Permissions Summary + Add Form */}
      <div className="bg-[#0B101D] border border-white/10 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
              <ShieldCheck size={17} className="text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Limited Tech Support Access</h2>
              <p className="text-xs text-slate-400">
                Tech Support reps can view Organizations, Support Tickets, Trial Signups, and Security Logs — they{" "}
                <strong className="text-slate-200">cannot</strong> delete organizations, edit billing/plans, create coupons, or manage this team.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Rep Email (Verified Sign-In)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="support@company.com"
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex (Support)"
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex items-end">
            <label className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-slate-200 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canImpersonate}
                onChange={(e) => setCanImpersonate(e.target.checked)}
                className="accent-emerald-400"
              />
              <span>Allow Support Mode (View Org)</span>
            </label>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              <span>{saving ? "Adding…" : "Add Tech Support"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Team List */}
      <div className="bg-[#0B101D] border border-white/10 rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-bold text-white mb-4">Tech Support Team ({members.length})</h3>
        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-xs text-slate-400">
            <Loader2 size={14} className="animate-spin text-emerald-400" /> Loading team…
          </div>
        ) : members.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl">
            No limited Tech Support reps added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.email}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{m.name}</span>
                    <span className="text-xs text-slate-400">{m.email}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        m.active
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-400/30"
                      }`}
                    >
                      {m.active ? "Active" : "Paused"}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/10">
                      {m.canImpersonate ? "Support Mode: On" : "Read-Only"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => runAction("toggle_impersonate", m.email)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    title="Toggle whether this rep can open client workspaces in Support Mode"
                  >
                    {m.canImpersonate ? <Eye size={12} className="text-sky-400" /> : <EyeOff size={12} className="text-slate-400" />}
                    <span>Support Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction("toggle_active", m.email)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-200 cursor-pointer"
                    title={m.active ? "Pause access" : "Resume access"}
                  >
                    {m.active ? <Pause size={13} /> : <Play size={13} className="text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction("remove", m.email)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 cursor-pointer"
                    title="Remove access"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
