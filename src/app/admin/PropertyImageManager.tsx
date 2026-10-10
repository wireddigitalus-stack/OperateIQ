"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Upload, ImageIcon, CheckCircle2, Loader2, X, RefreshCw,
  Star, Trash2, Plus, ChevronDown, ChevronUp,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

interface ImageRecord {
  url: string;
  isHero: boolean;
  uploadedAt: string;
}

interface PropertyImages {
  property_id: string;
  hero_url: string | null;
  all_urls: string[];
  updated_at: string;
}

export default function PropertyImageManager() {
  const [propImages, setPropImages] = useState<Record<string, PropertyImages>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Record<string, string>>({}); // propId → timestamp
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement>>({});

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const res = await fetch("/api/property-images");
    const d = await res.json();
    // Build a map: property_id → { hero_url, all_urls }
    const map: Record<string, PropertyImages> = {};
    if (Array.isArray(d.overrides)) {
      for (const row of d.overrides) {
        map[row.property_id] = {
          property_id: row.property_id,
          hero_url: row.hero_url || row.image_url || null,
          all_urls: Array.isArray(row.all_urls) ? row.all_urls : (row.image_url ? [row.image_url] : []),
          updated_at: row.updated_at,
        };
      }
    }
    setPropImages(map);
  }

  const getHero = useCallback((propId: string, fallback?: string) => {
    return propImages[propId]?.hero_url || fallback || null;
  }, [propImages]);

  const getAllUrls = useCallback((propId: string, fallbackImages?: string[]) => {
    const record = propImages[propId];
    if (record?.all_urls?.length) return record.all_urls;
    return fallbackImages || [];
  }, [propImages]);

  async function handleUpload(propertyId: string, files: FileList) {
    if (!files.length) return;
    setUploading(propertyId);
    setError(null);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("propertyId", propertyId);
      const res = await fetch("/api/property-images", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Upload failed"); continue; }
      if (d.url) newUrls.push(d.url);
    }

    if (newUrls.length) {
      // Merge with existing
      const existing = propImages[propertyId] || { property_id: propertyId, hero_url: null, all_urls: [], updated_at: "" };
      const merged = [...existing.all_urls, ...newUrls];
      const hero = existing.hero_url || newUrls[0];
      const updated: PropertyImages = {
        ...existing,
        all_urls: merged,
        hero_url: hero,
        updated_at: new Date().toISOString(),
      };
      setPropImages(prev => ({ ...prev, [propertyId]: updated }));
      // Persist hero + all_urls to Supabase
      await patchRecord(propertyId, hero, merged);
      setSuccess(propertyId);
      setTimeout(() => setSuccess(null), 3000);
      markSaved(propertyId);
      setExpanded(propertyId);
    }
    setUploading(null);
  }

  function markSaved(propertyId: string) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setSavedAt(prev => ({ ...prev, [propertyId]: time }));
  }

  /** Ensure a Supabase record exists for this property — seed from static data.ts images if needed */
  function ensureRecord(propertyId: string): PropertyImages {
    const existing = propImages[propertyId];
    if (existing) return existing;
    // Seed from static fallback
    const prop = PROPERTIES.find(p => p.id === propertyId);
    const fallbackImages: string[] = (prop as any)?.images || ((prop as any)?.image ? [(prop as any).image] : []);
    const seeded: PropertyImages = {
      property_id: propertyId,
      hero_url: fallbackImages[0] || null,
      all_urls: [...fallbackImages],
      updated_at: new Date().toISOString(),
    };
    setPropImages(prev => ({ ...prev, [propertyId]: seeded }));
    return seeded;
  }

  async function setHero(propertyId: string, url: string) {
    const existing = ensureRecord(propertyId);
    const updated = { ...existing, hero_url: url, updated_at: new Date().toISOString() };
    setPropImages(prev => ({ ...prev, [propertyId]: updated }));
    await patchRecord(propertyId, url, existing.all_urls);
    markSaved(propertyId);
  }

  async function removeImage(propertyId: string, url: string) {
    setDeleting(url);
    const existing = ensureRecord(propertyId);
    const next = existing.all_urls.filter((u) => u !== url);
    const newHero = existing.hero_url === url ? (next[0] || null) : existing.hero_url;
    setPropImages((prev) => ({
      ...prev,
      [propertyId]: { ...existing, all_urls: next, hero_url: newHero, updated_at: new Date().toISOString() },
    }));

    const res = await fetch("/api/property-images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, url }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Delete failed — please try again.");
      // Roll back optimistic state
      await fetchAll();
    } else {
      markSaved(propertyId);
      // Re-fetch to ensure UI matches server truth
      await fetchAll();
    }
    setDeleting(null);
  }

  async function patchRecord(propertyId: string, heroUrl: string | null, allUrls: string[]) {
    await fetch("/api/property-images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, heroUrl, allUrls }),
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-black text-[#60A5FA] uppercase tracking-widest">Property Gallery Manager</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Upload multiple photos per property. Star one as the hero image. Changes go live immediately.
          </p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          <X size={12} />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={10} /></button>
        </div>
      )}

      <div className="space-y-3">
        {PROPERTIES.map(prop => {
          const isUploading = uploading === prop.id;
          const isSuccessCard = success === prop.id;
          const isOpen = expanded === prop.id;
          const allUrls = getAllUrls(prop.id, (prop as any).images || ((prop as any).image ? [(prop as any).image] : []));
          const hero = getHero(prop.id, (prop as any).image);
          const hasCustom = Boolean(propImages[prop.id]?.all_urls?.length);
          const imgCount = allUrls.length;

          return (
            <div
              key={prop.id}
              className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] overflow-hidden"
            >
              {/* ── Card Header ────────────────────────────────────── */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Thumb */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[rgba(255,255,255,0.04)] flex-shrink-0">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero} alt={prop.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={20} className="text-gray-700" />
                    </div>
                  )}
                  {hasCustom && (
                    <span className="absolute top-0.5 right-0.5 text-[7px] font-black px-1 py-0.5 rounded-full bg-[rgba(96,165,250,0.9)] text-black leading-none">
                      {imgCount}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{prop.name}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{prop.type} · {prop.city}</p>
                  <p className="text-[10px] text-gray-700 mt-0.5">
                    {imgCount > 0 ? `${imgCount} photo${imgCount !== 1 ? "s" : ""}` : "No photos uploaded"}
                    {isSuccessCard && <span className="ml-2 text-[#4ADE80]">✓ Uploaded!</span>}
                    {success === prop.id + "-hero" && <span className="ml-2 text-[#FACC15]">⭐ Hero set!</span>}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Upload button */}
                  <input
                    ref={el => { if (el) fileRefs.current[prop.id] = el; }}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                    multiple
                    className="hidden"
                    onChange={e => { if (e.target.files?.length) { handleUpload(prop.id, e.target.files); e.target.value = ""; } }}
                  />
                  <button
                    onClick={() => fileRefs.current[prop.id]?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgba(96,165,250,0.3)] text-[#60A5FA] text-[10px] font-bold hover:bg-[rgba(96,165,250,0.1)] transition-all disabled:opacity-40"
                  >
                    {isUploading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                    {isUploading ? "…" : "Add"}
                  </button>

                  {/* Expand toggle */}
                  {imgCount > 0 && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : prop.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-gray-500 text-[10px] hover:text-white transition-colors"
                    >
                      {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Expanded Gallery Grid ───────────────────────── */}
              {isOpen && imgCount > 0 && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {allUrls.map((url, i) => {
                      const isHero = url === hero;
                      const isDeleting = deleting === url;
                      return (
                        <div key={url + i} className={`rounded-xl overflow-hidden border-2 transition-all ${isHero ? "border-[#FACC15]" : "border-[rgba(255,255,255,0.08)]"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`${prop.name} ${i + 1}`}
                            className={`w-full h-16 object-cover ${isDeleting ? "opacity-30" : ""}`}
                          />
                          {/* Always-visible action bar — touch safe */}
                          <div className="flex items-center justify-between px-1.5 py-1 bg-[rgba(0,0,0,0.6)]">
                            {isHero ? (
                              <span className="text-[8px] font-black text-[#FACC15] flex items-center gap-0.5">
                                <Star size={7} fill="currentColor" /> HERO
                              </span>
                            ) : (
                              <button
                                onClick={() => setHero(prop.id, url)}
                                className="text-[#FACC15] hover:scale-110 transition-transform p-0.5"
                                title="Set as hero"
                              >
                                <Star size={11} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm("Remove this image?")) removeImage(prop.id, url);
                              }}
                              disabled={isDeleting}
                              className="text-red-400 hover:text-red-300 transition-colors p-0.5 disabled:opacity-40"
                              title="Remove"
                            >
                              {isDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={11} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add more button inside grid */}
                    <button
                      onClick={() => fileRefs.current![prop.id]?.click()}
                      disabled={isUploading}
                      className="h-[88px] rounded-xl border-2 border-dashed border-[rgba(96,165,250,0.3)] text-[#60A5FA] hover:border-[rgba(96,165,250,0.6)] hover:bg-[rgba(96,165,250,0.05)] transition-all flex items-center justify-center disabled:opacity-40"
                    >
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-700 mt-2">
                    ⭐ Star = hero image · Tap 🗑️ to remove (confirmation required)
                  </p>

                  {/* ── Gallery Saved Banner ─────────────────────── */}
                  {savedAt[prop.id] && (
                    <div className="mt-3 flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.25)]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#4ADE80] flex-shrink-0" />
                        <div>
                          <p className="text-xs font-black text-[#4ADE80] leading-none">Gallery Saved</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Live on site · saved at {savedAt[prop.id]}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSavedAt(prev => { const n = { ...prev }; delete n[prop.id]; return n; })}
                        className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
                        aria-label="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-700 mt-4">
        Supports JPG, PNG, WEBP, HEIC. Multiple photos per property supported. Photos go live immediately after upload.
      </p>
    </div>
  );
}
