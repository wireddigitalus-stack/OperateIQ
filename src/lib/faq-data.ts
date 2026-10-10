// FAQ data for homepage — imported by both FAQSection (client UI) and page.tsx (schema)

export const HOMEPAGE_FAQS = [
  {
    q: "How much does it cost to rent office space in Bristol, TN?",
    a: "Office space in Downtown Bristol, TN typically ranges from $8–$22/sqft annually depending on location, size, and finish level. Vision LLC offers flexible lease terms for suites from 500 to 18,000+ sqft. Contact us for current availability and pricing.",
    link: { label: "View Office Space", href: "/spaces/office-space-tri-cities-tn" },
  },
  {
    q: "Is coworking space available in Bristol, TN?",
    a: "Yes — Bristol CoWork at 620 State Street is Downtown Bristol's premier coworking facility. We offer hot desks, dedicated desks, and private offices with all-inclusive monthly memberships including gigabit Wi-Fi, coffee, conference rooms, and 24/7 access.",
    link: { label: "Explore Bristol CoWork", href: "/cowork" },
  },
  {
    q: "What commercial real estate is available in the Tri-Cities region?",
    a: "Vision LLC is the largest private commercial real estate owner in Downtown Bristol, TN/VA. Our active portfolio includes office suites, retail storefronts, coworking space, event venues, and industrial/warehouse space across Bristol, Kingsport, and Johnson City.",
    link: { label: "Browse All Properties", href: "/commercial-real-estate" },
  },
  {
    q: "How do I find retail space for lease in Bristol, TN?",
    a: "Vision LLC manages high-traffic retail storefronts on State Street and throughout Downtown Bristol. Units range from 800 to 5,000 sqft with excellent foot traffic, prominent signage, and flexible lease terms. Call 423-573-1022 or submit an inquiry online.",
    link: { label: "View Retail Space", href: "/spaces/retail-space-bristol-tn" },
  },
  {
    q: "Does Vision LLC serve Johnson City and Kingsport?",
    a: "Yes. While our primary portfolio is centered in Downtown Bristol, Vision LLC provides commercial real estate leasing, executive advisement, and development consulting across the entire Tri-Cities region including Kingsport, Johnson City, and Sullivan and Washington counties.",
    link: { label: "View Tri-Cities Markets", href: "/markets" },
  },
  {
    q: "What is the minimum lease term for commercial space with Vision LLC?",
    a: "Vision LLC offers flexible lease structures including short-term arrangements. CoWorking memberships start month-to-month. Traditional commercial leases typically run 1–5 years with customizable terms. Contact our team to discuss your specific timeline and requirements.",
    link: { label: "Contact Us", href: "/contact" },
  },
];

export const HOMEPAGE_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOMEPAGE_FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};
