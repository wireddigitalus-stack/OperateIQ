"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Phone, User, Building2, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

const SPACE_OPTIONS = [
  "Office Space",
  "Executive Suite",
  "CoWork / Flex Desk",
  "Retail Storefront",
  "Warehouse / Industrial",
  "Not sure yet",
];

const INPUT = "w-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] rounded-2xl px-4 py-3.5 text-white text-base focus:border-[rgba(74,222,128,0.6)] focus:bg-[rgba(255,255,255,0.1)] outline-none placeholder:text-white/40 transition-all";

function formatPhoneMeet(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (!digits.length) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function MeetPage() {
  const params = useParams();
  const agent = ((params.agent as string) ?? "team").toLowerCase();

  // ── Resolve team member name dynamically from Supabase ──────────────────
  const [member, setMember] = useState({ name: "Vision LLC", title: "Commercial Real Estate" });
  const [memberLoaded, setMemberLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/team-member?slug=${encodeURIComponent(agent)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setMember({ name: data.name, title: data.title || "Vision LLC Team" });
      })
      .catch(() => {})
      .finally(() => setMemberLoaded(true));
  }, [agent]);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", spaceType: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = form.name.trim() && form.phone.replace(/\D/g, "").length >= 10;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/admin-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          email: form.email.trim(),
          spaceType: form.spaceType || "Not sure yet",
          budget: 0,
          timeline: "Exploring options",
          teamSize: "Solo",
          additionalInfo: form.notes.trim(),
          score: 62,
          scoreLabel: "Warm Lead",
          reasoning: `In-person QR lead captured by ${member.name}. Direct referral — high conversion potential.`,
          source: "qr",
          medium: "in-person",
          campaign: agent,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); return; }
      setDone(true);
    } catch {
      setError("Connection error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Derive the first name for friendly copy
  const firstName = member.name.split(" ")[0];
  // Only show the personal "You met <name>" when it's actually a person, not "Vision LLC"
  const isPersonal = member.name !== "Vision LLC";

  return (
    <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center px-5 pt-24 pb-12">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#4ADE80] opacity-[0.05] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative">


        {!done ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] text-xs font-bold mb-4 tracking-wider uppercase">
                {memberLoaded
                  ? isPersonal
                    ? `🤝 You met ${member.name}`
                    : "🤝 You met our team"
                  : "🤝 Welcome"
                }
              </div>
              <h1 className="text-2xl font-black text-white mb-2">
                Let&apos;s Stay Connected
              </h1>
              <p className="text-sm text-gray-400">
                {isPersonal
                  ? `Drop your info and ${firstName} will be in touch about the right space for you.`
                  : "Drop your info and our team will be in touch about the right space for you."
                }
              </p>
            </div>

            {/* Form */}
            <div className="space-y-3">
              {/* Name */}
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  autoFocus
                  autoComplete="name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name *"
                  className={`${INPUT} pl-11`}
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: formatPhoneMeet(e.target.value) })}
                  placeholder="(423) ___-____ *"
                  className={`${INPUT} pl-11`}
                />
              </div>

              {/* Email */}
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email (optional)"
                className={INPUT}
              />

              {/* Space type */}
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <select
                  value={form.spaceType}
                  onChange={e => setForm({ ...form, spaceType: e.target.value })}
                  className={`${INPUT} pl-11 appearance-none`}
                >
                  <option value="">What are you looking for?</option>
                  {SPACE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Notes */}
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything else? (optional)"
                rows={2}
                className={`${INPUT} resize-none`}
              />

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={submit}
                disabled={!canSubmit || submitting}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#4ADE80] to-[#22C55E] text-black font-black text-base hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_8px_32px_rgba(74,222,128,0.25)] mt-2"
              >
                {submitting
                  ? <><Loader2 size={18} className="animate-spin" /> Connecting…</>
                  : <>Connect with Vision LLC <ArrowRight size={16} /></>
                }
              </button>

              <p className="text-center text-[11px] text-gray-600 mt-2">
                Your info is only shared with the Vision LLC team. No spam, ever.
              </p>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(74,222,128,0.35)]">
              <CheckCircle2 size={36} className="text-black" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">You&apos;re Connected! 🎉</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {isPersonal
                ? `${firstName} has your info and will be in touch shortly about the perfect space for you.`
                : "Our team has your info and will be in touch shortly about the perfect space for you."
              }
            </p>
            <div className="rounded-2xl border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.05)] p-4">
              <p className="text-xs text-gray-500 mb-1">You connected with</p>
              <p className="text-white font-bold">{member.name}</p>
              <p className="text-[#4ADE80] text-xs">{member.title} · Vision LLC</p>
            </div>
            <p className="text-xs text-gray-700 mt-6">
              teamvisionllc.com · 423-573-1022
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
