"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Save, CheckCircle2, Loader2, RotateCcw, AlertCircle,
  Type, ChevronDown, ChevronRight, Building2, MapPin,
  Star, Trash2, Upload, ImageIcon, Plus, Eye, EyeOff,
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

interface PropertyImages {
  property_id: string;
  hero_url: string | null;
  all_urls: string[];
  updated_at: string;
}

// ── Build defaults from the properties array ───────────────────────

type FieldMeta = { label: string; value: string; type: "text" | "textarea" };

interface EditableProperty {
  id: string;
  name: string;
  type: string;
  address?: string;
  city: string;
  sqft: string;
  status: string;
  badge?: string;
  description: string;
  features: string[];
  image?: string;
  images?: string[];
  imageAlt?: string;
  videoTour?: string;
  published?: boolean;
}

function buildPropertyDefaults(list: EditableProperty[]): Record<string, Record<string, FieldMeta>> {
  const sections: Record<string, Record<string, FieldMeta>> = {};
  for (const p of list) {
    const key = `property:${p.id}`;
    sections[key] = {
      name:        { label: "Property Name", value: p.name, type: "text" },
      type:        { label: "Property Type", value: p.type, type: "text" },
      address:     { label: "Address", value: p.address || "", type: "text" },
      city:        { label: "City / Market", value: p.city, type: "text" },
      sqft:        { label: "Square Footage", value: p.sqft, type: "text" },
      status:      { label: "Availability Status", value: p.status, type: "text" },
      badge:       { label: "Badge Text", value: p.badge || "", type: "text" },
      description: { label: "Description", value: p.description, type: "textarea" },
      features:    { label: "Features (one per line)", value: (p.features || []).join("\n"), type: "textarea" },
      imageAlt:    { label: "Image Alt Text (SEO)", value: p.imageAlt || p.name, type: "text" },
      videoTour:   { label: "Video Tour (YouTube URL)", value: p.videoTour || "", type: "text" },
    };
  }
  return sections;
}

interface ContentItem { section: string; key: string; value: string }

