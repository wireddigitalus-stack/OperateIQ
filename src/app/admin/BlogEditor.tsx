"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Globe, Eye, EyeOff, Save, X,
  Loader2, RefreshCw, ImageIcon, ChevronDown, ChevronRight,
  CheckCircle2, ArrowLeft, FileText, Tag, Clock, AlertCircle,
  ExternalLink, Upload, Image as ImageLucide, DownloadCloud, Sparkles,
  Wand2, Info, RotateCcw, ChevronUp,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Market Insights", "Investment", "Coworking", "Office Space",
  "Retail", "Industrial", "Development", "Executive Advisement", "Tri-Cities News",
];

interface BlogPost {
  id: string;
  slug: string;
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
  author: string;
  author_title: string;
  image_url?: string;
  image_alt?: string;
}

const EMPTY_POST: Omit<BlogPost, "id" | "created_at" | "published_at"> = {
  slug: "",
  title: "",
  meta_title: "",
  meta_description: "",
  excerpt: "",
  category: "Market Insights",
  tags: [],
  read_time: 5,
  content: "",
  status: "draft",
  author: "Vision LLC",
  author_title: "Commercial Real Estate",
  image_url: "",
  image_alt: "",
};

const FIELD = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(167,139,250,0.5)] outline-none placeholder:text-gray-600 transition-colors";
const LABEL = "text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Static Posts Seed Data ───────────────────────────────────────────────────

const STATIC_POSTS = [
  {
    slug: "downtown-bristol-tn-commercial-real-estate-market-2026",
    title: "Downtown Bristol, TN Commercial Real Estate Market Outlook 2026",
    meta_title: "Downtown Bristol TN Commercial Real Estate Market Outlook 2026 | Vision LLC",
    meta_description: "Deep dive into the 2025 commercial real estate market in Downtown Bristol, TN.",
    category: "Market Reports",
    tags: ["Bristol TN", "Market Report", "Commercial Real Estate", "Tri-Cities"],
    read_time: 6,
    published_at: "2026-04-01T00:00:00.000Z",
    author: "Vision LLC Team",
    author_title: "Commercial Real Estate Experts — Tri-Cities, TN",
    image_url: "/images/Hard_Rock_Bristol_VA.jpg",
    image_alt: "Hard Rock Hotel & Casino Bristol, Virginia",
    excerpt: "Downtown Bristol, TN is experiencing one of its most dynamic commercial real estate cycles in two decades.",
    status: "published" as const,
  },
  {
    slug: "coworking-vs-traditional-office-tri-cities-tennessee",
    title: "Coworking vs. Traditional Office Space in the Tri-Cities: What's Right for Your Business?",
    meta_title: "Coworking vs Traditional Office Space Tri-Cities TN | Bristol CoWork | Vision LLC",
    meta_description: "Comparing coworking memberships vs. traditional commercial leases in the Tri-Cities.",
    category: "Business Insights",
    tags: ["Coworking", "Bristol TN", "Office Space", "Tri-Cities", "Small Business"],
    read_time: 5,
    published_at: "2026-04-04T00:00:00.000Z",
    author: "Vision LLC Team",
    author_title: "Commercial Real Estate Experts — Tri-Cities, TN",
    image_url: "",
    image_alt: "",
    excerpt: "For growing businesses in the Tri-Cities, the choice between a coworking membership and a traditional lease is more nuanced than ever.",
    status: "published" as const,
  },
  {
    slug: "historic-adaptive-reuse-downtown-bristol-tennessee",
    title: "Historic Adaptive Reuse: How Vision LLC Is Transforming Downtown Bristol, TN",
    meta_title: "Historic Adaptive Reuse Downtown Bristol TN | Vision LLC Development",
    meta_description: "How Vision LLC is leading the historic adaptive reuse movement in Downtown Bristol, TN.",
    category: "Development",
    tags: ["Historic Preservation", "Adaptive Reuse", "Bristol TN", "Development"],
    read_time: 6,
    published_at: "2026-04-07T00:00:00.000Z",
    author: "Vision LLC Team",
    author_title: "Commercial Real Estate Experts — Tri-Cities, TN",
    image_url: "",
    image_alt: "",
    excerpt: "Vision LLC has spent over 20 years converting historic downtown Bristol buildings into premium commercial assets.",
    status: "published" as const,
  },
  {
    slug: "top-industries-driving-commercial-real-estate-kingsport-johnson-city",
    title: "Top Industries Driving Commercial Real Estate Demand in Kingsport & Johnson City, TN",
    meta_title: "Industries Driving Commercial Real Estate Kingsport & Johnson City TN | Vision LLC",
    meta_description: "Eastman Chemical, ETSU, Ballad Health, and defense contractors are fueling office and industrial demand.",
    category: "Market Reports",
    tags: ["Kingsport TN", "Johnson City TN", "Market Report", "Industrial", "Tri-Cities"],
    read_time: 6,
    published_at: "2026-04-10T00:00:00.000Z",
    author: "Vision LLC Team",
    author_title: "Commercial Real Estate Experts — Tri-Cities, TN",
    image_url: "",
    image_alt: "",
    excerpt: "The Tri-Cities commercial real estate market is being shaped by five dominant industries.",
    status: "published" as const,
  },
  {
    slug: "executive-business-consulting-northeast-tennessee-2026",
    title: "Executive Business Consulting in Northeast Tennessee: What CEOs Need in 2025",
    meta_title: "Executive Business Consulting Northeast Tennessee 2025 | Vision LLC Advisement",
    meta_description: "Vision LLC's Executive Advisement division offers C-suite strategy, site selection, and market entry consulting.",
    category: "Executive Advisement",
    tags: ["Executive Consulting", "Business Strategy", "Tri-Cities", "Tennessee"],
    read_time: 7,
    published_at: "2026-04-14T00:00:00.000Z",
    author: "Vision LLC Team",
    author_title: "Executive Advisement Division — Vision LLC",
    image_url: "",
    image_alt: "",
    excerpt: "The Tri-Cities region is an underappreciated strategic market in 2025.",
    status: "published" as const,
  },
];

