"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Phone, Mail, Clock, ArrowRight, MessageSquare,
  CheckCircle, Loader2, AlertCircle, Globe,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getAnalyticsSessionId, trackEvent } from "@/hooks/useAnalytics";
import SafeEmail from "@/components/SafeEmail";
import Turnstile from "@/components/Turnstile";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const formOpenedAt = useRef<number>(Date.now());
  const formRef = useRef<HTMLFormElement>(null);

  // Record the exact moment the form mounts (used for bot timing check) and pre-fill interest from URL if provided
  useEffect(() => {
    formOpenedAt.current = Date.now();
    if (typeof window !== "undefined") {
      const interestParam = new URLSearchParams(window.location.search).get("interest");
      if (interestParam && formRef.current) {
        const selectEl = formRef.current.elements.namedItem("interest") as HTMLSelectElement | null;
        if (selectEl) selectEl.value = interestParam;
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      name:         fd.get("name"),
      company:      fd.get("company"),
      email:        fd.get("email"),
      phone:        fd.get("phone"),
      interest:     fd.get("interest"),
      city:         fd.get("city"),
      message:      fd.get("message"),
      // Anti-spam
      website:      fd.get("website"),        // honeypot
      formOpenedAt: formOpenedAt.current,     // timing check
      turnstileToken,                         // Cloudflare Turnstile token
      // Analytics correlation
      sessionId:    getAnalyticsSessionId(),  // link this lead to their browsing session
    };
    // Capture email before the form unmounts so we can show it on the success screen
    setSubmittedEmail((fd.get("email") as string) || "");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again shortly.");
        setStatus("error");
        return;
      }

      setStatus("success");
      trackEvent("form_submit", { form: "contact", interest: fd.get("interest") as string });
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  // ── Thank-you screen ────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="pt-28 pb-20 min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full mx-auto">
          <div className="glass rounded-2xl p-10 border border-[rgba(99,102,241,0.25)] text-center">
            {/* Animated check */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center">
                  <CheckCircle size={40} className="text-[#22D3EE]" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-[#22D3EE] opacity-30 animate-ping" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">
              Message Sent!
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-2">
              Thanks for reaching out. A member of the OperateIQ team will review your message and
              follow up at{" "}
              {submittedEmail && (
                <span className="text-white font-semibold">{submittedEmail}</span>
              )}
              {!submittedEmail && "your email"}{" "}
              within 24 hours.
            </p>
            <div className="mb-8" />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setStatus("idle");
                  setTimeout(() => formRef.current?.reset(), 50);
                }}
                className="btn-secondary flex-1 py-3 justify-center text-sm"
              >
                Send Another Message
              </button>
              <Link href="/features" className="btn-primary flex-1 py-3 justify-center text-sm">
                Explore Features <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  const inputClass =
    "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(99,102,241,0.15)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[rgba(99,102,241,0.5)] transition-all";

  return (
    <div className="pt-28 pb-20 min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-14">
          <div className="section-line mb-4" />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Let&apos;s Talk{" "}
            <span className="oiq-grad-text">Operations</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Questions about plans, onboarding, or a demo? Send us a note — we respond within one business day.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <form
              ref={formRef}
              id="contact-form"
              onSubmit={handleSubmit}
              className="glass rounded-2xl p-5 sm:p-8 border border-[rgba(99,102,241,0.1)] space-y-5"
              aria-label="Contact OperateIQ"
            >
              {/* ── Honeypot — hidden from humans, invisible via CSS ─────── */}
              <div style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
                <label htmlFor="contact-website">Website (leave blank)</label>
                <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Full Name *
                  </label>
                  <input id="contact-name" type="text" name="name" required placeholder="Jane Smith"
                    className={inputClass} />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Phone *</label>
                  <input id="contact-phone" type="tel" name="phone" required placeholder="(555) 000-0000"
                    className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email *</label>
                  <input id="contact-email" type="email" name="email" required placeholder="jane@company.com"
                    className={inputClass} />
                </div>
                <div>
                  <label htmlFor="contact-company" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Company</label>
                  <input id="contact-company" type="text" name="company" placeholder="Acme Corp."
                    className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="contact-interest" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">I&apos;m Interested In *</label>
                <select id="contact-interest" name="interest" required className={inputClass}>
                  <option value="" className="bg-[#111827]">Select a topic...</option>
                  <option value="Plans & Pricing" className="bg-[#111827]">Plans &amp; Pricing</option>
                  <option value="Book a Demo" className="bg-[#111827]">Book a Demo</option>
                  <option value="Onboarding & Data Import" className="bg-[#111827]">Onboarding &amp; Data Import</option>
                  <option value="Website Builder" className="bg-[#111827]">Website Builder</option>
                  <option value="Support" className="bg-[#111827]">Support</option>
                  <option value="Partnerships" className="bg-[#111827]">Partnerships</option>
                  <option value="Other" className="bg-[#111827]">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-city" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Portfolio Size</label>
                <select id="contact-city" name="city" className={inputClass}>
                  <option value="" className="bg-[#111827]">Select portfolio size...</option>
                  <option value="1-5 properties" className="bg-[#111827]">1–5 properties</option>
                  <option value="6-25 properties" className="bg-[#111827]">6–25 properties</option>
                  <option value="26-100 properties" className="bg-[#111827]">26–100 properties</option>
                  <option value="100+ properties" className="bg-[#111827]">100+ properties</option>
                                                    </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tell Us More</label>
                <textarea spellCheck={true} id="contact-message" name="message" rows={4}
                  placeholder="Square footage needed, timeline, budget, special requirements..."
                  className={`${inputClass} resize-none`} />
              </div>

              {/* Error message */}
              {status === "error" && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-900/50">
                  <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-300">{errorMsg}</p>
                </div>
              )}

              {/* Cloudflare Turnstile CAPTCHA */}
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
              />

              <button
                type="submit"
                id="contact-submit"
                disabled={status === "submitting" || !turnstileToken}
                className="btn-primary w-full py-4 justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message — We Respond Within 24hrs <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-5">
            {[
              { icon: <Globe size={20} />, label: "Website",  value: BRAND.domain,       href: `https://${BRAND.domain.toLowerCase()}`,                               id: "contact-side-domain" },
              { icon: <Mail size={20} />,  label: "Email",      value: BRAND.email,        href: BRAND.email ? `mailto:${BRAND.email}` : null,                                     id: "contact-side-email" },
              { icon: <Phone size={20} />, label: "Call Us",    value: BRAND.phone,        href: BRAND.phone ? `tel:${BRAND.phone}` : null,                                             id: "contact-side-phone" },
              { icon: <Clock size={20} />, label: "Hours",      value: "Mon–Fri · Replies within 1 business day", href: null,                                              id: "contact-side-hours" },
            ].filter((item) => item.value).map((item) => (
              <div key={item.id} className="glass rounded-xl p-5 border border-[rgba(99,102,241,0.1)]">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-[#22D3EE] flex-shrink-0">{item.icon}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
                    {item.id === "contact-side-email" ? (
                      <SafeEmail className="text-sm font-semibold text-white hover:text-[#22D3EE] transition-colors break-all" />
                    ) : item.href ? (
                      <a href={item.href} id={item.id}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-sm font-semibold text-white hover:text-[#22D3EE] transition-colors break-all">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-white">{item.value}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="glass rounded-xl p-5 border border-sky-400/30 bg-sky-500/[0.06]">
              <div className="flex items-center gap-2.5 mb-2">
                <Globe size={18} className="text-sky-400" />
                <span className="text-base font-extrabold text-white">Help &amp; Tech Support Center</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed mb-4">
                Browse 40+ step-by-step ProTips guides, interactive troubleshooting fixes, and instant AI tech support.
              </p>
              <Link
                href="/help"
                className="oiq-btn w-full !py-2.5 text-sm justify-center"
              >
                <span>Open Help &amp; Support Center</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="glass rounded-xl p-5 border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.04)]">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare size={18} className="text-[#22D3EE]" />
                <span className="text-sm font-bold text-white">Chat with OpsIQ</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] pulse-green" />
                  <span className="text-[10px] text-[#22D3EE]">Online</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">Get instant answers about features, plans, and getting started.</p>
              <button
                id="contact-open-chat"
                onClick={() => (document.querySelector<HTMLButtonElement>("[aria-label=\"Chat with OpsIQ\"]") as HTMLButtonElement)?.click()}
                className="btn-secondary w-full py-2.5 text-sm justify-center"
              >
                Ask OpsIQ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
