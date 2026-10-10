"use client";
import { useState, useRef, useEffect } from "react";
import {
  Loader2, Sparkles, Copy, CheckCircle2, Download,
  Clock, Instagram, RefreshCw, Hash, Mail, Globe, Calendar,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

// ── Auto-growing textarea ──────────────────────────────────────────────────────
function AutoTextarea({
  value, onChange, placeholder, className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={3}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`resize-none overflow-hidden w-full bg-transparent text-sm text-gray-200 leading-relaxed outline-none placeholder:text-gray-700 ${className ?? ""}`}
    />
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors flex-shrink-0"
    >
      {copied
        ? <><CheckCircle2 size={10} className="text-[#4ADE80]" /> Copied!</>
        : <><Copy size={10} /> {label}</>}
    </button>
  );
}

// ── Content card ──────────────────────────────────────────────────────────────
function ContentCard({
  borderColor, icon, label, value, onChange, charLimit, hint,
}: {
  borderColor: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  charLimit?: number;
  hint?: string;
}) {
  const pct = charLimit ? Math.min(100, Math.round((value.length / charLimit) * 100)) : 0;
  const barColor = pct > 90 ? "#EF4444" : pct > 70 ? "#FACC15" : "#4ADE80";

  return (
    <div className={`glass rounded-2xl border p-4 space-y-3 ${borderColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          {icon}
          <p className="text-xs font-black text-white uppercase tracking-widest">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          {charLimit && <span className="text-[10px] text-gray-600 tabular-nums">{value.length}/{charLimit}</span>}
          <CopyBtn text={value} />
        </div>
      </div>

      <AutoTextarea value={value} onChange={onChange} placeholder={`${label} content will appear here…`} />

      {charLimit && value.length > 0 && (
        <div className="h-0.5 rounded-full bg-[rgba(255,255,255,0.06)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
      {hint && <p className="text-[10px] text-gray-600">{hint}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
type HistoryEntry = { label: string; ts: string; d: Record<string, string> };

const TONES = [
  { key: "professional", label: "💼 Pro" },
  { key: "friendly",     label: "😊 Warm" },
  { key: "exciting",     label: "🔥 Hot" },
  { key: "luxury",       label: "✨ Luxury" },
] as const;

const GOALS = [
  { key: "awareness", label: "📢 Awareness" },
  { key: "leads",     label: "📞 Get Leads" },
  { key: "tour",      label: "🚪 Book Tour" },
  { key: "promo",     label: "🎁 Promo" },
] as const;

export default function SocialStudio() {
  // Controls
  const [propId, setPropId]   = useState(PROPERTIES[0]?.id ?? "");
  const [tone, setTone]       = useState<"professional"|"friendly"|"exciting"|"luxury">("professional");
  const [goal, setGoal]       = useState<"awareness"|"leads"|"tour"|"promo">("leads");
  const [hook, setHook]       = useState("");
  const [activeVariant, setActiveVariant] = useState<"main"|"alt">("main");

  // Outputs (editable)
  const [post,       setPost]       = useState("");
  const [postAlt,    setPostAlt]    = useState("");
  const [story,      setStory]      = useState("");
  const [emailSubj,  setEmailSubj]  = useState("");
  const [gpost,      setGpost]      = useState("");
  const [hashAll,    setHashAll]    = useState("");
  const [hashLoc,    setHashLoc]    = useState("");
  const [hashInd,    setHashInd]    = useState("");
  const [hashProp,   setHashProp]   = useState("");
  const [bestTime,   setBestTime]   = useState("");
  const [hashFilter, setHashFilter] = useState<"all"|"location"|"industry"|"property">("all");

  // UI
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [history,     setHistory]     = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const hasOutput = !!(post || postAlt);
  const activePost = activeVariant === "alt" ? postAlt : post;
  const setActivePost = activeVariant === "alt" ? setPostAlt : setPost;

  const filteredTags = (() => {
    const src =
      hashFilter === "location" ? hashLoc :
      hashFilter === "industry" ? hashInd :
      hashFilter === "property" ? hashProp : hashAll;
    return src.split(/\s+/).filter(h => h.startsWith("#")).filter((h, i, a) => a.indexOf(h) === i);
  })();

  async function generate() {
    const property = PROPERTIES.find(p => p.id === propId);
    if (!property) return;
    setLoading(true); setError("");
    setPost(""); setPostAlt(""); setStory(""); setEmailSubj("");
    setGpost(""); setHashAll(""); setHashLoc(""); setHashInd(""); setHashProp(""); setBestTime("");
    setActiveVariant("main");
    try {
      const res = await fetch("/api/generate-social-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, tone, customContext: hook, goal }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPost(d.post || "");
      setPostAlt(d.postAlt || "");
      setStory(d.storyCaption || "");
      setEmailSubj(d.emailSubject || "");
      setGpost(d.googlePost || "");
      setHashAll(d.hashtags || "");
      setHashLoc(d.hashtagsLocation || "");
      setHashInd(d.hashtagsIndustry || "");
      setHashProp(d.hashtagsProperty || "");
      setBestTime(d.bestTime || "");
      setHistory(prev => [
        { label: property.name, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), d },
        ...prev,
      ].slice(0, 5));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  function restore(entry: HistoryEntry) {
    const d = entry.d;
    setPost(d.post||""); setPostAlt(d.postAlt||""); setStory(d.storyCaption||"");
    setEmailSubj(d.emailSubject||""); setGpost(d.googlePost||"");
    setHashAll(d.hashtags||""); setHashLoc(d.hashtagsLocation||"");
    setHashInd(d.hashtagsIndustry||""); setHashProp(d.hashtagsProperty||"");
    setBestTime(d.bestTime||"");
    setActiveVariant("main"); setShowHistory(false);
  }

  function exportPack() {
    const prop = PROPERTIES.find(p => p.id === propId);
    const txt = [
      "VISION LLC — SOCIAL CONTENT PACK",
      `Property: ${prop?.name}  |  ${new Date().toLocaleString()}`,
      "=".repeat(60),
      `\nUNIVERSAL POST (Variant 1):\n${post}`,
      `\nUNIVERSAL POST (Variant 2):\n${postAlt}`,
      `\nSTORY CAPTION:\n${story}`,
      `\nEMAIL SUBJECT:\n${emailSubj}`,
      `\nGOOGLE BUSINESS POST:\n${gpost}`,
      `\nHASHTAG BANK:\n${hashAll}`,
      `  📍 Location: ${hashLoc}`,
      `  🏢 Industry: ${hashInd}`,
      `  🏠 Property: ${hashProp}`,
      `\nBEST TIME TO POST:\n${bestTime}`,
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
    a.download = `vision-social-${Date.now()}.txt`;
    a.click();
  }

  function copyAll() {
    const pack = [
      post      ? `📋 POST (Variant 1):\n${post}` : "",
      postAlt   ? `📋 POST (Variant 2):\n${postAlt}` : "",
      story     ? `▶ STORY:\n${story}` : "",
      emailSubj ? `📧 EMAIL SUBJECT:\n${emailSubj}` : "",
      gpost     ? `🌐 GOOGLE POST:\n${gpost}` : "",
      hashAll   ? `#️⃣ HASHTAGS:\n${hashAll}` : "",
    ].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(pack).catch(() => {});
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E1306C] to-[#833AB4] flex items-center justify-center shadow-[0_0_20px_rgba(225,48,108,0.3)]">
            <Instagram size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Social Content Studio</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Universal post · Story · Email · Google Business · Hashtag Bank — one click, every channel
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={11} /> History ({history.length})
          </button>
        )}
      </div>

      {/* History drawer */}
      {showHistory && (
        <div className="glass rounded-2xl border border-[rgba(255,255,255,0.08)] p-4 space-y-2">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Recent Generations</p>
          {history.map((h, i) => (
            <button key={i} onClick={() => restore(h)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.06)] transition-colors text-left">
              <span className="text-xs font-semibold text-white">{h.label}</span>
              <span className="text-[10px] text-gray-600">{h.ts}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Property */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">1. Property</label>
          <select
            value={propId} onChange={e => setPropId(e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(225,48,108,0.5)] outline-none appearance-none"
          >
            {PROPERTIES.map(p => (
              <option key={p.id} value={p.id} className="bg-[#0a1628]">{p.name}</option>
            ))}
          </select>
        </div>

        {/* Goal */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">2. Goal</label>
          <div className="grid grid-cols-2 gap-1.5">
            {GOALS.map(g => (
              <button key={g.key} onClick={() => setGoal(g.key)}
                className={`py-2 rounded-xl text-[11px] font-black border transition-all ${
                  goal === g.key
                    ? "border-[rgba(74,222,128,0.6)] bg-[rgba(74,222,128,0.1)] text-[#4ADE80]"
                    : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white"
                }`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">3. Tone</label>
        <div className="flex gap-2">
          {TONES.map(t => (
            <button key={t.key} onClick={() => setTone(t.key)}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-black border transition-all ${
                tone === t.key
                  ? "border-[rgba(167,139,250,0.6)] bg-[rgba(167,139,250,0.12)] text-[#A78BFA]"
                  : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hook */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          4. Hook <span className="normal-case font-normal text-gray-600">(optional — promo, event, or angle to highlight)</span>
        </label>
        <input type="text" value={hook} onChange={e => setHook(e.target.value)}
          placeholder='"First month free" · "Just renovated" · "Limited availability" · "Corner unit with parking"'
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(225,48,108,0.4)] outline-none placeholder:text-gray-700"
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#E1306C] to-[#833AB4] text-white font-black text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-[0_0_24px_rgba(225,48,108,0.3)]">
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
            : <><Sparkles size={15} /> Generate Content Pack</>}
        </button>
        {hasOutput && (
          <>
            <button onClick={copyAll}
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.1)] text-gray-300 text-sm font-bold hover:bg-[rgba(255,255,255,0.05)] transition-all">
              <Copy size={14} /> Copy All
            </button>
            <button onClick={exportPack}
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.1)] text-gray-300 text-sm font-bold hover:bg-[rgba(255,255,255,0.05)] transition-all">
              <Download size={14} /> Export .txt
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* ── Output ── */}
      {hasOutput && (
        <div className="space-y-5">

          {/* Best time banner */}
          {bestTime && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[rgba(250,204,21,0.07)] border border-[rgba(250,204,21,0.2)]">
              <Clock size={14} className="text-[#FACC15] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#FACC15]"><span className="font-black">Best time to post:</span> {bestTime}</p>
            </div>
          )}

          {/* Universal Post with variant toggle */}
          {(post || postAlt) && (
            <div className="glass rounded-2xl border border-[rgba(167,139,250,0.25)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center">
                    <span className="text-white font-black text-[9px]">✦</span>
                  </div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">Universal Post</p>
                  <span className="text-[10px] text-gray-600 normal-case font-normal">— works on FB, IG & LinkedIn</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600 tabular-nums">{activePost.length} chars</span>
                  <CopyBtn text={activePost} />
                </div>
              </div>

              {/* Variant tabs */}
              <div className="flex gap-1.5">
                {(["main", "alt"] as const).map(v => (
                  <button key={v} onClick={() => setActiveVariant(v)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                      activeVariant === v
                        ? "border-[rgba(167,139,250,0.6)] bg-[rgba(167,139,250,0.12)] text-[#A78BFA]"
                        : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white"
                    }`}>
                    Variant {v === "main" ? "1" : "2"}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-gray-600 self-center">Click text to edit</span>
              </div>

              <AutoTextarea
                value={activePost}
                onChange={setActivePost}
                className="min-h-[80px]"
              />

              <p className="text-[10px] text-gray-600">
                Paste directly to Facebook, Instagram, or LinkedIn. Add hashtags separately as first comment on IG.
              </p>
            </div>
          )}

          {/* Story + Email row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {story && (
              <div className="glass rounded-2xl border border-[rgba(250,204,21,0.2)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FACC15] to-[#F97316] flex items-center justify-center">
                      <span className="text-black font-black text-[9px]">▶</span>
                    </div>
                    <p className="text-xs font-black text-white uppercase tracking-widest">Story Caption</p>
                  </div>
                  <CopyBtn text={story} />
                </div>
                <AutoTextarea value={story} onChange={setStory} className="text-xl font-black text-[#FACC15] leading-snug min-h-[40px]" />
                <p className="text-[10px] text-gray-600">Paste as text overlay on your Story image or video</p>
              </div>
            )}
            {emailSubj && (
              <div className="glass rounded-2xl border border-[rgba(96,165,250,0.2)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-[#60A5FA]" />
                    <p className="text-xs font-black text-white uppercase tracking-widest">Email Subject</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 tabular-nums">{emailSubj.length}/60</span>
                    <CopyBtn text={emailSubj} />
                  </div>
                </div>
                <AutoTextarea value={emailSubj} onChange={setEmailSubj} className="font-bold text-[#60A5FA] min-h-[28px]" />
                <p className="text-[10px] text-gray-600">Paste directly as your email subject line</p>
              </div>
            )}
          </div>

          {/* Google Business Post */}
          {gpost && (
            <ContentCard
              borderColor="border-[rgba(74,222,128,0.2)]"
              icon={<Globe size={14} className="text-[#4ADE80]" />}
              label="Google Business Post"
              value={gpost}
              onChange={setGpost}
              charLimit={1500}
              hint="Paste directly into your Google Business Profile → Add update"
            />
          )}

          {/* Hashtag Bank */}
          {hashAll && (
            <div className="glass rounded-2xl border border-[rgba(167,139,250,0.2)] p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center">
                    <Hash size={12} className="text-white" />
                  </div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">
                    Hashtag Bank <span className="text-gray-600 font-normal normal-case">({filteredTags.length} tags)</span>
                  </p>
                </div>
                <CopyBtn text={filteredTags.join(" ")} label="Copy set" />
              </div>

              {/* Category filter */}
              <div className="flex gap-1.5 flex-wrap">
                {(["all","location","industry","property"] as const).map(f => (
                  <button key={f} onClick={() => setHashFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                      hashFilter === f
                        ? "border-[rgba(167,139,250,0.6)] bg-[rgba(167,139,250,0.12)] text-[#A78BFA]"
                        : "border-[rgba(255,255,255,0.06)] text-gray-600 hover:text-gray-300"
                    }`}>
                    {f === "all" ? "All Tags" : f === "location" ? "📍 Location" : f === "industry" ? "🏢 Industry" : "🏠 Property"}
                  </button>
                ))}
              </div>

              {/* Tag pills */}
              <div className="flex flex-wrap gap-1.5">
                {filteredTags.map(tag => (
                  <button key={tag} title="Click to copy individually"
                    onClick={() => navigator.clipboard.writeText(tag).catch(() => {})}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#A78BFA] bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)] hover:bg-[rgba(167,139,250,0.18)] transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600">
                Click any tag to copy individually · For Instagram: paste hashtags as the <span className="text-gray-400 font-semibold">first comment</span> — not in the caption — for max reach
              </p>
            </div>
          )}

          {/* Posting schedule */}
          {bestTime && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
              <Calendar size={13} className="text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Optimal Posting Window</p>
                <p className="text-xs text-gray-300">{bestTime}</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