// ─── Static Posts Import Banner ───────────────────────────────────────────────

function StaticPostsImportBanner({ dbSlugs, onImported }: { dbSlugs: Set<string>; onImported: () => void }) {
  const unimported = STATIC_POSTS.filter(p => !dbSlugs.has(p.slug));
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ imported: string[]; skipped: string[]; errors: string[] } | null>(null);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || unimported.length === 0) return null;

  async function importAll() {
    setImporting(true); setError("");
    try {
      const res = await fetch("/api/blog-import-static", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data); setDone(true); onImported();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally { setImporting(false); }
  }

  if (done && result) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[rgba(74,222,128,0.07)] border border-[rgba(74,222,128,0.25)]">
        <CheckCircle2 size={15} className="text-[#4ADE80] flex-shrink-0" />
        <p className="text-xs text-[#4ADE80] font-bold">
          {result.imported.length} article{result.imported.length !== 1 ? "s" : ""} imported with full content — fully editable now.
          {result.skipped.length > 0 && ` (${result.skipped.length} already existed)`}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgba(250,204,21,0.25)] bg-[rgba(250,204,21,0.04)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={13} className="text-[#FACC15]" />
          </div>
          <div>
            <p className="text-xs font-black text-[#FACC15] uppercase tracking-widest mb-1">
              {unimported.length} article{unimported.length !== 1 ? "s" : ""} not yet editable
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              These posts are hardwired in the site code and can&apos;t be edited here yet:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {unimported.map(p => (
                <span key={p.slug} className="text-[10px] px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-gray-500">
                  {p.title.length > 40 ? p.title.slice(0, 40) + "…" : p.title}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-2">
              Click import to move them into the database — after that you can edit, update photos, and manage them exactly like any other post.
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-gray-700 hover:text-gray-400 transition-colors flex-shrink-0">
          <X size={13} />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400 mt-2 ml-11">{error}</p>}
      <div className="flex items-center gap-2 mt-3 ml-11">
        <button onClick={importAll} disabled={importing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F59E0B] text-black text-xs font-black hover:opacity-90 transition-all disabled:opacity-50">
          {importing ? <Loader2 size={12} className="animate-spin" /> : <DownloadCloud size={12} />}
          {importing ? "Importing…" : `Import ${unimported.length} Article${unimported.length !== 1 ? "s" : ""} to Database`}
        </button>
        <button onClick={() => setDismissed(true)} className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
          Remind me later
        </button>
      </div>
    </div>
  );
}

// ─── Client-Side Image Compression ───────────────────────────────────────────

async function compressImage(file: File): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const originalSize = file.size;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_W = 1200, MAX_H = 675;
        let { width, height } = img;
        if (width > MAX_W || height > MAX_H) {
          const ratio = Math.min(MAX_W / width, MAX_H / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => {
            if (!blob) { reject(new Error("Compression failed")); return; }
            resolve({ blob, originalSize, compressedSize: blob.size });
          },
          "image/webp", 0.82
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── Image Library Types ──────────────────────────────────────────────────────

interface LibraryImage {
  url: string;
  label: string;
  source: "static" | "property-upload" | "blog-upload";
  thumbnail: string;
}

// ─── Image Source Picker (Upload / Library / URL tabs) ────────────────────────

function ImageSourcePicker({
  onUploadClick, onUrlChange, currentUrl,
  onDrop, onDragOver, onDragLeave, dragging, uploadError, onRetry,
}: {
  onUploadClick: () => void;
  onUrlChange: (url: string) => void;
  currentUrl: string;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  dragging: boolean;
  uploadError: string;
  onRetry: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "library" | "url">("upload");
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "property-upload" | "blog-upload" | "static">("all");
  const [selectedUrl, setSelectedUrl] = useState("");

  async function fetchLibrary() {
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/image-library");
      const data = await res.json();
      if (Array.isArray(data.images)) setLibrary(data.images);
    } finally { setLibraryLoading(false); }
  }

  useEffect(() => {
    if (tab === "library" && library.length === 0) fetchLibrary();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredLibrary = library
    .filter(img => libraryFilter === "all" || img.source === libraryFilter)
    .filter(img => !librarySearch || img.label.toLowerCase().includes(librarySearch.toLowerCase()) || img.url.toLowerCase().includes(librarySearch.toLowerCase()));

  function sourceBadge(s: LibraryImage["source"]) {
    if (s === "blog-upload")    return { text: "Blog",     cls: "text-[#A78BFA] border-[rgba(167,139,250,0.4)]" };
    if (s === "property-upload") return { text: "Uploaded", cls: "text-[#60A5FA] border-[rgba(96,165,250,0.4)]" };
    return { text: "Site", cls: "text-[#4ADE80] border-[rgba(74,222,128,0.4)]" };
  }

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden bg-[rgba(255,255,255,0.01)]">
      {/* Tab bar */}
      <div className="flex border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
        {([
          { key: "upload" as const,  label: "Upload New",        icon: Upload },
          { key: "library" as const, label: "Pick from Library", icon: ImageLucide },
          { key: "url" as const,     label: "Paste URL",         icon: ExternalLink },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold transition-all border-b-2 ${
              tab === key
                ? "text-[#A78BFA] border-[#A78BFA] bg-[rgba(167,139,250,0.05)]"
                : "text-gray-600 border-transparent hover:text-gray-400"
            }`}>
            <Icon size={11} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{key === "library" ? "Library" : label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          className={`transition-colors ${dragging ? "bg-[rgba(167,139,250,0.06)]" : ""}`}>
          {uploadError ? (
            <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-red-950/50 border border-red-900/50 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-300">Upload failed</p>
                <p className="text-xs text-red-500 mt-0.5">{uploadError}</p>
              </div>
              <button type="button" onClick={onRetry}
                className="px-4 py-2 rounded-xl border border-red-800/50 text-red-400 text-xs font-bold hover:bg-red-950/30 transition-colors">
                Try Again
              </button>
            </div>
          ) : (
            <button type="button" onClick={onUploadClick}
              className="w-full flex flex-col items-center justify-center gap-3 py-10 px-6 text-center hover:bg-[rgba(167,139,250,0.03)] transition-colors">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-colors ${
                dragging ? "bg-[rgba(167,139,250,0.2)] border-[#A78BFA]" : "bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.2)]"
              }`}>
                <Upload size={20} className="text-[#A78BFA]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-300">{dragging ? "Drop to upload" : "Upload a photo"}</p>
                <p className="text-xs text-gray-600 mt-0.5">From camera roll, or drag & drop here</p>
                <p className="text-[10px] text-gray-700 mt-2">iPhone photos auto-compressed · 8 MB → ~120 KB</p>
              </div>
              <span className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white text-xs font-black shadow-lg shadow-[rgba(167,139,250,0.2)]">
                <Upload size={12} /> Choose Photo
              </span>
            </button>
          )}
        </div>
      )}

      {/* Library tab */}
      {tab === "library" && (
        <div className="p-3 space-y-3">
          <div className="flex gap-2 items-center">
            <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Search images…"
              className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-xs text-white focus:border-[rgba(167,139,250,0.4)] outline-none placeholder:text-gray-700 transition-colors" />
            <button onClick={fetchLibrary} type="button"
              className="p-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-white transition-colors">
              <RefreshCw size={12} className={libraryLoading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: "all" as const,              label: `All (${library.length})` },
              { key: "blog-upload" as const,      label: "Blog Uploads" },
              { key: "property-upload" as const,  label: "Property Uploads" },
              { key: "static" as const,           label: "Site Photos" },
            ]).map(f => (
              <button key={f.key} type="button" onClick={() => setLibraryFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  libraryFilter === f.key
                    ? "bg-[rgba(167,139,250,0.15)] text-[#A78BFA] border-[rgba(167,139,250,0.4)]"
                    : "text-gray-600 border-[rgba(255,255,255,0.07)] hover:text-gray-400"
                }`}>{f.label}</button>
            ))}
          </div>
          {libraryLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-600">
              <Loader2 size={16} className="animate-spin text-[#A78BFA]" />
              <span className="text-xs">Loading library…</span>
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-600">No images found</p>
              <p className="text-[10px] text-gray-700 mt-1">Upload photos first, or try a different filter.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredLibrary.map(img => {
                  const isSelected = selectedUrl === img.url;
                  const badge = sourceBadge(img.source);
                  return (
                    <button key={img.url} type="button"
                      onClick={() => setSelectedUrl(isSelected ? "" : img.url)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square group ${
                        isSelected
                          ? "border-[#A78BFA] shadow-lg shadow-[rgba(167,139,250,0.3)]"
                          : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(167,139,250,0.4)]"
                      }`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.thumbnail} alt={img.label} className="w-full h-full object-cover" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                      <span className={`absolute top-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded border bg-[rgba(10,15,25,0.85)] ${badge.cls}`}>
                        {badge.text}
                      </span>
                      {isSelected && (
                        <div className="absolute inset-0 bg-[rgba(167,139,250,0.3)] flex items-center justify-center">
                          <CheckCircle2 size={20} className="text-white drop-shadow" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[8px] text-gray-300 leading-tight line-clamp-2">{img.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedUrl && (
                <button type="button" onClick={() => { onUrlChange(selectedUrl); setSelectedUrl(""); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white text-xs font-black hover:opacity-90 transition-all shadow-lg shadow-[rgba(167,139,250,0.2)]">
                  <CheckCircle2 size={13} /> Use Selected Image
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* URL tab */}
      {tab === "url" && (
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-gray-600">Paste any public image URL from your website, Google Drive, Unsplash, or anywhere else.</p>
          <input value={currentUrl} onChange={e => onUrlChange(e.target.value)} className={FIELD}
            placeholder="https://example.com/photo.jpg" autoFocus />
          {currentUrl && (
            <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] max-h-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentUrl} alt="Preview" className="w-full h-40 object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI SEO Panel ────────────────────────────────────────────────────────────

interface SeoResult {
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  enhancedContent: string;
  seoNotes: string;
}

function AiSeoPanel({
  form,
  onApply,
}: {
  form: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    meta_title: string;
    meta_description: string;
    excerpt: string;
  };
  onApply: (updates: {
    meta_title?: string;
    meta_description?: string;
    excerpt?: string;
    content?: string;
  }) => void;
}) {
  type Phase = "idle" | "running" | "review" | "error";
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<SeoResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [accepted, setAccepted] = useState<Record<string, boolean>>({
    metaTitle: true,
    metaDescription: true,
    excerpt: true,
    content: false, // content enhancement requires explicit opt-in
  });
  const [showNotes, setShowNotes] = useState(false);
  const [showContentDiff, setShowContentDiff] = useState(false);

  const hasContent = form.title.trim().length > 0 && form.content.trim().length > 50;

  async function runAi() {
    if (!hasContent) return;
    setPhase("running");
    setResult(null);
    setErrorMsg("");
    setShowNotes(false);
    setShowContentDiff(false);
    setAccepted({ metaTitle: true, metaDescription: true, excerpt: true, content: false });
    try {
      const res = await fetch("/api/blog-seo-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category,
          tags: form.tags,
          currentMeta: form.meta_description,
          currentExcerpt: form.excerpt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.metaTitle) throw new Error(data.error || "AI returned no data");
      setResult(data);
      setPhase("review");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPhase("error");
    }
  }

  function applySelected() {
    if (!result) return;
    const updates: { meta_title?: string; meta_description?: string; excerpt?: string; content?: string } = {};
    if (accepted.metaTitle)     updates.meta_title     = result.metaTitle;
    if (accepted.metaDescription) updates.meta_description = result.metaDescription;
    if (accepted.excerpt)       updates.excerpt        = result.excerpt;
    if (accepted.content)       updates.content        = result.enhancedContent;
    onApply(updates);
    setPhase("idle");
    setResult(null);
  }

  const metaDescLen = result?.metaDescription?.length ?? 0;
  const metaTitleLen = result?.metaTitle?.length ?? 0;

  // ── Idle state ──
  if (phase === "idle") {
    return (
      <div className="rounded-2xl border border-[rgba(139,92,246,0.25)] bg-gradient-to-br from-[rgba(139,92,246,0.05)] to-[rgba(167,139,250,0.03)] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[rgba(124,58,237,0.3)]">
              <Wand2 size={16} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-[#C4B5FD] uppercase tracking-widest">AI SEO Assistant</p>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(167,139,250,0.15)] border border-[rgba(167,139,250,0.3)] text-[#A78BFA] font-bold">Gemini</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                Auto-generates optimised meta title, meta description, excerpt, and suggests local geo SEO enhancements — you review and choose what to apply.
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-600">
                <span className="flex items-center gap-1"><CheckCircle2 size={9} className="text-[#4ADE80]" /> Meta title & description</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={9} className="text-[#4ADE80]" /> Excerpt</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={9} className="text-[#4ADE80]" /> Geo SEO content refinement</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={runAi}
            disabled={!hasContent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white text-xs font-black hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[rgba(124,58,237,0.25)] flex-shrink-0"
          >
            <Wand2 size={13} /> Run AI SEO
          </button>
        </div>
        {!hasContent && (
          <p className="text-[10px] text-gray-700 mt-3 ml-13 pl-0.5">
            Add a title and article content first — the AI needs the full text to generate accurate SEO metadata.
          </p>
        )}
      </div>
    );
  }

  // ── Running state ──
  if (phase === "running") {
    return (
      <div className="rounded-2xl border border-[rgba(139,92,246,0.25)] bg-gradient-to-br from-[rgba(139,92,246,0.05)] to-[rgba(167,139,250,0.03)] p-6 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[rgba(124,58,237,0.3)]">
            <Wand2 size={18} className="text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#080C14] border border-[rgba(167,139,250,0.3)] flex items-center justify-center">
            <Loader2 size={11} className="animate-spin text-[#A78BFA]" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white">AI is reading your article…</p>
          <p className="text-[11px] text-gray-500 mt-1">Analysing content, generating meta tags, and identifying geo SEO opportunities</p>
        </div>
        <div className="flex gap-1.5">
          {["Meta title", "Meta description", "Excerpt", "Geo SEO"].map((step, i) => (
            <span key={step} className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
              i === 0 ? "text-[#A78BFA] border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.1)]" : "text-gray-700 border-[rgba(255,255,255,0.06)]"
            }`}>{step}</span>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (phase === "error") {
    return (
      <div className="rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.04)] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-red-950/50 border border-red-900/50 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={14} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-300">AI SEO generation failed</p>
            <p className="text-[11px] text-red-500 mt-0.5">{errorMsg}</p>
          </div>
        </div>
        <button type="button" onClick={runAi}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-800/50 text-red-400 text-xs font-bold hover:bg-red-950/30 transition-colors">
          <RotateCcw size={11} /> Try Again
        </button>
      </div>
    );
  }

  // ── Review state ──
  if (!result) return null;
  return (
    <div className="rounded-2xl border border-[rgba(139,92,246,0.3)] bg-gradient-to-br from-[rgba(139,92,246,0.06)] to-[rgba(167,139,250,0.03)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[rgba(139,92,246,0.15)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center flex-shrink-0">
            <Wand2 size={12} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-[#C4B5FD] uppercase tracking-widest">AI SEO Results</p>
            <p className="text-[10px] text-gray-600">Select which suggestions to apply — then click Apply Selected</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setPhase("idle"); setResult(null); }}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 transition-colors" title="Discard all">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Meta Title */}
        <div className={`rounded-xl border p-4 transition-all ${
          accepted.metaTitle ? "border-[rgba(167,139,250,0.35)] bg-[rgba(167,139,250,0.05)]" : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.01)] opacity-60"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Meta Title</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  metaTitleLen > 60 ? "text-yellow-400 bg-yellow-950/40" :
                  metaTitleLen >= 50 ? "text-[#4ADE80] bg-[rgba(74,222,128,0.08)]" : "text-gray-500"
                }`}>{metaTitleLen}/60 chars</span>
              </div>
              <p className="text-sm text-white font-medium leading-snug">{result.metaTitle}</p>
              {form.meta_title && (
                <p className="text-[10px] text-gray-600 mt-1.5 line-through">{form.meta_title}</p>
              )}
            </div>
            <button type="button" onClick={() => setAccepted(a => ({ ...a, metaTitle: !a.metaTitle }))}
              className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                accepted.metaTitle ? "bg-[#A78BFA] border-[#A78BFA]" : "border-[rgba(255,255,255,0.15)]"
              }`}>
              {accepted.metaTitle && <CheckCircle2 size={14} className="text-white" />}
            </button>
          </div>
        </div>

        {/* Meta Description */}
        <div className={`rounded-xl border p-4 transition-all ${
          accepted.metaDescription ? "border-[rgba(167,139,250,0.35)] bg-[rgba(167,139,250,0.05)]" : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.01)] opacity-60"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Meta Description</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  metaDescLen > 160 ? "text-red-400 bg-red-950/40" :
                  metaDescLen >= 145 ? "text-[#4ADE80] bg-[rgba(74,222,128,0.08)]" : "text-yellow-400 bg-yellow-950/40"
                }`}>{metaDescLen}/155 chars</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  metaDescLen >= 145 && metaDescLen <= 160 ? "text-[#4ADE80]" : "text-yellow-400"
                }`}>{metaDescLen >= 145 && metaDescLen <= 160 ? "✓ Optimal" : "Review length"}</span>
              </div>
              <p className="text-sm text-white leading-relaxed">{result.metaDescription}</p>
              {form.meta_description && (
                <p className="text-[10px] text-gray-600 mt-1.5 line-through leading-relaxed">{form.meta_description}</p>
              )}
            </div>
            <button type="button" onClick={() => setAccepted(a => ({ ...a, metaDescription: !a.metaDescription }))}
              className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                accepted.metaDescription ? "bg-[#A78BFA] border-[#A78BFA]" : "border-[rgba(255,255,255,0.15)]"
              }`}>
              {accepted.metaDescription && <CheckCircle2 size={14} className="text-white" />}
            </button>
          </div>
        </div>

        {/* Excerpt */}
        <div className={`rounded-xl border p-4 transition-all ${
          accepted.excerpt ? "border-[rgba(167,139,250,0.35)] bg-[rgba(167,139,250,0.05)]" : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.01)] opacity-60"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Excerpt</p>
              <p className="text-sm text-white leading-relaxed">{result.excerpt}</p>
              {form.excerpt && (
                <p className="text-[10px] text-gray-600 mt-1.5 line-through leading-relaxed">{form.excerpt}</p>
              )}
            </div>
            <button type="button" onClick={() => setAccepted(a => ({ ...a, excerpt: !a.excerpt }))}
              className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                accepted.excerpt ? "bg-[#A78BFA] border-[#A78BFA]" : "border-[rgba(255,255,255,0.15)]"
              }`}>
              {accepted.excerpt && <CheckCircle2 size={14} className="text-white" />}
            </button>
          </div>
        </div>

        {/* Geo-enhanced Content */}
        <div className={`rounded-xl border p-4 transition-all ${
          accepted.content ? "border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.04)]" : "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.01)]"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Geo SEO Content Enhancement</p>
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-[rgba(250,204,21,0.4)] text-yellow-400 bg-[rgba(250,204,21,0.06)] font-bold">Review carefully</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Same article, same voice — with local geographic terms woven in naturally. Your original is not lost — toggle to compare.
              </p>
              <button type="button" onClick={() => setShowContentDiff(p => !p)}
                className="flex items-center gap-1.5 mt-2 text-[11px] text-[#A78BFA] hover:text-white transition-colors">
                {showContentDiff ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showContentDiff ? "Hide" : "Preview"} enhanced content
              </button>
              {showContentDiff && (
                <div className="mt-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] p-3 max-h-52 overflow-y-auto">
                  <div className="prose prose-invert prose-xs max-w-none text-gray-400 text-[11px] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: result.enhancedContent }} />
                </div>
              )}
            </div>
            <button type="button" onClick={() => setAccepted(a => ({ ...a, content: !a.content }))}
              className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                accepted.content ? "bg-[#4ADE80] border-[#4ADE80]" : "border-[rgba(255,255,255,0.15)]"
              }`}>
              {accepted.content && <CheckCircle2 size={14} className="text-black" />}
            </button>
          </div>
        </div>

        {/* SEO Notes */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] p-3">
          <button type="button" onClick={() => setShowNotes(p => !p)}
            className="flex items-center gap-2 w-full text-left">
            <Info size={11} className="text-gray-600 flex-shrink-0" />
            <p className="text-[10px] text-gray-600 flex-1">{showNotes ? "Hide" : "Show"} what the AI changed and why</p>
            {showNotes ? <ChevronUp size={10} className="text-gray-700" /> : <ChevronDown size={10} className="text-gray-700" />}
          </button>
          {showNotes && (
            <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
              <p className="text-[11px] text-gray-500 whitespace-pre-line leading-relaxed">{result.seoNotes}</p>
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={() => { setPhase("idle"); setResult(null); }}
            className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">Discard all</button>
          <div className="flex gap-2 items-center">
            <button type="button" onClick={runAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(167,139,250,0.3)] text-[#A78BFA] text-[11px] font-bold hover:bg-[rgba(167,139,250,0.08)] transition-all">
              <RotateCcw size={10} /> Re-run AI
            </button>
            <button type="button" onClick={applySelected}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white text-xs font-black hover:opacity-90 transition-all shadow-lg shadow-[rgba(124,58,237,0.25)]">
              <CheckCircle2 size={13} /> Apply Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Blog Image Uploader ──────────────────────────────────────────────────────

interface UploadState {
  phase: "idle" | "compressing" | "uploading" | "done" | "error";
  progress: number;
  originalSize: number;
  compressedSize: number;
  error: string;
}

function BlogImageUploader({ currentUrl, currentAlt, onUrlChange, onAltChange }: {
  currentUrl: string;
  currentAlt: string;
  onUrlChange: (url: string) => void;
  onAltChange: (alt: string) => void;
}) {
  const [upload, setUpload] = useState<UploadState>({ phase: "idle", progress: 0, originalSize: 0, compressedSize: 0, error: "" });
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
      setUpload(u => ({ ...u, phase: "error", error: "Please select an image file." }));
      return;
    }
    try {
      setUpload({ phase: "compressing", progress: 20, originalSize: file.size, compressedSize: 0, error: "" });
      const { blob, originalSize, compressedSize } = await compressImage(file);
      setUpload(u => ({ ...u, phase: "uploading", progress: 60, compressedSize }));
      const form = new FormData();
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      form.append("file", blob, `blog-${Date.now()}.${ext}`);
      const res = await fetch("/api/blog-images", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setUpload({ phase: "done", progress: 100, originalSize, compressedSize, error: "" });
      onUrlChange(data.url);
    } catch (e: unknown) {
      setUpload(u => ({ ...u, phase: "error", progress: 0, error: e instanceof Error ? e.message : "Upload failed" }));
    }
  }, [onUrlChange]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; };
  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }, [handleFile]);
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const savings = upload.originalSize > 0 ? Math.round((1 - upload.compressedSize / upload.originalSize) * 100) : 0;
  const hasImage = !!currentUrl;

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onInputChange} />

      {/* Current image preview */}
      {hasImage && (
        <div className="relative rounded-2xl border-2 border-[rgba(167,139,250,0.2)] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt={currentAlt || "Featured image"} className="w-full h-48 object-cover"
            onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#A78BFA] text-white text-xs font-black hover:bg-[#9333ea] transition-colors">
              <Upload size={12} /> Upload New
            </button>
            <button type="button" onClick={() => { onUrlChange(""); setUpload(u => ({ ...u, phase: "idle" })); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/80 text-white text-xs font-black hover:bg-red-600 transition-colors">
              <X size={12} /> Remove
            </button>
          </div>
          {upload.phase === "done" && upload.originalSize > 0 && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(10,15,25,0.85)] border border-[rgba(74,222,128,0.3)]">
              <CheckCircle2 size={11} className="text-[#4ADE80] flex-shrink-0" />
              <p className="text-[10px] text-[#4ADE80]">
                {formatBytes(upload.originalSize)} → {formatBytes(upload.compressedSize)} <span className="font-black">({savings}% smaller)</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Uploading spinner */}
      {!hasImage && (upload.phase === "compressing" || upload.phase === "uploading") && (
        <div className="rounded-2xl border-2 border-[rgba(167,139,250,0.3)] bg-[rgba(167,139,250,0.04)] flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin text-[#A78BFA]" />
          <div className="text-center">
            <p className="text-sm font-bold text-white">{upload.phase === "compressing" ? "Compressing…" : "Uploading…"}</p>
            <p className="text-xs text-gray-500 mt-1">
              {upload.phase === "compressing" ? `${formatBytes(upload.originalSize)} → optimising` : `${formatBytes(upload.compressedSize)} uploading`}
            </p>
          </div>
          <div className="w-48 h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] transition-all duration-300" style={{ width: `${upload.progress}%` }} />
          </div>
        </div>
      )}

      {/* Three-source picker */}
      {!hasImage && upload.phase !== "compressing" && upload.phase !== "uploading" && (
        <ImageSourcePicker
          onUploadClick={() => fileInputRef.current?.click()}
          onUrlChange={onUrlChange}
          currentUrl={currentUrl}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          dragging={dragging}
          uploadError={upload.phase === "error" ? upload.error : ""}
          onRetry={() => { setUpload(u => ({ ...u, phase: "idle", error: "" })); fileInputRef.current?.click(); }}
        />
      )}

      {/* Alt text */}
      <div>
        <label className={LABEL}>Image Alt Text <span className="text-gray-700 font-normal normal-case">(for SEO)</span></label>
        <input value={currentAlt} onChange={e => onAltChange(e.target.value)} className={FIELD}
          placeholder="e.g. Downtown Bristol Tennessee State Street" />
      </div>
    </div>
  );
}

// ─── Post List Card ───────────────────────────────────────────────────────────

function PostCard({ post, onEdit, onTogglePublish, onDelete }: {
  post: BlogPost;
  onEdit: (post: BlogPost) => void;
  onTogglePublish: (post: BlogPost) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    await onDelete(post.id);
    setDeleting(false); setConfirming(false);
  }

  return (
    <div className="flex items-start gap-3 px-4 py-4 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(167,139,250,0.2)] transition-all">
      <div className="w-16 h-14 flex-shrink-0 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt={post.image_alt || post.title} className="w-full h-full object-cover" />
        ) : (
          <FileText size={18} className="text-gray-700" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate leading-snug">{post.title || "(Untitled)"}</p>
            <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-gray-600">
              <span>{post.category}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={9} />{post.read_time} min</span>
              <span>·</span>
              <span>{new Date(post.published_at || post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${
            post.status === "published"
              ? "text-[#4ADE80] border-[rgba(74,222,128,0.4)] bg-[rgba(74,222,128,0.08)]"
              : "text-gray-500 border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]"
          }`}>
            {post.status === "published" ? "LIVE" : "DRAFT"}
          </span>
        </div>
        {post.excerpt && (
          <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={() => onEdit(post)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[rgba(167,139,250,0.3)] text-[#A78BFA] hover:bg-[rgba(167,139,250,0.1)] transition-all">
            <Pencil size={10} /> Edit Post
          </button>
          <button onClick={() => onTogglePublish(post)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              post.status === "published"
                ? "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-yellow-400 hover:border-yellow-500/30"
                : "border-[rgba(74,222,128,0.3)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.1)]"
            }`}>
            {post.status === "published" ? <><EyeOff size={10} /> Unpublish</> : <><Globe size={10} /> Publish</>}
          </button>
          {post.status === "published" && (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white transition-all">
              <ExternalLink size={10} /> View Live
            </a>
          )}
          <button onClick={handleDelete} disabled={deleting}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              confirming ? "border-red-500/40 text-red-400 bg-red-950/30" : "border-[rgba(255,255,255,0.06)] text-gray-700 hover:text-red-400 hover:border-red-500/30"
            }`}>
            {deleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
            {confirming ? "Confirm Delete" : "Delete"}
          </button>
          {confirming && !deleting && (
            <button onClick={() => setConfirming(false)} className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Post Editor Form ──────────────────────────────────────────────────────────

function PostEditor({ initial, onSave, onCancel }: {
  initial: BlogPost | null;
  onSave: (data: Partial<BlogPost> & { slug: string; status: "draft" | "published" }) => Promise<void>;
  onCancel: () => void;
}) {
  const isNew = !initial;
  const [form, setForm] = useState<typeof EMPTY_POST & { slug: string }>(() => {
    if (initial) {
      return {
        slug: initial.slug,
        title: initial.title,
        meta_title: initial.meta_title || "",
        meta_description: initial.meta_description || "",
        excerpt: initial.excerpt || "",
        category: initial.category || "Market Insights",
        tags: initial.tags || [],
        read_time: initial.read_time || 5,
        content: initial.content || "",
        status: initial.status,
        author: initial.author || "Vision LLC",
        author_title: initial.author_title || "Commercial Real Estate",
        image_url: initial.image_url || "",
        image_alt: initial.image_alt || "",
      };
    }
    return { ...EMPTY_POST, slug: "" };
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [slugManual, setSlugManual] = useState(!!initial);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewContent, setPreviewContent] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    if (!slugManual && form.title) setForm(f => ({ ...f, slug: slugify(f.title) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, slugManual]);

  function addTag() {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) { setTagInput(""); return; }
    setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  }
  function removeTag(tag: string) { setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) })); }

  async function handleSave(status: "draft" | "published") {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.slug.trim()) { setError("Slug is required."); return; }
    if (!form.content.trim()) { setError("Content is required."); return; }
    setSaving(true); setError("");
    try {
      await onSave({ ...form, status });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">
            <ArrowLeft size={14} />
          </button>
          <div>
            <p className="text-xs font-black text-[#A78BFA] uppercase tracking-widest">{isNew ? "New Blog Post" : "Edit Post"}</p>
            {!isNew && <p className="text-[11px] text-gray-600 mt-0.5">/blog/{initial!.slug}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave("draft")} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] text-gray-400 text-xs font-bold hover:text-white transition-all disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Draft
          </button>
          <button onClick={() => handleSave("published")} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white text-xs font-black hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-[rgba(167,139,250,0.2)]">
            {saving ? <Loader2 size={12} className="animate-spin" /> : success ? <CheckCircle2 size={12} /> : <Globe size={12} />}
            {success ? "Saved!" : "Publish Live"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-300">
          <AlertCircle size={13} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Core fields */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] p-5 space-y-4">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Article Details</p>
        <div>
          <label className={LABEL}>Article Title *</label>
          <input ref={titleRef} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={FIELD}
            placeholder="e.g. Why Downtown Bristol is the Best Place to Open a Business in 2026" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL} style={{ marginBottom: 0 }}>URL Slug *</label>
            {!slugManual && (
              <button onClick={() => setSlugManual(true)} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">Edit manually</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 flex-shrink-0">/blog/</span>
            <input value={form.slug} onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })); }}
              className={`${FIELD} font-mono text-xs`} placeholder="article-url-slug" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={FIELD} style={{ colorScheme: "dark" }}>
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#080C14]">{c}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Read Time (minutes)</label>
            <input type="number" min={1} max={60} value={form.read_time}
              onChange={e => setForm(f => ({ ...f, read_time: Number(e.target.value) }))} className={FIELD} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Excerpt / Summary</label>
          <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={3}
            className={`${FIELD} resize-none`} placeholder="A 1–2 sentence summary shown in blog listing cards and search results..." />
        </div>
        <div>
          <label className={LABEL}>Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)] text-[#A78BFA]">
                <Tag size={9} /> {tag}
                <button onClick={() => removeTag(tag)} className="ml-1 text-gray-600 hover:text-red-400 transition-colors"><X size={9} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              className={`${FIELD} flex-1`} placeholder="Add a tag and press Enter..." />
            <button onClick={addTag} className="px-3 py-2 rounded-xl border border-[rgba(167,139,250,0.3)] text-[#A78BFA] text-xs font-bold hover:bg-[rgba(167,139,250,0.1)] transition-all">Add</button>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <ImageIcon size={14} className="text-[#A78BFA]" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Featured Image</p>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] font-bold">Auto-compressed</span>
        </div>
        <BlogImageUploader
          currentUrl={form.image_url || ""}
          currentAlt={form.image_alt || ""}
          onUrlChange={url => setForm(f => ({ ...f, image_url: url }))}
          onAltChange={alt => setForm(f => ({ ...f, image_alt: alt }))}
        />
      </div>

      {/* Article Body */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Article Body *</p>
          <button onClick={() => setPreviewContent(p => !p)}
            className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-300 transition-colors">
            {previewContent ? <><EyeOff size={10} /> Edit</> : <><Eye size={10} /> Preview</>}
          </button>
        </div>
        <p className="text-[10px] text-gray-700">Paste your article here — plain text or HTML. Paragraphs from Word or Google Docs work fine.</p>
        {previewContent ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] p-4 max-h-[500px] overflow-y-auto prose prose-invert prose-sm max-w-none text-gray-300 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: form.content }} />
        ) : (
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={20}
            className={`${FIELD} resize-y font-mono text-xs leading-relaxed min-h-[300px]`}
            placeholder={`Paste your article content here. Plain text or HTML both work.\n\nFor HTML:\n<h2>Section Heading</h2>\n<p>Paragraph text...</p>\n<ul><li>List item</li></ul>`}
            spellCheck={true} />
        )}
      </div>

      {/* AI SEO Assistant */}
      <AiSeoPanel
        form={{
          title: form.title,
          content: form.content,
          category: form.category,
          tags: form.tags,
          meta_title: form.meta_title,
          meta_description: form.meta_description,
          excerpt: form.excerpt,
        }}
        onApply={updates => setForm(f => ({ ...f, ...updates }))}
      />

      {/* SEO & Author fields — always visible now, populated by AI */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
        <button onClick={() => setShowAdvanced(p => !p)}
          className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SEO & Author Settings</p>
            {(form.meta_title || form.meta_description) ? (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)] text-[#4ADE80] font-bold">✓ Filled</span>
            ) : (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.25)] text-yellow-400 font-bold">Run AI above ↑</span>
            )}
          </div>
          {showAdvanced ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
        </button>
        {showAdvanced && (
          <div className="border-t border-[rgba(255,255,255,0.05)] p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Author Name</label>
                <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className={FIELD} placeholder="Vision LLC" />
              </div>
              <div>
                <label className={LABEL}>Author Title</label>
                <input value={form.author_title} onChange={e => setForm(f => ({ ...f, author_title: e.target.value }))} className={FIELD} placeholder="Commercial Real Estate" />
              </div>
            </div>
            <div>
              <label className={LABEL}>
                SEO Meta Title
                <span className="text-gray-700 font-normal normal-case ml-1">(leave blank to use article title)</span>
              </label>
              <input value={form.meta_title} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))} className={FIELD} placeholder="Search result title (50–60 chars)" />
              <p className={`text-[10px] mt-1 ${form.meta_title.length > 60 ? "text-yellow-400" : form.meta_title.length >= 50 ? "text-[#4ADE80]" : "text-gray-700"}`}>
                {form.meta_title.length}/60 chars{form.meta_title.length >= 50 && form.meta_title.length <= 60 ? " ✓ optimal" : ""}
              </p>
            </div>
            <div>
              <label className={LABEL}>SEO Meta Description</label>
              <textarea value={form.meta_description} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))} rows={3}
                className={`${FIELD} resize-none`} placeholder="Description shown in Google search results (145–155 chars ideal)" />
              <p className={`text-[10px] mt-1 ${
                form.meta_description.length > 160 ? "text-red-400" :
                form.meta_description.length >= 145 ? "text-[#4ADE80]" :
                form.meta_description.length > 0 ? "text-yellow-400" : "text-gray-700"
              }`}>
                {form.meta_description.length}/155 chars
                {form.meta_description.length >= 145 && form.meta_description.length <= 160 ? " ✓ optimal" : ""}
                {form.meta_description.length > 160 ? " — too long, Google will truncate" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <button onClick={onCancel} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">← Back to all posts</button>
        <div className="flex gap-2">
          <button onClick={() => handleSave("draft")} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] text-gray-400 text-sm font-bold hover:text-white transition-all disabled:opacity-40">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save as Draft
          </button>
          <button onClick={() => handleSave("published")} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white text-sm font-black hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-[rgba(167,139,250,0.25)]">
            {saving ? <Loader2 size={13} className="animate-spin" /> : success ? <CheckCircle2 size={13} /> : <Globe size={13} />}
            {success ? "Saved!" : "Publish to Live Site"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main BlogEditor Component ────────────────────────────────────────────────

export default function BlogEditor() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null | "new">(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/blog-posts?all=1");
      const d = await res.json();
      if (Array.isArray(d.posts)) setPosts(d.posts);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchPosts(); }, []);

  async function handleTogglePublish(post: BlogPost) {
    const newStatus = post.status === "published" ? "draft" : "published";
    setToggling(post.id);
    await fetch(`/api/blog-posts?id=${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
    setToggling(null);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/blog-posts?id=${id}`, { method: "DELETE" });
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  async function handleSave(data: Partial<BlogPost> & { slug: string; status: "draft" | "published" }) {
    if (typeof editing === "string") {
      // Brand-new post (editing === "new")
      const res = await fetch("/api/blog-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, published_at: new Date().toISOString() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      await fetchPosts();
      setEditing(null);
    } else if (editing !== null) {
      if (editing.id) {
        // Existing DB post — update by id
        const res = await fetch(`/api/blog-posts?id=${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        // Static post with no DB id yet — upsert by slug (POST with merge-duplicates)
        const res = await fetch("/api/blog-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, published_at: (data as any).published_at || new Date().toISOString() }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Save failed");
      }
      await fetchPosts();
      setEditing(null);
    }
  }

  const filtered = posts
    .filter(p => filter === "all" || p.status === filter)
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  const live = posts.filter(p => p.status === "published").length;
  const drafts = posts.filter(p => p.status === "draft").length;

  if (editing !== null) {
    return (
      <PostEditor
        initial={typeof editing === "string" ? null : editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.03)] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[rgba(167,139,250,0.2)]">
              <FileText size={15} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-[#A78BFA] uppercase tracking-widest">Blog Manager</p>
              <p className="text-[11px] text-gray-600">{live} live · {drafts} drafts · {posts.length} total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={fetchPosts} className="p-2 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-white transition-colors">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setEditing("new")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white text-xs font-black hover:opacity-90 transition-all shadow-lg shadow-[rgba(167,139,250,0.2)]">
              <Plus size={13} /> New Blog Post
            </button>
          </div>
        </div>
      </div>

      {/* Static posts import banner */}
      <StaticPostsImportBanner dbSlugs={new Set(posts.map(p => p.slug))} onImported={fetchPosts} />

      {/* Filter + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-[rgba(255,255,255,0.03)] rounded-xl p-1 border border-[rgba(255,255,255,0.06)]">
          {(["all", "published", "draft"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                filter === f
                  ? "bg-[rgba(167,139,250,0.15)] text-[#A78BFA] border border-[rgba(167,139,250,0.3)]"
                  : "text-gray-600 hover:text-gray-400"
              }`}>
              {f === "all" ? `All (${posts.length})` : f === "published" ? `Live (${live})` : `Drafts (${drafts})`}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..."
          className="flex-1 min-w-[180px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-xs text-white focus:border-[rgba(167,139,250,0.4)] outline-none placeholder:text-gray-700 transition-colors" />
      </div>

      {/* Post list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-600">
          <Loader2 size={18} className="animate-spin text-[#A78BFA]" />
          <span className="text-sm">Loading posts…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border-2 border-dashed border-[rgba(255,255,255,0.06)]">
          <FileText size={32} className="text-gray-700" />
          <div className="text-center">
            <p className="text-sm font-bold text-gray-600">{posts.length === 0 ? "No blog posts yet" : "No posts match your filter"}</p>
            <p className="text-xs text-gray-700 mt-1">
              {posts.length === 0 ? "Click \"New Blog Post\" to write your first article." : "Try changing the filter or search."}
            </p>
          </div>
          {posts.length === 0 && (
            <button onClick={() => setEditing("new")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white text-sm font-black hover:opacity-90 transition-all">
              <Plus size={14} /> Write First Post
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={p => setEditing(p)}
              onTogglePublish={toggling ? () => {} : handleTogglePublish}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <div className="text-center pb-4">
        <p className="text-xs text-gray-700">
          {filtered.length} post{filtered.length !== 1 ? "s" : ""} shown · Live posts update within 60 seconds
        </p>
      </div>
    </div>
  );
}
