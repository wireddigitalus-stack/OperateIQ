"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  Upload, FileSpreadsheet, FileText, Camera, CheckCircle2,
  AlertTriangle, AlertCircle, X, ChevronDown, ChevronUp, Loader2, Sparkles,
  Trash2, Plus, RefreshCw, Eye, EyeOff, Building, DollarSign,
  CheckSquare, Square, ArrowRight, ShieldCheck,
  Users, Paperclip, SlidersHorizontal, Download, Flame
} from "lucide-react";
import {
  inspectSpreadsheetFile,
  parseCleanMoney,
  normalizeFlexibleDate,
  downloadRentRollTemplate,
  type SpreadsheetInspectionResult,
} from "@/lib/spreadsheet";
import { compressImageFile } from "@/lib/image-compression";
import { supabaseBrowser } from "@/lib/supabase-browser";

export type PropertyAssetType = "Commercial" | "Multi-Family" | "Single-Family" | "Mixed-Use";

export interface StagedTenantRecord {
  id: string;
  name: string;
  contactName: string;
  guarantor?: string;
  email: string;
  phone: string;
  building: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyType?: PropertyAssetType;
  unit: string;
  unitSqft?: number;
  beds?: number;
  baths?: number;
  monthlyRent: number;
  nnnFee?: number;
  utilitiesFee?: number;
  utilitiesFeeLabel?: string;
  securityDeposit: number;
  secDepReceived?: boolean;
  secDepNotes?: string;
  escalationPct?: number;
  escalationDate?: string;
  lateFeeRule?: string;
  hvacFilterIntervalDays?: number;
  createHvacSchedule?: boolean;
  leaseStart: string;
  leaseEnd: string;
  status?: "active" | "pending" | "expired";
  isExpiredHoldover?: boolean;
  sourceDocUrl?: string;
  sourceDocName?: string;
  notes: string;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  selected: boolean;
  matchedExistingTenantId?: string;
  matchedExistingTenantName?: string;
  duplicateAction?: "update" | "create" | "skip";
}

interface ExistingOrgTenantLite {
  id: string;
  name: string;
  email: string;
  building: string;
  unit: string;
}

interface IntakeStagingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onImportSuccess?: (count: number) => void;
  knownBuildings?: string[];
  currentOrgName?: string;
  onViewTenants?: () => void;
  onViewBuildings?: () => void;
}

type MappedFieldKey =
  | ""
  | "name"
  | "contactName"
  | "email"
  | "phone"
  | "building"
  | "propertyCity"
  | "propertyType"
  | "unit"
  | "unitSqft"
  | "monthlyRent"
  | "nnnFee"
  | "utilitiesFee"
  | "securityDeposit"
  | "escalationPct"
  | "leaseStart"
  | "leaseEnd"
  | "notes";

