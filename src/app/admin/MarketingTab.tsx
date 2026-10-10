"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Copy, Download, CheckCircle2, Trash2, FileText, Clock, ChevronDown, BookOpen, Instagram, Radar } from "lucide-react";
import BlogGenerator from "./BlogGenerator";
import BlogEditor from "./BlogEditor";
import PropertyOneSheet from "./PropertyOneSheet";
import SocialStudio from "./SocialStudio";
import MarketIntel from "./MarketIntel";


// ─── Types ────────────────────────────────────────────────────────────────────

type PRStatus = "draft" | "approved" | "published";

interface PressRelease {
  id: string;
  title: string;
  type: string;
  content: string;
  status: PRStatus;
  createdAt: string;
}

const PR_TYPES = [
  { value: "new_listing",    label: "New Property Available" },
  { value: "lease_signed",   label: "Lease Signed / Deal Closed" },
  { value: "market_update",  label: "Market Update / Report" },
  { value: "company_news",   label: "Company News / Announcement" },
  { value: "expansion",      label: "Business Expansion" },
  { value: "award",          label: "Award / Recognition" },
  { value: "custom",         label: "Custom Topic" },
];

const STATUS_STYLES: Record<PRStatus, string> = {
  draft:     "bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[#FACC15]",
  approved:  "bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.3)] text-[#4ADE80]",
  published: "bg-[rgba(96,165,250,0.1)] border-[rgba(96,165,250,0.3)] text-[#60A5FA]",
};

function loadQueue(): PressRelease[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("vision_press_releases") || "[]"); }
  catch { return []; }
}

function saveQueue(q: PressRelease[]) {
  localStorage.setItem("vision_press_releases", JSON.stringify(q));
}

// ─── Blog Section (Editor + AI Generator tabs) ────────────────────────────────

