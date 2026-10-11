// ─────────────────────────────────────────────────────────────────────────────
// WIRED DIGITAL LLC — PREMIER COMMERCIAL & RESIDENTIAL ASSET SEED
// Used as high-end mock data until the owner adds their own properties.
// ─────────────────────────────────────────────────────────────────────────────

export interface SeedProperty {
  id: string;
  name: string;
  type: string;
  city: string;
  address: string;
  sqft: string;
  status: string;
  badge: string;
  badgeColor: string;
  image: string;
  specs: {
    yearBuilt: string;
    floors: number;
    parking: string;
    zoning: string;
    hvac: string;
    fiber: string;
    power: string;
    ceilingHeight: string;
  };
  description: string;
  highlights: string[];
}

export const WIRED_DIGITAL_PROPERTIES: SeedProperty[] = [
  {
    id: "wired-tech-hub",
    name: "Wired Digital Tech Hub & Executive Suites",
    type: "Medical & Office",
    city: "Innovation District",
    address: "400 Wired Innovation Blvd, Suite 100",
    sqft: "1,200 – 6,500",
    status: "Available",
    badge: "Tech & Executive Hub",
    badgeColor: "blue",
    image: "/demo-properties/oakridge-professional-plaza.jpg",
    specs: {
      yearBuilt: "2021",
      floors: 3,
      parking: "Dedicated Surface & EV Charging",
      zoning: "B-2 Commercial / Technology",
      hvac: "Independent VAV Multi-Zone Climate Systems",
      fiber: "Dedicated Dual-Feed Gigabit Fiber (10 Gbps ready)",
      power: "3-Phase 480V 800A Backup Generator Ready",
      ceilingHeight: "12 ft Clear Exposed Architectural Acoustic Ceiling",
    },
    description:
      "State-of-the-art tech campus featuring turnkey fiber-connected creative suites, executive boardrooms, enterprise gigabit networking, private phone pods, and flexible hybrid workstations.",
    highlights: [
      "Enterprise redundant gigabit fiber internet connection",
      "Executive conference suites with 4K video conferencing systems",
      "Keyless smart card & mobile Bluetooth access control 24/7",
      "On-site cafe lounge, barista station & private outdoor courtyard",
    ],
  },
  {
    id: "wired-innovation-lofts",
    name: "Wired Innovation Lofts & Creative Studios",
    type: "Mixed-Use & Lofts",
    city: "Downtown Commerce District",
    address: "220 Digital Way, Suite 2B",
    sqft: "850 – 2,800",
    status: "Available",
    badge: "Mixed-Use Lofts",
    badgeColor: "emerald",
    image: "/demo-properties/heritage-square-mixed-use.jpg",
    specs: {
      yearBuilt: "2019",
      floors: 4,
      parking: "Reserved Garage & Street Parking",
      zoning: "C-1 Mixed Commercial / Residential",
      hvac: "Smart Nest Multi-Zone Heat Pump",
      fiber: "Symmetrical Fiber & Wi-Fi 6 Mesh",
      power: "200A Dedicated Per Suite",
      ceilingHeight: "14 ft Heavy Timber Restored Ceilings",
    },
    description:
      "Premier mixed-use asset featuring street-level creative studio & retail storefronts with second and third floor luxury live-work lofts overlooking the district.",
    highlights: [
      "Double-height loft living with industrial steel & exposed brick aesthetics",
      "Direct fiber optic connections to every commercial & residential suite",
      "Walkable to prime dining, district transit, and riverside parks",
      "Integrated smart parcel lockers and digital intercoms",
    ],
  },
  {
    id: "digital-apex-flex",
    name: "Digital Apex Flex & Logistics Center",
    type: "Contractor Flex",
    city: "Gateway Commerce Park",
    address: "850 Enterprise Parkway, Bay 4",
    sqft: "2,400 – 12,000",
    status: "Leasing Now",
    badge: "Contractor & Flex",
    badgeColor: "amber",
    image: "/demo-properties/cedar-creek-trade-center.jpg",
    specs: {
      yearBuilt: "2022",
      floors: 1,
      parking: "Heavy Equipment, Van Staging & Trailer Bays",
      zoning: "M-1 Light Industrial & Commercial Flex",
      hvac: "Climate-Controlled Office Storefront + High-Efficiency Heated Warehouse",
      fiber: "High-Capacity Broadband & Security Video Mesh",
      power: "3-Phase 208V 400A High-Amperage Service",
      ceilingHeight: "22 ft Clear Ceiling Height with 14 ft Drive-In Overhead Doors",
    },
    description:
      "Purpose-built contractor flex center optimized for technology installation teams, electrical contractors, specialty trades, and light assembly logistics.",
    highlights: [
      "14 ft motorized commercial roll-up drive-in doors",
      "Dedicated fenced outdoor equipment storage yard",
      "Finished air-conditioned client sales storefront & private executive office",
      "Heavy slab foundation supporting commercial vehicle lifts and pallet racks",
    ],
  },
  {
    id: "wired-riverview-residences",
    name: "The Wired Residences at Riverview",
    type: "Residential Apartments",
    city: "Waterfront Park District",
    address: "150 Riverfront Promenade",
    sqft: "750 – 1,450",
    status: "Immediate Move-in",
    badge: "Smart Multi-Family",
    badgeColor: "indigo",
    image: "/demo-properties/pinecrest-valley-apartments.jpg",
    specs: {
      yearBuilt: "2023",
      floors: 4,
      parking: "Covered Parking Structure with Level 2 EV Chargers",
      zoning: "R-3 High Density Residential",
      hvac: "High-Efficiency Inverter Heat Pump Systems",
      fiber: "Pre-Wired 1 Gbps Gigabit to every unit",
      power: "125A Individual Metered Panel",
      ceilingHeight: "10 ft Smooth Finish Ceilings with Energy-Star Windows",
    },
    description:
      "Upscale 1 and 2-bedroom smart apartment residences engineered for modern remote professionals, featuring private balconies, smart locks, and resort-style amenities.",
    highlights: [
      "Private resident co-working lounge with soundproof podcast booths",
      "Keyless digital smart lock entry and remote guest delivery access",
      "Resort-style saltwater pool, firepit terrace, and fitness wellness center",
      "Pet-friendly community with dog washing station and direct trail access",
    ],
  },
];

