"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  HelpCircle,
  BookOpen,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  Printer,
  PlusCircle,
  Sparkles,
  PhoneCall,
  UserCheck,
  Filter,
  Archive,
  Send,
  Snowflake,
  Edit3,
  StickyNote,
  Bell,
  Users,
  CalendarClock,
  DollarSign,
  ShieldCheck,
  Building2,
  Layers,
  Car,
  Wind,
  ClipboardCheck,
  TrendingUp,
  FileSpreadsheet,
  Wrench,
  HardHat,
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  SprayCan,
  Calendar,
  BarChart3,
  PieChart,
  Brain,
  FileText,
  Newspaper,
  Image as ImageIcon,
  LayoutTemplate,
  Share2,
  Compass,
  FileBadge,
  Globe,
  MapPin,
  Settings,
  CreditCard,
  KeyRound,
  Palette,
  MessageSquare,
  ListChecks,
  RotateCcw,
  Trash2,
  ExternalLink,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabKey =
  | "leads"
  | "tenants"
  | "propdetails"
  | "analytics"
  | "maintenance"
  | "cleaning"
  | "marketing"
  | "marketing-press"
  | "marketing-blog"
  | "marketing-photos"
  | "marketing-banner"
  | "marketing-properties"
  | "marketing-social"
  | "marketing-intel"
  | "marketing-one-sheet"
  | "archived"
  | "content"
  | "content-homepage"
  | "content-markets"
  | "content-pages"
  | "content-properties"
  | "settings"
  | "teamboard"
  | "global";

type Tip = {
  title: string;
  body: string;
  highlights?: string[];
  icon: LucideIcon;
  accent?: "blue" | "emerald" | "amber" | "purple" | "cyan" | "rose";
};

const ACCENT_STYLES: Record<
  NonNullable<Tip["accent"]>,
  { badgeBg: string; badgeBorder: string; iconText: string; pillBg: string; pillText: string }
> = {
  blue: {
    badgeBg: "bg-sky-500/15",
    badgeBorder: "border-sky-400/30",
    iconText: "text-sky-400",
    pillBg: "bg-sky-500/10 border-sky-400/25",
    pillText: "text-sky-300",
  },
  emerald: {
    badgeBg: "bg-emerald-500/15",
    badgeBorder: "border-emerald-400/30",
    iconText: "text-emerald-400",
    pillBg: "bg-emerald-500/10 border-emerald-400/25",
    pillText: "text-emerald-300",
  },
  amber: {
    badgeBg: "bg-amber-500/15",
    badgeBorder: "border-amber-400/30",
    iconText: "text-amber-400",
    pillBg: "bg-amber-500/10 border-amber-400/25",
    pillText: "text-amber-300",
  },
  purple: {
    badgeBg: "bg-purple-500/15",
    badgeBorder: "border-purple-400/30",
    iconText: "text-purple-400",
    pillBg: "bg-purple-500/10 border-purple-400/25",
    pillText: "text-purple-300",
  },
  cyan: {
    badgeBg: "bg-cyan-500/15",
    badgeBorder: "border-cyan-400/30",
    iconText: "text-cyan-400",
    pillBg: "bg-cyan-500/10 border-cyan-400/25",
    pillText: "text-cyan-300",
  },
  rose: {
    badgeBg: "bg-rose-500/15",
    badgeBorder: "border-rose-400/30",
    iconText: "text-rose-400",
    pillBg: "bg-rose-500/10 border-rose-400/25",
    pillText: "text-rose-300",
  },
};

// ─── Guide Content ────────────────────────────────────────────────────────────

