"use client";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Plus, Trash2, Upload, CheckCircle2, Building2, Eye, EyeOff, Edit3, X } from "lucide-react";

const TYPES = ["Office","CoWorking","Retail","Event Space","Warehouse","Suite","Mixed-Use","Industrial"];
const STATUSES = [{ v:"available", l:"Available" },{ v:"leased", l:"Leased" },{ v:"coming-soon", l:"Coming Soon" }];
const BADGE_COLORS = ["#4ADE80","#FACC15","#60A5FA","#F97316","#A78BFA","#F43F5E"];

interface DynProperty {
  id: string; name: string; type: string; address?: string; city: string; sqft?: string;
  lease_status: string; badge?: string; badge_color: string; description?: string;
  features: string[]; images: string[]; hero_image?: string; in_banner: boolean;
  published: boolean; created_at: string;
}

const EMPTY = (): Omit<DynProperty,"id"|"created_at"> => ({
  name:"", type:"Office", address:"", city:"Bristol", sqft:"", lease_status:"available",
  badge:"", badge_color:"#4ADE80", description:"", features:[""], images:[], hero_image:"",
  in_banner:false, published:false,
});

export default function PropertyCreator() {
  const [form, setForm] = useState(EMPTY());
  const [properties, setProperties] = useState<DynProperty[]>([]);
  const [editId, setEditId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{type:"ok"|"err", text:string}|null>(null);
  const [tableOk, setTableOk] = useState(true);
  const [deleting, setDeleting] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/properties-dynamic?admin=1");
    if (!res.ok) return;
    const d = await res.json();
    setTableOk(d.tableExists !== false);
    setProperties(d.properties || []);
  }

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function setFeature(i: number, v: string) {
    const next = [...form.features]; next[i] = v; set("features", next);
  }
  function addFeature() { set("features", [...form.features, ""]); }
  function removeFeature(i: number) { set("features", form.features.filter((_,x) => x !== i)); }

  async function uploadImages(files: FileList) {
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append("file", file); fd.append("type", "image");
      const r = await fetch("/api/hero-banner/upload", { method:"POST", body:fd });
      if (r.ok) { const d = await r.json(); urls.push(d.url); }
    }
    const next = [...form.images, ...urls];
    set("images", next);
    if (!form.hero_image && next.length) set("hero_image", next[0]);
    setUploading(false);
  }

  function removeImage(url: string) {
    const next = form.images.filter(u => u !== url);
    set("images", next);
    if (form.hero_image === url) set("hero_image", next[0] || "");
  }

  async function enhance() {
    setEnhancing(true); setMsg(null);
    try {
      const res = await fetch("/api/ai/enhance-property", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:form.name, type:form.type, city:form.city, sqft:form.sqft, address:form.address, keywords }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ type:"err", text: d.message || d.error || "AI failed" }); return; }
      if (d.description) set("description", d.description);
      if (d.features?.length) set("features", d.features);
      if (d.badge) set("badge", d.badge);
    } catch { setMsg({ type:"err", text:"AI enhancement failed — fill in manually." }); }
    finally { setEnhancing(false); }
  }

  async function save() {
    if (!form.name || !form.city) { setMsg({ type:"err", text:"Name and City are required." }); return; }
    setSaving(true); setMsg(null);
    const payload = { ...form, features: form.features.filter(Boolean) };
    const method = editId ? "PATCH" : "POST";
    const url = editId ? `/api/properties-dynamic/${editId}` : "/api/properties-dynamic";
    const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) {
      if (d.error === "TABLE_MISSING") setTableOk(false);
      setMsg({ type:"err", text: d.error === "TABLE_MISSING" ? "Run the setup SQL in Supabase first." : (d.error || "Save failed") });
      return;
    }
    setMsg({ type:"ok", text: editId ? "Property updated!" : "Property saved as draft!" });
    setForm(EMPTY()); setEditId(null); setKeywords("");
    load();
  }

  function startEdit(p: DynProperty) {
    setEditId(p.id);
    setForm({ name:p.name, type:p.type, address:p.address||"", city:p.city, sqft:p.sqft||"",
      lease_status:p.lease_status, badge:p.badge||"", badge_color:p.badge_color,
      description:p.description||"", features:p.features.length ? p.features : [""],
      images:p.images, hero_image:p.hero_image||"", in_banner:p.in_banner, published:p.published });
    formRef.current?.scrollIntoView({ behavior:"smooth" });
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY()); setMsg(null); }

  async function togglePublish(p: DynProperty) {
    await fetch(`/api/properties-dynamic/${p.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ published: !p.published }),
    });
    load();
  }

  async function del(id: string) {
    setDeleting(id);
    await fetch(`/api/properties-dynamic/${id}`, { method:"DELETE" });
    setDeleting(null); load();
  }

  const inputCls = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[rgba(74,222,128,0.4)] outline-none placeholder:text-gray-700";
  const labelCls = "text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-8">

      {/* Setup Warning */}
      {!tableOk && (
        <div className="rounded-2xl border border-[rgba(250,204,21,0.3)] bg-[rgba(250,204,21,0.06)] p-5">
          <p className="text-sm font-bold text-[#FACC15] mb-2">⚠ Database Table Required</p>
          <p className="text-xs text-gray-400 mb-3">Run this SQL in <strong>Supabase → SQL Editor</strong> then refresh:</p>
          <pre className="text-[10px] text-gray-300 bg-black/40 rounded-xl p-4 overflow-x-auto leading-relaxed">{`CREATE TABLE IF NOT EXISTS properties (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  address      TEXT,
  city         TEXT NOT NULL DEFAULT 'Bristol',
  sqft         TEXT,
  lease_status TEXT DEFAULT 'available',
  badge        TEXT,
  badge_color  TEXT DEFAULT '#4ADE80',
  description  TEXT,
  features     JSONB DEFAULT '[]',
  images       JSONB DEFAULT '[]',
  hero_image   TEXT,
  in_banner    BOOLEAN DEFAULT false,
  published    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;`}</pre>
        </div>
      )}

      {/* Form */}
      <div ref={formRef} className="glass rounded-2xl border border-[rgba(74,222,128,0.15)] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center">
              <Building2 size={17} className="text-black" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">{editId ? "Edit Property" : "Add New Property"}</h2>
              <p className="text-[11px] text-gray-500">{editId ? "Update fields then save" : "Fill in the details — use AI to generate copy"}</p>
            </div>
          </div>
          {editId && (
            <button onClick={cancelEdit} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 transition-colors">
              <X size={11} /> Cancel
            </button>
          )}
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Property Name *</label>
            <input className={inputCls} placeholder="e.g. The Park View Suite" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Type *</label>
            <select className={inputCls} value={form.type} onChange={e => set("type", e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input className={inputCls} placeholder="e.g. 100 5th St., Suite 3A" value={form.address} onChange={e => set("address", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>City *</label>
            <input className={inputCls} placeholder="Bristol" value={form.city} onChange={e => set("city", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Square Footage</label>
            <input className={inputCls} placeholder="e.g. 2,400" value={form.sqft} onChange={e => set("sqft", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Lease Status</label>
            <select className={inputCls} value={form.lease_status} onChange={e => set("lease_status", e.target.value)}>
              {STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Badge Text</label>
            <input className={inputCls} placeholder="e.g. Move-In Ready" value={form.badge} onChange={e => set("badge", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Badge Color</label>
            <div className="flex gap-2">
              {BADGE_COLORS.map(c => (
                <button key={c} onClick={() => set("badge_color", c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.badge_color === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        {/* AI Enhancement */}
        <div className="rounded-2xl border border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.04)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-[#A78BFA]" />
            <p className="text-xs font-black text-white">AI Enhancement</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[rgba(167,139,250,0.2)] text-[#A78BFA] font-bold">Gemini</span>
          </div>
          <div>
            <label className={labelCls}>Feature Keywords (optional — comma separated)</label>
            <input className={inputCls} placeholder="e.g. fiber internet, parking, private offices, natural light"
              value={keywords} onChange={e => setKeywords(e.target.value)} />
          </div>
          <button onClick={enhance} disabled={enhancing || !form.name}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white text-xs font-black hover:opacity-90 disabled:opacity-40 transition-all">
            {enhancing ? <><Loader2 size={11} className="animate-spin" /> Enhancing…</> : <><Sparkles size={11} /> Generate Description + Features</>}
          </button>
          <p className="text-[10px] text-gray-600">Fill in Name, Type & City first, then click Generate to auto-write copy.</p>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <textarea spellCheck={true} className={inputCls} rows={5} placeholder="Property description — use AI above or write your own…"
            value={form.description} onChange={e => set("description", e.target.value)} />
        </div>

        {/* Features */}
        <div>
          <label className={labelCls}>Features & Amenities</label>
          <div className="space-y-2">
            {form.features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} placeholder={`Feature ${i+1}`} value={f} onChange={e => setFeature(i, e.target.value)} />
                <button onClick={() => removeFeature(i)} className="text-gray-700 hover:text-red-400 transition-colors px-1">
                  <X size={13} />
                </button>
              </div>
            ))}
            <button onClick={addFeature} className="flex items-center gap-1.5 text-xs text-[#4ADE80] hover:text-white transition-colors">
              <Plus size={11} /> Add Feature
            </button>
          </div>
        </div>

        {/* Images */}
        <div>
          <label className={labelCls}>Property Images</label>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
            onChange={e => e.target.files && uploadImages(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.12)] text-gray-500 hover:border-[rgba(74,222,128,0.4)] hover:text-[#4ADE80] transition-all text-xs font-bold w-full justify-center">
            {uploading ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : <><Upload size={12} /> Click to upload images</>}
          </button>
          {form.images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {form.images.map((url, i) => (
                <div key={i} className={`relative group rounded-xl overflow-hidden border-2 transition-all ${form.hero_image === url ? "border-[#4ADE80]" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-20 object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button onClick={() => set("hero_image", url)} title="Set as hero" className="text-[#4ADE80] hover:scale-110 transition-transform">
                      <CheckCircle2 size={14} />
                    </button>
                    <button onClick={() => removeImage(url)} className="text-red-400 hover:scale-110 transition-transform">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {form.hero_image === url && (
                    <div className="absolute top-1 left-1 text-[8px] bg-[#4ADE80] text-black font-black px-1.5 py-0.5 rounded-full">HERO</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Placement */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div onClick={() => set("in_banner", !form.in_banner)}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.in_banner ? "bg-[#4ADE80]" : "bg-[rgba(255,255,255,0.08)]"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.in_banner ? "left-5" : "left-0.5"}`} />
            </div>
            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Include in Homepage Banner rotation</span>
          </label>
        </div>

        {/* Message */}
        {msg && (
          <div className={`text-xs px-4 py-2.5 rounded-xl font-medium ${msg.type === "ok" ? "bg-[rgba(74,222,128,0.1)] text-[#4ADE80] border border-[rgba(74,222,128,0.3)]" : "bg-[rgba(239,68,68,0.1)] text-red-400 border border-[rgba(239,68,68,0.3)]"}`}>
            {msg.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => { set("published", false); save(); }} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[rgba(255,255,255,0.1)] text-white text-sm font-black hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50 transition-all">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save as Draft
          </button>
          <button onClick={() => { set("published", true); save(); }} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black text-sm font-black hover:opacity-90 disabled:opacity-50 transition-all">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save & Publish
          </button>
        </div>
      </div>

      {/* Property List */}
      {properties.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Dynamic Properties ({properties.length})</h3>
          {properties.map(p => (
            <div key={p.id} className="glass rounded-2xl border border-[rgba(255,255,255,0.06)] flex items-center gap-4 px-5 py-4">
              {p.hero_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.hero_image} alt={p.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center flex-shrink-0">
                  <Building2 size={22} className="text-gray-700" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white truncate">{p.name}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${p.published ? "bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.3)] text-[#4ADE80]" : "bg-[rgba(250,204,21,0.1)] border-[rgba(250,204,21,0.3)] text-[#FACC15]"}`}>
                    {p.published ? "Live" : "Draft"}
                  </span>
                  {p.in_banner && <span className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.3)] text-[#60A5FA] font-black">Banner</span>}
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">{p.type} · {p.city}{p.sqft ? ` · ${p.sqft} sqft` : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(p)} title={p.published ? "Unpublish" : "Publish"}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-[#4ADE80] transition-colors">
                  {p.published ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => startEdit(p)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-white transition-colors">
                  <Edit3 size={13} />
                </button>
                <button onClick={() => del(p.id)} disabled={deleting === p.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-600 hover:text-red-400 hover:border-[rgba(239,68,68,0.3)] transition-colors">
                  {deleting === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
