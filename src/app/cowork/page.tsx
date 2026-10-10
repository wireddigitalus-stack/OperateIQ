import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { Phone, ArrowRight, Check, Wifi, Coffee, Users, Clock, Monitor, Lock, Star } from "lucide-react";
import { COMPANY } from "@/lib/data";
import Navigation from "@/components/Navigation";
import CoWorkHeroCarousel from "@/components/CoWorkHeroCarousel";
import { fetchImageOverrides, resolveAllImages } from "@/lib/property-image-overrides";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Bristol CoWork | Private Offices & Coworking | 620 State St, Bristol TN/VA",
  description:
    "Bristol CoWork at 620 State Street offers private offices, dedicated desks & conference rooms in downtown Bristol, TN. All-inclusive. Move-in ready. Call 423-573-1022.",
  alternates: {
    canonical: "https://www.teamvisionllc.com/cowork",
  },
  openGraph: {
    title: "Bristol CoWork | Downtown Bristol's Coworking & Private Offices",
    description:
      "Private offices, dedicated desks & conference rooms at 620 State Street, Bristol, TN/VA. All-inclusive memberships. Move in tomorrow. Call 423-573-1022.",
    url: "https://www.teamvisionllc.com/cowork",
    images: [
      {
        url: "https://www.teamvisionllc.com/api/og?title=Bristol+CoWork&subtitle=620+State+Street+%C2%B7+Bristol%2C+TN+%E2%80%94+Premium+Coworking&tag=Now+Open&type=default",
        width: 1200,
        height: 630,
        alt: "Bristol CoWork — 620 State Street, Bristol TN",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bristol CoWork | Private Offices & Coworking in Downtown Bristol, TN/VA",
    description:
      "Private offices, dedicated desks & conference rooms. 620 State Street, Bristol TN. All-inclusive memberships from Vision LLC.",
    images: [
      "https://www.teamvisionllc.com/api/og?title=Bristol+CoWork&subtitle=620+State+Street+%C2%B7+Bristol%2C+TN+%E2%80%94+Premium+Coworking&tag=Now+Open&type=default",
    ],
  },
};

const plans = [
  {
    name: "Hot Desk",
    price: "Contact Us",
    period: "/ month",
    description: "Flexible open workspace. Drop in when you need it.",
    features: ["Shared Workspace Access", "High-Speed Wi-Fi", "Coffee & Beverages", "Business Address Use", "Community Lounge"],
    cta: "Inquire",
    highlight: false,
  },
  {
    name: "Dedicated Desk",
    price: "Contact Us",
    period: "/ month",
    description: "Your own reserved desk. Locked storage. Always ready.",
    features: ["Reserved Dedicated Desk", "Locked File Cabinet", "24/7 Building Access", "High-Speed Wi-Fi", "Business Address", "Mail Handling", "Conference Room Hours"],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Private Office",
    price: "Contact Us",
    period: "/ month",
    description: "Fully furnished, lockable private office. Move in tomorrow.",
    features: ["Private Lockable Office", "Furnished & Ready", "All Utilities Included", "Dedicated Internet", "Business Address", "Conference Rooms Included", "24/7 Access", "Signage Options"],
    cta: "Schedule Tour",
    highlight: false,
  },
];

const amenities = [
  { icon: <Wifi size={20} />, label: "Gigabit Internet" },
  { icon: <Coffee size={20} />, label: "Coffee & Beverages" },
  { icon: <Users size={20} />, label: "Conference Rooms" },
  { icon: <Clock size={20} />, label: "24/7 Access" },
  { icon: <Monitor size={20} />, label: "Printing & Scanning" },
  { icon: <Lock size={20} />, label: "Secure Building" },
];

// Static fallback images (used when no admin override exists)
const STATIC_IMAGES = [
  "/property-images/cowork-shared-office.jpg",
  "/property-images/cowork-conference-room.jpg",
  "/property-images/cowork-lobby-waiting.jpg",
  "/property-images/cowork-private-office.jpg",
];

export default async function CoWorkPage() {
  const [overrides, imgOverrides] = await Promise.all([
    getSiteContent("page:cowork"),
    fetchImageOverrides(),
  ]);
  const c = (key: string, fallback: string) => overrides[key] || fallback;

  const liveUrls = resolveAllImages("bristol-cowork", STATIC_IMAGES, STATIC_IMAGES[0], imgOverrides);
  const gallery = liveUrls.map((src, i) => ({
    src,
    alt: `Bristol CoWork interior view ${i + 1}`,
  }));

  // Build plans from overrides (falls back to static defaults)
  const livePlans = [
    {
      name: c("plan_1_name", "Hot Desk"),
      price: c("plan_1_price", "Contact Us"),
      period: "/ month",
      description: c("plan_1_desc", "Flexible open workspace. Drop in when you need it."),
      features: c("plan_1_features", "Shared Workspace Access\nHigh-Speed Wi-Fi\nCoffee & Beverages\nBusiness Address Use\nCommunity Lounge").split("\n").filter(Boolean),
      cta: "Inquire",
      highlight: false,
    },
    {
      name: c("plan_2_name", "Dedicated Desk"),
      price: c("plan_2_price", "Contact Us"),
      period: "/ month",
      description: c("plan_2_desc", "Your own reserved desk. Locked storage. Always ready."),
      features: c("plan_2_features", "Reserved Dedicated Desk\nLocked File Cabinet\n24/7 Building Access\nHigh-Speed Wi-Fi\nBusiness Address\nMail Handling\nConference Room Hours").split("\n").filter(Boolean),
      cta: "Get Started",
      highlight: true,
    },
    {
      name: c("plan_3_name", "Private Office"),
      price: c("plan_3_price", "Contact Us"),
      period: "/ month",
      description: c("plan_3_desc", "Fully furnished, lockable private office. Move in tomorrow."),
      features: c("plan_3_features", "Private Lockable Office\nFurnished & Ready\nAll Utilities Included\nDedicated Internet\nBusiness Address\nConference Rooms Included\n24/7 Access\nSignage Options").split("\n").filter(Boolean),
      cta: "Schedule Tour",
      highlight: false,
    },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CoworkingSpace",
            name: "Bristol CoWork",
            telephone: "+14235731022",
            description: "Downtown Bristol's premier professional coworking space — private offices, dedicated desks, and conference rooms at 620 State Street.",
            address: {
              "@type": "PostalAddress",
              streetAddress: "620 State Street",
              addressLocality: "Bristol",
              addressRegion: "TN",
              postalCode: "37620",
              addressCountry: "US",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: "36.5946",
              longitude: "-82.1893",
            },
            openingHoursSpecification: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              opens: "00:00",
              closes: "23:59",
            },
            amenityFeature: [
              { "@type": "LocationFeatureSpecification", name: "High-Speed Wi-Fi", value: true },
              { "@type": "LocationFeatureSpecification", name: "Conference Rooms", value: true },
              { "@type": "LocationFeatureSpecification", name: "24/7 Access", value: true },
              { "@type": "LocationFeatureSpecification", name: "Coffee & Beverages", value: true },
              { "@type": "LocationFeatureSpecification", name: "Printing & Scanning", value: true },
              { "@type": "LocationFeatureSpecification", name: "Secure Building", value: true },
            ],
            parentOrganization: {
              "@type": "RealEstateAgent",
              name: "Vision LLC",
              url: "https://www.teamvisionllc.com",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.teamvisionllc.com" },
              { "@type": "ListItem", position: 2, name: "Bristol CoWork", item: "https://www.teamvisionllc.com/cowork" },
            ],
          }),
        }}
      />
      <Navigation />
      <main>
        {/* Dark spacer behind the fixed nav — keeps the top of the page black */}
        <div className="w-full h-16 sm:h-20 bg-[#080B0F]" />


        {/* Hero */}
        <section className="pt-12 pb-0 px-4 sm:px-6 lg:px-8 bg-[#0D1117] relative overflow-hidden">
          {/* Ghosted cowork interior image */}
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src="/property-images/cowork-shared-office.jpg"
              alt=""
              fill
              className="object-cover object-center"
              style={{ opacity: 0.06 }}
              priority
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117] via-[#0D1117]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-transparent to-[#0D1117]/50" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.06)_0%,transparent_60%)]" />

          <div className="max-w-7xl mx-auto relative grid lg:grid-cols-2 gap-12 items-center pb-16">
            <div>
              {/* "Now Open" badge — above the logo+title row */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.2)] text-[#FACC15] text-xs font-bold mb-5 tracking-wider uppercase">
                {c("hero_badge", "Now Open · 620 State Street")}
              </div>

              {/* Squircle logo + h1 side by side */}
              <div className="flex items-center gap-5 sm:gap-7 mb-6">
                {/* Squircle badge */}
                <div
                  className="flex-shrink-0 flex items-center justify-center bg-white p-3 sm:p-4"
                  style={{
                    borderRadius: "28%",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.5)",
                    width: "clamp(127px, 15vw, 184px)",
                    height: "clamp(127px, 15vw, 184px)",
                  }}
                >
                  <Image
                    src="/images/bristol-cowork-logo.svg"
                    alt="Bristol CoWork — 620 State Street, Bristol TN"
                    width={560}
                    height={270}
                    className="w-full h-auto"
                    priority
                  />
                </div>
                {/* Title */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
                  Bristol<br />
                  <span className="text-[#FACC15]">CoWork</span>
                </h1>
              </div>
              <p className="text-xl text-gray-400 mb-4">
                {c("hero_description", "Downtown Bristol's premier professional workspace — built for entrepreneurs, remote teams, and growing businesses that need more than a coffee shop.")}
              </p>
              <p className="text-gray-500 mb-8">
                {c("hero_subtext", "620 State Street, Bristol, TN · All-inclusive memberships · Private offices available today")}
              </p>
              <div className="flex flex-wrap gap-4">
                <a href={COMPANY.phoneHref} className="btn-primary" style={{ background: "#FACC15", color: "#000", borderColor: "#FACC15" }}>
                  <Phone size={16} /> Call to Book a Tour
                </a>
                <Link href="/contact" className="btn-secondary">
                  Send an Inquiry <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            {/* Hero carousel */}
            <CoWorkHeroCarousel gallery={gallery} />
          </div>
        </section>

        {/* Amenities Bar */}
        <div className="bg-[rgba(250,204,21,0.04)] border-y border-[rgba(250,204,21,0.1)] py-6 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-3 sm:grid-cols-6 gap-4">
            {amenities.map((a) => (
              <div key={a.label} className="flex flex-col items-center gap-2 text-center">
                <div className="text-[#FACC15]">{a.icon}</div>
                <span className="text-xs text-gray-400 font-medium">{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Membership Plans */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="section-line mx-auto mb-4" />
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
                {c("plans_heading", "Membership Plans").includes("Plans") ? <>{c("plans_heading", "Membership Plans").replace("Plans", "")}<span className="text-[#FACC15]">Plans</span></> : c("plans_heading", "Membership Plans")}
              </h2>
              <p className="text-gray-400">
                {c("plans_subtext", "All plans include Wi-Fi, coffee, and access to communal areas. Contact us for current rates.")}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {livePlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`glass rounded-2xl p-6 border flex flex-col ${
                    plan.highlight
                      ? "border-[#FACC15] bg-[rgba(250,204,21,0.04)]"
                      : "border-[rgba(255,255,255,0.08)]"
                  }`}
                >
                  {plan.highlight && (
                    <div className="text-[10px] font-black text-black bg-[#FACC15] px-2 py-0.5 rounded-lg self-start mb-3 tracking-wider uppercase">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-3xl font-black text-[#FACC15] mb-1">{plan.price}</p>
                  <p className="text-xs text-gray-500 mb-4">{plan.period}</p>
                  <p className="text-sm text-gray-400 mb-6">{plan.description}</p>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <Check size={14} className="text-[#FACC15] mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={COMPANY.phoneHref}
                    className={`text-center py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                      plan.highlight
                        ? "bg-[#FACC15] text-black hover:opacity-90"
                        : "border border-[rgba(250,204,21,0.3)] text-[#FACC15] hover:bg-[rgba(250,204,21,0.08)]"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="py-16 px-4 bg-[rgba(74,222,128,0.03)] border-t border-[rgba(74,222,128,0.08)]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-black text-white mb-4">
              {c("location_heading", "Prime Downtown Location").includes("Location") ? <>{c("location_heading", "Prime Downtown Location").replace("Location", "")}<span className="gradient-text-green">Location</span></> : c("location_heading", "Prime Downtown Location")}
            </h2>
            <p className="text-gray-400 mb-2 text-lg">{c("location_address", "620 State Street · Bristol, TN 37620")}</p>
            <p className="text-gray-500 mb-8">
              {c("location_desc", "Located on Bristol's iconic State Street — right on the TN/VA state line, steps from restaurants, hotels, and the region's most active commercial corridor.")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href={COMPANY.phoneHref} className="btn-primary">
                <Phone size={16} /> {COMPANY.phone}
              </a>
              <Link href="/contact" className="btn-secondary">
                Get Directions & Availability <ArrowRight size={16} />
              </Link>
              <a
                href="https://maps.app.goo.gl/EFTj2yweHqtJwks69"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[rgba(250,204,21,0.3)] bg-[rgba(250,204,21,0.06)] text-[#FACC15] font-semibold text-sm hover:bg-[rgba(250,204,21,0.12)] transition-colors"
              >
                <Star size={16} /> Leave a Review
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
