// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE CONTENT — placeholder data for a new OperateIQ account.
// The admin dashboard imports these shapes (PROPERTIES, COMPANY, GEO_PAGES,
// SPACE_TYPE_PAGES). Customers replace this with their own data via the
// dashboard / site builder. Keep the shapes stable.
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANY = {
  name: "Your Company",
  shortName: "Your Company",
  tagline: "Professional property management",
  phone: "",
  phoneHref: "",
  email: "",
  address: "123 Main Street",
  fullAddress: "123 Main Street, Anytown, ST 00000",
  city: "Anytown",
  state: "ST",
  zip: "00000",
  founded: "",
  yearsInBusiness: 0,
  about:
    "Tell your story here. Describe your portfolio, your service area, and what makes your properties a great place to lease.",
};

export const GEO_PAGES = [
  {
    slug: "sample-city",
    city: "Sample City",
    state: "ST",
    stateFullName: "Sample State",
    region: "Sample Region",
    h1: "Properties in Sample City",
    metaTitle: "Properties in Sample City",
    metaDescription: "Sample market page — edit this in your dashboard.",
    heroSubline: "Your local market headline",
    lat: 0,
    lng: 0,
    zipCode: "00000",
    countyName: "Sample County",
    neighborhoods: ["Downtown"],
    nearbyHighways: [] as string[],
    population: "",
    medianIncome: "",
    keyEmployers: [] as string[],
    marketBlurb: "Describe this market for prospective tenants.",
    availableTypes: ["Office", "Retail"],
    isPrimary: true,
  },
];

export const PROPERTIES = [
  {
    id: "sample-office",
    name: "Sample Office Building",
    type: "Office",
    city: "Anytown, ST",
    address: "123 Main Street, Anytown, ST 00000",
    sqft: "500 – 5,000",
    status: "Available",
    badge: "Sample",
    badgeColor: "indigo",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=70",
    images: ["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=70"],
    description: "Sample property. Add your real properties from the dashboard.",
    features: ["Feature one", "Feature two", "Feature three"],
    imageAlt: "Sample office building",
    reviewUrl: "",
  },
  {
    id: "sample-retail",
    name: "Sample Retail Center",
    type: "Retail",
    city: "Anytown, ST",
    address: "456 Market Street, Anytown, ST 00000",
    sqft: "1,200 – 3,500",
    status: "Available",
    badge: "Sample",
    badgeColor: "indigo",
    image: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&q=70",
    images: ["https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&q=70"],
    description: "Sample property. Add your real properties from the dashboard.",
    features: ["Street frontage", "Parking", "Flexible terms"],
    imageAlt: "Sample retail center",
    reviewUrl: "",
  },
];

export const SPACE_TYPE_PAGES = [
  {
    slug: "office-space",
    type: "Office",
    propertyIds: ["sample-office"],
    h1: "Office Space",
    metaTitle: "Office Space",
    metaDescription: "Sample space-type page — edit this in your dashboard.",
    tagline: "Professional space for growing teams",
    accentColor: "#6366F1",
    badge: "Office",
    intro: "Describe your office offering here.",
    benefits: [{ icon: "⚡", title: "Benefit", body: "Describe a key benefit." }],
    faqs: [{ q: "Sample question?", a: "Sample answer." }],
    canonicalUrl: "",
    geoLinks: ["sample-city"],
  },
];