export const WIRED_DIGITAL_HERO_SLIDES = [
  {
    propertyId: "wired-tech-hub",
    name: "Wired Digital Tech Hub & Executive Suites",
    tagline: "Turnkey Fiber-Connected Creative Suites & Executive Boardrooms",
    submarket: "Innovation District · High-Speed Commercial Corridor",
    image: "/demo-properties/oakridge-professional-plaza.jpg",
    type: "Medical & Office",
    featuredSuite: "Suite 300 · Gigabit Innovation Floor",
    suiteSpecs: "3,200 RSF · 8 Private Executive Offices · 10 Gbps Fiber",
    rate: "$26 / SF Full Service",
    badge: "Tech & Executive Hub",
  },
  {
    propertyId: "wired-innovation-lofts",
    name: "Wired Innovation Lofts & Creative Studios",
    tagline: "Double-Height Creative Studios & Modern Live-Work Lofts",
    submarket: "Downtown Arts & Commerce District",
    image: "/demo-properties/heritage-square-mixed-use.jpg",
    type: "Mixed-Use & Lofts",
    featuredSuite: "Suite 2B Studio & Loft 3A",
    suiteSpecs: "1,450 RSF Creative Office + 1,200 RSF Residential Loft",
    rate: "$24 / SF Retail · $1,750/mo Loft",
    badge: "Mixed-Use Lofts",
  },
  {
    propertyId: "digital-apex-flex",
    name: "Digital Apex Flex & Logistics Center",
    tagline: "Drive-In Flex Bays for Tech Systems, Electrical & Logistics",
    submarket: "Gateway Commerce Park",
    image: "/demo-properties/cedar-creek-trade-center.jpg",
    type: "Contractor Flex",
    featuredSuite: "Bay 4 · Drive-In Contractor Flex Unit",
    suiteSpecs: "2,400 RSF · 14 ft Overhead Door · Fenced Equipment Yard",
    rate: "$14.50 / SF NNN",
    badge: "Contractor & Flex",
  },
  {
    propertyId: "wired-riverview-residences",
    name: "The Wired Residences at Riverview",
    tagline: "Smart 1 & 2-Bedroom Luxury Apartments with Co-Working Lounge",
    submarket: "Waterfront Park District",
    image: "/demo-properties/pinecrest-valley-apartments.jpg",
    type: "Residential Apartments",
    featuredSuite: "Unit 402 · 2-Bed / 2-Bath Penthouse View",
    suiteSpecs: "1,250 Sq Ft · Balcony · Gigabit Pre-Wired · EV Charging",
    rate: "$1,695 / month",
    badge: "Smart Multi-Family",
  },
];