const TIPS: Record<TabKey, Tip[]> = {
  global: [
    {
      icon: Sparkles,
      accent: "cyan",
      title: "AI Document, Excel & Photo Intake",
      body: "Use the 'Import Docs / Excel' button in the top navigation bar from anywhere in the dashboard. Upload a rent roll spreadsheet (.xlsx / .csv), a lease PDF, or even a photo of a handwritten property sheet — Gemini AI extracts your buildings, units, and tenant records and imports them in one click.",
      highlights: [
        "Supports Excel (.xlsx, .xls, .csv), PDFs, Word docs, and photos",
        "Preview and edit every extracted building or tenant before saving",
        "Automatically links tenants to their matching building",
      ],
    },
    {
      icon: Brain,
      accent: "purple",
      title: "Ask OpsIQ Portfolio Assistant",
      body: "Click 'Ask OpsIQ' in the top bar anytime to ask natural-language questions about your portfolio — such as expiring leases, overdue rent, open maintenance tickets, or top-scoring leads.",
      highlights: [
        "Reads live data across your organization's buildings, tenants, and tickets",
        "Available to both Admin users and mobile Crew Portal staff",
      ],
    },
  ],

  teamboard: [
    {
      icon: MessageSquare,
      accent: "blue",
      title: "Team Comm Board & @Mentions",
      body: "Use the Comm Board sub-tab to post operational updates, log building notes, and coordinate with your team in real time. Type @Name to notify a specific team member with an instant audio chime and banner alert.",
      highlights: [
        "Messages refresh automatically across all signed-in team members",
        "Use @mentions to alert specific managers or staff immediately",
      ],
    },
    {
      icon: ListChecks,
      accent: "emerald",
      title: "Shared & Private Task Board",
      body: "Switch to the Task List sub-tab to manage operational to-dos. Assign tasks to specific team members, set priority levels and due dates, or toggle a task to 'Private' so only you can see it.",
      highlights: [
        "Filter tasks by assignee, status, or priority",
        "Private tasks are strictly visible only to their creator",
      ],
    },
  ],

  leads: [
    {
      icon: Flame,
      accent: "amber",
      title: "AI Lead Scoring & Temperature",
      body: "Every incoming lead receives an AI qualification score from 0 to 100 based on budget, timeline, space requirements, and fit. Hot Leads score 75+, Warm Leads score 50–74, and Nurture leads score below 50.",
      highlights: [
        "75–100 (Hot Lead): Immediate follow-up recommended",
        "50–74 (Warm Lead): Good fit, schedule a tour or discovery call",
        "Below 50 (Nurture): Longer timeline or smaller budget",
      ],
    },
    {
      icon: PlusCircle,
      accent: "blue",
      title: "Adding a Walk-In or Phone Lead",
      body: "Click '+ Add Lead' to log a prospect who called or walked in. Choose 'AI Score It' to have Gemini evaluate the lead and draft a personalized follow-up email, or choose 'Set Manually' to assign your own score with the slider.",
      highlights: [
        "Drafts auto-save locally while you type so you never lose a phone intake",
        "Automatically stamps your name as the team member who entered the lead",
      ],
    },
    {
      icon: Sparkles,
      accent: "purple",
      title: "AI Priority Call List",
      body: "The Priority Call List card at the top of the Leads tab ranks your top prospects to call today. Click 'Refresh Brief' to have Ask OpsIQ generate a 2-sentence executive summary of who to call first and why.",
      highlights: [
        "Click any prospect's name in the priority list to jump straight to their lead card",
        "Shows your personal overdue follow-up checklist right below the AI brief",
      ],
    },
    {
      icon: PhoneCall,
      accent: "emerald",
      title: "Logging Calls & Follow-Up Dates",
      body: "Click 'Log Call' on any lead card to record the call outcome (Connected, Voicemail, No Answer) and notes. Every logged call builds a permanent activity timeline on that lead card.",
      highlights: [
        "Set a Follow-Up Date on any lead to add it to your daily follow-up reminders",
        "Overdue follow-ups highlight automatically in red until completed",
      ],
    },
    {
      icon: Send,
      accent: "cyan",
      title: "Sending AI Follow-Up Emails",
      body: "Expand any lead card to review the AI-drafted response email. You can edit the subject or message body directly, then click 'Send Email' to deliver it to the prospect and log the outreach.",
    },
    {
      icon: Snowflake,
      accent: "blue",
      title: "Cold Pipeline CRM",
      body: "Click 'Cold Pipeline' in the Leads toolbar to track outbound prospects and businesses you are actively recruiting before they become inbound leads. When a prospect warms up, promote them with one click.",
    },
    {
      icon: Printer,
      accent: "emerald",
      title: "Printing the Call Sheet",
      body: "Use the 'Print Call Sheet' button near the top right of the Leads tab to open a clean, print-ready table of your active leads — ideal for walking properties or weekly leasing meetings.",
    },
    {
      icon: UserCheck,
      accent: "purple",
      title: "Assigning Leads & Filtering",
      body: "Use the 'Assign To' dropdown inside any lead card to assign ownership to a team member. Filter your pipeline anytime using the pill buttons (Verified Lead, MQL, Prospect, Whale $2.5k+/mo, or New Today).",
    },
    {
      icon: Archive,
      accent: "rose",
      title: "Archiving vs. Deleting Leads",
      body: "Click 'Archive' on a lead card to move inactive prospects out of your main pipeline while keeping their history in the Archive tab. Use 'Delete' only when you want to permanently remove spam or test entries.",
    },
  ],

  tenants: [
    {
      icon: Users,
      accent: "blue",
      title: "Managing Your Tenant Directory",
      body: "Click '+ Add Tenant' to create a tenant record with lease dates, monthly rent, security deposit, square footage, and contact info — or use 'Import Docs / Excel' in the top bar to bulk-import an entire rent roll.",
      highlights: [
        "Filter tenants by building or search by business name, contact, or unit",
        "Click any tenant row to expand full lease details, documents, and payment history",
      ],
    },
    {
      icon: CalendarClock,
      accent: "amber",
      title: "Automated Lease Expiry Alerts",
      body: "OperateIQ automatically monitors every tenant's lease end date and renewal date. Color-coded badges warn you at 90 days (Watch), 60 days (Soon), 30 days (Urgent), and Expired so you never miss a renewal window.",
      highlights: [
        "Customize the alert threshold per tenant (e.g., 90, 120, or 180 days)",
        "Expiring leases also surface in the top-of-dashboard Lease Renewal Alert banner",
      ],
    },
    {
      icon: DollarSign,
      accent: "emerald",
      title: "Monthly Rent Ledger",
      body: "Click 'Rent Ledger' at the top of the Tenants tab to open the full 12-month payment matrix. Click any month cell for a tenant to mark rent Paid, Partial, Late, or Unpaid, and record check numbers or payment notes.",
      highlights: [
        "Tracks total collected vs. expected rent for every month of the year",
        "Export or print the rent ledger for accounting and ownership reporting",
      ],
    },
    {
      icon: ShieldCheck,
      accent: "cyan",
      title: "Security Deposit & Document Vault",
      body: "Open the 'Security Deposits' ledger to track deposit amounts held, bank/escrow locations, and refund status. Inside each tenant card, you can also upload signed lease PDFs and addenda to their secure document vault.",
    },
  ],

  propdetails: [
    {
      icon: Building2,
      accent: "blue",
      title: "Adding & Managing Properties",
      body: "Click '+ Add Property' to add a building to your portfolio, or use 'Import Docs / Excel' in the top bar to let AI import buildings and units from a spreadsheet or document. Select any building pill at the top to view its full operational profile.",
      highlights: [
        "New workspaces start 100% clean — or you can load editable sample properties in 1 click",
        "Delete or archive any property directly from its property detail header",
      ],
    },
    {
      icon: Layers,
      accent: "emerald",
      title: "Units, Suites & Rent Roll Sync",
      body: "Inside each property's 'Units / Spaces' sub-tab, add individual suites with square footage, asking rent, and occupancy status. Occupied units link directly to your Tenants directory so occupancy and revenue stay in sync.",
      highlights: [
        "Track Available, Occupied, and Offline/Renovation units per building",
        "Portfolio occupancy rate and revenue KPIs update automatically",
      ],
    },
    {
      icon: TrendingUp,
      accent: "purple",
      title: "Financials, Valuations & Taxes",
      body: "Record purchase price, estimated market value, mortgage debt, annual property taxes, and insurance costs on each building. OperateIQ calculates your portfolio equity, cap rate, and net operating metrics automatically.",
    },
    {
      icon: Car,
      accent: "amber",
      title: "Parking Lots & Standalone Assets",
      body: "Switch to the 'Parking Lots' view to track surface lots or auxiliary parcels, including associated buildings, lease renewal dates, and annual city/county tax obligations.",
    },
    {
      icon: Wind,
      accent: "cyan",
      title: "HVAC Filter Change Tracker",
      body: "Open the 'Filter Changes' view to track HVAC filter sizes, quantities, last replacement dates, and next due dates across every building. Your maintenance crew can also log filter changes straight from their mobile portal.",
    },
    {
      icon: ClipboardCheck,
      accent: "emerald",
      title: "Building Inspections & Compliance",
      body: "Use the 'Inspections' view to log fire extinguisher, sprinkler, elevator, backflow, and roof inspections with pass/fail status, inspector names, and next due dates.",
    },
  ],

  maintenance: [
    {
      icon: Wrench,
      accent: "amber",
      title: "Creating & Dispatching Work Orders",
      body: "Click '+ New Ticket' to log a maintenance issue for any building and unit. Set the priority (Low, Medium, High, Urgent/Emergency), category (Plumbing, HVAC, Electrical, General), and assign a maintenance technician.",
      highlights: [
        "Assigned tickets appear immediately on the crew member's mobile portal",
        "Filter tickets by Open, In Progress, Completed, Priority, or Building",
      ],
    },
    {
      icon: QrCode,
      accent: "blue",
      title: "Mobile Maintenance Crew Portal",
      body: "Your field technicians don't need admin accounts. Share the Maintenance Portal link (/staff/maintenance) or print the QR code — crew members sign in with their 6-digit PIN from any phone.",
      highlights: [
        "Manage crew PINs in Settings → Team & Access",
        "Field staff see only operational ticket details, never private financial or cost fields",
      ],
    },
    {
      icon: Camera,
      accent: "emerald",
      title: "Before & After Completion Photos",
      body: "Technicians can snap and upload photos directly from their phone when reporting an issue or marking a work order complete. All photos attach to the ticket card for admin verification.",
    },
    {
      icon: HardHat,
      accent: "purple",
      title: "Subcontractor & Vendor Directory",
      body: "Switch to the 'Subcontractors' sub-tab to keep a searchable directory of licensed plumbers, electricians, HVAC vendors, and roofers with their phone numbers, specialties, and notes.",
    },
  ],

  cleaning: [
    {
      icon: SprayCan,
      accent: "cyan",
      title: "Scheduling Cleaning Assignments",
      body: "Create recurring or one-off cleaning assignments by building, floor, or suite. Use Quick Mode for fast dispatch or Full Mode to attach room-by-room checklists and special instructions.",
      highlights: [
        "Track status across Scheduled, In Progress, and Completed assignments",
        "View daily and weekly workload across your cleaning crew",
      ],
    },
    {
      icon: QrCode,
      accent: "emerald",
      title: "Mobile Cleaning Crew Portal",
      body: "Cleaning staff log in at /staff/cleaning on their smartphone using their 6-digit PIN. They can view today's assigned buildings, check off tasks, upload completion photos, and ask OpsIQ questions.",
    },
    {
      icon: Camera,
      accent: "blue",
      title: "Photo Verification & Quality Control",
      body: "When a cleaner marks an assignment complete and uploads a photo from their phone, it appears directly inside the admin Cleaning tab with a timestamp so managers can verify quality remotely.",
    },
  ],

  analytics: [
    {
      icon: BarChart3,
      accent: "blue",
      title: "Executive Portfolio Analytics",
      body: "The Analytics & Reports tab gives you a real-time pulse on lead conversion, occupancy rates, monthly rent collection, maintenance resolution times, and portfolio valuation.",
      highlights: [
        "Switch between Overview, Weekly Ops Report (QBR), and Portfolio Snapshots",
        "Compare historical occupancy and revenue trends over time",
      ],
    },
    {
      icon: Sparkles,
      accent: "purple",
      title: "AI Weekly Executive Brief & QBR",
      body: "Generate an AI-written Weekly Operations Report or Quarterly Business Review (QBR) summarizing leasing velocity, completed maintenance, upcoming lease renewals, and action items for ownership.",
    },
    {
      icon: PieChart,
      accent: "emerald",
      title: "Historical Portfolio Snapshots",
      body: "Record point-in-time snapshots of your portfolio's occupancy, unit counts, and monthly revenue so you can track growth month over month.",
    },
  ],

  marketing: [
    {
      icon: Megaphone,
      accent: "purple",
      title: "AI Marketing & Leasing Studio",
      body: "Use the Marketing Studio sub-tabs to generate SEO blog articles, press releases, social media posts, property one-sheets, and market intelligence briefs powered by Gemini AI and tailored to your portfolio.",
      highlights: [
        "Blog Articles & Press Releases for local SEO and announcements",
        "One-Sheet PDF generator for printable property flyers",
        "Social Studio for LinkedIn, Facebook, and Instagram leasing posts",
      ],
    },
  ],

  "marketing-press": [
    {
      icon: Newspaper,
      accent: "blue",
      title: "AI Press Release Generator",
      body: "Announce new tenant signings, building acquisitions, or renovations. Enter a few key facts, choose a tone, and Gemini drafts a publication-ready press release formatted for local media.",
    },
  ],

  "marketing-blog": [
    {
      icon: FileText,
      accent: "emerald",
      title: "SEO Blog Article Generator & Editor",
      body: "Generate local commercial real estate articles optimized for search engines, then publish them directly to your public website's /blog with featured images and AI SEO enhancements.",
      highlights: [
        "Draft new posts with AI or edit existing articles in the Blog Editor",
        "Published articles automatically appear on your tenant website and sitemap",
      ],
    },
  ],

  "marketing-photos": [
    {
      icon: ImageIcon,
      accent: "cyan",
      title: "Property Photo & Media Library",
      body: "Upload high-resolution exterior and interior photos for each building in your portfolio. Choose a Hero Image for each property and reorder gallery photos that appear on your public website and flyers.",
    },
  ],

  "marketing-banner": [
    {
      icon: LayoutTemplate,
      accent: "amber",
      title: "Homepage Hero Banner Manager",
      body: "Customize the rotating hero slides on your public website. Upload custom banner photography, edit headlines and call-to-action buttons, or link slides directly to featured properties.",
    },
  ],

  "marketing-properties": [
    {
      icon: Building2,
      accent: "blue",
      title: "Public Property Listing Creator",
      body: "Create and publish new property listings to your public website with rich descriptions, amenity tags, square footage ranges, and photo galleries.",
    },
  ],

  "marketing-social": [
    {
      icon: Share2,
      accent: "purple",
      title: "Social Media Copy Studio",
      body: "Select any property in your portfolio and generate platform-ready leasing posts for LinkedIn, Facebook, and Instagram — complete with hooks, amenity highlights, and hashtags.",
    },
  ],

  "marketing-intel": [
    {
      icon: Compass,
      accent: "cyan",
      title: "Local Market Intelligence",
      body: "Track regional commercial real estate trends, comparable lease rates, and economic news, and generate AI Market Briefs for your team or investors.",
    },
  ],

  "marketing-one-sheet": [
    {
      icon: FileBadge,
      accent: "emerald",
      title: "Printable Property One-Sheets",
      body: "Select any building to generate a polished, branded 1-page leasing flyer featuring your organization's logo, contact details, property photos, specs, and QR code — ready to print or save as PDF.",
    },
  ],

  archived: [
    {
      icon: RotateCcw,
      accent: "blue",
      title: "Restoring Archived Leads",
      body: "The Archive tab holds leads you've removed from your active pipeline. Click 'Restore' on any archived lead to return it immediately to your active Leads board with all notes and call logs intact.",
    },
    {
      icon: Trash2,
      accent: "rose",
      title: "Permanent Deletion",
      body: "Clicking 'Delete Permanently' inside the Archive tab removes the lead record from your database forever. Only delete leads you are certain you no longer need.",
    },
  ],

  content: [
    {
      icon: Globe,
      accent: "blue",
      title: "Public Website & Content Builder",
      body: "Control everything prospects see on your public leasing website (/site/your-slug or your custom domain). Edit property listings, homepage hero banners, market pages, and company branding.",
    },
  ],

  "content-homepage": [
    {
      icon: LayoutTemplate,
      accent: "blue",
      title: "Homepage Content Editor",
      body: "Customize your public website's headline, subheadline, value propositions, and call-to-action sections. Changes save directly to your organization's live site.",
    },
  ],

  "content-markets": [
    {
      icon: MapPin,
      accent: "emerald",
      title: "Local Market & Area Pages",
      body: "Manage regional market highlights and neighborhood descriptions to boost local search visibility and showcase your market expertise to prospective tenants.",
    },
  ],

  "content-pages": [
    {
      icon: Layers,
      accent: "purple",
      title: "Space Use-Case Pages",
      body: "Configure dedicated landing sections for Office, Retail, Medical, Flex, and Warehouse spaces so prospective tenants can filter by their exact business need.",
    },
  ],

  "content-properties": [
    {
      icon: Building2,
      accent: "cyan",
      title: "Published Property Listings",
      body: "Choose which properties are published on your public website, edit their marketing descriptions, update availability badges (Available, Leased, Coming Soon), and manage listing photos.",
    },
  ],

  settings: [
    {
      icon: CreditCard,
      accent: "emerald",
      title: "Subscription, 14-Day Trial & Stripe Billing",
      body: "View your current plan tier (Starter $99/mo, Growth $249/mo, or Pro $499/mo) and trial countdown at the top of Settings. Click any plan to upgrade via Stripe Checkout in one click, or click 'Manage Billing & Invoices' to update payment methods and download receipts.",
      highlights: [
        "Starter ($99/mo): Up to 5 properties, 5 team members, core CRM & Maintenance",
        "Growth ($249/mo): Up to 25 properties, 15 team members, Cleaning, Marketing Studio & Site Builder",
        "Pro ($499/mo): Unlimited properties & users, Custom Domain, Executive QBR & full AI suite",
      ],
    },
    {
      icon: Palette,
      accent: "blue",
      title: "Organization Profile & Branding",
      body: "Set your company's display name, primary contact email, phone number, city/state, logo URL, and brand colors. These details power your public website, printable property one-sheets, and AI email signatures.",
    },
    {
      icon: Users,
      accent: "purple",
      title: "Team Members, Roles & Crew PINs",
      body: "Invite Admin/Manager users by work email, or create Maintenance and Cleaning crew profiles. Crew members automatically receive a unique 6-digit PIN for logging into the mobile field portals (/staff/maintenance and /staff/cleaning).",
      highlights: [
        "Admins can sign in with Password, Magic Link, or Google",
        "Field crew sign in at /staff/maintenance or /staff/cleaning using their 6-digit PIN",
        "Workspace owners are protected and cannot be deactivated by invited admins",
      ],
    },
    {
      icon: Globe,
      accent: "cyan",
      title: "Custom Domain Manager (GoDaddy / IONOS / Cloudflare)",
      body: "On the Pro plan, connect your own custom domain (e.g., properties.yourcompany.com) to your public OperateIQ website. Enter your domain, add the displayed DNS records at your registrar, and click 'Verify DNS Connection'.",
    },
    {
      icon: KeyRound,
      accent: "amber",
      title: "Password & Account Security",
      body: "Use the Password & Security card in Settings anytime to set or update your account password — even if you originally signed in via Magic Link or Google.",
    },
  ],
};

