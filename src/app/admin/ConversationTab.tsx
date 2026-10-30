"use client";
import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Loader2, User, Clock } from "lucide-react";

interface Message {
  id: string;
  message: string;
  author_name: string;
  author_email: string;
  created_at: string;
}

export default function ConversationTab({
  currentUserName,
  currentUserEmail,
  onMention,
}: {
  currentUserName?: string;
  currentUserEmail?: string;
  onMention?: (msg: string, author: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastSeenIdRef = useRef<string | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/internal-conversations");
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);

        const isFirstLoad = !lastSeenIdRef.current;
        const lastIdx = lastSeenIdRef.current
          ? data.messages.findIndex((m: Message) => m.id === lastSeenIdRef.current)
          : -1;

        // Since messages are ordered oldest to newest, slice from lastIdx + 1
        const newMsgs = lastIdx !== -1
          ? data.messages.slice(lastIdx + 1)
          : (isFirstLoad ? [] : data.messages);

        if (data.messages.length > 0) {
          lastSeenIdRef.current = data.messages[data.messages.length - 1].id;
        }

        if (newMsgs.length > 0 && currentUserName && onMention) {
          const cleanName = currentUserName.split(" ")[0].toLowerCase();
          newMsgs.forEach((m: Message) => {
            if (m.author_email !== currentUserEmail) {
              const msgLower = m.message.toLowerCase();
              if (
                msgLower.includes(`@${cleanName}`) ||
                msgLower.includes(`@${currentUserName.toLowerCase()}`)
              ) {
                onMention(m.message, m.author_name);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [currentUserName, currentUserEmail, onMention]);

  const prevCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/internal-conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          author_name: currentUserName || "Staff",
          author_email: currentUserEmail || "",
        }),
      });
      if (res.ok) {
        setInput("");
        fetchMessages();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-220px)] bg-[#080C14] rounded-2xl border border-white/12 shadow-[0_0_24px_rgba(56,189,248,0.06)] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.08] bg-gradient-to-r from-blue-500/[0.08] via-transparent to-transparent flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <MessageSquare size={17} className="text-sky-400" /> Communication Board
          </h2>
          <p className="text-xs text-gray-400 mt-1">Internal team logs & chat</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading board...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <MessageSquare size={48} className="opacity-10 mb-4" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.author_email === currentUserEmail;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isMe 
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-[0_0_14px_rgba(59,130,246,0.3)]" 
                    : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-gray-200"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                </div>
                <div className="flex items-center gap-2 mt-1.5 px-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{m.author_name}</span>
                  <span className="text-[10px] text-gray-600 flex items-center gap-1">
                    <Clock size={9} /> {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-[#0A0F1A] border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 focus-within:border-blue-400/60 focus-within:shadow-[0_0_12px_rgba(56,189,248,0.2)] transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Post an update or message..."
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-40 transition-all flex-shrink-0 shadow-[0_0_16px_rgba(59,130,246,0.35)]"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
