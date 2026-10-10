"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Image as ImageIcon, Plus, X, GripVertical, Upload, Loader2, Eye, EyeOff,
  Save, CheckCircle2, AlertCircle, Video, Link2, ChevronDown, ChevronRight,
  RotateCcw, Trash2,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface SlideConfig {
  type: "property" | "custom";
  propertyId?: string;
  imageUrl?: string;
  label?: string;
  location?: string;
  enabled: boolean;
  order: number;
}

interface HeroConfig {
  slides: SlideConfig[];
  videoUrl: string | null;
  videoEnabled: boolean;
}

interface ResolvedSlide {
  src: string;
  label: string;
  location: string;
}

interface PropertyOption {
  id: string;
  name: string;
  city: string;
  image: string;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function HeroBannerManager() {
  const [config, setConfig] = useState<HeroConfig | null>(null);
  const [resolved, setResolved] = useState<ResolvedSlide[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<number | null>(null);

  /* ── Fetch current config ──────────────────────────────────────────────── */
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/hero-banner");
      const data = await res.json();
      const cfg: HeroConfig = data.raw || {
        slides: [], videoUrl: null, videoEnabled: false,
      };
      setConfig(cfg);
      setResolved(data.resolved || []);

      // Build property list from slides + add all known properties
      const propRes = await fetch("/api/properties-list").catch(() => null);
      if (propRes?.ok) {
        const props = await propRes.json();
        setProperties(props);
      }
    } catch {
      setError("Failed to load hero config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  const slides = config?.slides ?? [];

  const getResolvedImage = (slide: SlideConfig, idx: number): string => {
    // Use resolved data if available, otherwise fall back
    if (resolved[idx]?.src) return resolved[idx].src;
    if (slide.type === "custom" && slide.imageUrl) return slide.imageUrl;
    return "/property-images/commercial-city-centre-exterior.jpg";
  };

  const getLabel = (slide: SlideConfig, idx: number): string => {
    if (slide.label) return slide.label;
    if (resolved[idx]?.label) return resolved[idx].label;
    return `Slide ${idx + 1}`;
  };

  const getLocation = (slide: SlideConfig, idx: number): string => {
    if (slide.location) return slide.location;
    if (resolved[idx]?.location) return resolved[idx].location;
    return "";
  };

  const updateSlides = (newSlides: SlideConfig[]) => {
    if (!config) return;
    setConfig({ ...config, slides: newSlides });
    setDirty(true);
    setSaveSuccess(false);
  };

  /* ── Toggle slide enabled ──────────────────────────────────────────────── */
  const toggleSlide = (idx: number) => {
    const next = [...slides];
    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
    updateSlides(next);
  };

  /* ── Remove slide ──────────────────────────────────────────────────────── */
  const removeSlide = (idx: number) => {
    const next = slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));
    updateSlides(next);
    // Also clean resolved
    setResolved(prev => prev.filter((_, i) => i !== idx));
  };

  /* ── Replace image (opens file picker) ─────────────────────────────────── */
  const startReplace = (idx: number) => {
    replaceTargetRef.current = idx;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const idx = replaceTargetRef.current;
    if (idx === null) return;

    setUploadingIdx(idx);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "slide");

      const res = await fetch("/api/hero-banner/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      // Update the slide to "custom" with new URL
      const next = [...slides];
      next[idx] = {
        ...next[idx],
        type: "custom",
        imageUrl: data.url,
        propertyId: undefined,
      };
      updateSlides(next);

      // Update resolved preview
      setResolved(prev => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], src: data.url };
        return copy;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingIdx(null);
      replaceTargetRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ── Add slide ─────────────────────────────────────────────────────────── */
  const addPropertySlide = (propId: string) => {
    const prop = properties.find(p => p.id === propId);
    if (!prop) return;

    const newSlide: SlideConfig = {
      type: "property",
      propertyId: propId,
      label: prop.name,
      location: prop.city,
      enabled: true,
      order: slides.length,
    };
    updateSlides([...slides, newSlide]);
    setResolved(prev => [...prev, { src: prop.image, label: prop.name, location: prop.city }]);
    setShowAddPicker(false);
  };

  const addCustomSlide = () => {
    replaceTargetRef.current = slides.length;
    const newSlide: SlideConfig = {
      type: "custom",
      imageUrl: "",
      label: "New Slide",
      location: "Bristol, TN",
      enabled: true,
      order: slides.length,
    };
    updateSlides([...slides, newSlide]);
    setResolved(prev => [...prev, { src: "", label: "New Slide", location: "Bristol, TN" }]);
    setShowAddPicker(false);

    // Open file picker for the new slide
    setTimeout(() => {
      replaceTargetRef.current = slides.length; // the new last index
      fileInputRef.current?.click();
    }, 100);
  };

  /* ── Edit label/location inline ────────────────────────────────────────── */
  const updateField = (idx: number, field: "label" | "location", value: string) => {
    const next = [...slides];
    next[idx] = { ...next[idx], [field]: value };
    updateSlides(next);
  };

  /* ── Drag & Drop reorder ───────────────────────────────────────────────── */
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      const next = [...slides];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dragOverIdx, 0, moved);
      const reordered = next.map((s, i) => ({ ...s, order: i }));
      updateSlides(reordered);

