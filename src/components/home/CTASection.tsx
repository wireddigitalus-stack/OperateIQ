import Link from "next/link";
import { Phone, Mail, ArrowRight, MapPin } from "lucide-react";
import { COMPANY } from "@/lib/data";
import SafeEmail from "@/components/SafeEmail";

interface CTAOverrides {
  badge_text?: string;
  heading_1?: string;
  heading_2?: string;
  subtext?: string;
  cta_button?: string;
}

export default function CTASection({ overrides }: { overrides?: CTAOverrides }) {
  const o = overrides || {};

  const badgeText = o.badge_text ?? "Serving the Tri-Cities Since 2002";
  const heading1 = o.heading_1 ?? "Ready to Find Your Space";
  const heading2 = o.heading_2 ?? "in the Tri-Cities?";
  const subtext = o.subtext ?? "Whether you\u2019re looking for a downtown office, retail storefront, or want to talk commercial strategy \u2014 the Vision team is ready.";
  const ctaButton = o.cta_button ?? "Schedule a Tour";

  return (
    <section
      id="cta"
      aria-label="Contact Vision LLC"
      className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto">
        <div className="relative glass-strong rounded-3xl overflow-hidden border border-[rgba(74,222,128,0.2)] glow-green p-10 lg:p-16 text-center">
          {/* Background orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#4ADE80]/5 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-[#FACC15]/4 blur-[60px] pointer-events-none" />

          <div className="relative">
            {/* Location badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.06)]">
              <MapPin size={13} className="text-[#4ADE80]" />
              <span className="text-sm font-semibold text-[#4ADE80]">
                {badgeText}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5 leading-tight">
              {heading1}{" "}
              <br className="hidden sm:block" />
              <span className="gradient-text-green">{heading2}</span>
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              {subtext}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                id="final-cta-contact"
                className="btn-primary text-base px-8 py-4 w-full sm:w-auto justify-center"
              >
                {ctaButton} <ArrowRight size={18} />
              </Link>
              <a
                href={COMPANY.phoneHref}
                id="final-cta-phone"
                className="btn-secondary text-base px-8 py-4 w-full sm:w-auto justify-center"
              >
                <Phone size={18} /> {COMPANY.phone}
              </a>
              <SafeEmail
                className="btn-secondary text-base px-8 py-4 w-full sm:w-auto justify-center"
              >
                <Mail size={18} /> Email Us
              </SafeEmail>
            </div>

            <p className="text-xs text-gray-600 mt-8">
              {COMPANY.fullAddress} · Mon–Fri 8am–5pm EST
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
