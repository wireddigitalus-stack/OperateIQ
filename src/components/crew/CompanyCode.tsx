"use client";

import { useEffect, useState } from "react";

/**
 * Crew portals log in with COMPANY CODE + PIN. The company code is the
 * organization slug. It arrives via the invite link (`?org=acme-properties`)
 * and is remembered on the device so crew only type it once.
 */
const KEY = "oiq_staff_org";

export function normalizeOrgCode(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function useStaffOrgCode(): [string, (v: string) => void, boolean] {
  const [code, setCode] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("org");
      const initial = normalizeOrgCode(fromUrl || localStorage.getItem(KEY) || "");
      if (initial) {
        setCode(initial);
        localStorage.setItem(KEY, initial);
      }
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);

  const update = (v: string) => {
    const n = normalizeOrgCode(v);
    setCode(n);
    try {
      if (n) localStorage.setItem(KEY, n);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  return [code, update, ready];
}

/** Company code input / summary shown above the PIN dots. */
export function CompanyCodeField({
  code,
  onChange,
  accent = "#FACC15",
}: {
  code: string;
  onChange: (v: string) => void;
  accent?: string;
}) {
  const [editing, setEditing] = useState(!code);
  const [draft, setDraft] = useState(code);
  const [userTyping, setUserTyping] = useState(false);

  useEffect(() => {
    // Collapse to the summary line when a code arrives externally (from URL link or localStorage)
    // without collapsing mid-keystroke while the worker is typing.
    if (!userTyping) {
      setEditing(!code);
      setDraft(code);
    }
  }, [code, userTyping]);

  if (!editing && code) {
    return (
      <div className="mb-4 sm:mb-6 text-center text-xs text-gray-500">
        Company code: <span className="font-mono font-bold text-gray-300">{code}</span>{" "}
        <button type="button" onClick={() => { setUserTyping(true); setEditing(true); }} className="underline hover:text-white ml-1">
          change
        </button>
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-xs mb-4 sm:mb-6"
      onSubmit={(e) => {
        e.preventDefault();
        setUserTyping(false);
        onChange(draft);
        if (normalizeOrgCode(draft)) setEditing(false);
      }}
    >
      <label htmlFor="company-code" className="block text-xs font-bold text-gray-400 mb-1.5 text-center">
        Company code
      </label>
      <div className="flex gap-2">
        <input
          id="company-code"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setUserTyping(true);
            setDraft(v);
            onChange(v);
          }}
          onBlur={() => {
            setUserTyping(false);
            if (normalizeOrgCode(draft)) setEditing(false);
          }}
          placeholder="e.g. smith-properties"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 min-w-0 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2.5 text-base text-white font-mono outline-none focus:border-white/30"
        />
        <button
          type="submit"
          className="px-3 rounded-xl text-sm font-bold text-black"
          style={{ backgroundColor: accent }}
        >
          OK
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mt-1.5 text-center">It&apos;s in the portal link your manager sent you.</p>
    </form>
  );
}