const SECTION_CATEGORIES: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "leads", label: "Leads & CRM", icon: Flame },
  { key: "tenants", label: "Tenants & Rent", icon: Users },
  { key: "propdetails", label: "Properties & Assets", icon: Building2 },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "cleaning", label: "Cleaning", icon: SprayCan },
  { key: "teamboard", label: "Team & Tasks", icon: MessageSquare },
  { key: "analytics", label: "Analytics & QBR", icon: BarChart3 },
  { key: "marketing-blog", label: "Marketing & AI", icon: Sparkles },
  { key: "content-properties", label: "Website Builder", icon: Globe },
  { key: "settings", label: "Settings & Billing", icon: Settings },
  { key: "global", label: "Platform AI Tools", icon: Brain },
];

const TAB_LABELS: Record<TabKey, string> = {
  leads: "Leads & CRM",
  tenants: "Tenants & Rent Ledger",
  propdetails: "Properties & Asset Details",
  maintenance: "Maintenance & Work Orders",
  cleaning: "Cleaning Operations",
  analytics: "Analytics & Executive Reports",
  marketing: "Marketing Studio",
  "marketing-press": "Press Releases",
  "marketing-blog": "Blog & SEO Articles",
  "marketing-photos": "Property Photo Library",
  "marketing-banner": "Homepage Hero Banner",
  "marketing-properties": "Property Listings",
  "marketing-social": "Social Media Studio",
  "marketing-intel": "Market Intelligence",
  "marketing-one-sheet": "Property One-Sheets",
  archived: "Archived Leads",
  content: "Website & Content Builder",
  "content-homepage": "Homepage Editor",
  "content-markets": "Local Market Pages",
  "content-pages": "Space Use-Case Pages",
  "content-properties": "Published Website Properties",
  settings: "Settings, Billing & Team",
  teamboard: "Team Comm & Task Board",
  global: "Platform AI Tools",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProTips({ activeTab }: { activeTab: TabKey }) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TabKey>(activeTab);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [pulse, setPulse] = useState(false);
  const prevTab = useRef<TabKey>(activeTab);
  const modalRef = useRef<HTMLDivElement>(null);

  // Scroll refs & state for modern scroll UI graphics
  const categoryBarRef = useRef<HTMLDivElement>(null);
  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(true);

  const sidebarListRef = useRef<HTMLDivElement>(null);
  const [sidebarScrollState, setSidebarScrollState] = useState<{
    canScrollDown: boolean;
    canScrollUp: boolean;
    progress: number;
  }>({ canScrollDown: false, canScrollUp: false, progress: 0 });

  // Sync selectedCategory when user switches tabs in the dashboard
  useEffect(() => {
    if (prevTab.current !== activeTab) {
      prevTab.current = activeTab;
      setSelectedCategory(activeTab);
      setSelectedIdx(0);
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1800);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  // Also reset to current activeTab whenever the modal is freshly opened
  const handleOpen = () => {
    setSelectedCategory(activeTab);
    setSelectedIdx(0);
    setSearchQuery("");
    setOpen(true);
  };

  // Allow opening from top header button via custom event
  useEffect(() => {
    const onOpenEvent = () => {
      setSelectedCategory(activeTab);
      setSelectedIdx(0);
      setSearchQuery("");
      setOpen(true);
    };
    window.addEventListener("open-help-center", onOpenEvent);
    return () => window.removeEventListener("open-help-center", onOpenEvent);
  }, [activeTab]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // Build list of tips for selected category (plus global AI tips), or search across all categories
  const displayedTips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const results: (Tip & { categoryLabel: string })[] = [];
      const seenTitles = new Set<string>();
      (Object.keys(TIPS) as TabKey[]).forEach((k) => {
        for (const tip of TIPS[k] || []) {
          if (seenTitles.has(tip.title)) continue;
          if (
            tip.title.toLowerCase().includes(q) ||
            tip.body.toLowerCase().includes(q) ||
            tip.highlights?.some((h) => h.toLowerCase().includes(q)) ||
            TAB_LABELS[k]?.toLowerCase().includes(q)
          ) {
            seenTitles.add(tip.title);
            results.push({ ...tip, categoryLabel: TAB_LABELS[k] || "Guide" });
          }
        }
      });
      return results;
    }

    const primary = TIPS[selectedCategory] ?? [];
    // If a marketing-* or content-* sub-tab has only 1 tip, also append the other related marketing/content tips for convenience
    const combined: (Tip & { categoryLabel: string })[] = primary.map((t) => ({
      ...t,
      categoryLabel: TAB_LABELS[selectedCategory] || "Current Section",
    }));

    if (selectedCategory.startsWith("marketing-") && combined.length <= 2) {
      const extraKeys: TabKey[] = [
        "marketing-blog",
        "marketing-press",
        "marketing-photos",
        "marketing-banner",
        "marketing-social",
        "marketing-one-sheet",
        "marketing-intel",
      ];
      for (const k of extraKeys) {
        if (k === selectedCategory) continue;
        for (const t of TIPS[k] || []) {
          combined.push({ ...t, categoryLabel: TAB_LABELS[k] });
        }
      }
    } else if (selectedCategory.startsWith("content-") && combined.length <= 2) {
      const extraKeys: TabKey[] = [
        "content-properties",
        "content-homepage",
        "content-markets",
        "content-pages",
      ];
      for (const k of extraKeys) {
        if (k === selectedCategory) continue;
        for (const t of TIPS[k] || []) {
          combined.push({ ...t, categoryLabel: TAB_LABELS[k] });
        }
      }
    }

    // Always append Global Platform AI tips at the bottom if not already on 'global'
    if (selectedCategory !== "global") {
      for (const t of TIPS.global) {
        combined.push({ ...t, categoryLabel: "Platform AI Tools" });
      }
    }

    return combined;
  }, [selectedCategory, searchQuery]);

  const safeIdx = Math.min(selectedIdx, Math.max(0, displayedTips.length - 1));
  const current = displayedTips[safeIdx] ?? null;

  // Update horizontal category bar scroll indicators
  const updateCategoryScrollState = () => {
    const el = categoryBarRef.current;
    if (!el) return;
    setCanScrollCatLeft(el.scrollLeft > 8);
    setCanScrollCatRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  // Update vertical sidebar scroll state & progress
  const updateSidebarScrollState = () => {
    const el = sidebarListRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 6) {
      setSidebarScrollState({ canScrollDown: false, canScrollUp: false, progress: 100 });
      return;
    }
    const progress = Math.min(100, Math.max(0, Math.round((el.scrollTop / maxScroll) * 100)));
    setSidebarScrollState({
      canScrollUp: el.scrollTop > 10,
      canScrollDown: el.scrollTop < maxScroll - 10,
      progress,
    });
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      updateCategoryScrollState();
      updateSidebarScrollState();
    }, 60);
    return () => clearTimeout(t);
  }, [open, selectedCategory, displayedTips.length, searchQuery]);

  // Smooth scroll selected topic button into view when navigating via Prev/Next or Segmented Bar
  useEffect(() => {
    if (!open || !sidebarListRef.current) return;
    const activeBtn = sidebarListRef.current.querySelector(
      `[data-tip-idx="${safeIdx}"]`
    ) as HTMLElement | null;
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [safeIdx, open]);

  const scrollCategoryBar = (dir: "left" | "right") => {
    const el = categoryBarRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
  };

  const scrollSidebarStep = () => {
    const el = sidebarListRef.current;
    if (!el) return;
    if (sidebarScrollState.canScrollDown) {
      el.scrollBy({ top: 220, behavior: "smooth" });
    } else {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* ── Modern Floating Help & Guide Trigger Button ── */}
      <button
        onClick={handleOpen}
        aria-label="Open Help & Guide Center"
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl
          bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-bold text-sm
          border border-sky-300/30
          shadow-[0_10px_30px_rgba(37,99,235,0.45),0_0_20px_rgba(56,189,248,0.35)]
          hover:shadow-[0_12px_36px_rgba(37,99,235,0.65),0_0_28px_rgba(56,189,248,0.55)]
          hover:scale-[1.03] active:scale-95 transition-all duration-200 select-none cursor-pointer
          ${pulse ? "ring-4 ring-sky-400/40" : ""}`}
        title="Open Help & Guide Center"
      >
        <HelpCircle size={20} className="text-white flex-shrink-0" />
        <span className="tracking-tight">Help &amp; Guide</span>
        {pulse && (
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
        )}
      </button>

      {/* ── Centered Large Modal Popup ── */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 md:p-8">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200" />

          {/* Modal Window */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="OperateIQ Help and Guide Center"
            className="relative w-full max-w-5xl max-h-[88vh] flex flex-col bg-[#0B1120] border border-white/15 rounded-3xl
              shadow-[0_25px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(56,189,248,0.16)] overflow-hidden
              animate-in zoom-in-95 fade-in duration-200"
          >
            {/* ── Top Header Bar ── */}
            <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-white/10 bg-gradient-to-r from-sky-500/[0.08] via-indigo-500/[0.05] to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_24px_rgba(56,189,248,0.4)] flex-shrink-0">
                  <BookOpen size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Help &amp; Guide Center
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 border border-sky-400/30 text-sky-300">
                      {TAB_LABELS[selectedCategory] || "Platform Guide"}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-300 mt-1">
                    Step-by-step guides and best practices for your workspace
                  </p>
                </div>
              </div>

              {/* Search + Close */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-72">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedIdx(0);
                    }}
                    placeholder="Search all help topics..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:bg-white/[0.09] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedIdx(0);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close Help Center"
                  className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* ── Category Switcher Carousel Bar (Modern Scroll UI with Fade Masks & Glide Arrows) ── */}
            {!searchQuery && (
              <div className="relative border-b border-white/10 bg-[#080D1A] flex items-center flex-shrink-0">
                {/* Left fade + glide button */}
                {canScrollCatLeft && (
                  <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-2 pr-6 bg-gradient-to-r from-[#080D1A] via-[#080D1A]/95 to-transparent pointer-events-none">
                    <button
                      onClick={() => scrollCategoryBar("left")}
                      aria-label="Scroll categories left"
                      className="pointer-events-auto w-8 h-8 rounded-full bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 hover:text-white flex items-center justify-center shadow-[0_0_16px_rgba(56,189,248,0.35)] transition-all cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                )}

                <div
                  ref={categoryBarRef}
                  onScroll={updateCategoryScrollState}
                  className="px-6 sm:px-8 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth w-full"
                >
                  {SECTION_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive =
                      selectedCategory === cat.key ||
                      (cat.key === "marketing-blog" && selectedCategory.startsWith("marketing")) ||
                      (cat.key === "content-properties" && selectedCategory.startsWith("content"));
                    return (
                      <button
                        key={cat.key}
                        onClick={(e) => {
                          setSelectedCategory(cat.key);
                          setSelectedIdx(0);
                          e.currentTarget.scrollIntoView({
                            behavior: "smooth",
                            inline: "center",
                            block: "nearest",
                          });
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? "bg-sky-500/20 border border-sky-400/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                            : "bg-white/[0.03] border border-white/[0.07] text-slate-300 hover:text-white hover:bg-white/[0.07]"
                        }`}
                      >
                        <Icon size={15} className={isActive ? "text-sky-400" : "text-slate-400"} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right fade + glide button */}
                {canScrollCatRight && (
                  <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pr-2 pl-6 bg-gradient-to-l from-[#080D1A] via-[#080D1A]/95 to-transparent pointer-events-none">
                    <button
                      onClick={() => scrollCategoryBar("right")}
                      aria-label="Scroll categories right"
                      className="pointer-events-auto w-8 h-8 rounded-full bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 hover:text-white flex items-center justify-center shadow-[0_0_16px_rgba(56,189,248,0.35)] transition-all cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Main Split Body: Left Topic List + Right Guide Content ── */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
              {/* Left Sidebar: Topic List with Modern Scroll UI Graphic */}
              <div className="relative w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-white/10 bg-[#090E1C] flex flex-col max-h-60 md:max-h-none flex-shrink-0">
                {/* Sidebar Header with Scroll Progress Graphic */}
                <div className="px-5 pt-3.5 pb-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2 flex-shrink-0">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400 truncate">
                    {searchQuery
                      ? `Search Results (${displayedTips.length})`
                      : `${TAB_LABELS[selectedCategory] || "Section"} (${displayedTips.length})`}
                  </span>
                  {(sidebarScrollState.canScrollDown || sidebarScrollState.canScrollUp) && (
                    <div className="flex items-center gap-2 flex-shrink-0" title="Scroll progress">
                      <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all duration-150"
                          style={{ width: `${Math.max(15, sidebarScrollState.progress)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Scrollable Topic List */}
                <div
                  ref={sidebarListRef}
                  onScroll={updateSidebarScrollState}
                  className="flex-1 overflow-y-auto help-scroll p-3 sm:p-4 pb-14 space-y-1.5"
                >
                  {displayedTips.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-base font-bold text-slate-300">No matching guides found</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Try a different keyword or clear the search filter.
                      </p>
                    </div>
                  ) : (
                    displayedTips.map((tip, i) => {
                      const Icon = tip.icon;
                      const accent = ACCENT_STYLES[tip.accent || "blue"];
                      const isSelected = safeIdx === i;
                      return (
                        <button
                          key={`${tip.title}-${i}`}
                          data-tip-idx={i}
                          onClick={() => setSelectedIdx(i)}
                          className={`w-full text-left p-3.5 rounded-2xl flex items-start gap-3.5 transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-gradient-to-r from-sky-500/20 to-indigo-500/10 border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.12)]"
                              : "bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/10"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${accent.badgeBg} ${accent.badgeBorder}`}
                          >
                            <Icon size={20} className={accent.iconText} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm sm:text-[15px] font-bold leading-snug ${
                                isSelected ? "text-white" : "text-slate-200"
                              }`}
                            >
                              {tip.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 truncate">
                              {tip.categoryLabel}
                            </p>
                          </div>
                          <ChevronRight
                            size={18}
                            className={`flex-shrink-0 mt-2 transition-transform ${
                              isSelected ? "text-sky-400 translate-x-0.5" : "text-slate-600"
                            }`}
                          />
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Floating Modern Scroll Indicator Pill Graphic at Bottom of Sidebar */}
                {(sidebarScrollState.canScrollDown || sidebarScrollState.canScrollUp) && (
                  <div className="absolute bottom-0 left-0 right-0 pt-6 pb-2.5 px-4 bg-gradient-to-t from-[#090E1C] via-[#090E1C]/95 to-transparent flex justify-center pointer-events-none">
                    <button
                      onClick={scrollSidebarStep}
                      className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-xs font-bold text-sky-200 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(56,189,248,0.25)] backdrop-blur-md transition-all cursor-pointer group"
                    >
                      {/* Animated Mouse / Scroll Wheel Graphic */}
                      <span className="w-3.5 h-5 rounded-full border-2 border-sky-400/80 flex items-start justify-center p-0.5">
                        <span className="w-1 h-1.5 rounded-full bg-sky-300 animate-bounce" />
                      </span>
                      <span>
                        {sidebarScrollState.canScrollDown ? "Scroll for more guides" : "Back to top"}
                      </span>
                      {sidebarScrollState.canScrollDown ? (
                        <ChevronDown size={14} className="text-sky-400 group-hover:translate-y-0.5 transition-transform" />
                      ) : (
                        <ChevronUp size={14} className="text-sky-400 group-hover:-translate-y-0.5 transition-transform" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Content Pane */}
              <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 md:p-10 overflow-y-auto help-scroll bg-[#0B1120]">
                {current ? (
                  <div key={`${current.title}-${safeIdx}`} className="animate-in fade-in duration-200">
                    {/* Interactive Segmented Topic Stepper Graphic */}
                    {displayedTips.length > 1 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                          <span className="uppercase tracking-wider text-sky-400">
                            Guide {safeIdx + 1} of {displayedTips.length}
                          </span>
                          <span>Click any bar to jump</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {displayedTips.map((t, idx) => {
                            const isCurrent = idx === safeIdx;
                            const isPast = idx < safeIdx;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedIdx(idx)}
                                title={t.title}
                                aria-label={`Jump to guide ${idx + 1}: ${t.title}`}
                                className={`h-2 flex-1 rounded-full transition-all cursor-pointer ${
                                  isCurrent
                                    ? "bg-gradient-to-r from-sky-400 to-indigo-400 shadow-[0_0_12px_rgba(56,189,248,0.6)] scale-y-125"
                                    : isPast
                                    ? "bg-sky-500/45 hover:bg-sky-400/70"
                                    : "bg-white/10 hover:bg-white/25"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Category Pill + Icon Header */}
                    {(() => {
                      const Icon = current.icon;
                      const accent = ACCENT_STYLES[current.accent || "blue"];
                      return (
                        <div className="flex items-start gap-4 sm:gap-5 mb-6">
                          <div
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-lg ${accent.badgeBg} ${accent.badgeBorder}`}
                          >
                            <Icon size={30} className={accent.iconText} />
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border mb-2 ${accent.pillBg} ${accent.pillText}`}
                            >
                              {current.categoryLabel}
                            </span>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                              {current.title}
                            </h3>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Main Legible Body Text */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6 mb-6">
                      <p className="text-base sm:text-lg text-slate-100 leading-relaxed">
                        {current.body}
                      </p>
                    </div>

                    {/* Key Takeaways / Highlights Box */}
                    {current.highlights && current.highlights.length > 0 && (
                      <div className="bg-sky-500/[0.06] border border-sky-400/20 rounded-2xl p-5 sm:p-6">
                        <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-300 mb-3.5 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-sky-400" />
                          Key Takeaways &amp; Quick Tips
                        </p>
                        <ul className="space-y-2.5">
                          {current.highlights.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-3 text-sm sm:text-base text-slate-200 leading-relaxed"
                            >
                              <span className="w-2 h-2 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Bottom Navigation Controls */}
                <div className="flex items-center justify-between gap-4 mt-8 pt-5 border-t border-white/10">
                  <button
                    onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                    disabled={safeIdx === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-sm font-bold text-slate-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                    Previous Topic
                  </button>

                  <span className="text-sm font-bold text-slate-400">
                    Topic {displayedTips.length > 0 ? safeIdx + 1 : 0} of {displayedTips.length}
                  </span>

                  <button
                    onClick={() =>
                      setSelectedIdx((i) => Math.min(displayedTips.length - 1, i + 1))
                    }
                    disabled={safeIdx >= displayedTips.length - 1}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sm font-bold text-sky-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    Next Topic
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Modal Footer ── */}
            <div className="px-6 sm:px-8 py-4 bg-[#070B14] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <p className="text-xs sm:text-sm text-slate-400">
                Tip: Press <kbd className="px-2 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-xs">Esc</kbd> anytime to close this window, or use <strong className="text-slate-200">Ask OpsIQ</strong> in the top bar for live portfolio questions.
              </p>
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold hover:opacity-95 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

