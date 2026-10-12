"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar, X, CheckCircle2, Building2, User, Mail,
  Phone, Clock, ArrowRight, Loader2, Sparkles, ShieldCheck
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

interface AcmeTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPropertyId?: string;
  properties?: any[];
  orgName?: string;
  orgId?: string;
  orgSlug?: string;
}

export default function AcmeTourModal({
  isOpen,
  onClose,
  selectedPropertyId,
  properties,
  orgName,
  orgId,
  orgSlug,
}: AcmeTourModalProps) {
  const propList = properties ?? PROPERTIES; // demo data only when no list is passed (/demo-site)
  const [propertyId, setPropertyId] = useState(selectedPropertyId || propList[0]?.id || "");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sqftNeeded, setSqftNeeded] = useState("800 - 2,500 RSF");
  const [timeline, setTimeline] = useState("30-60 Days");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Re-sync the selected building each time the modal opens for a property.
  useEffect(() => {
    if (isOpen) setPropertyId(selectedPropertyId || propList[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedPropertyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !email.trim()) {
      setErrorMsg("Please provide your name and email address.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const selectedProp = propList.find((p) => p.id === propertyId) || propList[0];
    const buildingName = selectedProp?.name || "General Inquiry";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId || null,
          org_slug: orgSlug || null,
          name: contactName.trim(),
          company: companyName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          space_type: selectedProp?.type || "",
          timeline,
          team_size: sqftNeeded,
          interest: `${buildingName} — Tour Scheduling Request`,
          city: selectedProp?.city || "",
          message: `Space needed: ${sqftNeeded}.${notes.trim() ? ` Notes: ${notes.trim()}` : ""}`,
          formOpenedAt: Date.now() - 5000,
          source: "public_site",
          medium: "tour_modal",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error || "We could not submit your tour request. Please try again.";
        setErrorMsg(msg);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Tour booking submission failed:", err);
      setErrorMsg(err?.message || "A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#080C14] border border-white/20 shadow-[0_0_50px_rgba(56,189,248,0.25)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0A1020]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Schedule a Private Property Tour
              </h3>
              <p className="text-xs text-gray-400">
                Direct leasing inquiry · Instant confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {success ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.3)]">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-white">Tour Request Received!</h4>
              <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                Your tour request has been routed to {orgName ? `${orgName}'s` : "the"} leasing team. We will reach out shortly to confirm your scheduled time and prepare your walkthrough.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Target Property Selector */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Select Property / Building *
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400 transition-colors"
              >
                {propList.length === 0 && (
                  <option value="" className="bg-[#0A1020] text-white">General Inquiry</option>
                )}
                {propList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0A1020] text-white">
                    {p.name} ({p.type} · {p.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Name & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Valley Trade & Service LLC"
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 349-8201"
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Space Needed & Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Estimated RSF Needed
                </label>
                <select
                  value={sqftNeeded}
                  onChange={(e) => setSqftNeeded(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                >
                  <option value="800 - 1,500 RSF">800 – 1,500 RSF (Retail / 1-2 Bed Loft)</option>
                  <option value="1,500 - 3,500 RSF">1,500 – 3,500 RSF (Medical / Flex Bay)</option>
                  <option value="3,500 - 6,500 RSF">3,500 – 6,500 RSF (Full Floor Suite)</option>
                  <option value="6,500+ RSF">6,500+ RSF (Entire Facility / Multi-Bay)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Move-In Timeline
                </label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
                >
                  <option value="Immediate">Immediate Move-In</option>
                  <option value="30-60 Days">30 – 60 Days</option>
                  <option value="Q3 2025">Q3 / Q4 2025</option>
                  <option value="Exploring Options">Exploring Market Options</option>
                </select>
              </div>
            </div>

            {/* Special Requirements */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Special Requirements or Questions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Inquiring about dark fiber connectivity, parking allocation, or space subdivision..."
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-sky-400"
              />
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-600 text-white font-bold text-xs shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Transmitting to Leasing Team...</span>
                  </>
                ) : (
                  <>
                    <Calendar size={14} />
                    <span>Confirm Tour Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
