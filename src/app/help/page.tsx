import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { BASIC_FAQS } from "@/lib/help-data";
import HelpCenterClient from "./HelpCenterClient";

export const metadata: Metadata = {
  title: `Help Center & Tech Support | ${BRAND.name}`,
  description: `Step-by-step guides, ProTips, troubleshooting, and AI tech support for ${BRAND.name} property owners, managers, and field crews.`,
};

export default function HelpPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: BASIC_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <HelpCenterClient />
    </>
  );
}