function BlogSection() {
  const [blogView, setBlogView] = useState<"editor" | "generator">("editor");

  return (
    <div className="space-y-4">
      {/* Inner tab toggle */}
      <div className="flex gap-1 bg-[rgba(255,255,255,0.03)] rounded-xl p-1 border border-[rgba(255,255,255,0.06)]">
        <button
          onClick={() => setBlogView("editor")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            blogView === "editor"
              ? "bg-[rgba(167,139,250,0.15)] text-[#A78BFA] border border-[rgba(167,139,250,0.3)]"
              : "text-gray-600 hover:text-gray-400"
          }`}
        >
          <BookOpen size={13} />
          Manage & Edit Posts
        </button>
        <button
          onClick={() => setBlogView("generator")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            blogView === "generator"
              ? "bg-[rgba(167,139,250,0.15)] text-[#A78BFA] border border-[rgba(167,139,250,0.3)]"
              : "text-gray-600 hover:text-gray-400"
          }`}
        >
          <Sparkles size={13} />
          AI Generator
        </button>
      </div>

      {blogView === "editor" && <BlogEditor />}
      {blogView === "generator" && <BlogGenerator />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketingTab({ onSubTabChange }: { onSubTabChange?: (sub: string) => void }) {
  const [subTab, setSubTab] = useState<"press" | "blog" | "social" | "one-sheet" | "intel">("blog");

  const switchSubTab = (key: "press" | "blog" | "social" | "one-sheet" | "intel") => {
    setSubTab(key);
    onSubTabChange?.(key);
  };


  // ── Press Release state ──────────────────────────────────────────────────────
  const [prType,     setPrType]     = useState("new_listing");
  const [topic,      setTopic]      = useState("");
  const [details,    setDetails]    = useState("");
  const [draft,      setDraft]      = useState("");
  const [title,      setTitle]      = useState("");
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState("");
  const [copied,     setCopied]     = useState(false);
  const [queue,      setQueue]      = useState<PressRelease[]>([]);
  const [saved,      setSaved]      = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { setQueue(loadQueue()); }, []);

  // ── Generate Press Release ──────────────────────────────────────────────────

  async function generate() {
    if (!topic.trim()) { setError("Please enter a topic or property name."); return; }
    setGenerating(true); setError(""); setDraft(""); setTitle("");
    try {
      const res = await fetch("/api/generate-press-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: prType, topic: topic.trim(), details: details.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Generation failed.");
      setTitle(d.title || "");
      setDraft(d.content || "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Save to queue ─────────────────────────────────────────────────────────

  function saveDraft() {
    if (!draft.trim()) return;
    const pr: PressRelease = {
      id: `pr_${Date.now()}`,
      title: title || topic,
      type: PR_TYPES.find(t => t.value === prType)?.label || prType,
      content: draft,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    const next = [pr, ...queue];
    setQueue(next); saveQueue(next);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  // ── Copy / Download ───────────────────────────────────────────────────────

  function copyDraft() {
    navigator.clipboard.writeText(`${title}\n\n${draft}`).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function downloadDraft() {
    const blob = new Blob([`${title}\n\n${draft}`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || topic).replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;
    a.click();
  }

  // ── Queue actions ─────────────────────────────────────────────────────────

  function updateStatus(id: string, status: PRStatus) {
    const next = queue.map(p => p.id === id ? { ...p, status } : p);
    setQueue(next); saveQueue(next);
  }

  function deletePR(id: string) {
    const next = queue.filter(p => p.id !== id);
    setQueue(next); saveQueue(next);
  }

  function loadIntoEditor(pr: PressRelease) {
    setTitle(pr.title);
    setDraft(pr.content);
    const match = PR_TYPES.find(t => t.label === pr.type);
    if (match) setPrType(match.value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Sub-nav ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          {
            key:   "blog",
            label: "Blog Articles",
            desc:  "SEO articles, live on site",
            icon:  BookOpen,
            grad:  "from-[#A78BFA] to-[#7C3AED]",
            glow:  "rgba(167,139,250,0.2)",
            border:"rgba(167,139,250,0.4)",
            tag:   "AI + Live",
          },
          {
            key:   "press",
            label: "Press Releases",
            desc:  "AI-generated press copy",
            icon:  FileText,
            grad:  "from-[#60A5FA] to-[#3B82F6]",
            glow:  "rgba(96,165,250,0.2)",
            border:"rgba(96,165,250,0.4)",
            tag:   "Generator",
          },

          {
            key:   "social",
            label: "Social Copy",
            desc:  "FB, IG & LinkedIn AI posts",
            icon:  Instagram,
            grad:  "from-[#E1306C] to-[#833AB4]",
            glow:  "rgba(225,48,108,0.2)",
            border:"rgba(225,48,108,0.4)",
            tag:   "AI",
          },
          {
            key:   "one-sheet",
            label: "One-Sheet PDF",
            desc:  "Magazine-quality brochures",
            icon:  FileText,
            grad:  "from-[#F97316] to-[#EA580C]",
            glow:  "rgba(249,115,22,0.2)",
            border:"rgba(249,115,22,0.4)",
            tag:   "PDF",
          },
          {
            key:   "intel",
            label: "Market Intel",
            desc:  "AI relocation radar",
            icon:  Radar,
            grad:  "from-[#EF4444] to-[#F97316]",
            glow:  "rgba(239,68,68,0.2)",
            border:"rgba(239,68,68,0.4)",
            tag:   "Beta",
          },
        ] as const).map(({ key, label, desc, icon: Icon, grad, glow, border, tag }) => (
          <button
            key={key}
            onClick={() => switchSubTab(key as "press"|"blog"|"social"|"one-sheet"|"intel")}
            className={`relative text-left p-4 rounded-2xl border-2 transition-all duration-200 group overflow-hidden w-full ${
              subTab === key
                ? "bg-[rgba(255,255,255,0.04)]"
                : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.02)]"
            }`}
            style={subTab === key ? { borderColor: border, boxShadow: `0 0 24px ${glow}` } : {}}
          >
            {/* Active glow bg */}
            {subTab === key && (
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top left, ${glow.replace("0.2","1")} 0%, transparent 70%)` }} />
            )}
            <div className="flex items-start gap-3 relative">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <Icon size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <p className="text-sm font-black text-white whitespace-nowrap">{label}</p>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r ${grad} text-white opacity-80 whitespace-nowrap`}>{tag}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Blog Articles ── */}
      {subTab === "blog" && <BlogSection />}

      {/* Homepage Banner → moved to Content tab (HeroBannerManager) */}

      {/* ── One-Sheet PDF ── */}
      {subTab === "one-sheet" && <PropertyOneSheet />}

      {/* ── Press Releases ── */}
      {subTab === "press" && (<div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center">
            <FileText size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Press Release Generator</h2>
            <p className="text-[11px] text-gray-500">AI drafts your release — you review and approve before distribution</p>
          </div>
        </div>
      </div>

      {/* ── Generator Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left — inputs */}
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 space-y-4">
            <p className="text-xs font-black text-white uppercase tracking-widest">1. Configure</p>

            {/* Type */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Release Type</label>
              <select
                value={prType}
                onChange={e => setPrType(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(96,165,250,0.5)] outline-none appearance-none cursor-pointer"
              >
                {PR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">
                Property / Topic *
              </label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. 2,400 sqft Office Suite — Downtown Bristol"
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(96,165,250,0.5)] outline-none placeholder:text-gray-700"
              />
            </div>

            {/* Key details */}
            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">
                Key Details <span className="text-gray-700 font-normal normal-case">(optional — the more you give, the better the copy)</span>
              </label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={5}
                placeholder={"Location, square footage, amenities, lease terms, notable features, target tenant type, contact info..."}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(96,165,250,0.5)] outline-none resize-none placeholder:text-gray-700 leading-relaxed"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={generate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white font-black text-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {generating ? (
                <><Loader2 size={14} className="animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={14} /> Generate Press Release</>
              )}
            </button>
          </div>

          {/* Distribution tips */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-2">Free Distribution Channels</p>
            <div className="space-y-1.5">
              {[
                { name: "PRLog", url: "https://www.prlog.org", note: "Free press wire — solid Google News pickup" },
                { name: "PR.com", url: "https://www.pr.com", note: "Free basic distribution" },
                { name: "OpenPR", url: "https://www.openpr.com", note: "Free, good for commercial real estate" },
                { name: "PRFree", url: "https://www.prfree.org", note: "Free submission, fast indexing" },
              ].map(d => (
                <a key={d.name} href={d.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between group rounded-lg px-2.5 py-1.5 hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">{d.name}</span>
                  <span className="text-[10px] text-gray-600">{d.note}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right — draft */}
        <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-white uppercase tracking-widest">2. Review & Edit</p>
            {draft && (
              <div className="flex items-center gap-2">
                <button onClick={copyDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors">
                  {copied ? <><CheckCircle2 size={10} className="text-[#4ADE80]" /> Copied!</> : <><Copy size={10} /> Copy</>}
                </button>
                <button onClick={downloadDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors">
                  <Download size={10} /> .txt
                </button>
              </div>
            )}
          </div>

          {draft ? (
            <>
              {/* Title */}
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-[rgba(96,165,250,0.5)] outline-none"
                placeholder="Press release headline…"
              />
              {/* Body */}
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={18}
                className="flex-1 w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-gray-200 focus:border-[rgba(96,165,250,0.4)] outline-none resize-none leading-relaxed font-mono"
              />
              {/* Save */}
              <button
                onClick={saveDraft}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black font-black text-sm hover:opacity-90 transition-all"
              >
                {saved ? <><CheckCircle2 size={13} /> Saved to Queue!</> : <><FileText size={13} /> Save to Review Queue</>}
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.05)] text-gray-700 py-16">
              <Sparkles size={28} className="opacity-30" />
              <p className="text-sm text-center">AI-generated press release<br />will appear here for review</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Review Queue ── */}
      {queue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-gray-500" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Review Queue</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-gray-500 font-bold">
              {queue.length} release{queue.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {queue.map(pr => (
              <div key={pr.id} className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  onClick={() => setExpandedId(expandedId === pr.id ? null : pr.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white truncate">{pr.title}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase ${STATUS_STYLES[pr.status]}`}>
                        {pr.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {pr.type} · {new Date(pr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  {/* Status actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {pr.status === "draft" && (
                      <button onClick={() => updateStatus(pr.id, "approved")}
                        className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.2)] transition-colors">
                        Approve
                      </button>
                    )}
                    {pr.status === "approved" && (
                      <button onClick={() => updateStatus(pr.id, "published")}
                        className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-[rgba(96,165,250,0.12)] border border-[rgba(96,165,250,0.3)] text-[#60A5FA] hover:bg-[rgba(96,165,250,0.2)] transition-colors">
                        Mark Published
                      </button>
                    )}
                    <button onClick={() => loadIntoEditor(pr)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white transition-colors">
                      Edit
                    </button>
                    <button onClick={() => deletePR(pr.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(255,255,255,0.06)] text-gray-700 hover:text-red-400 hover:border-[rgba(239,68,68,0.3)] transition-colors">
                      <Trash2 size={11} />
                    </button>
                    <ChevronDown size={13} className={`text-gray-600 transition-transform ${expandedId === pr.id ? "rotate-180" : ""}`} />
                  </div>
                </div>
                {/* Expanded content */}
                {expandedId === pr.id && (
                  <div className="px-5 pb-5 border-t border-[rgba(255,255,255,0.04)]">
                    <pre className="mt-4 text-xs text-gray-400 whitespace-pre-wrap leading-relaxed font-mono bg-[rgba(0,0,0,0.3)] rounded-xl p-4 max-h-80 overflow-y-auto">
                      {pr.content}
                    </pre>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { navigator.clipboard.writeText(`${pr.title}\n\n${pr.content}`).catch(() => {}); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors">
                        <Copy size={10} /> Copy
                      </button>
                      <button onClick={() => {
                        const blob = new Blob([`${pr.title}\n\n${pr.content}`], { type: "text/plain" });
                        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                        a.download = `${pr.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`; a.click();
                      }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white transition-colors">
                        <Download size={10} /> Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}</div>)}{/* end press tab */}

      {/* ── Social Content Studio ── */}
      {subTab === "social" && (
        <div className="space-y-6">
          <SocialStudio />
        </div>
      )}{/* end social tab */}

      {/* ── Market Intel ── */}
      {subTab === "intel" && <MarketIntel />}

    </div>
  );
}

