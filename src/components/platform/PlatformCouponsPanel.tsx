"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Ticket,
  Sparkles,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Pause,
  Play,
  Trash2,
  Loader2,
  Send,
  Link2,
  X,
} from "lucide-react";

interface CouponItem {
  code: string;
  plan: "starter" | "growth" | "pro";
  trialDays: number;
  maxUses: number | null;
  uses: number;
  active: boolean;
  expiresAt: string | null;
  note: string;
  recipientEmail?: string;
  createdAt: string;
  lastUsedAt?: string | null;
  redeemedBy?: string[];
}

export default function PlatformCouponsPanel() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [originUrl, setOriginUrl] = useState("https://propopsiq.com");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Create form state
  const [customCode, setCustomCode] = useState("");
  const [plan, setPlan] = useState<"starter" | "growth" | "pro">("pro");
  const [trialDays, setTrialDays] = useState("60");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  // Copy states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Outreach composer state (Email or SMS)
  const [emailTarget, setEmailTarget] = useState<CouponItem | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalEmailMsg, setPersonalEmailMsg] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [smsTarget, setSmsTarget] = useState<CouponItem | null>(null);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsBody, setSmsBody] = useState("");

  const flash = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/coupons", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
        setEmailConfigured(Boolean(data.emailConfigured));
        if (data.platformUrl) setOriginUrl(data.platformUrl);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const copyText = (key: string, text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      flash(`Copied ${label}`);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  const handleGenerateRandomPreview = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const seg = () =>
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setCustomCode(`BETA-${seg()}-${seg()}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/platform/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          code: customCode.trim() || undefined,
          plan,
          trialDays: Number(trialDays) || 60,
          maxUses: maxUses === "unlimited" ? null : Number(maxUses) || 1,
          expiresAt: expiresAt || null,
          note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create code.");
      setCoupons(data.coupons || []);
      setCustomCode("");
      setNote("");
      setExpiresAt("");
      flash(`Created code ${data.coupon?.code}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to create code.", "err");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (code: string) => {
    const res = await fetch("/api/platform/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", code }),
    });
    const data = await res.json();
    if (res.ok) setCoupons(data.coupons || []);
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete coupon code "${code}"?`)) return;
    const res = await fetch("/api/platform/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", code }),
    });
    const data = await res.json();
    if (res.ok) {
      setCoupons(data.coupons || []);
      flash(`Deleted ${code}`);
    }
  };

  const openEmailComposer = (c: CouponItem) => {
    const planLabel = c.plan.charAt(0).toUpperCase() + c.plan.slice(1);
    setEmailTarget(c);
    setRecipientEmail(c.recipientEmail || "");
    setRecipientName("");
    setPersonalEmailMsg(
      `I'd love to invite you to try PropOpsIQ! Here is a personal invite code for ${c.trialDays} days free on our ${planLabel} plan (no credit card required).`
    );
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTarget) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/platform/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email",
          code: emailTarget.code,
          recipientEmail,
          recipientName,
          personalMessage: personalEmailMsg,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite email.");
      setCoupons(data.coupons || []);
      flash(`Invite emailed to ${recipientEmail}`);
      setEmailTarget(null);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Email failed.", "err");
    } finally {
      setSendingEmail(false);
    }
  };

  const openSmsComposer = (c: CouponItem) => {
    const link = `${originUrl}/signup?code=${encodeURIComponent(c.code)}`;
    const planLabel = c.plan.charAt(0).toUpperCase() + c.plan.slice(1);
    setSmsTarget(c);
    setSmsPhone("");
    setSmsBody(
      `Hey! Here's your PropOpsIQ invite link for ${c.trialDays} days free on ${planLabel} (no card needed): ${link} — or enter code ${c.code} at signup.`
    );
  };

  const smsHref = smsPhone.trim()
    ? `sms:${encodeURIComponent(smsPhone.trim())}?&body=${encodeURIComponent(smsBody)}`
    : `sms:?&body=${encodeURIComponent(smsBody)}`;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border text-xs font-bold shadow-2xl ${
            toast.type === "ok"
              ? "bg-emerald-950/95 border-emerald-400/40 text-emerald-200"
              : "bg-rose-950/95 border-rose-400/40 text-rose-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Generator Card */}
      <div className="bg-[#0B101D] border border-white/10 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center">
              <Ticket size={17} className="text-sky-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Generate Coupon / Invite Code</h2>
              <p className="text-xs text-slate-400">
                Create single-use or multi-use codes and send them via personal email or text message.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-full">
            Built-in always-on codes: <strong className="text-slate-200">BETA60</strong>,{" "}
            <strong className="text-slate-200">FOUNDER</strong>
          </span>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Code (leave blank for random)
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="e.g. OAKRIDGE60"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={handleGenerateRandomPreview}
                className="px-2.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-xs font-semibold text-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
                title="Generate random readable code"
              >
                <Sparkles size={12} className="text-sky-300" />
                <span>Random</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Unlocked</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as "starter" | "growth" | "pro")}
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
            >
              <option value="pro">Pro ($149/mo tier)</option>
              <option value="growth">Growth ($79/mo tier)</option>
              <option value="starter">Starter ($29/mo tier)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Free Days</label>
            <select
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
            >
              <option value="30">30 Days</option>
              <option value="60">60 Days (Beta)</option>
              <option value="90">90 Days</option>
              <option value="180">180 Days</option>
              <option value="365">365 Days (1 Year)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Max Redemptions</label>
            <select
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
            >
              <option value="1">1 (Single-Use)</option>
              <option value="5">5 Uses</option>
              <option value="25">25 Uses</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Expires (Optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Note / Who is this for? (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Sarah @ Oakridge Realty — texted after coffee meeting"
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
              <span>{creating ? "Creating…" : "Create Invite Code"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Coupons List */}
      <div className="bg-[#0B101D] border border-white/10 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-white">
            Generated Coupon Codes ({coupons.length})
          </h3>
          {!emailConfigured && (
            <span className="text-[11px] text-amber-300">
              Note: RESEND_API_KEY not configured — use Text (SMS) or Copy Link
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-xs text-slate-400">
            <Loader2 size={14} className="animate-spin text-sky-400" /> Loading coupon codes…
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl">
            No custom coupon codes generated yet. Create your first one above!
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => {
              const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
              const maxed = c.maxUses !== null && c.uses >= c.maxUses;
              const statusLabel = !c.active
                ? "Paused"
                : expired
                ? "Expired"
                : maxed
                ? "Redeemed"
                : "Active";
              const statusClass =
                statusLabel === "Active"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                  : statusLabel === "Paused"
                  ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
                  : "bg-slate-500/15 text-slate-400 border-white/10";
              const signupLink = `${originUrl}/signup?code=${encodeURIComponent(c.code)}`;

              return (
                <div
                  key={c.code}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-black text-white tracking-wider bg-black/50 px-2.5 py-1 rounded-lg border border-white/10">
                        {c.code}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">
                        {c.trialDays}d {c.plan.toUpperCase()}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusClass}`}>
                        {statusLabel}
                      </span>
                      <span className="text-xs text-slate-300 tabular-nums">
                        Uses: <strong>{c.uses}</strong> / {c.maxUses ?? "∞"}
                      </span>
                      {c.expiresAt && (
                        <span className="text-[11px] text-slate-400">
                          Exp: {new Date(c.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {c.note && <p className="text-xs text-slate-400 truncate">{c.note}</p>}
                    {c.redeemedBy && c.redeemedBy.length > 0 && (
                      <p className="text-[11px] text-emerald-300/90 truncate">
                        Redeemed by: {c.redeemedBy.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => copyText(`code:${c.code}`, c.code, `code ${c.code}`)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === `code:${c.code}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(`link:${c.code}`, signupLink, "invite link")}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === `link:${c.code}` ? <Check size={12} className="text-emerald-400" /> : <Link2 size={12} className="text-sky-400" />}
                      <span>Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEmailComposer(c)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-xs font-semibold text-sky-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail size={12} />
                      <span>Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openSmsComposer(c)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-xs font-semibold text-emerald-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare size={12} />
                      <span>Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(c.code)}
                      title={c.active ? "Pause code" : "Activate code"}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 cursor-pointer"
                    >
                      {c.active ? <Pause size={13} /> : <Play size={13} className="text-emerald-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.code)}
                      title="Delete code"
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Human Email Modal */}
      {emailTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSendEmail}
            className="w-full max-w-md rounded-2xl bg-[#0B101D] border border-white/15 p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail size={15} className="text-sky-400" />
                Email Invite Code ({emailTarget.code})
              </h4>
              <button type="button" onClick={() => setEmailTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Email</label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="owner@company.com"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">First Name (Optional)</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Sarah"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Personal Note</label>
              <textarea
                rows={3}
                value={personalEmailMsg}
                onChange={(e) => setPersonalEmailMsg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEmailTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingEmail}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>{sendingEmail ? "Sending…" : "Send Email"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Human Text (SMS) Modal */}
      {smsTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B101D] border border-white/15 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare size={15} className="text-emerald-400" />
                Text Invite Code ({smsTarget.code})
              </h4>
              <button type="button" onClick={() => setSmsTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Text Message</label>
              <textarea
                rows={4}
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  copyText(`sms:${smsTarget.code}`, smsBody, "text message");
                  setSmsTarget(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={13} />
                <span>Copy Text</span>
              </button>
              <a
                href={smsHref}
                onClick={() => setSmsTarget(null)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 flex items-center gap-1.5"
              >
                <MessageSquare size={13} />
                <span>Open Messages App →</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
