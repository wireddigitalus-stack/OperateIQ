"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, X, Send, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "ai";
  text: string;
}

interface StaffAskVisionProps {
  role: "maintenance" | "cleaning";
  context?: string; // ticket or assignment summary for AI
}

const QUICK_PROMPTS: Record<string, string[]> = {
  maintenance: [
    "How do I reset a tripped HVAC breaker?",
    "Steps to stop a slow toilet leak?",
    "When should I escalate to a licensed contractor?",
    "How do I reset a door keypad?",
  ],
  cleaning: [
    "Best way to remove bathroom mildew?",
    "Safe ratio for bleach dilution?",
    "What issues should I always report?",
    "How long should each unit take?",
  ],
};

export default function StaffAskVision({ role, context }: StaffAskVisionProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ask-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, role, context }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.response || data.error || "Sorry, couldn't get a response." }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const roleColor = role === "maintenance" ? "#FACC15" : "#4ADE80";
  const roleGradient = role === "maintenance"
    ? "from-[#FACC15] to-[#F97316]"
    : "from-[#4ADE80] to-[#22C55E]";

  return (
    <>
      {/* Floating Brain Button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-br ${roleGradient} shadow-lg flex items-center justify-center text-black transition-transform active:scale-90`}
        aria-label="Ask VISION AI"
      >
        <Brain size={22} />
      </button>

      {/* Full-screen chat sheet */}
      {open && (
        <div className="fixed inset-0 z-50 bg-[#080C14] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[rgba(255,255,255,0.07)] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${roleGradient} flex items-center justify-center shadow-lg`}>
                <Brain size={18} className="text-black" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Ask VISION AI</p>
                <p className="text-[11px] text-gray-500">
                  {role === "maintenance" ? "Repair guides & troubleshooting" : "Cleaning procedures & tips"}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} style={{ color: roleColor }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: roleColor }}>
                    Quick questions
                  </p>
                </div>
                <div className="space-y-2">
                  {QUICK_PROMPTS[role].map(q => (
                    <button key={q} onClick={() => ask(q)}
                      className="w-full text-left px-4 py-3.5 rounded-2xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.09)] text-gray-300 text-sm font-medium hover:bg-[rgba(255,255,255,0.09)] active:scale-95 transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "ai" && (
                  <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${roleGradient} flex items-center justify-center flex-shrink-0 mr-2 mt-0.5`}>
                    <Brain size={13} className="text-black" />
                  </div>
                )}
                <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[rgba(255,255,255,0.1)] text-white rounded-br-sm"
                    : "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-gray-200 rounded-bl-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${roleGradient} flex items-center justify-center flex-shrink-0 mr-2`}>
                  <Brain size={13} className="text-black" />
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" style={{ color: roleColor }} />
                  <span className="text-xs text-gray-500">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 py-4 pb-8 border-t border-[rgba(255,255,255,0.07)] bg-[rgba(8,12,20,0.97)]">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                placeholder={role === "maintenance" ? "Ask about repairs, tools, or procedures…" : "Ask about cleaning, supplies, or what to report…"}
                rows={2}
                className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 resize-none"
                style={{ borderColor: input ? `${roleColor}40` : undefined }}
              />
              <button
                onClick={() => ask(input)}
                disabled={loading || !input.trim()}
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${roleGradient} flex items-center justify-center text-black flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all`}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
