// Tier definitions + feature-gate matrix. Used by the pricing page now and by
// server/admin gating in Phase 3 (hasFeature). Change prices here only.
export type Tier = "starter" | "growth" | "pro";

export type Feature =
  | "properties" | "tenants" | "rent_ledger" | "security_deposits"
  | "maintenance" | "staff_mobile"
  | "cleaning" | "filter_changes" | "inspections"
  | "subcontractors" | "tasks" | "call_logs" | "reports"
  | "opsiq_basic" | "opsiq_full"
  | "weekly_report" | "portfolio_snapshots"
  | "sales_crm" | "marketing_studio" | "market_intel"
  | "site_card" | "site_basic" | "site_builder" | "blog" | "custom_domain";

export interface Plan {
  id: Tier;
  name: string;
  monthly: number;
  annual: number; // per year (2 months free)
  blurb: string;
  limits: { properties: number | null; users: number | null };
  highlight?: boolean;
  features: Feature[];
}

const STARTER: Feature[] = [
  "properties", "tenants", "rent_ledger", "security_deposits",
  "maintenance", "staff_mobile", "opsiq_basic", "site_card",
];
const GROWTH: Feature[] = [
  ...STARTER,
  "cleaning", "filter_changes", "inspections", "subcontractors",
  "tasks", "call_logs", "reports", "opsiq_full", "site_basic",
];
const PRO: Feature[] = [
  ...GROWTH,
  "weekly_report", "portfolio_snapshots", "sales_crm", "marketing_studio",
  "market_intel", "site_builder", "blog", "custom_domain",
];

export const PLANS: Plan[] = [
  {
    id: "starter", name: "Starter", monthly: 49, annual: 490,
    blurb: "For independent owners getting organized.",
    limits: { properties: 5, users: 3 }, features: STARTER,
  },
  {
    id: "growth", name: "Growth", monthly: 129, annual: 1290,
    blurb: "For growing portfolios with staff and vendors.",
    limits: { properties: 25, users: 10 }, features: GROWTH, highlight: true,
  },
  {
    id: "pro", name: "Pro", monthly: 299, annual: 2990,
    blurb: "For management companies that want it all — plus a website.",
    limits: { properties: null, users: null }, features: PRO,
  },
];

export const TRIAL_DAYS = 14;

export const FEATURE_LABELS: Record<Feature, string> = {
  properties: "Property portfolio",
  tenants: "Tenant records & lease tracking",
  rent_ledger: "Rent ledger & late fees",
  security_deposits: "Security deposit ledger",
  maintenance: "Maintenance tickets",
  staff_mobile: "Staff mobile app (PIN login)",
  cleaning: "Cleaning schedules & crew app",
  filter_changes: "HVAC filter tracking",
  inspections: "Building inspections & compliance",
  subcontractors: "Vendor / subcontractor directory",
  tasks: "Team tasks",
  call_logs: "Call logs",
  reports: "Financial & ops reports",
  opsiq_basic: "OpsIQ AI assistant (basic)",
  opsiq_full: "OpsIQ AI assistant (full)",
  weekly_report: "Weekly & quarterly AI reports",
  portfolio_snapshots: "Portfolio history & trends",
  sales_crm: "Leads & sales CRM",
  marketing_studio: "Social & marketing studio",
  market_intel: "Market intelligence",
  site_card: "Digital business card website",
  site_basic: "Basic listings website",
  site_builder: "Full website builder",
  blog: "Blog with AI writer & SEO tools",
  custom_domain: "Custom domain",
};

export function hasFeature(tier: Tier, feature: Feature): boolean {
  return PLANS.find((p) => p.id === tier)?.features.includes(feature) ?? false;
}
