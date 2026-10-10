"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Phone, Mail, MapPin, Clock, ArrowRight, MessageSquare,
  CheckCircle, Loader2, AlertCircle,
} from "lucide-react";
import { COMPANY } from "@/lib/data";
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

  // Record the exact moment the form mounts (used for bot timing check)
  useEffect(() => {
    formOpenedAt.current = Date.now();
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
        setErrorMsg(data.error ?? "Something went wrong. Please call us directly.");
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
          <div className="glass rounded-2xl p-10 border border-[rgba(74,222,128,0.25)] text-center">
            {/* Animated check */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[rgba(74,222,128,0.12)] flex items-center justify-center">
                  <CheckCircle size={40} className="text-[#4ADE80]" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-[#4ADE80] opacity-30 animate-ping" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">
              Message Sent!
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-2">
              Thanks for reaching out. A member of the Vision team will review your inquiry and
              follow up at{" "}
              {submittedEmail && (
                <span className="text-white font-semibold">{submittedEmail}</span>
              )}
              {!submittedEmail && "your email"}{" "}
              within 24 hours.
            </p>
            <p className="text-gray-500 text-xs mb-8">
              Need to speak to someone right now?{" "}
              <a href={COMPANY.phoneHref} className="text-[#4ADE80] font-semibold">
                {COMPANY.phone}
              </a>
            </p>

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
              <Link href="/commercial-real-estate" className="btn-primary flex-1 py-3 justify-center text-sm">
                Browse Listings <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  const inputClass =
    "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(74,222,128,0.15)] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[rgba(74,222,128,0.5)] transition-all";

  return (
    <div className="pt-28 pb-20 min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-14">
          <div className="section-line mb-4" />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Let&apos;s Find Your{" "}
            <span className="gradient-text-green">Perfect Space</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Whether you&apos;re looking for office space, a retail location, or want to
            discuss a development project — we respond within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <form
              ref={formRef}
              id="contact-form"
              onSubmit={handleSubmit}
              className="glass rounded-2xl p-8 border border-[rgba(74,222,128,0.1)] space-y-5"
              aria-label="Contact Vision LLC"
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
                  <input id="contact-phone" type="tel" name="phone" required placeholder="(423) 000-0000"
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
                  <option value="" className="bg-[#111827]">Select a service...</option>
                  <option value="Office Space" className="bg-[#111827]">Office Space</option>
                  <option value="Retail Storefront" className="bg-[#111827]">Retail Storefront</option>
                  <option value="Warehouse / Industrial" className="bg-[#111827]">Warehouse / Industrial</option>
                  <option value="Bristol CoWork Membership" className="bg-[#111827]">Bristol CoWork Membership</option>
                  <option value="Development / Construction" className="bg-[#111827]">Development / Construction</option>
                  <option value="Executive Advisement" className="bg-[#111827]">Executive Advisement</option>
                  <option value="Other" className="bg-[#111827]">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-city" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Preferred Market</label>
                <select id="contact-city" name="city" className={inputClass}>
                  <option value="" className="bg-[#111827]">Any / Open to suggestions</option>
                  <option value="Bristol, TN" className="bg-[#111827]">Bristol, TN</option>
                  <option value="Bristol, VA" className="bg-[#111827]">Bristol, VA</option>
                  <option value="Kingsport, TN" className="bg-[#111827]">Kingsport, TN</option>
                  <option value="Johnson City, TN" className="bg-[#111827]">Johnson City, TN</option>
                  <option value="Abingdon, VA" className="bg-[#111827]">Abingdon, VA</option>
                  <option value="Elizabethton, TN" className="bg-[#111827]">Elizabethton, TN</option>
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

              <p className="text-xs text-gray-600 text-center">
                Or call us directly at{" "}
                <a href={COMPANY.phoneHref} className="text-[#4ADE80] font-semibold">{COMPANY.phone}</a>
              </p>
            </form>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-5">
            {[
              { icon: <Phone size={20} />, label: "Call Us",    value: COMPANY.phone,        href: COMPANY.phoneHref,                                             id: "contact-side-phone" },
              { icon: <Mail size={20} />,  label: "Email",      value: COMPANY.email,        href: `mailto:${COMPANY.email}`,                                     id: "contact-side-email" },
              { icon: <MapPin size={20} />,label: "Our Office", value: COMPANY.fullAddress,  href: "https://maps.google.com/?q=100+5th+St+Bristol+TN+37620",       id: "contact-side-address" },
              { icon: <Clock size={20} />, label: "Hours",      value: "Mon–Fri: 8:00 AM – 5:00 PM EST", href: null,                                              id: "contact-side-hours" },
            ].map((item) => (
              <div key={item.id} className="glass rounded-xl p-5 border border-[rgba(74,222,128,0.1)]">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.1)] flex items-center justify-center text-[#4ADE80] flex-shrink-0">{item.icon}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
                    {item.id === "contact-side-email" ? (
                      <SafeEmail className="text-sm font-semibold text-white hover:text-[#4ADE80] transition-colors break-all" />
                    ) : item.href ? (
                      <a href={item.href} id={item.id}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-sm font-semibold text-white hover:text-[#4ADE80] transition-colors break-all">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-white">{item.value}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="glass rounded-xl p-5 border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.04)]">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare size={18} className="text-[#4ADE80]" />
                <span className="text-sm font-bold text-white">Chat with Vision AI</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] pulse-green" />
                  <span className="text-[10px] text-[#4ADE80]">Online</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">Get instant answers about our properties, services, and the Tri-Cities CRE market.</p>
              <button
                id="contact-open-chat"
                onClick={() => (document.getElementById("lease-bot-toggle") as HTMLButtonElement)?.click()}
                className="btn-secondary w-full py-2.5 text-sm justify-center"
              >
                Ask VISION
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
