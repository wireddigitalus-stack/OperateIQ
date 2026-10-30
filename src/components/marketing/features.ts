import {
  Building2, Users, Wallet, Wrench, Sparkles, ClipboardCheck, Wind, HardHat,
  BarChart3, Bot, Globe, Smartphone,
} from "lucide-react";

// Shared feature catalogue for the homepage grid and /features page.
export const FEATURES = [
  { icon: Wallet, title: "Rent ledger", body: "Monthly rent roll, partial payments, late fees and NNN/CAM charges — submitted and locked month by month." },
  { icon: Users, title: "Tenants & leases", body: "Lease dates, escalations, renewal alerts, documents and security deposits in one record." },
  { icon: Wrench, title: "Maintenance", body: "Prioritized tickets with photos, SLA timers, costs, billable materials and vendor assignment." },
  { icon: Smartphone, title: "Staff mobile app", body: "PIN-login portals for maintenance and cleaning crews — take photos, log time, close jobs from the field." },
  { icon: Sparkles, title: "Cleaning schedules", body: "Assign crews by property and area, track completion with photos and compare estimated vs. actual cost." },
  { icon: ClipboardCheck, title: "Inspections", body: "Monthly building inspections and a compliance view so nothing slips — fire, sprinkler, elevator and more." },
  { icon: Wind, title: "Filter tracking", body: "Know when every HVAC filter was last changed and what's coming due." },
  { icon: HardHat, title: "Vendor directory", body: "Rated subcontractors by trade, ready to assign to any ticket." },
  { icon: Building2, title: "Portfolio & expenses", body: "Per-property taxes, insurance and utilities with occupancy and NOI rolled up across the portfolio." },
  { icon: BarChart3, title: "AI reports", body: "Weekly ops summaries and quarterly business reviews written for you from live data." },
  { icon: Bot, title: "OpsIQ AI assistant", body: "Ask questions about your portfolio in plain English and get answers grounded in your data." },
  { icon: Globe, title: "Website builder", body: "Publish a listings site with your brand, pages, blog and SEO tools — on your own domain." },
];
