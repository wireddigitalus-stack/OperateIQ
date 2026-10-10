"use client";
import { useState, useRef, useEffect, useCallback } from "react";

/**
 * MicButton — Native Web Speech API dictation button.
 * Zero dependencies. ~1KB. Works in Chrome, Edge, Safari.
 * If the browser doesn't support it, renders nothing.
 *
 * Usage:
 *   <MicButton onResult={(text) => setMyField(prev => prev ? prev + " " + text : text)} />
 */

interface MicButtonProps {
  /** Called with the recognized text when the user finishes speaking */
  onResult: (text: string) => void;
  /** Optional size in px (default 16) */
  size?: number;
  /** Optional className overrides */
  className?: string;
}

// Safely check for SpeechRecognition support
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SR || null;
}

export default function MicButton({ onResult, size = 16, className = "" }: MicButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const toggle = useCallback(() => {
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) onResultRef.current(text);
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recRef.current) {
        try { recRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Stop listening" : "Voice input"}
      className={`flex-shrink-0 flex items-center justify-center rounded-lg transition-all ${
        listening
          ? "bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]"
          : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-[#4ADE80] hover:border-[rgba(74,222,128,0.3)] hover:bg-[rgba(74,222,128,0.06)]"
      } ${className}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      {listening ? (
        /* Stop icon */
        <svg width={size - 2} height={size - 2} viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="3" width="10" height="10" rx="2" />
        </svg>
      ) : (
        /* Mic icon */
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )}
    </button>
  );
}
