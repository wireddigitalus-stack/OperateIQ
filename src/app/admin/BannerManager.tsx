"use client";
import React, { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, X, Upload, Video, ImageIcon, Trash2, Save, RefreshCw, AlertTriangle, Monitor } from "lucide-react";
import { PROPERTIES } from "@/lib/data";

const MAIN_IDS = ["city-centre","bristol-cowork","the-executive","centre-point-suites","foundation-event-facility","warehouse"];
const BANNER_PROPS = PROPERTIES.filter(p => MAIN_IDS.includes(p.id));

interface Slide { type: "property"|"custom"; propertyId?: string; imageUrl?: string; label: string; location: string; enabled: boolean; order: number; }
interface HeroConfig { slides: Slide[]; videoUrl: string|null; videoEnabled: boolean; }
interface Override { property_id: string; image_url: string; }

export default function BannerManager() {
  const [config, setConfig] = useState<HeroConfig>({ slides: [], videoUrl: null, videoEnabled: false });
  const [overrides, setOverrides] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [uploadingCustom, setUploadingCustom] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customLoc, setCustomLoc] = useState("Bristol, TN");
  const [videoInput, setVideoInput] = useState("");
  const customFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [bRes, iRes] = await Promise.all([fetch("/api/hero-banner"), fetch("/api/property-images")]);
      if (bRes.ok) {
        const d = await bRes.json();
        if (d.raw) { setConfig(d.raw); if (d.raw.videoUrl) setVideoInput(d.raw.videoUrl); }
        // Show setup prompt if table doesn't exist
        if (d.tableExists === false) setSetupNeeded(true);
      } else setSetupNeeded(true);
      if (iRes.ok) {
        const d = await iRes.json();
        const map: Record<string,string> = {};
        if (Array.isArray(d.overrides)) d.overrides.forEach((o: Override) => { map[o.property_id] = o.image_url; });
        setOverrides(map);
      }
    } catch { setSetupNeeded(true); }
    finally { setLoading(false); }
  }

  function getPropImg(id: string) { const p = BANNER_PROPS.find(x => x.id === id); return overrides[id] || p?.image || ""; }
  function isOn(id: string) { return config.slides.find(s => s.type==="property" && s.propertyId===id)?.enabled ?? false; }

  function toggleProp(id: string) {
    setConfig(prev => {
      const idx = prev.slides.findIndex(s => s.type==="property" && s.propertyId===id);
      if (idx >= 0) {
        const next = [...prev.slides]; next[idx] = { ...next[idx], enabled: !next[idx].enabled };
        return { ...prev, slides: next };
      }
      const p = BANNER_PROPS.find(x => x.id === id)!;
      const maxOrder = Math.max(0, ...prev.slides.map(s => s.order));
      return { ...prev, slides: [...prev.slides, { type:"property", propertyId:id, label:p.name, location:`${p.city}, TN`, enabled:true, order:maxOrder+1 }] };
    });
  }

  async function uploadCustom(file: File) {
    setUploadingCustom(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("type","image");
      const res = await fetch("/api/hero-banner/upload", { method:"POST", body:fd });
      const d = await res.json(); if (!res.ok) throw new Error(d.error);
      const maxOrder = Math.max(0, ...config.slides.map(s => s.order));
      setConfig(prev => ({ ...prev, slides: [...prev.slides, { type:"custom", imageUrl:d.url, label:customLabel||"Custom Banner", location:customLoc||"Bristol, TN", enabled:true, order:maxOrder+1 }] }));
      setCustomLabel(""); setCustomLoc("Bristol, TN");
    } catch(e: unknown) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploadingCustom(false); }
  }

  async function uploadVideo(file: File) {
    setUploadingVideo(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("type","video");
      const res = await fetch("/api/hero-banner/upload", { method:"POST", body:fd });
      const d = await res.json(); if (!res.ok) throw new Error(d.error);
      setConfig(prev => ({ ...prev, videoUrl:d.url, videoEnabled:true }));
      setVideoInput(d.url);
    } catch(e: unknown) { setError(e instanceof Error ? e.message : "Video upload failed"); }
    finally { setUploadingVideo(false); }
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const payload = { ...config, videoUrl: config.videoEnabled ? (videoInput.trim() || config.videoUrl) : null };
      const res = await fetch("/api/hero-banner", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) {
        if (d.error === "TABLE_MISSING") {
          setSetupNeeded(true);
          setError("Database table not ready — run the SQL below first, then save again.");
        } else {
          throw new Error(d.error || "Save failed");
        }
        return;
      }
      setSavedOk(true); setSetupNeeded(false); setTimeout(()=>setSavedOk(false), 3000);
    } catch(e: unknown) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  const customSlides = config.slides.filter(s => s.type === "custom");
  const activeCount = config.slides.filter(s => s.enabled).length;

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#FACC15]" /></div>;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-[#FACC15] uppercase tracking-widest">Homepage Banner Manager</p>
          <p className="text-[11px] text-gray-600 mt-0.5">Toggle property slides, add custom images, or set a video background.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-white transition-colors"><RefreshCw size={13} /></button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F59E0B] text-black text-xs font-black hover:opacity-90 disabled:opacity-40 transition-all">
            {saving ? <Loader2 size={12} className="animate-spin"/> : savedOk ? <CheckCircle2 size={12}/> : <Save size={12}/>}
            {saving ? "Saving…" : savedOk ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Setup SQL */}
      {setupNeeded && (
        <div className="rounded-2xl border border-[rgba(250,204,21,0.3)] bg-[rgba(250,204,21,0.04)] p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#FACC15] text-xs font-black"><AlertTriangle size={13}/> One-Time Database Setup</div>
          <p className="text-[11px] text-gray-400">Run this in your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#FACC15] underline">Supabase SQL Editor</a>, then configure and Save:</p>
          <pre className="text-[10px] text-[#4ADE80] bg-black/40 rounded-xl p-3 overflow-x-auto font-mono whitespace-pre">{`CREATE TABLE IF NOT EXISTS site_settings (\n  key TEXT PRIMARY KEY,\n  value JSONB NOT NULL,\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);`}</pre>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          <X size={12}/>{error}<button onClick={()=>setError(null)} className="ml-auto"><X size={10}/></button>
        </div>
      )}

      {/* Live status */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
        <Monitor size={13} className="text-gray-500"/>
        <p className="text-xs text-gray-400">Banner mode:
          {config.videoEnabled && config.videoUrl
            ? <span className="text-[#FACC15] font-bold ml-1">📹 Video Background</span>
            : <span className="text-[#4ADE80] font-bold ml-1">🖼 {activeCount}-slide Slideshow</span>
          }
        </p>
        <span className="ml-auto text-[10px] text-gray-600">Changes go live on Save</span>
      </div>

      {/* ── Property Slides ── */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-3">
          <ImageIcon size={13} className="text-[#FACC15]"/>
          <p className="text-xs font-black text-white">Property Slides</p>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[rgba(250,204,21,0.1)] text-[#FACC15] border border-[rgba(250,204,21,0.25)]">
            {BANNER_PROPS.filter(p => isOn(p.id)).length} / {BANNER_PROPS.length} ON
          </span>
          <p className="text-[10px] text-gray-600 ml-auto">Tap to toggle in/out of banner</p>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BANNER_PROPS.map(prop => {
            const on = isOn(prop.id);
            const img = getPropImg(prop.id);
            return (
              <button key={prop.id} onClick={()=>toggleProp(prop.id)}
                className={`relative rounded-xl border-2 overflow-hidden text-left transition-all duration-200 ${on ? "border-[#4ADE80] shadow-[0_0_10px_rgba(74,222,128,0.2)]" : "border-[rgba(255,255,255,0.07)] opacity-50 hover:opacity-70"}`}
              >
                <div className="relative h-20">
                  {img && <img src={img} alt={prop.name} className="w-full h-full object-cover"/>}
                  <div className={`absolute inset-0 ${on ? "bg-black/10" : "bg-black/50"}`}/>
                  <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${on ? "border-[#4ADE80] bg-[#4ADE80]" : "border-white/30 bg-black/40"}`}>
                    {on && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-bold text-white truncate">{prop.name}</p>
                  <p className="text-[9px] text-gray-600">{prop.city}, TN</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Custom Banner Images ── */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-3">
          <Upload size={13} className="text-[#60A5FA]"/>
          <p className="text-xs font-black text-white">Custom Banner Images</p>
          <p className="text-[10px] text-gray-600 ml-auto">Upload any photo to add as a slide</p>
        </div>
        <div className="p-4 space-y-3">
          {/* Custom label/location inputs */}
          <div className="grid grid-cols-2 gap-2">
            <input value={customLabel} onChange={e=>setCustomLabel(e.target.value)} placeholder="Slide label (e.g. New Development)" className="px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#60A5FA]"/>
            <input value={customLoc} onChange={e=>setCustomLoc(e.target.value)} placeholder="Location" className="px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#60A5FA]"/>
          </div>
          <input ref={customFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/heic" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) uploadCustom(f); e.target.value="";}}/>
          <button onClick={()=>customFileRef.current?.click()} disabled={uploadingCustom} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[rgba(96,165,250,0.3)] text-[#60A5FA] text-xs font-bold hover:bg-[rgba(96,165,250,0.07)] disabled:opacity-40 transition-all">
            {uploadingCustom ? <><Loader2 size={12} className="animate-spin"/>Uploading…</> : <><Upload size={12}/>Choose Image to Upload</>}
          </button>
          {/* Existing custom slides */}
          {customSlides.length > 0 && (
            <div className="space-y-2 pt-1">
              {customSlides.map(s => (
                <div key={s.imageUrl} className="flex items-center gap-3 p-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                  {s.imageUrl && <img src={s.imageUrl} alt={s.label} className="w-12 h-8 object-cover rounded-lg flex-shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{s.label}</p>
                    <p className="text-[9px] text-gray-600">{s.location}</p>
                  </div>
                  <button onClick={()=>setConfig(prev=>({...prev, slides:prev.slides.filter(x=>x.imageUrl!==s.imageUrl)}))} className="p-1 text-red-400 hover:text-red-300 transition-colors flex-shrink-0">
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Video Background ── */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-3">
          <Video size={13} className="text-[#A78BFA]"/>
          <p className="text-xs font-black text-white">Video Background</p>
          <span className="text-[9px] text-gray-600 ml-auto">Replaces the slideshow when enabled</span>
          {/* Toggle */}
          <button onClick={()=>setConfig(prev=>({...prev, videoEnabled:!prev.videoEnabled}))}
            className={`relative w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${config.videoEnabled ? "bg-[#A78BFA]" : "bg-[rgba(255,255,255,0.12)]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${config.videoEnabled ? "left-[18px]" : "left-0.5"}`}/>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input value={videoInput} onChange={e=>setVideoInput(e.target.value)} placeholder="Paste direct .mp4 video URL…" className="flex-1 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#A78BFA]"/>
            <button onClick={()=>{ if(videoInput.trim()) setConfig(prev=>({...prev, videoUrl:videoInput.trim(), videoEnabled:true})); }}
              className="px-3 py-2 rounded-xl bg-[rgba(167,139,250,0.15)] border border-[rgba(167,139,250,0.3)] text-[#A78BFA] text-xs font-bold hover:bg-[rgba(167,139,250,0.25)] transition-all">
              Set URL
            </button>
          </div>
          <p className="text-[10px] text-gray-600 text-center">— or —</p>
          <input ref={videoFileRef} type="file" accept="video/mp4,video/webm,video/mov" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) uploadVideo(f); e.target.value="";}}/>
          <button onClick={()=>videoFileRef.current?.click()} disabled={uploadingVideo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[rgba(167,139,250,0.3)] text-[#A78BFA] text-xs font-bold hover:bg-[rgba(167,139,250,0.07)] disabled:opacity-40 transition-all">
            {uploadingVideo ? <><Loader2 size={12} className="animate-spin"/>Uploading video…</> : <><Upload size={12}/>Upload Video File (.mp4, .webm)</>}
          </button>
          {config.videoUrl && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)]">
              <Video size={12} className="text-[#A78BFA] flex-shrink-0"/>
              <p className="text-[10px] text-[#A78BFA] truncate flex-1">{config.videoUrl}</p>
              <button onClick={()=>setConfig(prev=>({...prev, videoUrl:null, videoEnabled:false}))} className="text-red-400 hover:text-red-300 flex-shrink-0"><X size={11}/></button>
            </div>
          )}
          {config.videoEnabled && !config.videoUrl && <p className="text-[10px] text-[#FACC15]/60 text-center">⚠ Video enabled but no URL set — slideshow will show instead.</p>}
        </div>
      </div>
    </div>
  );
}
