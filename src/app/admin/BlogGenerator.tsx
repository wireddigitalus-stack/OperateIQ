"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Send, Globe, FileText, Trash2, Eye, EyeOff, ChevronDown, RefreshCw } from "lucide-react";
import { PROPERTIES } from "@/lib/data";

const CATEGORIES = ["Market Insights","Investment","Coworking","Office Space","Retail","Industrial","Development","Executive Advisement","Tri-Cities News"];

interface BlogPost {
  id: string;
  title: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  category: string;
  tags: string[];
  read_time: number;
  content: string;
  status: "draft" | "published";
  published_at: string;
  created_at: string;
}

const FIELD  = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(96,165,250,0.4)] outline-none placeholder:text-gray-600";
const LABEL  = "text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5";

export default function BlogGenerator() {
  const [topic,    setTopic]    = useState("");
  const [keyword,  setKeyword]  = useState("");
  const [category, setCategory] = useState("Market Insights");
  const [property, setProperty] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft]       = useState<BlogPost | null>(null);
  const [queue, setQueue]       = useState<BlogPost[]>([]);
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [preview, setPreview]   = useState<string | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);

  useEffect(() => { fetchQueue(); }, []);

  async function fetchQueue() {
    setLoadingQueue(true);
    try {
      const res = await fetch("/api/blog-posts?all=1");
      const d   = await res.json();
      if (Array.isArray(d.posts)) setQueue(d.posts);
    } finally { setLoadingQueue(false); }
  }

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic first."); return; }
    setGenerating(true); setError(""); setDraft(null);
    try {
      const res = await fetch("/api/generate-blog-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keyword, category, property }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Generation failed");
      const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
      setDraft({
        id: "", title: d.article.title, meta_title: d.article.metaTitle,
        meta_description: d.article.metaDescription, excerpt: d.article.excerpt,
        category, tags: d.article.tags || [], read_time: d.article.readTime || 5,
        content: d.article.content, status: "draft",
        published_at: new Date().toISOString(), created_at: new Date().toISOString(),
        // @ts-expect-error slug field for saving
        slug,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  }

  async function saveToDB(status: "draft" | "published") {
    if (!draft) return;
    setSaving(true); setError("");
    try {
      const slug = (draft as BlogPost & { slug: string }).slug || `article-${Date.now()}`;
      const res = await fetch("/api/blog-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, title: draft.title, meta_title: draft.meta_title,
          meta_description: draft.meta_description, excerpt: draft.excerpt,
          category: draft.category, tags: draft.tags, read_time: draft.read_time,
          content: draft.content, status,
          published_at: new Date().toISOString(),
          author: "Vision LLC", author_title: "Commercial Real Estate",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      setDraft(null); setTopic(""); setKeyword(""); setProperty("");
      await fetchQueue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function togglePublish(post: BlogPost) {
    const newStatus = post.status === "published" ? "draft" : "published";
    await fetch(`/api/blog-posts?id=${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setQueue(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
  }

  async function deletePost(id: string) {
    await fetch(`/api/blog-posts?id=${id}`, { method: "DELETE" });
    setQueue(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Generator form */}
      <div className="rounded-2xl border border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.03)] p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center">
            <FileText size={14} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-[#60A5FA] uppercase tracking-widest">Blog Article Generator</p>
            <p className="text-[11px] text-gray-600">AI writes SEO-optimised, publication-ready articles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className={LABEL}>Article Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} className={FIELD}
              placeholder="e.g. Why Downtown Bristol TN is the Best Place to Open a Business in 2026" />
          </div>
          <div>
            <label className={LABEL}>Target Keyword</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} className={FIELD}
              placeholder="e.g. commercial real estate Bristol TN" />
          </div>
          <div>
            <label className={LABEL}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={FIELD} style={{ colorScheme: "dark" }}>
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#080C14]">{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Feature a Property <span className="text-gray-700 font-normal normal-case">(optional)</span></label>
            <select value={property} onChange={e => setProperty(e.target.value)} className={FIELD} style={{ colorScheme: "dark" }}>
              <option value="" className="bg-[#080C14]">None — general article</option>
              {PROPERTIES.map(p => <option key={p.id} value={p.name} className="bg-[#080C14]">{p.name}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button onClick={generate} disabled={generating || !topic.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white font-black text-sm hover:opacity-90 disabled:opacity-50 transition-all">
          {generating ? <><Loader2 size={14} className="animate-spin" /> Generating Article…</> : <><Sparkles size={14} /> Generate Article</>}
        </button>
      </div>

      {/* Draft preview */}
      {draft && (
        <div className="rounded-2xl border border-[rgba(96,165,250,0.3)] bg-[rgba(96,165,250,0.04)] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[#60A5FA] font-black uppercase tracking-widest mb-1">Draft Ready for Review</p>
              <h3 className="text-white font-bold text-sm leading-snug">{draft.title}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{draft.category} · ~{draft.read_time} min read · {draft.tags.slice(0,3).join(" · ")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <p className="text-gray-600 text-[10px] mb-0.5">Meta Title</p>
              <p className="text-gray-300">{draft.meta_title}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <p className="text-gray-600 text-[10px] mb-0.5">Meta Description</p>
              <p className="text-gray-300">{draft.meta_description}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <p className="text-gray-600 text-[10px] mb-0.5">Excerpt</p>
              <p className="text-gray-300">{draft.excerpt}</p>
            </div>
          </div>

          {/* Content preview toggle */}
          <button onClick={() => setPreview(prev => prev === "draft" ? null : "draft")}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
            {preview === "draft" ? <EyeOff size={11} /> : <Eye size={11} />}
            {preview === "draft" ? "Hide" : "Preview"} article content
            <ChevronDown size={11} className={`transition-transform ${preview === "draft" ? "rotate-180" : ""}`} />
          </button>
          {preview === "draft" && (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 max-h-80 overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none text-gray-300 text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: draft.content }} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => saveToDB("published")} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-xs font-black hover:opacity-90 disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
              Publish to Blog
            </button>
            <button onClick={() => saveToDB("draft")} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgba(96,165,250,0.3)] text-[#60A5FA] text-xs font-bold hover:bg-[rgba(96,165,250,0.1)] transition-all">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              Save as Draft
            </button>
            <button onClick={() => setDraft(null)} className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-xs hover:text-white transition-colors">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Article Queue */}
      {(queue.length > 0 || loadingQueue) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <FileText size={11} /> Article Queue ({queue.length})
            </p>
            <button onClick={fetchQueue} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors">
              <RefreshCw size={12} className={loadingQueue ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="space-y-2">
            {queue.map(post => (
              <div key={post.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.12)] transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{post.title}</p>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-gray-600">
                    <span>{post.category}</span>
                    <span>·</span>
                    <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  post.status === "published"
                    ? "text-[#4ADE80] border-[rgba(74,222,128,0.4)] bg-[rgba(74,222,128,0.1)]"
                    : "text-gray-500 border-[rgba(255,255,255,0.1)]"
                }`}>
                  {post.status === "published" ? "LIVE" : "DRAFT"}
                </span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => togglePublish(post)} title={post.status === "published" ? "Unpublish" : "Publish"}
                    className={`p-1.5 rounded-lg border transition-all text-xs ${
                      post.status === "published"
                        ? "border-[rgba(74,222,128,0.3)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.1)]"
                        : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-[#4ADE80] hover:border-[rgba(74,222,128,0.3)]"
                    }`}>
                    <Globe size={11} />
                  </button>
                  <button onClick={() => deletePost(post.id)} title="Delete"
                    className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-red-400 hover:border-red-500/30 transition-all">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
