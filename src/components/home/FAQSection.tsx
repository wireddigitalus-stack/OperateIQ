"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { HOMEPAGE_FAQS } from "@/lib/faq-data";

interface FAQOverrides {
  section_badge?: string;
  section_heading_1?: string;
  section_heading_2?: string;
  section_subtext?: string;
  q_1?: string; a_1?: string;
  q_2?: string; a_2?: string;
  q_3?: string; a_3?: string;
  q_4?: string; a_4?: string;
  q_5?: string; a_5?: string;
  q_6?: string; a_6?: string;
}

export default function FAQSection({ overrides }: { overrides?: FAQOverrides }) {
  const [open, setOpen] = useState<number | null>(null);
  const o = overrides || {};

  const badge = o.section_badge ?? "Common Questions";
  const heading1 = o.section_heading_1 ?? "Commercial Real Estate in the ";
  const heading2 = o.section_heading_2 ?? "Tri-Cities — FAQ";
  const sectionSubtext = o.section_subtext ?? "Everything you need to know about leasing commercial space with Vision LLC in Bristol, Kingsport, and Johnson City, TN.";

  // Merge CMS overrides with default FAQ data
  const faqs = HOMEPAGE_FAQS.map((faq, idx) => {
    const i = idx + 1;
    return {
      q: o[`q_${i}` as keyof FAQOverrides] ?? faq.q,
      a: o[`a_${i}` as keyof FAQOverrides] ?? faq.a,
      link: faq.link, // links stay structural
    };
  });

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[rgba(74,222,128,0.08)]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="section-line mx-auto mb-4" />
          <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest">{badge}</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-3 mb-4">
            {heading1}
            <span className="gradient-text-green">{heading2}</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {sectionSubtext}
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`glass rounded-2xl border overflow-hidden transition-all duration-200 ${
                open === i
                  ? "border-[rgba(74,222,128,0.3)]"
                  : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(74,222,128,0.15)]"
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
                aria-expanded={open === i}
              >
                <span className="text-sm font-semibold text-white pr-4 leading-snug">
                  {faq.q}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-[#4ADE80] flex-shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{faq.a}</p>
                  <Link
                    href={faq.link.href}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4ADE80] hover:text-white transition-colors"
                  >
                    {faq.link.label} →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">
            Still have questions?{" "}
            <Link href="/contact" className="text-[#4ADE80] font-semibold hover:text-white transition-colors">
              Talk to our team →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