const FIELD_OPTIONS: Array<{ value: MappedFieldKey; label: string }> = [
  { value: "", label: "— Ignore Column —" },
  { value: "name", label: "Tenant / Company Name *" },
  { value: "contactName", label: "Co-Tenant / Contact / Guarantor" },
  { value: "building", label: "Building / Property Name" },
  { value: "propertyType", label: "Property Type (Commercial / SFR / Multi)" },
  { value: "propertyCity", label: "City" },
  { value: "unit", label: "Unit / Suite #" },
  { value: "unitSqft", label: "SqFt / RSF" },
  { value: "monthlyRent", label: "Base Monthly Rent ($) *" },
  { value: "nnnFee", label: "NNN / CAM Monthly Fee ($)" },
  { value: "utilitiesFee", label: "Pet / Lawn / Utility Fee ($)" },
  { value: "securityDeposit", label: "Security Deposit ($)" },
  { value: "escalationPct", label: "Annual Escalation (%)" },
  { value: "leaseStart", label: "Lease Start Date" },
  { value: "leaseEnd", label: "Lease End Date" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes / Special Terms" },
];

// Expanded header dictionary covering AppFolio, Buildium, Yardi, Stessa, QuickBooks & custom sheets
const COL_MAP: Record<string, MappedFieldKey> = {
  name: "name",
  tenant: "name",
  "tenant name": "name",
  tenants: "name",
  resident: "name",
  "resident name": "name",
  lessee: "name",
  occupant: "name",
  company: "name",
  "company name": "name",
  business: "name",
  "business name": "name",
  customer: "name",
  contact: "contactName",
  "contact name": "contactName",
  "co-tenant": "contactName",
  "co-tenant / contact": "contactName",
  cotenant: "contactName",
  guarantor: "contactName",
  "primary contact": "contactName",
  rep: "contactName",
  email: "email",
  "e-mail": "email",
  "email address": "email",
  "tenant email": "email",
  phone: "phone",
  "phone number": "phone",
  "tenant phone": "phone",
  cell: "phone",
  mobile: "phone",
  tel: "phone",
  telephone: "phone",
  building: "building",
  property: "building",
  "property name": "building",
  "building name": "building",
  community: "building",
  complex: "building",
  location: "building",
  address: "building",
  "property address": "building",
  site: "building",
  city: "propertyCity",
  "property city": "propertyCity",
  type: "propertyType",
  "property type": "propertyType",
  "asset class": "propertyType",
  unit: "unit",
  "unit / suite": "unit",
  "unit #": "unit",
  "unit number": "unit",
  apt: "unit",
  "apt #": "unit",
  apartment: "unit",
  suite: "unit",
  "suite #": "unit",
  "suite number": "unit",
  space: "unit",
  bay: "unit",
  room: "unit",
  sqft: "unitSqft",
  "sq ft": "unitSqft",
  "sq. ft.": "unitSqft",
  rsf: "unitSqft",
  "square feet": "unitSqft",
  rent: "monthlyRent",
  "monthly rent": "monthlyRent",
  "base monthly rent": "monthlyRent",
  "base rent": "monthlyRent",
  "rent amount": "monthlyRent",
  "current rent": "monthlyRent",
  "contract rent": "monthlyRent",
  "monthly charge": "monthlyRent",
  charge: "monthlyRent",
  amount: "monthlyRent",
  payment: "monthlyRent",
  nnn: "nnnFee",
  "nnn fee": "nnnFee",
  "nnn / cam fee": "nnnFee",
  cam: "nnnFee",
  "cam fee": "nnnFee",
  "additional rent": "nnnFee",
  "pet rent": "utilitiesFee",
  "pet fee": "utilitiesFee",
  "pet / other monthly fee": "utilitiesFee",
  "other fee": "utilitiesFee",
  "utilities fee": "utilitiesFee",
  "utility fee": "utilitiesFee",
  "landscaping fee": "utilitiesFee",
  deposit: "securityDeposit",
  "security deposit": "securityDeposit",
  "sec dep": "securityDeposit",
  sec_dep: "securityDeposit",
  "deposit held": "securityDeposit",
  escrow: "securityDeposit",
  escalation: "escalationPct",
  "escalation %": "escalationPct",
  "annual escalation %": "escalationPct",
  "rent escalation": "escalationPct",
  "lease start": "leaseStart",
  "start date": "leaseStart",
  start: "leaseStart",
  commencement: "leaseStart",
  "move in": "leaseStart",
  "move-in": "leaseStart",
  "move in date": "leaseStart",
  "lease from": "leaseStart",
  "lease end": "leaseEnd",
  "end date": "leaseEnd",
  end: "leaseEnd",
  expiration: "leaseEnd",
  "expiration date": "leaseEnd",
  expires: "leaseEnd",
  "lease to": "leaseEnd",
  "move out": "leaseEnd",
  "move-out": "leaseEnd",
  notes: "notes",
  comments: "notes",
  memo: "notes",
  remarks: "notes",
  terms: "notes",
};

function guessColumnField(header: string): MappedFieldKey {
  const norm = header
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (COL_MAP[norm]) return COL_MAP[norm];
  if (norm.includes("nnn") || norm.includes("cam")) return "nnnFee";
  if (norm.includes("pet") || norm.includes("landscap") || norm.includes("utilit")) return "utilitiesFee";
  if (norm.includes("deposit") || norm.includes("escrow")) return "securityDeposit";
  if (norm.includes("rent") || norm.includes("monthly charge")) return "monthlyRent";
  if (norm.includes("escalat")) return "escalationPct";
  if (norm.includes("start") || norm.includes("move in") || norm.includes("commence")) return "leaseStart";
  if (norm.includes("end") || norm.includes("expir") || norm.includes("maturity")) return "leaseEnd";
  if (norm.includes("sqft") || norm.includes("sq ft") || norm.includes("rsf")) return "unitSqft";
  if (norm.includes("unit") || norm.includes("suite") || norm.includes("apt")) return "unit";
  if (norm.includes("building") || norm.includes("property") || norm.includes("community")) return "building";
  if (norm.includes("tenant") || norm.includes("resident") || norm.includes("lessee")) return "name";
  if (norm.includes("email")) return "email";
  if (norm.includes("phone") || norm.includes("mobile") || norm.includes("cell")) return "phone";
  if (norm.includes("note") || norm.includes("comment") || norm.includes("term")) return "notes";
  return "";
}

function normalizeAssetClass(val: unknown): PropertyAssetType {
  const s = String(val || "").toLowerCase();
  if (s.includes("commercial") || s.includes("office") || s.includes("retail") || s.includes("industrial")) {
    return "Commercial";
  }
  if (s.includes("single") || s.includes("sfr") || s.includes("house")) {
    return "Single-Family";
  }
  if (s.includes("multi") || s.includes("apartment") || s.includes("duplex")) {
    return "Multi-Family";
  }
  return "Mixed-Use";
}

// 18 realistic sample candidate records for instant 1-click test drive (Commercial + Residential)
const DEMO_STAGED_RECORDS: StagedTenantRecord[] = [
  {
    id: "sample_1",
    name: "Holston River Outfitters LLC",
    contactName: "Marcus Vance",
    email: "marcus@holstonoutfitters.com",
    phone: "(423) 555-0142",
    building: "State Street Mixed-Use",
    propertyType: "Commercial",
    unit: "Suite 101",
    unitSqft: 2400,
    monthlyRent: 2850,
    nnnFee: 320,
    securityDeposit: 2850,
    leaseStart: "2025-01-01",
    leaseEnd: "2027-12-31",
    notes: "Commercial Retail · 2,400 sqft · 3-year term",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_2",
    name: "State Line Coffee Roasters",
    contactName: "Sarah Jenkins",
    email: "sarah@statelinecoffeeroasters.com",
    phone: "(423) 555-0188",
    building: "State Street Mixed-Use",
    propertyType: "Commercial",
    unit: "Suite 102",
    unitSqft: 1650,
    monthlyRent: 1950,
    securityDeposit: 1950,
    leaseStart: "2024-06-01",
    leaseEnd: "2029-05-31",
    notes: "Commercial Cafe/Bakery · 1,650 sqft · 5-year term",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_3",
    name: "Appalachian Legal Partners PLLC",
    contactName: "David Sterling, Esq.",
    email: "dsterling@appalachianlegal.com",
    phone: "(423) 555-0195",
    building: "State Street Mixed-Use",
    propertyType: "Commercial",
    unit: "Suite 201",
    unitSqft: 2800,
    monthlyRent: 3200,
    securityDeposit: 3200,
    leaseStart: "2025-03-01",
    leaseEnd: "2027-02-28",
    notes: "Professional Legal Office · 2,800 sqft · 2-year term",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_4",
    name: "High Country Design Studio",
    contactName: "Elena Rossi",
    email: "elena@highcountrystudio.com",
    phone: "(423) 555-0177",
    building: "State Street Mixed-Use",
    propertyType: "Commercial",
    unit: "Suite 204",
    unitSqft: 1100,
    monthlyRent: 1450,
    securityDeposit: 1450,
    leaseStart: "2025-08-01",
    leaseEnd: "2027-07-31",
    notes: "Creative Agency · 1,100 sqft · 2-year term",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_5",
    name: "Davis, Michael & Emily",
    contactName: "Michael Davis",
    email: "mdavis.family@example.com",
    phone: "(423) 555-0211",
    building: "Appalachian Ridge Apartments",
    propertyType: "Multi-Family",
    unit: "Apt 1A",
    unitSqft: 750,
    monthlyRent: 1150,
    securityDeposit: 1150,
    leaseStart: "2026-04-01",
    leaseEnd: "2027-03-31",
    notes: "Residential 1BR/1BA · 750 sqft · Covered parking included",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_6",
    name: "Martinez, Jessica",
    contactName: "Jessica Martinez",
    email: "jmartinez@example.com",
    phone: "(423) 555-0234",
    building: "Appalachian Ridge Apartments",
    propertyType: "Multi-Family",
    unit: "Apt 1B",
    unitSqft: 750,
    monthlyRent: 1150,
    utilitiesFee: 35,
    utilitiesFeeLabel: "Pet Rent",
    securityDeposit: 1150,
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    notes: "Residential 1BR/1BA · 750 sqft · Pet deposit on file",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_7",
    name: "Wilson, Thomas",
    contactName: "Thomas Wilson",
    email: "twilson@example.com",
    phone: "(423) 555-0245",
    building: "Appalachian Ridge Apartments",
    propertyType: "Multi-Family",
    unit: "Apt 2A",
    unitSqft: 1050,
    monthlyRent: 1450,
    securityDeposit: 1450,
    leaseStart: "2026-01-15",
    leaseEnd: "2027-01-14",
    notes: "Residential 2BR/2BA · 1,050 sqft · Balcony unit",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_8",
    name: "Taylor, Brian & Chloe",
    contactName: "Chloe Taylor",
    email: "chloe.taylor@example.com",
    phone: "(423) 555-0268",
    building: "Appalachian Ridge Apartments",
    propertyType: "Multi-Family",
    unit: "Apt 2B",
    unitSqft: 1050,
    monthlyRent: 1450,
    securityDeposit: 1450,
    leaseStart: "2026-05-01",
    leaseEnd: "2027-04-30",
    notes: "Residential 2BR/2BA · 1,050 sqft · Hardwood upgrade",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_9",
    name: "Reed, Samantha",
    contactName: "Samantha Reed",
    email: "sreed@example.com",
    phone: "(423) 555-0279",
    building: "Appalachian Ridge Apartments",
    propertyType: "Multi-Family",
    unit: "Apt 3A",
    unitSqft: 520,
    monthlyRent: 895,
    securityDeposit: 895,
    leaseStart: "2026-09-01",
    leaseEnd: "2027-02-28",
    notes: "Residential Studio · 520 sqft · Short-term 6mo lease",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_10",
    name: "Patel, Kevin",
    contactName: "Kevin Patel",
    email: "kpatel@example.com",
    phone: "(423) 555-0284",
    building: "Appalachian Ridge Apartments",
    propertyType: "Multi-Family",
    unit: "Apt 3B",
    unitSqft: 520,
    monthlyRent: 895,
    securityDeposit: 895,
    leaseStart: "2026-02-01",
    leaseEnd: "2027-01-31",
    notes: "Residential Studio · 520 sqft",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_11",
    name: "Miller, Robert & Ashley",
    contactName: "Robert Miller",
    email: "rmiller@example.com",
    phone: "(423) 555-0292",
    building: "Appalachian Ridge Apartments",
    propertyType: "Multi-Family",
    unit: "TH-01",
    unitSqft: 1600,
    monthlyRent: 1950,
    securityDeposit: 1950,
    leaseStart: "2025-11-01",
    leaseEnd: "2026-12-31",
    notes: "Residential 3BR/2.5BA Townhome · 1,600 sqft · Attached garage",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_12",
    name: "Morgan, Daniel",
    contactName: "Daniel Morgan",
    email: "dmorgan@example.com",
    phone: "(423) 555-0299",
    building: "Appalachian Ridge Apartments",
    propertyType: "Multi-Family",
    unit: "TH-02",
    unitSqft: 1600,
    monthlyRent: 1950,
    securityDeposit: 1950,
    leaseStart: "2025-12-01",
    leaseEnd: "2026-11-30",
    notes: "Residential 3BR/2.5BA Townhome · Deposit received · Move-in scheduled",
    confidence: "medium",
    needsReview: true,
    selected: true,
  },
  {
    id: "sample_13",
    name: "Tri-Cities Physical Therapy LLC",
    contactName: "Dr. Karen Brooks",
    email: "kbrooks@tricitiespt.com",
    phone: "(423) 555-0310",
    building: "Highland Medical & Professional Plaza",
    propertyType: "Commercial",
    unit: "Suite 100",
    unitSqft: 3600,
    monthlyRent: 4200,
    nnnFee: 520,
    escalationPct: 3,
    securityDeposit: 4200,
    leaseStart: "2023-09-01",
    leaseEnd: "2028-08-31",
    notes: "Medical Clinic · 3,600 sqft · 5-year NNN lease",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_14",
    name: "Cumberland Family Dentistry",
    contactName: "Dr. Anthony Hill",
    email: "office@cumberlanddentistry.com",
    phone: "(423) 555-0344",
    building: "Highland Medical & Professional Plaza",
    propertyType: "Commercial",
    unit: "Suite 150",
    unitSqft: 3100,
    monthlyRent: 3800,
    securityDeposit: 3800,
    leaseStart: "2024-01-01",
    leaseEnd: "2029-12-31",
    notes: "Dental Practice · 3,100 sqft · 5-year medical buildout",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_15",
    name: "Blue Ridge Tax & Wealth Advisers",
    contactName: "Gregory Vance, CPA",
    email: "gvance@blueridgetax.com",
    phone: "(423) 555-0382",
    building: "Highland Medical & Professional Plaza",
    propertyType: "Commercial",
    unit: "Suite 210",
    unitSqft: 2000,
    monthlyRent: 2400,
    securityDeposit: 2400,
    leaseStart: "2024-10-01",
    leaseEnd: "2027-09-30",
    notes: "Financial / Accounting Firm · 2,000 sqft · 3-year commercial",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_16",
    name: "Appalachian Plumbing Supply Inc.",
    contactName: "Ray Callahan",
    email: "rcallahan@appalachianplumbing.com",
    phone: "(423) 555-0415",
    building: "Blue Ridge Industrial & Flex Bays",
    propertyType: "Commercial",
    unit: "Bay 1",
    unitSqft: 4000,
    monthlyRent: 2600,
    securityDeposit: 2600,
    leaseStart: "2024-03-01",
    leaseEnd: "2027-02-28",
    notes: "Industrial Warehouse / Showroom · 4,000 sqft · Grade door access",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_17",
    name: "Summit Precision Fabrication",
    contactName: "Jason Cole",
    email: "jason@summitprecisionfab.com",
    phone: "(423) 555-0440",
    building: "Blue Ridge Industrial & Flex Bays",
    propertyType: "Commercial",
    unit: "Bay 2",
    unitSqft: 4800,
    monthlyRent: 3100,
    securityDeposit: 3100,
    leaseStart: "2024-11-01",
    leaseEnd: "2027-10-31",
    notes: "Manufacturing / CNC Fabrication · 4,800 sqft · 3-phase power",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
  {
    id: "sample_18",
    name: "Blue Ridge Electrical Services LLC",
    contactName: "Mark Higgins",
    email: "mhiggins@blueridgeelectrical.com",
    phone: "(423) 555-0475",
    building: "Blue Ridge Industrial & Flex Bays",
    propertyType: "Commercial",
    unit: "Bay 3",
    unitSqft: 3200,
    monthlyRent: 2200,
    securityDeposit: 2200,
    leaseStart: "2025-02-01",
    leaseEnd: "2027-01-31",
    notes: "Contractor Office & Fleet Yard · 3,200 sqft · 2-year term",
    confidence: "high",
    needsReview: false,
    selected: true,
  },
];

export default function IntakeStagingModal({
  isOpen,
  onClose,
  onImportSuccess,
  knownBuildings = [],
  currentOrgName = "Your Portfolio",
  onViewTenants,
  onViewBuildings,
}: IntakeStagingModalProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "review" | "committing" | "success">("upload");
  const [scanStatusText, setScanStatusText] = useState("Analyzing document structure...");
  const [scanProgressLabel, setScanProgressLabel] = useState("");
  const [stagedRecords, setStagedRecords] = useState<StagedTenantRecord[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState("");
  const [detectedBuilding, setDetectedBuilding] = useState("");
  const [sourceFile, setSourceFile] = useState<{ name: string; type: string; url?: string } | null>(null);
  const [showSourceDrawer, setShowSourceDrawer] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Smart Spreadsheet state (Sheet Tab Picker + Column Mapper)
  const [activeExcelFile, setActiveExcelFile] = useState<File | null>(null);
  const [excelInspection, setExcelInspection] = useState<SpreadsheetInspectionResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, MappedFieldKey>>({});
  const [showColumnMapper, setShowColumnMapper] = useState(false);

  // Existing tenants for duplicate / upsert matching
  const [existingTenants, setExistingTenants] = useState<ExistingOrgTenantLite[]>([]);

  // Committed stats for prominent Finalize & Saved screen
  const [savedBuildings, setSavedBuildings] = useState<string[]>([]);
  const [savedRentSum, setSavedRentSum] = useState<number>(0);
  const [savedTenantsCount, setSavedTenantsCount] = useState<number>(0);
  const [savedUpdatedCount, setSavedUpdatedCount] = useState<number>(0);
  const [savedUnitsSynced, setSavedUnitsSynced] = useState<number>(0);
  const [savedDocsAttached, setSavedDocsAttached] = useState<number>(0);
  const [savedHvacCount, setSavedHvacCount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load existing org tenants once when modal opens so duplicate detection is instant
  useEffect(() => {
    if (isOpen === false) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tenants?limit=500", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const rows = Array.isArray(data?.tenants)
          ? data.tenants
          : Array.isArray(data)
            ? data
            : [];
        if (!cancelled) {
          setExistingTenants(
            rows.map((t: Record<string, unknown>) => ({
              id: String(t.id || ""),
              name: String(t.name || ""),
              email: String(t.email || ""),
              building: String(t.building || ""),
              unit: String(t.unit || ""),
            }))
          );
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Annotate staged records against existing tenants for duplicate / upsert protection
  const annotateDuplicates = useCallback(
    (records: StagedTenantRecord[]): StagedTenantRecord[] => {
      if (existingTenants.length === 0) return records;
      return records.map((rec) => {
        const bKey = rec.building.trim().toLowerCase();
        const uKey = rec.unit.trim().toLowerCase();
        const eKey = rec.email.trim().toLowerCase();

        const match = existingTenants.find((et) => {
          const eb = et.building.trim().toLowerCase();
          const eu = et.unit.trim().toLowerCase();
          if (bKey && uKey && eb === bKey && eu === uKey) return true;
          if (eKey && et.email.trim().toLowerCase() === eKey) return true;
          return false;
        });

        if (!match) {
          return {
            ...rec,
            matchedExistingTenantId: undefined,
            matchedExistingTenantName: undefined,
            duplicateAction: rec.duplicateAction === "skip" ? "skip" : "create",
          };
        }

        return {
          ...rec,
          matchedExistingTenantId: match.id,
          matchedExistingTenantName: match.name,
          duplicateAction: rec.duplicateAction || "update",
        };
      });
    },
    [existingTenants]
  );

  // Re-annotate if existingTenants finishes loading after records are staged
  useEffect(() => {
    if (existingTenants.length > 0 && stagedRecords.length > 0 && sourceFile?.type !== "sample") {
      setStagedRecords((prev) => annotateDuplicates(prev));
    }
  }, [existingTenants, annotateDuplicates, sourceFile?.type, stagedRecords.length]);

  const buildingSuggestions = useMemo(() => {
    const list = Array.from(new Set([...knownBuildings, detectedBuilding])).filter(Boolean);
    return list.length ? list : ["Apex Plaza", "Oakview Apartments", "Main Building"];
  }, [knownBuildings, detectedBuilding]);

  // Build staged records from SpreadsheetInspectionResult + columnMapping
  const buildRecordsFromInspection = useCallback(
    (
      inspection: SpreadsheetInspectionResult,
      mapping: Record<string, MappedFieldKey>,
      fallbackBuilding: string
    ): StagedTenantRecord[] => {
      const mapped: StagedTenantRecord[] = [];

      inspection.rows.forEach((row, idx) => {
        let name = "";
        let contactName = "";
        let email = "";
        let phone = "";
        let building = "";
        let propertyCity = "";
        let propertyType = "Mixed-Use" as PropertyAssetType;
        let unit = "";
        let unitSqft = 0;
        let monthlyRent = 0;
        let nnnFee = 0;
        let utilitiesFee = 0;
        let securityDeposit = 0;
        let escalationPct = 0;
        let leaseStart = "";
        let leaseEnd = "";
        let notes = "";

        inspection.headers.forEach((h) => {
          const target = mapping[h];
          const val = row[h];
          if (!target || val === undefined || val === null || String(val).trim() === "") return;

          if (target === "name") name = String(val).trim();
          else if (target === "contactName") contactName = String(val).trim();
          else if (target === "email") email = String(val).trim();
          else if (target === "phone") phone = String(val).trim();
          else if (target === "building") building = String(val).trim();
          else if (target === "propertyCity") propertyCity = String(val).trim();
          else if (target === "propertyType") propertyType = normalizeAssetClass(val);
          else if (target === "unit") unit = String(val).trim();
          else if (target === "unitSqft") unitSqft = Math.max(0, Math.round(parseCleanMoney(val)));
          else if (target === "monthlyRent") monthlyRent = parseCleanMoney(val);
          else if (target === "nnnFee") nnnFee += parseCleanMoney(val);
          else if (target === "utilitiesFee") utilitiesFee += parseCleanMoney(val);
          else if (target === "securityDeposit") securityDeposit = parseCleanMoney(val);
          else if (target === "escalationPct") escalationPct = Math.max(0, parseCleanMoney(val));
          else if (target === "leaseStart") leaseStart = normalizeFlexibleDate(val);
          else if (target === "leaseEnd") leaseEnd = normalizeFlexibleDate(val);
          else if (target === "notes") notes = [notes, String(val).trim()].filter(Boolean).join(" · ");
        });

        // Skip rows labeled "Vacant" in the tenant name column (vacant unit placeholders)
        if (/^vacant\b/i.test(name)) {
          return;
        }

        const isExpiredHoldover = Boolean(leaseEnd && leaseEnd < todayIso);
        const status: "active" | "pending" | "expired" = isExpiredHoldover
          ? "expired"
          : leaseStart && leaseStart > todayIso
            ? "pending"
            : "active";

        const isMissingCritical = !name || monthlyRent <= 0;
        mapped.push({
          id: `excel_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          name: name || `Tenant Row ${idx + 1}`,
          contactName,
          email,
          phone,
          building: building || fallbackBuilding || "Main Building",
          propertyCity,
          propertyType,
          unit: unit || (propertyType === "Single-Family" ? "Main" : `Unit ${idx + 1}`),
          unitSqft,
          monthlyRent,
          nnnFee,
          utilitiesFee,
          securityDeposit,
          escalationPct,
          leaseStart,
          leaseEnd,
          status,
          isExpiredHoldover,
          notes,
          confidence: isMissingCritical ? "low" : "high",
          needsReview: isMissingCritical,
          selected: !isMissingCritical,
        });
      });

      return annotateDuplicates(mapped);
    },
    [annotateDuplicates, todayIso]
  );

  // Handle Excel / CSV upload (supports multi-sheet inspection + column mapping)
  const handleExcelUpload = useCallback(
    async (file: File, sheetIndex?: number, append = false) => {
      setErrorMsg("");
      setActiveExcelFile(file);
      setSourceFile({ name: file.name, type: "spreadsheet" });
      setStep("scanning");
      setScanStatusText("Detecting rent roll headers, sheets & financial columns...");

      try {
        const inspection = await inspectSpreadsheetFile(file, { sheetIndex });
        if (!inspection.rows.length) {
          throw new Error("No data rows were found in the selected worksheet.");
        }

        const initialMap: Record<string, MappedFieldKey> = {};
        let matchedKeyFields = 0;
        inspection.headers.forEach((h) => {
          const guessed = guessColumnField(h);
          initialMap[h] = guessed;
          if (guessed === "name" || guessed === "monthlyRent") matchedKeyFields++;
        });

        setExcelInspection(inspection);
        setColumnMapping(initialMap);
        // Auto-open column mapper if either Tenant Name or Monthly Rent wasn't auto-recognized
        setShowColumnMapper(matchedKeyFields < 2);

        const mapped = buildRecordsFromInspection(
          inspection,
          initialMap,
          knownBuildings[0] || "Main Building"
        );

        setStagedRecords((prev) => (append ? [...prev, ...mapped] : mapped));
        const cleanupNotes: string[] = [];
        if (inspection.skippedBannerRows > 0) {
          cleanupNotes.push(`skipped ${inspection.skippedBannerRows} title row${inspection.skippedBannerRows === 1 ? "" : "s"}`);
        }
        if (inspection.skippedSummaryRows > 0) {
          cleanupNotes.push(`filtered ${inspection.skippedSummaryRows} Total/Summary row${inspection.skippedSummaryRows === 1 ? "" : "s"}`);
        }
        setPortfolioSummary(
          `Parsed ${mapped.length} tenant${mapped.length === 1 ? "" : "s"} from "${inspection.selectedSheetName}"${
            cleanupNotes.length ? ` (${cleanupNotes.join(", ")})` : ""
          }`
        );
        setStep("review");
      } catch (err) {
        console.error("Excel parse failed:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to parse spreadsheet.");
        setStep(stagedRecords.length > 0 ? "review" : "upload");
      }
    },
    [buildRecordsFromInspection, knownBuildings, stagedRecords.length]
  );

  // Re-map columns interactively when user changes a column dropdown
  const handleColumnMapChange = (header: string, newField: MappedFieldKey) => {
    const nextMap = { ...columnMapping, [header]: newField };
    setColumnMapping(nextMap);
    if (excelInspection) {
      const remapped = buildRecordsFromInspection(
        excelInspection,
        nextMap,
        knownBuildings[0] || "Main Building"
      );
      setStagedRecords(remapped);
    }
  };

  // Upload a single document/image to Supabase Storage via signed URL (bypasses 4.5MB Vercel limit) + run AI OCR
  const scanSingleDocumentFile = useCallback(
    async (file: File): Promise<{ candidates: StagedTenantRecord[]; summary: string; detectedBldg: string }> => {
      let uploadFile = file;
      if (file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) {
        const { file: compressed } = await compressImageFile(file, {
          maxDimension: 2000,
          maxBytes: 1400 * 1024,
          quality: 0.86,
        });
        uploadFile = compressed;
      }

      if (uploadFile.size > 25 * 1024 * 1024) {
        throw new Error(`"${file.name}" exceeds the 25 MB maximum document size.`);
      }

      // 1. Attempt direct signed-URL upload to Supabase Storage so:
      //    (a) files > 4.5 MB bypass Vercel's serverless body limit, and
      //    (b) the source lease PDF/DOCX is stored for automatic attachment to the tenant card!
      let storagePath = "";
      const ext = (uploadFile.name.split(".").pop() || "").toLowerCase();
      const signableExts = new Set(["pdf", "doc", "docx", "rtf", "txt", "png", "jpg", "jpeg", "webp"]);

      if (signableExts.has(ext)) {
        try {
          const signRes = await fetch("/api/tenant-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: uploadFile.name,
              tenantId: "intake-staging",
              size: uploadFile.size,
              contentType: uploadFile.type || "application/octet-stream",
            }),
          });

          if (signRes.ok) {
            const signData = await signRes.json();
            if (signData?.success && signData?.path && signData?.token) {
              let uploadedOk = false;
              try {
                const { error: upErr } = await supabaseBrowser.storage
                  .from("tenant-assets")
                  .uploadToSignedUrl(signData.path, signData.token, uploadFile, {
                    upsert: true,
                    contentType: uploadFile.type || "application/octet-stream",
                  });
                if (!upErr) uploadedOk = true;
              } catch {
                /* fallback to direct PUT */
              }

              if (!uploadedOk && signData.signedUrl) {
                const putRes = await fetch(signData.signedUrl, {
                  method: "PUT",
                  headers: {
                    "Content-Type": uploadFile.type || "application/octet-stream",
                    "x-upsert": "true",
                  },
                  body: uploadFile,
                });
                if (putRes.ok) uploadedOk = true;
              }

              if (uploadedOk) {
                storagePath = String(signData.path);
              }
            }
          }
        } catch (signErr) {
          console.warn("[IntakeStagingModal] Signed storage pre-upload skipped, using direct upload:", signErr);
        }
      }

      // 2. Call /api/ai/intake-ocr via storagePath JSON (preferred) or multipart FormData fallback
      let res: Response;
      if (storagePath) {
        res = await fetch("/api/ai/intake-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath,
            filename: uploadFile.name,
            mimeType: uploadFile.type,
            notes: `Source upload for ${currentOrgName}`,
          }),
        });
      } else {
        if (uploadFile.size > 4.4 * 1024 * 1024) {
          throw new Error(
            `"${file.name}" is ${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB and storage pre-upload failed. Please retry or upload a PDF under 4.4 MB.`
          );
        }
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("notes", `Source upload for ${currentOrgName}`);
        res = await fetch("/api/ai/intake-ocr", {
          method: "POST",
          body: formData,
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to scan "${file.name}" (HTTP ${res.status}).`);
      }

      const data = await res.json();
      const rawCandidates: StagedTenantRecord[] = Array.isArray(data.candidates)
        ? data.candidates.map((c: StagedTenantRecord) => ({
            ...c,
            createHvacSchedule: (c.hvacFilterIntervalDays || 0) > 0,
          }))
        : [];

      return {
        candidates: rawCandidates,
        summary: String(data.portfolioSummary || ""),
        detectedBldg: String(data.detectedBuildingName || ""),
      };
    },
    [currentOrgName]
  );

  // Unified Multi-File Batch Ingestion (handles 1 or N leases, photos, and spreadsheets)
  const handleFilesBatch = useCallback(
    async (fileList: FileList | File[], appendMode = false) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      setErrorMsg("");

      // Single spreadsheet shortcut -> preserves interactive Sheet Picker & Column Mapper
      if (files.length === 1 && /\.(xlsx|xls|csv)$/i.test(files[0].name) && !appendMode) {
        await handleExcelUpload(files[0], undefined, false);
        return;
      }

      setExcelInspection(null);
      setActiveExcelFile(null);
      setShowColumnMapper(false);

      const firstPreviewable = files.find(
        (f) => f.type === "application/pdf" || f.type.startsWith("image/") || /\.(pdf|jpe?g|png|webp)$/i.test(f.name)
      );
      setSourceFile({
        name: files.length === 1 ? files[0].name : `${files.length} files (${files[0].name} + ${files.length - 1} more)`,
        type: firstPreviewable?.type || files[0].type || "document",
        url: firstPreviewable ? URL.createObjectURL(firstPreviewable) : undefined,
      });

      setStep("scanning");
      const statusSequence = [
        "Analyzing lease clauses, base rent & NNN/pet add-ons...",
        "Extracting escalations, security escrow & property details...",
        "Checking existing portfolio for duplicate units...",
        "Attaching source lease files & preparing staging review...",
      ];
      let seqIdx = 0;
      setScanStatusText(statusSequence[0]);
      const interval = setInterval(() => {
        seqIdx = (seqIdx + 1) % statusSequence.length;
        setScanStatusText(statusSequence[seqIdx]);
      }, 1400);

      const collected: StagedTenantRecord[] = [];
      const summaries: string[] = [];
      const fileErrors: string[] = [];
      let singleDetectedBldg = "";

      try {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setScanProgressLabel(
            files.length > 1 ? `Scanning file ${i + 1} of ${files.length}: ${f.name}` : `Processing: ${f.name}`
          );

          try {
            if (/\.(xlsx|xls|csv)$/i.test(f.name)) {
              const insp = await inspectSpreadsheetFile(f);
              const autoMap: Record<string, MappedFieldKey> = {};
              insp.headers.forEach((h) => {
                autoMap[h] = guessColumnField(h);
              });
              const rows = buildRecordsFromInspection(insp, autoMap, knownBuildings[0] || "Main Building");
              collected.push(...rows);
              summaries.push(`${rows.length} from ${f.name}`);
            } else {
              const { candidates, summary, detectedBldg } = await scanSingleDocumentFile(f);
              collected.push(...candidates);
              if (summary) summaries.push(summary);
              if (detectedBldg && files.length === 1) singleDetectedBldg = detectedBldg;
            }
          } catch (fErr) {
            fileErrors.push(fErr instanceof Error ? fErr.message : `Could not read ${f.name}`);
          }
        }

        clearInterval(interval);

        if (collected.length === 0) {
          throw new Error(
            fileErrors[0] ||
              "No tenant records could be extracted. Verify that tenant names and rent amounts are visible."
          );
        }

        const annotated = annotateDuplicates(collected);
        setStagedRecords((prev) => (appendMode ? [...prev, ...annotated] : annotated));
        setPortfolioSummary(
          files.length > 1
            ? `Extracted ${annotated.length} lease record(s) across ${files.length} files`
            : summaries[0] || `Extracted ${annotated.length} record(s)`
        );
        if (singleDetectedBldg) {
          setDetectedBuilding(singleDetectedBldg);
        }
        if (fileErrors.length > 0) {
          setErrorMsg(`Partial batch warning: ${fileErrors.join(" · ")}`);
        }
        setStep("review");
      } catch (err) {
        clearInterval(interval);
        console.error("Batch intake error:", err);
        setErrorMsg(err instanceof Error ? err.message : "Document analysis failed.");
        setStep(stagedRecords.length > 0 ? "review" : "upload");
      }
    },
    [
      annotateDuplicates,
      buildRecordsFromInspection,
      handleExcelUpload,
      knownBuildings,
      scanSingleDocumentFile,
      stagedRecords.length,
    ]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesBatch(e.dataTransfer.files, false);
      }
    },
    [handleFilesBatch]
  );

  const handleLoadSample = () => {
    setErrorMsg("");
    setExcelInspection(null);
    setActiveExcelFile(null);
    setSourceFile({ name: "PropOpsIQ Mixed Portfolio Test Roll (Demo).xlsx", type: "sample" });
    setStagedRecords(DEMO_STAGED_RECORDS);
    setPortfolioSummary("18 Verified commercial & residential tenant leases across 4 properties loaded.");
    setDetectedBuilding("Multiple Properties");
    setStep("review");
  };

  const updateRow = <K extends keyof StagedTenantRecord>(
    id: string,
    field: K,
    value: StagedTenantRecord[K]
  ) => {
    setStagedRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        const updated: StagedTenantRecord = { ...rec, [field]: value };
        if (field === "name" || field === "monthlyRent") {
          if (updated.name.trim() && updated.monthlyRent > 0) {
            updated.needsReview = false;
            updated.confidence = "high";
          }
        }
        if (field === "leaseEnd") {
          const endStr = String(value || "");
          updated.isExpiredHoldover = Boolean(endStr && endStr < todayIso);
        }
        if (field === "building" || field === "unit" || field === "email") {
          return annotateDuplicates([updated])[0];
        }
        return updated;
      })
    );
  };

  const deleteRow = (id: string) => {
    setStagedRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const addEmptyRow = () => {
    const newRow: StagedTenantRecord = {
      id: `manual_${Date.now()}`,
      name: "",
      contactName: "",
      email: "",
      phone: "",
      building: detectedBuilding || buildingSuggestions[0] || "Main Building",
      propertyType: "Mixed-Use",
      unit: "",
      monthlyRent: 0,
      nnnFee: 0,
      utilitiesFee: 0,
      securityDeposit: 0,
      escalationPct: 0,
      leaseStart: "",
      leaseEnd: "",
      status: "active",
      notes: "Manually added record",
      confidence: "medium",
      needsReview: true,
      selected: true,
    };
    setStagedRecords((prev) => [...prev, newRow]);
  };

  const toggleSelectAll = () => {
    const allSelected = stagedRecords.every((r) => r.selected);
    setStagedRecords((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const selectedRecords = stagedRecords.filter((r) => r.selected && r.duplicateAction !== "skip");
  const totalBaseRent = selectedRecords.reduce((sum, r) => sum + (Number(r.monthlyRent) || 0), 0);
  const totalAddOnFees = selectedRecords.reduce(
    (sum, r) => sum + (Number(r.nnnFee) || 0) + (Number(r.utilitiesFee) || 0),
    0
  );
  const totalDeposit = selectedRecords.reduce((sum, r) => sum + (Number(r.securityDeposit) || 0), 0);
  const needsReviewCount = stagedRecords.filter((r) => r.needsReview).length;
  const duplicateMatchCount = stagedRecords.filter((r) => Boolean(r.matchedExistingTenantId)).length;
  const attachedDocsCount = selectedRecords.filter((r) => Boolean(r.sourceDocUrl)).length;
  const invalidSelected = selectedRecords.filter((r) => !r.name.trim() || r.monthlyRent <= 0).length;

  const handleCommit = async () => {
    if (selectedRecords.length === 0) return;
    if (invalidSelected > 0) {
      setErrorMsg(
        `Please supply a valid Name and Base Monthly Rent for all ${invalidSelected} selected row(s) before importing.`
      );
      return;
    }

    const isSampleRoll = sourceFile?.type === "sample";
    if (isSampleRoll) {
      const ok = window.confirm(
        `These ${selectedRecords.length} rows come from the PropOpsIQ sample demo roll.\n\nImport them as tagged [SAMPLE] records (unpublished and removable in one click)?`
      );
      if (!ok) return;
    }

    setStep("committing");
    setErrorMsg("");

    try {
      const payload = stagedRecords
        .filter((r) => r.selected)
        .map((r) => {
          const baseNote = r.notes.trim()
            ? r.notes.trim()
            : "Imported via PropOpsIQ Intake";
          return {
            name: r.name.trim(),
            contact_name: r.contactName.trim(),
            email: r.email.trim(),
            phone: r.phone.trim(),
            building: r.building.trim() || "Main Building",
            propertyAddress: r.propertyAddress || "",
            propertyCity: r.propertyCity || "",
            propertyType: r.propertyType || "Mixed-Use",
            unit: r.unit.trim(),
            unitSqft: Number(r.unitSqft) || 0,
            beds: Number(r.beds) || 0,
            baths: Number(r.baths) || 0,
            monthly_rent: Number(r.monthlyRent) || 0,
            nnn_fee: Number(r.nnnFee) || 0,
            utilities_fee: Number(r.utilitiesFee) || 0,
            security_deposit: Number(r.securityDeposit) || 0,
            sec_dep_received: Boolean(r.secDepReceived),
            sec_dep_notes: r.secDepNotes || "",
            escalation_pct: Number(r.escalationPct) || 0,
            escalation_date: r.escalationDate || null,
            hvacFilterIntervalDays: Number(r.hvacFilterIntervalDays) || 0,
            createHvacSchedule: r.createHvacSchedule !== false,
            lease_start: r.leaseStart || null,
            lease_end: r.leaseEnd || null,
            status: r.status || "active",
            sourceDocUrl: r.sourceDocUrl || "",
            sourceDocName: r.sourceDocName || "",
            existingTenantId: r.matchedExistingTenantId || "",
            duplicateAction: r.duplicateAction || (r.matchedExistingTenantId ? "update" : "create"),
            notes: isSampleRoll ? `[SAMPLE] ${baseNote}` : baseNote,
          };
        });

      const uniqueBuildingNames = Array.from(
        new Set(
          payload
            .filter((p) => p.duplicateAction !== "skip")
            .map((p) => p.building)
            .filter(Boolean)
        )
      );

      const res = await fetch("/api/intake/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenants: payload,
          autoCreateBuildings: true,
          syncUnits: true,
          isSample: isSampleRoll,
          source: "AI Multi-Tenant Intake",
        }),
      });

      const commitData = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rowErrPreview =
          Array.isArray(commitData.rowErrors) && commitData.rowErrors.length > 0
            ? ` (${commitData.rowErrors
                .slice(0, 3)
                .map((e: { row: number; name: string; message: string }) => `Row ${e.row} "${e.name}": ${e.message}`)
                .join("; ")})`
            : "";
        throw new Error((commitData.error || `Import failed with HTTP ${res.status}`) + rowErrPreview);
      }

      const createdBuildingList: string[] = Array.isArray(commitData.buildingsCreated)
        ? commitData.buildingsCreated
        : [];
      const activeCommitted = payload.filter((p) => p.duplicateAction !== "skip");
      const totalMonthlyRevenue = activeCommitted.reduce(
        (acc, t) => acc + (t.monthly_rent || 0) + (t.nnn_fee || 0) + (t.utilities_fee || 0),
        0
      );

      setSavedBuildings(createdBuildingList.length ? createdBuildingList : uniqueBuildingNames);
      setSavedTenantsCount(Number(commitData.tenantsCreated ?? activeCommitted.length));
      setSavedUpdatedCount(Number(commitData.tenantsUpdated ?? 0));
      setSavedUnitsSynced(Number(commitData.unitsSynced ?? 0));
      setSavedDocsAttached(Number(commitData.docsAttached ?? 0));
      setSavedHvacCount(Number(commitData.hvacSchedulesCreated ?? 0));
      setSavedRentSum(totalMonthlyRevenue);
      setStep("success");
      onImportSuccess?.(activeCommitted.length);
    } catch (err) {
      console.error("Batch tenant import failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to commit tenants to database.");
      setStep("review");
    }
  };

  if (isOpen !== undefined && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl max-h-[93vh] flex flex-col rounded-2xl bg-[#080C14] border border-white/20 shadow-[0_0_50px_rgba(56,189,248,0.15)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B1020]/90">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] flex-shrink-0">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Smart Lease, Rent Roll &amp; Portfolio Intake
                </h2>
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-300">
                  {currentOrgName}
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Lossless Staging + Auto-Attach Docs
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                Drop multiple PDF/Word leases, AppFolio/Buildium/Excel rent rolls, or photos of handwritten notes. Automatically maps NNN/pet fees, syncs Unit Roll, and attaches source leases.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="flex-shrink-0 text-red-400" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg("")}
                className="text-red-300 hover:text-white p-1"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* STEP 1: Upload / Ingestion Screen */}
          {step === "upload" && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative rounded-3xl border-2 border-dashed border-sky-400/35 hover:border-sky-400/80 bg-gradient-to-b from-sky-950/20 via-black/50 to-black/70 p-8 sm:p-12 text-center transition-all duration-300 group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.docx,.doc,.rtf,.txt,.xlsx,.xls,.csv,.tsv"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFilesBatch(files, false);
                    }
                    e.target.value = "";
                  }}
                />

                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all">
                    <Upload size={36} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
                      Drag &amp; Drop One or Multiple Leases, Spreadsheets, or Photos
                    </h3>
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                      Drop <strong className="text-white">multiple files at once</strong> — Commercial NNN &amp; Residential Leases (<code className="text-sky-300 font-bold">PDF, .docx, .doc</code> up to 25 MB), Rent Rolls (<code className="text-sky-300 font-bold">.xlsx, .csv</code>), or Legal Pad Photos (<code className="text-sky-300 font-bold">JPG, PNG, HEIC</code>).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-5 py-3 rounded-2xl bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/50 text-sky-200 text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <FileText size={18} /> Select Files (Multi-Upload)
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                      className="px-5 py-3 rounded-2xl bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400/50 text-purple-200 text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Camera size={18} /> Snap Photo (Camera)
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadRentRollTemplate();
                      }}
                      className="px-5 py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-200 text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Download size={18} /> Blank Excel Template
                    </button>

                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) handleFilesBatch(files, false);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Instant Test Drive / Quick Presets */}
              <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-white">Testing a New Account or Property?</h4>
                    <p className="text-sm text-gray-300 mt-0.5 leading-relaxed">
                      18-unit mixed portfolio: Commercial (Retail, Legal, Cafe, Design, Medical, Flex Bays) &amp; Residential (Apartments, Studios, Townhomes).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href="/sample-data/propopsiq_test_portfolio.xlsx"
                    download="propopsiq_test_portfolio.xlsx"
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-sm font-bold transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Sample .XLSX</span>
                  </a>
                  <a
                    href="/sample-data/propopsiq_test_portfolio.csv"
                    download="propopsiq_test_portfolio.csv"
                    className="px-4 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-sm font-bold transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Sample .CSV</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="px-5 py-2.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] border border-white/25 text-white text-sm sm:text-base font-black transition-all flex items-center gap-2 whitespace-nowrap shadow-[0_0_16px_rgba(255,255,255,0.08)] cursor-pointer"
                  >
                    ⚡ Preview 18 Sample Units <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {/* Capabilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-white/12 bg-black/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-sky-400">
                    <FileSpreadsheet size={18} /> Smart AppFolio / Excel Parser
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Auto-skips report title banners &amp; Total rows, supports multi-tab workbooks, interactive column mapping, and duplicate upsert protection.
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-white/12 bg-black/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-purple-400">
                    <FileText size={18} /> Commercial NNN &amp; Residential AI
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Extracts Base Rent, NNN/CAM shares, Pet &amp; Landscaping fees, Annual Escalations, HVAC filter rules, and auto-attaches the lease PDF/Word doc.
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-white/12 bg-black/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-emerald-400">
                    <Building size={18} /> Full Unit Roll &amp; Portfolio Sync
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Automatically registers Buildings (Asset Type, City, RSF), syncs your Unit Roll inventory, and masks sensitive SSNs automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Scanning & OCR Progress */}
          {step === "scanning" && (
            <div className="py-20 text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-sky-400/25 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-sky-500/10 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.35)]">
                  <Loader2 size={40} className="animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  PropOpsIQ Document Intelligence
                </h3>
                <p className="text-base sm:text-lg text-sky-300 font-bold tracking-wide animate-pulse">
                  {scanStatusText}
                </p>
                <p className="text-sm text-gray-400 font-medium">
                  {scanProgressLabel || `Processing: ${sourceFile?.name || "Document"}`}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Staging & Review Table */}
          {(step === "review" || step === "committing") && (
            <div className="space-y-4">
              {/* Worksheet Tab Bar + Smart Spreadsheet Banner (when importing Excel/CSV) */}
              {excelInspection && (
                <div className="p-3.5 rounded-2xl bg-sky-950/25 border border-sky-400/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <FileSpreadsheet size={15} /> {portfolioSummary}
                    </span>

                    {excelInspection.sheetNames.length > 1 && activeExcelFile && (
                      <div className="flex items-center gap-1.5 pl-2 border-l border-white/15">
                        <span className="text-xs text-gray-400">Sheet:</span>
                        {excelInspection.sheetNames.map((sName, sIdx) => (
                          <button
                            key={sName}
                            type="button"
                            onClick={() => handleExcelUpload(activeExcelFile, sIdx, false)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              sIdx === excelInspection.selectedSheetIndex
                                ? "bg-sky-500 text-white"
                                : "bg-white/5 text-gray-300 hover:bg-white/15"
                            }`}
                          >
                            {sName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowColumnMapper((v) => !v)}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      showColumnMapper
                        ? "bg-sky-500/25 border-sky-400/60 text-sky-200"
                        : "bg-white/5 border-white/15 text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    <SlidersHorizontal size={14} />
                    {showColumnMapper ? "Hide Column Mapper" : "Map Spreadsheet Columns"}
                  </button>
                </div>
              )}

              {/* Interactive Column Mapper Panel */}
              {excelInspection && showColumnMapper && (
                <div className="p-4 rounded-2xl bg-[#0B1020] border border-sky-400/35 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-sky-300">
                      Column Mapping — Match your spreadsheet headers to PropOpsIQ fields
                    </p>
                    <span className="text-xs text-gray-400">Changes update staged rows immediately</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {excelInspection.headers.map((h) => {
                      const mappedTo = columnMapping[h] || "";
                      return (
                        <div
                          key={h}
                          className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex flex-col gap-1.5"
                        >
                          <span className="text-xs font-bold text-gray-300 truncate" title={h}>
                            {h}
                          </span>
                          <select
                            value={mappedTo}
                            onChange={(e) =>
                              handleColumnMapChange(h, e.target.value as MappedFieldKey)
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#080C14] border outline-none ${
                              mappedTo
                                ? "border-emerald-500/50 text-emerald-300"
                                : "border-white/15 text-gray-400"
                            }`}
                          >
                            {FIELD_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Review Summary Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B1020] border border-white/20 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-black text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    {stagedRecords.every((r) => r.selected) ? <CheckSquare size={18} /> : <Square size={18} />}
                    Select All ({stagedRecords.length})
                  </button>

                  <div className="h-5 w-px bg-white/20 hidden sm:block" />

                  <div className="text-sm text-gray-200">
                    Importing: <span className="font-black text-white">{selectedRecords.length}</span>
                  </div>

                  <div className="text-sm text-emerald-300 font-bold flex items-center gap-1">
                    <DollarSign size={15} />
                    <span>
                      Base Rent: <strong>${totalBaseRent.toLocaleString()}/mo</strong>
                    </span>
                  </div>

                  {totalAddOnFees > 0 && (
                    <div className="text-sm text-cyan-300 font-bold">
                      +NNN/Fees: <strong>${totalAddOnFees.toLocaleString()}/mo</strong>
                    </div>
                  )}

                  <div className="text-sm text-amber-300 font-bold">
                    Deposits: <strong>${totalDeposit.toLocaleString()}</strong>
                  </div>

                  {attachedDocsCount > 0 && (
                    <span className="text-xs font-bold text-sky-200 bg-sky-500/15 border border-sky-400/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Paperclip size={12} /> {attachedDocsCount} Lease File{attachedDocsCount === 1 ? "" : "s"} Auto-Attached
                    </span>
                  )}

                  {duplicateMatchCount > 0 && (
                    <span className="text-xs font-bold text-indigo-200 bg-indigo-500/20 border border-indigo-400/40 px-2.5 py-1 rounded-full">
                      {duplicateMatchCount} Existing Match{duplicateMatchCount === 1 ? "" : "es"} (Upsert Ready)
                    </span>
                  )}

                  {needsReviewCount > 0 && (
                    <span className="text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-400/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle size={13} /> {needsReviewCount} review
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={addMoreInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.docx,.doc,.rtf,.txt,.xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesBatch(e.target.files, true);
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addMoreInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={14} /> + Add More Files
                  </button>

                  {sourceFile?.url && (
                    <button
                      type="button"
                      onClick={() => setShowSourceDrawer(!showSourceDrawer)}
                      className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        showSourceDrawer
                          ? "bg-sky-500/25 border-sky-400/50 text-sky-200"
                          : "bg-white/[0.06] border-white/15 text-gray-200 hover:text-white"
                      }`}
                    >
                      {showSourceDrawer ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showSourceDrawer ? "Hide Scan" : "View Scan"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={addEmptyRow}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Add Row
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("upload");
                      setStagedRecords([]);
                      setSourceFile(null);
                      setExcelInspection(null);
                      setActiveExcelFile(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-gray-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} /> Start Over
                  </button>
                </div>
              </div>

              {/* Source Document Cross-Reference Preview Drawer */}
              {showSourceDrawer && sourceFile?.url && (
                <div className="p-5 rounded-2xl border border-sky-400/35 bg-black/70 space-y-3">
                  <div className="flex items-center justify-between text-sm text-sky-300 font-bold">
                    <span className="flex items-center gap-2">
                      <FileText size={18} /> Source Document Cross-Reference: {sourceFile.name}
                    </span>
                    <span className="text-gray-300 text-xs">Compare detected data against original document</span>
                  </div>
                  <div className="max-h-96 overflow-auto rounded-xl border border-white/15 bg-black/90 flex items-center justify-center p-3">
                    {sourceFile.type === "application/pdf" || /\.pdf$/i.test(sourceFile.name) ? (
                      <iframe
                        src={sourceFile.url}
                        title="Source PDF Preview"
                        className="w-full h-80 rounded-lg bg-white"
                      />
                    ) : sourceFile.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(sourceFile.name) ? (
                      <img
                        src={sourceFile.url}
                        alt="Source Scan"
                        className="max-h-72 object-contain rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="py-6 px-4 text-center text-sm text-slate-300">
                        Parsed directly from document file: <strong className="text-white">{sourceFile.name}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Staging Data Grid */}
              <div className="rounded-2xl border border-white/15 bg-black/50 overflow-hidden shadow-inner">
                <div className="overflow-x-auto max-h-[52vh]">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[#0B1020] text-gray-300 uppercase text-[11px] font-black tracking-wider sticky top-0 z-10 border-b border-white/15">
                      <tr>
                        <th className="py-3 px-2.5 w-9 text-center">Sel</th>
                        <th className="py-3 px-2.5 min-w-[130px]">Status / Match</th>
                        <th className="py-3 px-2.5 min-w-[185px]">Tenant / Company *</th>
                        <th className="py-3 px-2.5 min-w-[175px]">Property / Building</th>
                        <th className="py-3 px-2.5 min-w-[105px]">Unit / Suite</th>
                        <th className="py-3 px-2.5 min-w-[125px]">Base Rent *</th>
                        <th className="py-3 px-2.5 min-w-[120px]">+NNN / Fees</th>
                        <th className="py-3 px-2.5 min-w-[110px]">Deposit ($)</th>
                        <th className="py-3 px-2.5 min-w-[125px]">Lease Start</th>
                        <th className="py-3 px-2.5 min-w-[125px]">Lease End</th>
                        <th className="py-3 px-2.5 min-w-[185px]">Notes &amp; Badges</th>
                        <th className="py-3 px-2.5 w-24 text-center">Terms</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.08]">
                      {stagedRecords.map((r) => {
                        const isSkipped = r.duplicateAction === "skip";
                        const isInvalid = !isSkipped && (!r.name.trim() || r.monthlyRent <= 0);
                        const isExpanded = expandedRowId === r.id;
                        const combinedAddOn = (Number(r.nnnFee) || 0) + (Number(r.utilitiesFee) || 0);

                        return (
                          <React.Fragment key={r.id}>
                            <tr
                              className={`hover:bg-white/[0.03] transition-colors ${
                                !r.selected || isSkipped
                                  ? "opacity-45 bg-black/30"
                                  : isInvalid
                                    ? "bg-red-500/5"
                                    : ""
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-2.5 px-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={r.selected}
                                  onChange={(e) => updateRow(r.id, "selected", e.target.checked)}
                                  className="w-4 h-4 rounded border-white/30 text-sky-500 focus:ring-0 cursor-pointer"
                                />
                              </td>

                              {/* Status / Duplicate Match / Expired Holdover */}
                              <td className="py-2.5 px-2.5 space-y-1">
                                {isInvalid ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    <AlertCircle size={11} /> Missing Info
                                  </span>
                                ) : r.isExpiredHoldover ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 bg-amber-500/20 border border-amber-400/45 px-2 py-0.5 rounded-full whitespace-nowrap"
                                    title="Lease end date is in the past — expand Terms to choose Expired vs Active Holdover"
                                  >
                                    <AlertTriangle size={11} /> Expired / Holdover
                                  </span>
                                ) : r.needsReview ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    <AlertTriangle size={11} /> Review
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    <CheckCircle2 size={11} /> Verified
                                  </span>
                                )}

                                {r.matchedExistingTenantId && (
                                  <div>
                                    <select
                                      value={r.duplicateAction || "update"}
                                      onChange={(e) =>
                                        updateRow(
                                          r.id,
                                          "duplicateAction",
                                          e.target.value as "update" | "create" | "skip"
                                        )
                                      }
                                      title={`Matches existing tenant: ${r.matchedExistingTenantName}`}
                                      className="mt-0.5 w-full px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-950/70 border border-indigo-400/45 text-indigo-200 outline-none cursor-pointer"
                                    >
                                      <option value="update">↻ Update Existing</option>
                                      <option value="create">+ Create Duplicate</option>
                                      <option value="skip">⊘ Skip Row</option>
                                    </select>
                                  </div>
                                )}
                              </td>

                              {/* Tenant Name + Co-tenant hint */}
                              <td className="py-2.5 px-2.5">
                                <input
                                  type="text"
                                  value={r.name}
                                  onChange={(e) => updateRow(r.id, "name", e.target.value)}
                                  placeholder="Tenant or business..."
                                  className={`w-full px-2.5 py-1.5 rounded-xl text-sm font-semibold bg-black/50 border text-white outline-none focus:border-sky-400 ${
                                    !r.name.trim() && !isSkipped ? "border-red-500/60 bg-red-500/10" : "border-white/15"
                                  }`}
                                />
                                {r.contactName && (
                                  <div className="text-[11px] text-gray-400 mt-0.5 truncate px-1" title={r.contactName}>
                                    {r.contactName}
                                  </div>
                                )}
                              </td>

                              {/* Property / Building */}
                              <td className="py-2.5 px-2.5">
                                <input
                                  type="text"
                                  list={`buildings-${r.id}`}
                                  value={r.building}
                                  onChange={(e) => updateRow(r.id, "building", e.target.value)}
                                  placeholder="Property name..."
                                  className="w-full px-2.5 py-1.5 rounded-xl text-sm font-medium bg-black/50 border border-white/15 text-white outline-none focus:border-sky-400"
                                />
                                <datalist id={`buildings-${r.id}`}>
                                  {buildingSuggestions.map((b) => (
                                    <option key={b} value={b} />
                                  ))}
                                </datalist>
                                {(r.propertyType && r.propertyType !== "Mixed-Use") || r.propertyCity ? (
                                  <div className="text-[10px] text-sky-300/80 mt-0.5 px-1 truncate">
                                    {[r.propertyType, r.propertyCity].filter(Boolean).join(" · ")}
                                  </div>
                                ) : null}
                              </td>

                              {/* Unit / Suite */}
                              <td className="py-2.5 px-2.5">
                                <input
                                  type="text"
                                  value={r.unit}
                                  onChange={(e) => updateRow(r.id, "unit", e.target.value)}
                                  placeholder="Unit 1..."
                                  className="w-full px-2.5 py-1.5 rounded-xl text-sm bg-black/50 border border-white/15 text-white outline-none focus:border-sky-400"
                                />
                                {(r.unitSqft || 0) > 0 && (
                                  <div className="text-[10px] text-gray-400 mt-0.5 px-1">
                                    {Number(r.unitSqft).toLocaleString()} RSF
                                  </div>
                                )}
                              </td>

                              {/* Base Monthly Rent */}
                              <td className="py-2.5 px-2.5">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={r.monthlyRent || ""}
                                    onChange={(e) => updateRow(r.id, "monthlyRent", Number(e.target.value))}
                                    placeholder="0"
                                    className={`w-full pl-6 pr-2 py-1.5 rounded-xl text-sm bg-black/50 border text-emerald-300 font-black outline-none focus:border-sky-400 ${
                                      r.monthlyRent <= 0 && !isSkipped ? "border-red-500/60 bg-red-500/10" : "border-white/15"
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* Add-On Monthly Fees (NNN / Pet / Lawn) */}
                              <td className="py-2.5 px-2.5">
                                <div
                                  onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-black/50 border border-white/15 text-cyan-300 cursor-pointer hover:border-cyan-400/50 flex items-center justify-between"
                                  title="Click to edit NNN, CAM, Pet Rent, or Landscaping fees"
                                >
                                  <span>{combinedAddOn > 0 ? `+$${combinedAddOn.toLocaleString()}` : "$0"}</span>
                                  <ChevronDown size={12} className="text-gray-400" />
                                </div>
                                {(r.nnnFee || 0) > 0 && (
                                  <div className="text-[10px] text-cyan-300/80 mt-0.5 px-1">NNN ${r.nnnFee}/mo</div>
                                )}
                                {(r.utilitiesFee || 0) > 0 && (
                                  <div className="text-[10px] text-purple-300/90 mt-0.5 px-1 truncate">
                                    {r.utilitiesFeeLabel || "Add-on"} ${r.utilitiesFee}/mo
                                  </div>
                                )}
                              </td>

                              {/* Security Deposit */}
                              <td className="py-2.5 px-2.5">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={r.securityDeposit || ""}
                                    onChange={(e) => updateRow(r.id, "securityDeposit", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full pl-6 pr-2 py-1.5 rounded-xl text-sm bg-black/50 border border-white/15 text-amber-300 font-bold outline-none focus:border-sky-400"
                                  />
                                </div>
                                {r.secDepReceived && (
                                  <div className="text-[10px] text-emerald-400 mt-0.5 px-1">✓ In Escrow / Paid</div>
                                )}
                              </td>

                              {/* Lease Start */}
                              <td className="py-2.5 px-2.5">
                                <input
                                  type="date"
                                  value={r.leaseStart}
                                  onChange={(e) => updateRow(r.id, "leaseStart", e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-xl text-xs bg-black/50 border border-white/15 text-gray-200 outline-none focus:border-sky-400"
                                />
                              </td>

                              {/* Lease End */}
                              <td className="py-2.5 px-2.5">
                                <input
                                  type="date"
                                  value={r.leaseEnd}
                                  onChange={(e) => updateRow(r.id, "leaseEnd", e.target.value)}
                                  className={`w-full px-2 py-1.5 rounded-xl text-xs bg-black/50 border outline-none focus:border-sky-400 ${
                                    r.isExpiredHoldover
                                      ? "border-amber-400/60 text-amber-200"
                                      : "border-white/15 text-gray-200"
                                  }`}
                                />
                              </td>

                              {/* Notes & Rich Feature Badges */}
                              <td className="py-2.5 px-2.5">
                                <input
                                  type="text"
                                  value={r.notes}
                                  onChange={(e) => updateRow(r.id, "notes", e.target.value)}
                                  placeholder="Terms, options..."
                                  className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-black/50 border border-white/15 text-gray-200 outline-none focus:border-sky-400"
                                />
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(r.escalationPct || 0) > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                                      +{r.escalationPct}%/yr
                                    </span>
                                  )}
                                  {(r.hvacFilterIntervalDays || 0) > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30 flex items-center gap-0.5">
                                      <Flame size={10} /> HVAC {r.hvacFilterIntervalDays}d
                                    </span>
                                  )}
                                  {r.sourceDocUrl && (
                                    <span
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-400/30 flex items-center gap-0.5"
                                      title={`Attached: ${r.sourceDocName || "Lease"}`}
                                    >
                                      <Paperclip size={10} /> Lease Attached
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Expand Terms + Delete */}
                              <td className="py-2.5 px-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                      isExpanded
                                        ? "bg-sky-500/25 border-sky-400/50 text-sky-200"
                                        : "bg-white/5 border-white/15 text-gray-300 hover:text-white"
                                    }`}
                                    title="Edit commercial NNN, pet fees, escalations, email/phone & unit RSF"
                                  >
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteRow(r.id)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Remove Row"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expandable Detailed Lease & Property Drawer Row */}
                            {isExpanded && (
                              <tr className="bg-[#0B1222]/90 border-b border-sky-400/25">
                                <td colSpan={12} className="p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                                    <div>
                                      <label className="block text-gray-400 font-bold mb-1">Co-Tenant / Contact</label>
                                      <input
                                        type="text"
                                        value={r.contactName}
                                        onChange={(e) => updateRow(r.id, "contactName", e.target.value)}
                                        placeholder="Co-tenant or guarantor..."
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-gray-400 font-bold mb-1">Email</label>
                                      <input
                                        type="email"
                                        value={r.email}
                                        onChange={(e) => updateRow(r.id, "email", e.target.value)}
                                        placeholder="tenant@email.com"
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-gray-400 font-bold mb-1">Phone</label>
                                      <input
                                        type="text"
                                        value={r.phone}
                                        onChange={(e) => updateRow(r.id, "phone", e.target.value)}
                                        placeholder="(555) 000-0000"
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-gray-400 font-bold mb-1">Asset Type</label>
                                      <select
                                        value={r.propertyType || "Mixed-Use"}
                                        onChange={(e) =>
                                          updateRow(r.id, "propertyType", e.target.value as PropertyAssetType)
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white"
                                      >
                                        <option value="Commercial">Commercial</option>
                                        <option value="Multi-Family">Multi-Family</option>
                                        <option value="Single-Family">Single-Family (SFR)</option>
                                        <option value="Mixed-Use">Mixed-Use</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-gray-400 font-bold mb-1">City</label>
                                      <input
                                        type="text"
                                        value={r.propertyCity || ""}
                                        onChange={(e) => updateRow(r.id, "propertyCity", e.target.value)}
                                        placeholder="City..."
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-gray-400 font-bold mb-1">Unit SqFt / RSF</label>
                                      <input
                                        type="number"
                                        value={r.unitSqft || ""}
                                        onChange={(e) => updateRow(r.id, "unitSqft", Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-cyan-300 font-bold mb-1">NNN / CAM ($/mo)</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={r.nnnFee || ""}
                                        onChange={(e) => updateRow(r.id, "nnnFee", Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-200 font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-purple-300 font-bold mb-1">
                                        Pet / Lawn / Other ($/mo)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={r.utilitiesFee || ""}
                                        onChange={(e) => updateRow(r.id, "utilitiesFee", Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-purple-500/30 text-purple-200 font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-emerald-300 font-bold mb-1">
                                        Annual Escalation (%)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={r.escalationPct || ""}
                                        onChange={(e) => updateRow(r.id, "escalationPct", Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-emerald-500/30 text-emerald-200 font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-gray-400 font-bold mb-1">Lease Status</label>
                                      <select
                                        value={r.status || "active"}
                                        onChange={(e) =>
                                          updateRow(
                                            r.id,
                                            "status",
                                            e.target.value as "active" | "pending" | "expired"
                                          )
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white"
                                      >
                                        <option value="active">Active (or MTM Holdover)</option>
                                        <option value="expired">Expired</option>
                                        <option value="pending">Pending Move-In</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-amber-300 font-bold mb-1">
                                        HVAC Filter Interval (Days)
                                      </label>
                                      <input
                                        type="number"
                                        value={r.hvacFilterIntervalDays || ""}
                                        onChange={(e) =>
                                          updateRow(r.id, "hvacFilterIntervalDays", Number(e.target.value))
                                        }
                                        placeholder="e.g. 60"
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-amber-500/30 text-amber-200"
                                      />
                                    </div>
                                    <div className="flex flex-col justify-end pb-1">
                                      <label className="inline-flex items-center gap-2 cursor-pointer text-gray-200 font-semibold">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(r.secDepReceived)}
                                          onChange={(e) => updateRow(r.id, "secDepReceived", e.target.checked)}
                                          className="w-4 h-4 rounded border-white/30 text-emerald-500"
                                        />
                                        <span>Deposit Paid / In Escrow</span>
                                      </label>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmation Screen */}
          {step === "success" && (
            <div className="py-8 px-4 sm:px-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="relative text-center space-y-4">
                <div className="inline-flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                    <div className="w-full h-full rounded-[22px] bg-[#080C14] flex items-center justify-center text-emerald-400">
                      <CheckCircle2 size={44} className="stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-black tracking-wider uppercase">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Portfolio Synced &amp; Finalized</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    YES! YOUR DATA WAS SAVED &amp; FINALIZED
                  </h3>
                  <p className="text-sm sm:text-base text-gray-200 max-w-2xl mx-auto leading-relaxed">
                    Buildings, Unit Roll inventory, tenant leases, NNN/add-on fees, and attached lease documents are live across your workspace.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div className="p-6 rounded-3xl bg-gradient-to-b from-sky-950/30 to-[#0A1020] border border-sky-400/35 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
                        <Building size={24} />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">
                        Buildings + Unit Roll
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-white">
                        {savedBuildings.length} Building{savedBuildings.length === 1 ? "" : "s"}
                      </div>
                      <div className="text-sm text-gray-300 mt-1 font-medium">
                        {savedUnitsSynced > 0
                          ? `${savedUnitsSynced} Unit Roll space(s) synced`
                          : "Properties & Units Registered"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-white/10 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {savedBuildings.map((b) => (
                      <span
                        key={b}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200 truncate max-w-full"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-950/30 to-[#0A1020] border border-indigo-400/35 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                        <CheckSquare size={24} />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
                        Leases &amp; Docs
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-white">
                        {savedTenantsCount + savedUpdatedCount} Lease{savedTenantsCount + savedUpdatedCount === 1 ? "" : "s"}
                      </div>
                      <div className="text-sm text-gray-300 mt-1 font-medium">
                        {savedUpdatedCount > 0
                          ? `${savedTenantsCount} new · ${savedUpdatedCount} updated`
                          : "Committed to Rent Roll"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-white/10 text-xs text-gray-300 space-y-1">
                    {savedDocsAttached > 0 && (
                      <div className="text-sky-300 font-bold">
                        📎 {savedDocsAttached} source lease file(s) attached to tenant cards
                      </div>
                    )}
                    {savedHvacCount > 0 && (
                      <div className="text-amber-300 font-bold">
                        🔧 {savedHvacCount} HVAC filter schedule(s) auto-created
                      </div>
                    )}
                    {savedDocsAttached === 0 && savedHvacCount === 0 && (
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Active &amp; Verified
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-950/30 to-[#0A1020] border border-emerald-400/35 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                        <DollarSign size={24} />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                        Total Monthly Billing
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-emerald-400">
                        ${savedRentSum.toLocaleString()}
                        <span className="text-sm font-medium text-gray-400">/mo</span>
                      </div>
                      <div className="text-sm text-gray-300 mt-1 font-medium">
                        Base Rent + NNN &amp; Recurring Fees
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-sm text-gray-300">
                    <span>Projected Annual:</span>
                    <span className="font-bold text-white text-base">
                      ${(savedRentSum * 12).toLocaleString()}/yr
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    onViewTenants?.();
                    onClose();
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-[0_0_24px_rgba(59,130,246,0.4)] flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Users size={18} />
                  <span>View in Tenants Directory</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onViewBuildings?.();
                    onClose();
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-black text-sm sm:text-base shadow-[0_0_24px_rgba(6,182,212,0.4)] flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Building size={18} />
                  <span>View in Building Portfolio</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("upload");
                    setStagedRecords([]);
                    setSourceFile(null);
                    setExcelInspection(null);
                    setActiveExcelFile(null);
                    setErrorMsg("");
                  }}
                  className="px-5 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-gray-200 hover:text-white font-bold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={16} />
                  <span>Import More Files</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-2xl border border-white/15 text-gray-300 hover:text-white hover:bg-white/5 font-semibold text-sm sm:text-base transition-all cursor-pointer"
                >
                  Close &amp; Finish
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {(step === "review" || step === "committing") && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-t border-white/15 bg-[#0B1020]/95 gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
              <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
              <span>
                Click any row&apos;s <strong>▾</strong> button to edit NNN/pet fees, escalations, HVAC filter schedule, or lease status before committing.
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={step === "committing"}
                className="px-5 py-3 rounded-2xl border border-white/15 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCommit}
                disabled={step === "committing" || selectedRecords.length === 0 || invalidSelected > 0}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm sm:text-base font-black shadow-[0_0_24px_rgba(59,130,246,0.4)] transition-all flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {step === "committing" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Committing Portfolio...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Approve &amp; Save {selectedRecords.length} Lease{selectedRecords.length === 1 ? "" : "s"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
