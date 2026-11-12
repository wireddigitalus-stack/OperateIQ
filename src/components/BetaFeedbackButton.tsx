"use client";

import React, { useState } from "react";
import { MessageSquarePlus, X, Send, CheckCircle2, Loader2, Bug, Lightbulb, Sparkles } from "lucide-react";

interface BetaFeedbackButtonProps {
  orgName?: string;
  customerCode?: string;
  userName?: string;
  userEmail?: string;
  activeTab: string;
}

const CATEGORIES = [
  { key: "Beta Bug Report", label: "Bug / Glitch", icon: Bug, color: "#F87171" },
  { key: "UX / Layout Friction", label: "UX Friction", icon: Sparkles, color: "#FBBF24" },
  { key: "Feature Idea", label: "Feature Idea", icon: Lightbulb, color: "#38BDF8" },
] as const;

export default function BetaFeedbackButton({
  orgName,
  customerCode,
  userName,
  userEmail,
  activeTab,
}: BetaFeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(CATEGORIES[0].key);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const viewport =
        typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "unknown";
      const pagePath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/admin";
      const enrichedMessage = [
        message.trim(),
        "",
        "--- Auto-Captured Beta Context ---",
        `Tab: ${activeTab}`,
        `URL: ${pagePath}`,
        `Viewport: ${viewport}`,
        customerCode ? `Org Code: ${customerCode}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName || "Beta Tester",
          email: userEmail || "beta@propopsiq.com",
          company: orgName || "Beta Workspace",
          customerCode: customerCode || undefined,
          category,
          priority: category === "Beta Bug Report" ? "High" : "Normal",
          message: enrichedMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not submit feedback. Please try again.");
      }
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send feedback.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSent(false);
          setError("");
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-[11px] font-bold transition-all cursor-pointer"
        title="Send quick bug report, UX feedback, or idea to the PropOpsIQ team"
      >
        <MessageSquarePlus size={13} />
        <span>Beta Feedback</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => {
            if (!sending) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B1120] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300">
                  <MessageSquarePlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Beta Feedback &amp; Bug Report</h3>
                  <p className="text-[11px] text-gray-400">Goes straight to the founder &amp; engineering queue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {sent ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-white">Feedback Received — Thank You!</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Your note and workspace context were logged directly for the PropOpsIQ team.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCategory(c.key)}
                        className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          active
                            ? "bg-white/10 border-sky-400/50 text-white shadow-[0_0_12px_rgba(56,189,248,0.18)]"
                            : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        <Icon size={14} style={{ color: c.color }} />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                    What happened or what would make this better?
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. When I tried to import my Excel sheet, column X didn't map..."
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-sky-400 resize-none"
                  />
                </div>

                <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[10px] text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-gray-300">Auto-attached:</span>
                  <span>Tab: {activeTab}</span>
                  {customerCode && <span>· Code: {customerCode}</span>}
                  {orgName && <span>· {orgName}</span>}
                </div>

                {error && (
                  <p className="text-xs text-red-400 font-semibold">{error}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={sending}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>{sending ? "Sending…" : "Send Feedback"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