export default function PropertyEditor({ refreshKey = 0 }: { refreshKey?: number }) {
  const [propertiesList, setPropertiesList] = useState<EditableProperty[]>([]);
  const [overrides, setOverrides] = useState<ContentItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  // ── Image management state ──
  const [propImages, setPropImages] = useState<Record<string, PropertyImages>>({});
  const [imgUploading, setImgUploading] = useState<string | null>(null);
  const [imgDeleting, setImgDeleting] = useState<string | null>(null);
  const [imgSaved, setImgSaved] = useState<string | null>(null);
  const [propSaving, setPropSaving] = useState<Record<string, boolean>>({});
  const [propSaved, setPropSaved] = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement>>({});

  const DEFAULTS = React.useMemo(() => buildPropertyDefaults(propertiesList), [propertiesList]);

  function flashImgSaved(propId: string) {
    setImgSaved(propId);
    setTimeout(() => setImgSaved(null), 2500);
  };

  const fetchContent = useCallback(async () => {
    try {
      const [res, dynRes, sessRes] = await Promise.all([
        fetch("/api/site-content"),
        fetch("/api/properties-dynamic?admin=1"),
        fetch("/api/platform/session"),
      ]);
      const data = await res.json().catch(() => ({}));
      const dynData = await dynRes.json().catch(() => ({}));
      const sessData = await sessRes.json().catch(() => ({}));
      const isDemoOrg = sessData?.activeOrg?.id === "00000000-0000-0000-0000-000000000001";

      const dynProps: EditableProperty[] = (dynData.properties || []).map((dp: any) => ({
        id: dp.id,
        name: dp.name,
        type: dp.type || "Office",
        address: dp.address || "",
        city: dp.city || "",
        sqft: dp.sqft || "N/A",
        status: dp.lease_status || "Available",
        badge: dp.badge || "",
        description: dp.description || "",
        features: Array.isArray(dp.features) ? dp.features : [],
        image: dp.hero_image || dp.images?.[0] || "",
        images: Array.isArray(dp.images) ? dp.images : [],
        imageAlt: dp.name,
        videoTour: "",
        published: dp.published !== false,
      }));

      const dynIds = new Set(dynProps.map(d => d.id));
      const staticProps: EditableProperty[] = isDemoOrg
        ? PROPERTIES.filter(p => !dynIds.has(p.id)).map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            address: (p as any).address || "",
            city: p.city,
            sqft: p.sqft,
            status: p.status,
            badge: p.badge || "",
            description: p.description,
            features: p.features || [],
            image: (p as any).image || "",
            images: (p as any).images || ((p as any).image ? [(p as any).image] : []),
            imageAlt: (p as any).imageAlt || p.name,
            videoTour: (p as any).videoTour || "",
            published: true,
          }))
        : [];

      setPropertiesList([...dynProps, ...staticProps]);

      const items: ContentItem[] = (data.items || []).filter(
        (i: ContentItem) => i.section.startsWith("property:")
      );
      setOverrides(items);
    } catch {
      console.warn("Failed to fetch property content");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/property-images");
      const d = await res.json();
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
    } catch { console.warn("Failed to fetch images"); }
  }, []);

  useEffect(() => { fetchContent(); fetchImages(); }, [fetchContent, fetchImages, refreshKey]);

  // ── Image helpers ──
  function getImgRecord(propId: string, fallback?: string[]): PropertyImages {
    const ex = propImages[propId];
    if (ex) return ex;
    const prop = propertiesList.find(p => p.id === propId);
    const imgs: string[] = prop?.images || (prop?.image ? [prop.image] : []);
    return { property_id: propId, hero_url: fallback?.[0] || imgs[0] || null, all_urls: fallback || imgs, updated_at: "" };
  }

  async function patchImages(propId: string, heroUrl: string | null, allUrls: string[]) {
    await fetch("/api/property-images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: propId, heroUrl, allUrls }),
    });
  }

  async function handleImgUpload(propId: string, files: FileList) {
    setImgUploading(propId);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("propertyId", propId);
      const res = await fetch("/api/property-images", { method: "POST", body: form });
      const d = await res.json();
      if (d.url) newUrls.push(d.url);
    }
    if (newUrls.length) {
      const ex = getImgRecord(propId);
      const merged = [...ex.all_urls, ...newUrls];
      const hero = ex.hero_url || newUrls[0];
      setPropImages(prev => ({ ...prev, [propId]: { ...ex, all_urls: merged, hero_url: hero, updated_at: new Date().toISOString() } }));
      await patchImages(propId, hero, merged);
      flashImgSaved(propId);
    }
    setImgUploading(null);
  }

  async function handleSetHero(propId: string, url: string) {
    const ex = getImgRecord(propId);
    setPropImages(prev => ({ ...prev, [propId]: { ...ex, hero_url: url } }));
    await patchImages(propId, url, ex.all_urls);
    flashImgSaved(propId);
  }

  async function handleRemoveImg(propId: string, url: string) {
    setImgDeleting(url);
    const ex = getImgRecord(propId);
    const next = ex.all_urls.filter(u => u !== url);
    const newHero = ex.hero_url === url ? (next[0] || null) : ex.hero_url;
    setPropImages(prev => ({ ...prev, [propId]: { ...ex, all_urls: next, hero_url: newHero } }));
    await fetch("/api/property-images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: propId, url }) });
    setImgDeleting(null);
    flashImgSaved(propId);
  }

  const getValue = (section: string, key: string): string => {
    const editKey = `${section}:${key}`;
    if (editKey in editedValues) return editedValues[editKey];
    const override = overrides.find(o => o.section === section && o.key === key);
    if (override) return override.value;
    return DEFAULTS[section]?.[key]?.value ?? "";
  };

  const isDirty = (section: string, key: string): boolean => {
    const editKey = `${section}:${key}`;
    if (!(editKey in editedValues)) return false;
    const override = overrides.find(o => o.section === section && o.key === key);
    const saved = override?.value ?? DEFAULTS[section]?.[key]?.value ?? "";
    return editedValues[editKey] !== saved;
  };

  const isOverridden = (section: string, key: string): boolean =>
    overrides.some(o => o.section === section && o.key === key);

  const allDirtyFields = (): { section: string; key: string }[] => {
    const dirty: { section: string; key: string }[] = [];
    for (const [sec, fields] of Object.entries(DEFAULTS)) {
      for (const key of Object.keys(fields)) {
        if (isDirty(sec, key)) dirty.push({ section: sec, key });
      }
    }
    return dirty;
  };

  const totalDirty = allDirtyFields().length;

  const handleChange = (section: string, key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [`${section}:${key}`]: value }));
    setSaveSuccess(false);
  };

  const saveAll = async () => {
    const dirty = allDirtyFields();
    if (dirty.length === 0) return;
    setSaving(true); setError(null); setSaveSuccess(false);
    try {
      for (const { section, key } of dirty) {
        const value = editedValues[`${section}:${key}`] ?? getValue(section, key);
        const res = await fetch("/api/site-content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, key, value }),
        });
        if (!res.ok) throw new Error(`Failed to save ${section}/${key}`);
        setOverrides(prev => {
          const filtered = prev.filter(o => !(o.section === section && o.key === key));
          return [...filtered, { section, key, value }];
        });
      }
      setEditedValues({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const revertField = async (section: string, key: string) => {
    const editKey = `${section}:${key}`;
    setEditedValues(prev => { const n = { ...prev }; delete n[editKey]; return n; });
    if (isOverridden(section, key)) {
      try {
        await fetch(`/api/site-content?section=${encodeURIComponent(section)}&key=${encodeURIComponent(key)}`, { method: "DELETE" });
        setOverrides(prev => prev.filter(o => !(o.section === section && o.key === key)));
      } catch { setError("Failed to revert field"); }
    }
  };

  // Save only fields for a single property section
  const saveProp = async (sectionKey: string) => {
    const dirty = Object.keys(DEFAULTS[sectionKey] || {}).filter(k => isDirty(sectionKey, k));
    if (dirty.length === 0) return;
    setPropSaving(p => ({ ...p, [sectionKey]: true }));
    setError(null);
    const propId = sectionKey.replace(/^property:/, "");
    try {
      for (const key of dirty) {
        const value = editedValues[`${sectionKey}:${key}`] ?? getValue(sectionKey, key);
        const res = await fetch("/api/site-content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section: sectionKey, key, value }),
        });
        if (!res.ok) throw new Error(`Failed to save ${key}`);
        setOverrides(prev => {
          const filtered = prev.filter(o => !(o.section === sectionKey && o.key === key));
          return [...filtered, { section: sectionKey, key, value }];
        });
      }

      // Also sync core property fields directly to public.properties so the live tenant website & database stay in sync
      const resolveField = (k: string) => editedValues[`${sectionKey}:${k}`] ?? getValue(sectionKey, k);
      const nextName = resolveField("name");
      const nextType = resolveField("type");
      const nextAddress = resolveField("address");
      const nextCity = resolveField("city");
      const nextSqft = resolveField("sqft");
      const nextStatus = resolveField("status");
      const nextBadge = resolveField("badge");
      const nextDescription = resolveField("description");
      const nextFeaturesRaw = resolveField("features");
      const nextFeatures = nextFeaturesRaw
        ? nextFeaturesRaw.split("\n").map(s => s.trim()).filter(Boolean)
        : [];

      await fetch(`/api/properties-dynamic/${encodeURIComponent(propId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          type: nextType,
          address: nextAddress,
          city: nextCity,
          sqft: nextSqft,
          lease_status: nextStatus,
          badge: nextBadge || null,
          description: nextDescription,
          features: nextFeatures,
        }),
      }).catch(() => {});

      setPropertiesList(prev =>
        prev.map(p =>
          p.id === propId
            ? {
                ...p,
                name: nextName || p.name,
                type: nextType || p.type,
                address: nextAddress || p.address,
                city: nextCity || p.city,
                sqft: nextSqft || p.sqft,
                status: nextStatus || p.status,
                badge: nextBadge,
                description: nextDescription,
                features: nextFeatures,
              }
            : p
        )
      );

      setEditedValues(prev => {
        const next = { ...prev };
        for (const key of dirty) delete next[`${sectionKey}:${key}`];
        return next;
      });
      setPropSaved(p => ({ ...p, [sectionKey]: true }));
      setTimeout(() => setPropSaved(p => ({ ...p, [sectionKey]: false })), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPropSaving(p => ({ ...p, [sectionKey]: false }));
    }
  };

  const togglePublished = async (prop: EditableProperty, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPub = !(prop.published !== false);
    try {
      const res = await fetch(`/api/properties-dynamic/${encodeURIComponent(prop.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPub }),
      });
      if (res.ok) {
        setPropertiesList(prev => prev.map(p => (p.id === prop.id ? { ...p, published: nextPub } : p)));
      }
    } catch {
      setError("Failed to update visibility");
    }
  };

  const deleteProperty = async (prop: EditableProperty, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${prop.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/properties-dynamic/${encodeURIComponent(prop.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPropertiesList(prev => prev.filter(p => p.id !== prop.id));
      }
    } catch {
      setError("Failed to delete property");
    }
  };

  const toggleSection = (s: string) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  const sectionDirtyCount = (s: string): number =>
    Object.keys(DEFAULTS[s] || {}).filter(k => isDirty(s, k)).length;

  const inputClass =
    "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-400/60 focus:shadow-[0_0_12px_rgba(56,189,248,0.2)] focus:bg-[rgba(255,255,255,0.06)] transition-all";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#4ADE80]" />
        <span className="ml-3 text-gray-400 text-sm">Loading property editor…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <div className="p-5 sm:p-6 glass rounded-2xl border border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 size={20} className="text-[#38BDF8]" />
            Property Portfolio &amp; Listing Editor
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Edit photos, descriptions, availability, and features for your <strong className="text-white">{propertiesList.length} properties</strong>. Changes publish directly to your live website.
          </p>
        </div>
      </div>


      {error && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-950/40 border border-red-900/50">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {propertiesList.length === 0 && (
        <div className="p-10 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <Building2 size={32} className="text-slate-600 mx-auto mb-2.5" />
          <p className="text-base font-bold text-slate-300">No properties in your website portfolio yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Click <strong className="text-slate-300">&ldquo;Add New Property&rdquo;</strong> above to create a listing and upload photos.
          </p>
        </div>
      )}

      {/* ── Property Sections ── */}
      {propertiesList.map((prop) => {
        const sectionKey = `property:${prop.id}`;
        const fields = DEFAULTS[sectionKey];
        if (!fields) return null;
        const isExpanded = expandedSections[sectionKey];
        const dirtyCount = sectionDirtyCount(sectionKey);
        const customized = Object.keys(fields).filter(k => isOverridden(sectionKey, k)).length;
        const recPreview = getImgRecord(prop.id, prop.images || (prop.image ? [prop.image] : []));
        const thumbUrl = recPreview.hero_url || prop.image;
        const isPub = prop.published !== false;

        return (
          <div key={sectionKey} className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Property thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-[rgba(255,255,255,0.08)]">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt={prop.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                      <Building2 size={18} className="text-gray-700" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white flex flex-wrap items-center gap-2">
                    <span className="truncate">{getValue(sectionKey, "name") || prop.name}</span>
                    {customized > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] font-semibold">
                        {customized} customized
                      </span>
                    )}
                    {dirtyCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] font-semibold">
                        {dirtyCount} unsaved
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <MapPin size={11} className="text-slate-500" /> {getValue(sectionKey, "city") || prop.city} · {getValue(sectionKey, "type") || prop.type} · {getValue(sectionKey, "sqft") || prop.sqft} sqft
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => togglePublished(prop, e)}
                  title={isPub ? "Published on live website (click to set Draft)" : "Hidden Draft (click to Publish)"}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    isPub
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                      : "bg-slate-800/80 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {isPub ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span className="hidden sm:inline">{isPub ? "Live" : "Draft"}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => deleteProperty(prop, e)}
                  title="Delete property"
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <div className="text-slate-500 pl-1">
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-[rgba(255,255,255,0.05)] p-5 space-y-5">
                {/* ── Image Gallery ── */}
                {(() => {
                  const rec = getImgRecord(prop.id, (prop as any).images || ((prop as any).image ? [(prop as any).image] : []));
                  const hero = rec.hero_url;
                  const urls = rec.all_urls;
                  const isUp = imgUploading === prop.id;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Property Photo Gallery</p>
                        {imgSaved === prop.id && (
                          <span className="flex items-center gap-1 text-xs font-bold text-[#4ADE80] animate-pulse">
                            <CheckCircle2 size={12} /> Saved
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                        {urls.map((url, i) => {
                          const isHero = url === hero;
                          const isDel = imgDeleting === url;
                          return (
                            <div key={url + i} className={`relative rounded-xl overflow-hidden border-2 ${isHero ? "border-[#FACC15]" : "border-[rgba(255,255,255,0.08)]"}` }>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`${prop.name} ${i}`} className={`w-full h-20 object-cover ${isDel ? "opacity-30" : ""}`} />
                              {isHero && (
                                <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-[#FACC15] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-md">
                                  <Star size={8} fill="currentColor" /> HERO
                                </div>
                              )}
                              <div className="flex items-center justify-between px-2 py-1 bg-[rgba(0,0,0,0.65)]">
                                {isHero ? (
                                  <span className="text-[10px] font-black text-[#FACC15] flex items-center gap-1"><Star size={9} fill="currentColor" /> Cover</span>
                                ) : (
                                  <button onClick={() => handleSetHero(prop.id, url)} className="text-xs text-[#FACC15] hover:underline flex items-center gap-1 p-0.5" title="Set as cover photo"><Star size={12} /> Set Cover</button>
                                )}
                                <button
                                  onClick={() => { if (window.confirm("Remove this image?")) handleRemoveImg(prop.id, url); }}
                                  disabled={isDel}
                                  className="text-red-400 hover:text-red-300 p-0.5 disabled:opacity-40"
                                >
                                  {isDel ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={12} />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => fileRefs.current[prop.id]?.click()}
                          disabled={isUp}
                          className="h-[104px] rounded-xl border-2 border-dashed border-[rgba(96,165,250,0.3)] text-[#60A5FA] hover:border-[rgba(96,165,250,0.5)] hover:bg-[rgba(96,165,250,0.05)] transition-all flex flex-col items-center justify-center gap-1.5 text-xs font-semibold"
                        >
                          {isUp ? <Loader2 size={16} className="animate-spin" /> : <><Upload size={16} /><span>Upload Photos</span></>}
                        </button>
                      </div>
                      <input
                        ref={el => { if (el) fileRefs.current[prop.id] = el; }}
                        type="file" accept="image/*" multiple className="hidden"
                        onChange={e => { if (e.target.files?.length) { handleImgUpload(prop.id, e.target.files); e.target.value = ""; } }}
                      />
                    </div>
                  );
                })()}

                <div className="border-t border-[rgba(255,255,255,0.05)] pt-4 space-y-4">
                {Object.entries(fields).map(([fieldKey, fieldMeta]) => {
                  const val = getValue(sectionKey, fieldKey);
                  const dirty = isDirty(sectionKey, fieldKey);
                  const custom = isOverridden(sectionKey, fieldKey);

                  return (
                    <div key={fieldKey}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Type size={12} className="text-slate-500" />
                          {fieldMeta.label}
                          {dirty && <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] inline-block" />}
                        </label>
                        {(custom || dirty) && (
                          <button
                            onClick={() => revertField(sectionKey, fieldKey)}
                            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                            title="Reset to default"
                          >
                            <RotateCcw size={11} /> Reset
                          </button>
                        )}
                      </div>
                      {fieldMeta.type === "textarea" ? (
                        <textarea
                          value={val}
                          onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                          rows={fieldKey === "description" ? 5 : fieldKey === "features" ? 6 : 3}
                          className={`${inputClass} resize-none ${dirty ? "border-[rgba(250,204,21,0.3)]" : ""}`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={e => handleChange(sectionKey, fieldKey, e.target.value)}
                          className={`${inputClass} ${dirty ? "border-[rgba(250,204,21,0.3)]" : ""}`}
                        />
                      )}
                      {fieldKey === "features" && (
                        <p className="text-xs text-slate-500 mt-1">Enter one feature per line. These appear as feature badges on your website.</p>
                      )}
                      {fieldKey === "videoTour" && (
                        <p className="text-xs text-slate-500 mt-1">Paste a YouTube link (e.g. https://www.youtube.com/watch?v=...) to attach a video tour.</p>
                      )}
                    </div>
                  );
                })}
                </div>{/* end text fields */}

                {/* ── Per-property Save button ── */}
                {(() => {
                  const dc = sectionDirtyCount(sectionKey);
                  const isSaving = propSaving[sectionKey];
                  const isSaved = propSaved[sectionKey];
                  return (
                    <div className="flex items-center justify-end pt-2">
                      <button
                        onClick={() => saveProp(sectionKey)}
                        disabled={dc === 0 || isSaving}
                        className={`flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-300 ${
                          isSaved
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-[0_0_12px_rgba(74,222,128,0.25)]"
                            : dc > 0
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-[0_0_16px_rgba(59,130,246,0.35)]"
                            : "bg-[rgba(255,255,255,0.06)] text-gray-600 cursor-not-allowed"
                        }`}
                        style={dc > 0 && !isSaved ? { animation: "savePulse 2s infinite" } : {}}
                      >
                        {isSaving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> :
                         isSaved  ? <><CheckCircle2 size={14} /> Saved!</> :
                                    <><Save size={14} /> Save Changes{dc > 0 ? ` (${dc})` : ""}</>}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
