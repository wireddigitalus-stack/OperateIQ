"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Hi, I'm OpsIQ 👋 Ask me anything about OperateIQ — features, plans, or which tier fits your portfolio.",
};
const SUGGESTIONS = ["Which plan is right for me?", "How does the staff app work?", "Is my data secure?"];

export default function OpsIQWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/opsiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", content: data.reply || "Sorry, something went wrong." }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Connection issue — please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-96 h-[32rem] flex flex-col rounded-2xl border border-[var(--oiq-border)] bg-[#0E1430] shadow-2xl overflow-hidden">
          <div className="oiq-grad-bg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">OpsIQ</p>
              <p className="text-xs text-white/80">OperateIQ assistant</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white" aria-label="Close chat"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "oiq-grad-bg text-white" : "bg-white/5 text-slate-200 border border-[var(--oiq-border)]"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-[var(--oiq-border)] text-slate-300 hover:bg-white/5">{s}</button>
                ))}
              </div>
            )}
            {loading && <div className="text-xs text-slate-500">OpsIQ is typing…</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 border-t border-[var(--oiq-border)] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask OpsIQ…"
              className="flex-1 bg-white/5 border border-[var(--oiq-border)] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[var(--oiq-indigo)]"
            />
            <button type="submit" disabled={loading || !input.trim()} className="oiq-btn !px-3 !py-2 disabled:opacity-50" aria-label="Send"><Send size={16} /></button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-4 sm:right-6 z-[60] w-14 h-14 rounded-full oiq-grad-bg text-white flex items-center justify-center shadow-[0_10px_30px_-5px_rgba(99,102,241,.7)] hover:scale-105 transition-transform"
        aria-label="Chat with OpsIQ"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
