import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import StatsBar from "@/components/home/StatsBar";
import ServicesSection from "@/components/home/ServicesSection";
import PropertiesSection from "@/components/home/PropertiesSection";
import GeoMarketsSection from "@/components/home/GeoMarketsSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FAQSection from "@/components/home/FAQSection";
import CTASection from "@/components/home/CTASection";
import CustomSearchCTA from "@/components/CustomSearchCTA";
import { HOMEPAGE_FAQ_SCHEMA } from "@/lib/faq-data";
import { getAllSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Vision LLC | Downtown Bristol's #1 Commercial Real Estate Company",
  description:
    "Vision LLC is the largest private commercial property owner in Downtown Bristol, TN/VA. Award-winning commercial real estate, development & executive consulting across the Tri-Cities. Call 423-573-1022.",
  alternates: {
    canonical: "https://www.teamvisionllc.com",
  },
  openGraph: {
    title: "Vision LLC | #1 Commercial Real Estate Firm in Bristol, TN",
    description:
      "The largest private commercial property owner in Downtown Bristol, TN/VA. 50+ properties. Office, retail, coworking & executive consulting. Call 423-573-1022.",
    url: "https://www.teamvisionllc.com",
    images: [
      {
        url: "https://www.teamvisionllc.com/vision-social.png",
        width: 1200,
        height: 630,
        alt: "Vision LLC — Commercial Real Estate Bristol TN",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vision LLC | #1 Commercial Real Estate in Bristol, TN",
    description:
      "50+ commercial properties. Downtown Bristol's largest private owner. Office, retail, coworking & executive consulting. Call 423-573-1022.",
    images: [
      "https://www.teamvisionllc.com/vision-social.png",
    ],
  },
};

export default async function HomePage() {
  // Fetch all CMS overrides in one call (cached 60s)
  const overrides = await getAllSiteContent();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOMEPAGE_FAQ_SCHEMA) }}
      />
      <HeroSection overrides={overrides.hero} />
      <StatsBar overrides={overrides.stats} />
      <ServicesSection overrides={overrides.services} />
      <PropertiesSection />
      <CustomSearchCTA />
      <GeoMarketsSection />
      <TestimonialsSection overrides={overrides.testimonials} />
      <FAQSection overrides={overrides.faq} />
      <CTASection overrides={overrides.cta} />
    </>
  );
}