      // Also reorder resolved
      const nextRes = [...resolved];
      const [movedRes] = nextRes.splice(dragIdx, 1);
      nextRes.splice(dragOverIdx, 0, movedRes);
      setResolved(nextRes);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  /* ── Video toggle ──────────────────────────────────────────────────────── */
  const toggleVideo = () => {
    if (!config) return;
    setConfig({ ...config, videoEnabled: !config.videoEnabled });
    setDirty(true);
  };
  const setVideoUrl = (url: string) => {
    if (!config) return;
    setConfig({ ...config, videoUrl: url || null });
    setDirty(true);
  };

  /* ── Save ───────────────────────────────────────────────────────────────── */
  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/hero-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Save failed");
      }

      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);

      // Re-fetch to get fresh resolved data
      fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 size={20} className="animate-spin text-[#4ADE80]" />
          <span className="text-sm text-gray-400">Loading hero banner config…</span>
        </div>
      </div>
    );
  }

  const enabledCount = slides.filter(s => s.enabled).length;
  const usedPropertyIds = new Set(slides.filter(s => s.type === "property").map(s => s.propertyId));

  return (
    <div className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* ── Section Header ──────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-[#4ADE80]">
            <ImageIcon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Hero Banner Slideshow
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] font-semibold">
                {enabledCount} active
              </span>
              {dirty && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-semibold">
                  unsaved
                </span>
              )}
            </h3>
            <p className="text-[10px] text-gray-600 mt-0.5">
              Add, remove, reorder, or replace images in the homepage hero slideshow
            </p>
          </div>
        </div>
        <div className="text-gray-600">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.05)]">
          {/* ── Slide Cards ────────────────────────────────────────────── */}
          <div className="p-5 space-y-3">
            {slides.length === 0 && (
              <div className="text-center py-8">
                <ImageIcon size={32} className="mx-auto text-gray-700 mb-3" />
                <p className="text-sm text-gray-500">No slides configured</p>
                <p className="text-xs text-gray-600 mt-1">Add a property or custom slide below</p>
              </div>
            )}

            {slides.map((slide, idx) => {
              const imgSrc = getResolvedImage(slide, idx);
              const label = getLabel(slide, idx);
              const location = getLocation(slide, idx);
              const isUploading = uploadingIdx === idx;
              const isDragOver = dragOverIdx === idx;

              return (
                <div
                  key={`slide-${idx}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-stretch gap-3 rounded-xl border transition-all duration-200 ${
                    isDragOver
                      ? "border-[rgba(74,222,128,0.5)] bg-[rgba(74,222,128,0.04)] scale-[1.01]"
                      : slide.enabled
                      ? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]"
                      : "border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)] opacity-50"
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="flex items-center pl-3 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400">
                    <GripVertical size={16} />
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-28 sm:w-36 flex-shrink-0 my-2 rounded-lg overflow-hidden bg-[rgba(255,255,255,0.03)]">
                    {imgSrc ? (
                      <img src={imgSrc} alt={label} className="w-full h-full object-cover aspect-video" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center aspect-video">
                        <ImageIcon size={20} className="text-gray-700" />
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-[#4ADE80]" />
                      </div>
                    )}
                    {/* Order badge */}
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-md bg-black/70 flex items-center justify-center text-[9px] font-bold text-white">
                      {idx + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 py-3 pr-2 min-w-0">
                    <input
                      value={label}
                      onChange={e => updateField(idx, "label", e.target.value)}
                      className="bg-transparent text-sm font-bold text-white w-full outline-none border-b border-transparent focus:border-[rgba(74,222,128,0.3)] transition-colors pb-0.5"
                      placeholder="Slide label…"
                    />
                    <input
                      value={location}
                      onChange={e => updateField(idx, "location", e.target.value)}
                      className="bg-transparent text-xs text-gray-500 w-full outline-none border-b border-transparent focus:border-[rgba(255,255,255,0.1)] transition-colors mt-1"
                      placeholder="Location…"
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        slide.type === "property"
                          ? "bg-[rgba(96,165,250,0.1)] text-blue-400 border border-blue-500/20"
                          : "bg-[rgba(250,204,21,0.1)] text-[#FACC15] border border-yellow-500/20"
                      }`}>
                        {slide.type === "property" ? `Property: ${slide.propertyId}` : "Custom Upload"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pr-3 flex-shrink-0">
                    {/* Replace Image */}
                    <button
                      onClick={() => startReplace(idx)}
                      className="p-2 rounded-lg text-gray-500 hover:text-[#4ADE80] hover:bg-[rgba(74,222,128,0.08)] transition-colors"
                      title="Replace image"
                    >
                      <Upload size={14} />
                    </button>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleSlide(idx)}
                      className={`p-2 rounded-lg transition-colors ${
                        slide.enabled
                          ? "text-[#4ADE80] hover:bg-[rgba(74,222,128,0.08)]"
                          : "text-gray-600 hover:text-gray-400 hover:bg-[rgba(255,255,255,0.05)]"
                      }`}
                      title={slide.enabled ? "Disable slide" : "Enable slide"}
                    >
                      {slide.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => removeSlide(idx)}
                      className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="Remove slide"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Add Slide ──────────────────────────────────────────────── */}
          <div className="px-5 pb-4">
            {!showAddPicker ? (
              <button
                onClick={() => setShowAddPicker(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.08)] hover:border-[rgba(74,222,128,0.3)] text-gray-500 hover:text-[#4ADE80] text-sm font-semibold transition-colors"
              >
                <Plus size={16} />
                Add Slide
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">Choose a slide source</p>
                  <button onClick={() => setShowAddPicker(false)} className="text-gray-600 hover:text-gray-400">
                    <X size={14} />
                  </button>
                </div>

                {/* Custom upload option */}
                <button
                  onClick={addCustomSlide}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-[rgba(250,204,21,0.15)] hover:border-[rgba(250,204,21,0.4)] hover:bg-[rgba(250,204,21,0.04)] text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[rgba(250,204,21,0.08)] flex items-center justify-center text-[#FACC15] flex-shrink-0">
                    <Upload size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Upload Custom Image</p>
                    <p className="text-[10px] text-gray-500">Use any image — drone shot, event photo, etc.</p>
                  </div>
                </button>

                {/* Property options */}
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider pt-2">Or select a property</p>
                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-none">
                  {properties.length === 0 ? (
                    <p className="text-xs text-gray-600 py-2">Property list not available — use custom upload</p>
                  ) : (
                    properties.filter(p => !usedPropertyIds.has(p.id)).map(prop => (
                      <button
                        key={prop.id}
                        onClick={() => addPropertySlide(prop.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(74,222,128,0.05)] text-left transition-colors"
                      >
                        <img src={prop.image} alt={prop.name} className="w-12 h-8 object-cover rounded" />
                        <div>
                          <p className="text-xs font-semibold text-white">{prop.name}</p>
                          <p className="text-[10px] text-gray-500">{prop.city}</p>
                        </div>
                      </button>
                    ))
                  )}
                  {properties.length > 0 && properties.filter(p => !usedPropertyIds.has(p.id)).length === 0 && (
                    <p className="text-xs text-gray-600 py-2">All properties already added — use custom upload</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Video Override ──────────────────────────────────────────── */}
          <div className="px-5 pb-4">
            <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video size={14} className="text-gray-500" />
                  <span className="text-xs font-bold text-gray-400">Video Background</span>
                </div>
                <button
                  onClick={toggleVideo}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    config?.videoEnabled ? "bg-[#4ADE80]" : "bg-[rgba(255,255,255,0.1)]"
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${
                    config?.videoEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
              {config?.videoEnabled && (
                <div className="mt-3 flex items-center gap-2">
                  <Link2 size={12} className="text-gray-600 flex-shrink-0" />
                  <input
                    value={config?.videoUrl || ""}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://… (MP4 URL)"
                    className="flex-1 bg-transparent text-xs text-white outline-none border-b border-[rgba(255,255,255,0.1)] focus:border-[rgba(74,222,128,0.3)] transition-colors pb-1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────────────────── */}
          {error && (
            <div className="mx-5 mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/50">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <X size={12} />
              </button>
            </div>
          )}

          {/* ── Save Bar ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between p-5 border-t border-[rgba(255,255,255,0.05)]">
            <p className="text-[10px] text-gray-600">
              {slides.length} slide{slides.length !== 1 ? "s" : ""} total · {enabledCount} enabled ·
              Drag to reorder
            </p>
            <button
              onClick={saveConfig}
              disabled={!dirty || saving}
              className={`flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all ${
                saveSuccess
                  ? "bg-[#4ADE80] text-black"
                  : dirty
                  ? "bg-[#4ADE80] hover:bg-[#22C55E] text-black shadow-lg shadow-[rgba(74,222,128,0.25)]"
                  : "bg-[rgba(255,255,255,0.06)] text-gray-600 cursor-not-allowed"
              }`}
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : saveSuccess ? (
                <><CheckCircle2 size={14} /> Saved!</>
              ) : (
                <><Save size={14} /> Save Banner</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
