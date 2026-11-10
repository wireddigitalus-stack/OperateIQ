"use client";

import { useEffect, useState } from "react";
import { MailCheck, Loader2, X } from "lucide-react";

/**
 * Prompts password-signup owners to confirm their email. Unverified accounts
 * keep full access to the workspace they created, but can't be added to other
 * teams by invitation until verified.
 */
export default function EmailVerifyBanner() {
  const [state, setState] = useState<"hidden" | "unverified" | "sending" | "sent" | "verified" | "invalid">("hidden");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("email_verified");
    if (flag === "1") setState("verified");
    else if (flag === "invalid") setState("invalid");

    fetch("/api/platform/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => {
        if (s?.authenticated && s.user?.emailVerified === false && flag !== "1") setState("unverified");
      })
      .catch(() => {});
  }, []);

  const resend = async () => {
    setState("sending");
    try {
      const r = await fetch("/api/auth/verify-email", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setState("sent");
        setMsg("Sent! Check your inbox (and spam folder) for the confirmation link.");
      } else {
        setState("unverified");
        setMsg(d.error || "Could not send the email. Please try again.");
      }
    } catch {
      setState("unverified");
      setMsg("Network error. Please try again.");
    }
  };

  if (state === "hidden") return null;

  if (state === "verified" || state === "invalid") {
    const ok = state === "verified";
    return (
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 mt-3`}>
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${ok ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-amber-400/30 bg-amber-500/10 text-amber-200"}`}>
          <MailCheck size={16} className="flex-shrink-0" />
          <span className="flex-1">{ok ? "Your email is confirmed. Thanks!" : "That confirmation link is invalid or expired. Use “Resend” to get a new one."}</span>
          <button onClick={() => setState(ok ? "hidden" : "unverified")} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
        <MailCheck size={16} className="flex-shrink-0 text-sky-300" />
        <span className="flex-1 min-w-[200px]">
          Please confirm your email address. We sent a link when you signed up.
          {msg && <span className="block text-xs text-sky-200/80 mt-0.5">{msg}</span>}
        </span>
        {state !== "sent" && (
          <button
            onClick={resend}
            disabled={state === "sending"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-400 disabled:opacity-60"
          >
            {state === "sending" && <Loader2 size={12} className="animate-spin" />}
            Resend email
          </button>
        )}
      </div>
    </div>
  );
}
