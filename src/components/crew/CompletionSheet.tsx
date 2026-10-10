"use client";
import { useState, useEffect } from "react";
import { X, Loader2, Minus, Plus } from "lucide-react";
import PhotoCapture from "./PhotoCapture";
import SpeechTextarea from "./SpeechTextarea";

interface CompletionData {
  notes: string;
  photoUrl?: string;
  minutes?: number;
  billable?: boolean;
  materialAmount?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CompletionData) => Promise<void>;
  title: string;
  subtitle?: string;
  showTime?: boolean;
  accentColor?: string;
  submitLabel?: string;
}

export default function CompletionSheet({
  isOpen, onClose, onSubmit,
  title, subtitle,
  showTime = false,
  accentColor = "#4ADE80",
  submitLabel = "✓ Mark Done",
}: Props) {
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [minutes, setMinutes] = useState(30);
  const [billable, setBillable] = useState(false);
  const [materialAmount, setMaterialAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes("");
      setPhotoUrl(undefined);
      setMinutes(30);
      setBillable(false);
      setMaterialAmount("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        notes,
        photoUrl,
        minutes: showTime ? minutes : undefined,
        billable,
        materialAmount: billable ? (Number(materialAmount) || 0) : 0,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fmtTime = (m: number) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? `${h} hr` : `${h}h ${rem}m`;
  };

  const isLight = accentColor === "#FACC15" || accentColor === "#4ADE80";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div
        className="bg-[#0D1117] rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: "90vh", borderTop: `2px solid ${accentColor}50`, paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
      >
        <div className="p-6">
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.1)] mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-white">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* ── Time Picker ── */}
          {showTime && (
            <div className="mb-6">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">⏱ Time on Job</p>
              <div
                className="flex items-center gap-4 rounded-3xl p-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  onClick={() => setMinutes(m => Math.max(15, m - 15))}
                  className="w-16 h-16 rounded-2xl text-3xl font-black text-white flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <Minus size={24} />
                </button>
                <div className="flex-1 text-center">
                  <p className="text-4xl font-black text-white">{fmtTime(minutes)}</p>
                  <p className="text-xs text-gray-600 mt-1">tap +/− to adjust</p>
                </div>
                <button
                  onClick={() => setMinutes(m => Math.min(480, m + 15))}
                  className="w-16 h-16 rounded-2xl text-3xl font-black flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: `${accentColor}20`, color: accentColor }}
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>
          )}

          {/* ── Photo ── */}
          <div className="mb-6">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">📸 Photo Proof</p>
            <PhotoCapture
              label="📷 Take a Photo"
              onPhoto={url => setPhotoUrl(url)}
              onClear={() => setPhotoUrl(undefined)}
            />
          </div>

          {/* ── Billing ── */}
          <div className="mb-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">💰 Billable Item?</p>
                <p className="text-xs text-gray-500 mt-0.5">Toggle yes if tenant should be charged</p>
              </div>
              <button
                type="button"
                onClick={() => setBillable(!billable)}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 focus:outline-none ${billable ? "bg-[#4ADE80]" : "bg-[rgba(255,255,255,0.15)]"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-[#0D1117] transition-transform duration-200 ${billable ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {billable && (
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Material & Parts Cost ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={materialAmount}
                  onChange={e => setMaterialAmount(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2 text-sm text-white focus:border-[#4ADE80] outline-none placeholder:text-gray-700"
                />
              </div>
            )}
          </div>

          {/* ── Notes / Speech ── */}
          <div className="mb-8">
            <SpeechTextarea
              label="📝 Notes (optional — tap mic to speak)"
              value={notes}
              onChange={setNotes}
              placeholder="Any notes about this job…"
              rows={3}
              accentColor={accentColor}
            />
          </div>

          {/* ── Submit ── */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 rounded-3xl text-lg font-black flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
            style={{
              background: submitting ? "rgba(255,255,255,0.1)" : accentColor,
              color: isLight ? "#000" : "#fff",
              boxShadow: submitting ? "none" : `0 4px 20px ${accentColor}40`,
            }}
          >
            {submitting
              ? <><Loader2 size={22} className="animate-spin" /> Saving…</>
              : submitLabel
            }
          </button>
        </div>
      </div>
    </div>
  );
}
