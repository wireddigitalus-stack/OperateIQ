"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, X, Send, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { PLANS, TRIAL_DAYS, type Tier } from "@/lib/plans";

type Msg = {
  role: "user" | "assistant";
  content: string;
  recommendedPlan?: Tier;
};

const GREETING: Msg = {
  role: "assistant",
  content:
    `Hi, I'm OpsIQ 👋 Tell me how many properties you manage or what you want to automate, and I'll show you how PropOpsIQ works — plus help you launch a ${TRIAL_DAYS}-day free trial in 60 seconds.`,
  recommendedPlan: "growth",
};

const SUGGESTIONS = [
  "Which plan fits my portfolio?",
  `What's included in the ${TRIAL_DAYS}-day free trial?`,
  "How do crew PIN portals work?",
  "Can PropOpsIQ host my property website?",
  "How is my portfolio data kept private?",
];

const PLAN_LABELS: Record<Tier, { name: string; price: string }> = {
  starter: {
    name: PLANS.find((p) => p.id === "starter")?.name || "Starter",
    price: `$${PLANS.find((p) => p.id === "starter")?.monthly ?? 29}/mo`,
  },
  growth: {
    name: PLANS.find((p) => p.id === "growth")?.name || "Growth",
    price: `$${PLANS.find((p) => p.id === "growth")?.monthly ?? 79}/mo`,
  },
  pro: {
    name: PLANS.find((p) => p.id === "pro")?.name || "Pro",
    price: `$${PLANS.find((p) => p.id === "pro")?.monthly ?? 149}/mo`,
  },
};

export default function OpsIQWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<Tier>("growth");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function handleClose() {
    inputRef.current?.blur();
    setOpen(false);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/opsiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const recPlan: Tier =
        data.recommendedPlan === "starter" || data.recommendedPlan === "pro"
          ? data.recommendedPlan
          : "growth";
      setActivePlan(recPlan);
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: data.reply || "Sorry, something went wrong.",
          recommendedPlan: recPlan,
        },
      ]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Connection issue — please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const planMeta = PLAN_LABELS[activePlan] ?? PLAN_LABELS.growth;

  return (
    <div id="oiq-widget-root" translate="no" className="notranslate">
      {/* Persistently mounted panel (toggled via hidden/CSS so closing never triggers DOM removeChild crashes with browser extensions) */}
      <div
        id="oiq-chat-panel"
        aria-hidden={!open}
        className={
          open
            ? "fixed bottom-3 sm:bottom-24 right-3 sm:right-6 z-[60] w-[calc(100vw-1.5rem)] sm:w-[25rem] h-[34rem] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-7.5rem)] flex flex-col rounded-3xl border border-sky-400/30 bg-[#0A1022]/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.75),0_0_32px_rgba(56,189,248,0.18)] overflow-hidden"
            : "hidden"
        }
      >
        {/* Header */}
        <div className="oiq-grad-bg px-4 py-3.5 flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-2.5">
            <Image
              src="/operateiq_google_ICON_logo_1791954043128.png"
              alt="OpsIQ"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg object-contain bg-slate-950/30 p-0.5 shadow"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-white text-sm leading-none">Ask OpsIQ</p>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  {TRIAL_DAYS}-Day Free Trial
                </span>
              </div>
              <p className="text-[11px] text-white/85 mt-0.5">AI Portfolio &amp; Plan Advisor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-black/20 hover:bg-black/35 text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((m, i) => {
            const msgPlan = m.recommendedPlan
              ? PLAN_LABELS[m.recommendedPlan] ?? PLAN_LABELS.growth
              : null;
            return (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "oiq-grad-bg text-white font-medium shadow-md"
                      : "bg-white/[0.06] text-slate-100 border border-white/10"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && i > 0 && m.recommendedPlan && msgPlan && (
                  <Link
                    href={`/signup?plan=${m.recommendedPlan}`}
                    className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 hover:text-white text-[11px] font-bold transition-all"
                  >
                    <Sparkles size={11} />
                    <span>
                      Try {msgPlan.name} ({msgPlan.price}) Free for {TRIAL_DAYS} Days
                    </span>
                    <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            );
          })}

          {msgs.length <= 2 && !loading && (
            <div className="pt-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Popular questions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:border-sky-400/40 hover:bg-sky-500/10 transition-all cursor-pointer text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-sky-300 px-1">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>OpsIQ is thinking…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Persistent Free Trial Conversion Banner */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-950/90 via-sky-950/80 to-indigo-950/90 border-t border-sky-400/25 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold text-white truncate flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400 flex-shrink-0" />
              <span>{TRIAL_DAYS}-Day Free Trial · Instant Setup</span>
            </p>
            <p className="text-[10px] text-slate-300 truncate">
              Recommended: <strong className="text-sky-300">{planMeta.name} ({planMeta.price})</strong>
            </p>
          </div>
          <Link
            href={`/signup?plan=${activePlan}`}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md transition-all"
          >
            <span>Start Free Trial</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          autoComplete="off"
          className="p-3 border-t border-white/10 bg-[#080C18] flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            placeholder="Ask about features, plans, or your portfolio…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="oiq-btn !px-3.5 !py-2 disabled:opacity-50 cursor-pointer"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      <button
        id="lease-bot-toggle"
        type="button"
        onClick={() => (open ? handleClose() : setOpen(true))}
        className="fixed bottom-6 right-4 sm:right-6 z-[60] h-14 px-4 rounded-full oiq-grad-bg text-white flex items-center gap-2.5 shadow-[0_10px_30px_-5px_rgba(99,102,241,.7)] hover:scale-105 transition-transform cursor-pointer border border-white/20"
        aria-label="Chat with OpsIQ"
      >
        <span className={open ? "inline-flex items-center" : "hidden"}>
          <X size={22} />
        </span>
        <span className={open ? "hidden" : "inline-flex items-center gap-2.5"}>
          <MessageCircle size={22} />
          <span className="text-xs font-extrabold tracking-tight hidden sm:inline">Ask OpsIQ</span>
        </span>
      </button>
    </div>
  );
}
