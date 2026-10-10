"use client";
import { useRef, useState } from "react";
import { Camera, X, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  onPhoto: (url: string) => void;
  onClear?: () => void;
  label?: string;
}

export default function PhotoCapture({ onPhoto, onClear, label = "Add Photo Proof" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/crew-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        onPhoto(data.url);
      } else {
        setError("Upload failed — tap to retry");
        setPreview(null);
      }
    } catch {
      setError("Upload failed — tap to retry");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    onClear?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {preview ? (
        <div className="relative rounded-3xl overflow-hidden" style={{ height: 160 }}>
          <img src={preview} alt="proof" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="text-white animate-spin" />
              <p className="text-white text-sm font-black">Uploading…</p>
            </div>
          )}
          {!uploading && (
            <>
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5">
                <CheckCircle2 size={14} className="text-[#4ADE80]" />
                <span className="text-white text-xs font-black">Photo saved ✓</span>
              </div>
              <button
                onClick={clear}
                className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={16} className="text-white" />
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ height: 110, borderColor: "rgba(96,165,250,0.35)", background: "rgba(96,165,250,0.05)" }}
        >
          <Camera size={30} className="text-[#60A5FA]" />
          <span className="text-sm font-black text-white">{label}</span>
          <span className="text-xs text-gray-600">Tap to open camera</span>
        </button>
      )}

      {error && <p className="text-red-400 text-xs mt-2 text-center font-bold">{error}</p>}
    </>
  );
}
