import {
  Flame,
  Printer,
  PlusCircle,
  Sparkles,
  PhoneCall,
  UserCheck,
  Archive,
  Send,
  Snowflake,
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
  Wrench,
  HardHat,
  QrCode,
  Camera,
  SprayCan,
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
  Megaphone,
  FileSpreadsheet,
  Smartphone,
  LifeBuoy,
  CheckCircle2,
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

export type TipAccent = "blue" | "emerald" | "amber" | "purple" | "cyan" | "rose";

export type Tip = {
  title: string;
  body: string;
  highlights?: string[];
  icon: LucideIcon;
  accent?: TipAccent;
  audience?: "admin" | "crew" | "all";
};

export type TechSupportGuide = {
  id: string;
  title: string;
  symptom: string;
  category: "Account & Login" | "Crew Mobile Portals" | "Rent & Payments" | "AI & Data Import" | "Domains & Website" | "Billing & Plans";
  icon: LucideIcon;
  accent: TipAccent;
  solutionSummary: string;
  steps: string[];
  proTip?: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: "Getting Started" | "Daily Operations" | "Crew Portals" | "Billing & Security" | "Tech Support";
  relatedTab?: TabKey;
};

export const ACCENT_STYLES: Record<
  TipAccent,
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

// ─── Stored ProTips Knowledge Base (Shared Across Admin & Public Help Center) ─

export const TIPS: Record<TabKey, Tip[]> = {
  global: [
    {
      icon: Sparkles,
      accent: "cyan",
      audience: "admin",
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
      audience: "all",
      title: "Ask PropOpsIQ Portfolio Assistant",
      body: "Click 'Ask PropOpsIQ' in the top bar anytime to ask natural-language questions about your portfolio — such as expiring leases, overdue rent, open maintenance tickets, or top-scoring leads.",
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
      audience: "all",
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
      audience: "admin",
      title: "Shared & Private Task Board",
      body: "Switch to the Task List sub-tab to manage operational to-dos. Assign tasks to specific team members, set priority levels and due dates, or toggle a task to 'Private' so only you can see it.",
      highlights: [
        "Filter tasks by assignee, status, or priority",
        "Private tasks are strictly visible only to their creator, assignee, and workspace owner",
      ],
    },
  ],

  leads: [
    {
      icon: Flame,
      accent: "amber",
      audience: "admin",
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
      audience: "admin",
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
      audience: "admin",
      title: "AI Priority Call List",
      body: "The Priority Call List card at the top of the Leads tab ranks your top prospects to call today. Click 'Refresh Brief' to have Ask PropOpsIQ generate a 2-sentence executive summary of who to call first and why.",
      highlights: [
        "Click any prospect's name in the priority list to jump straight to their lead card",
        "Shows your personal overdue follow-up checklist right below the AI brief",
      ],
    },
    {
      icon: PhoneCall,
      accent: "emerald",
      audience: "admin",
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
      audience: "admin",
      title: "Sending AI Follow-Up Emails",
      body: "Expand any lead card to review the AI-drafted response email. You can edit the subject or message body directly, then click 'Send Email' to deliver it to the prospect and log the outreach.",
    },
    {
      icon: Snowflake,
      accent: "blue",
      audience: "admin",
      title: "Cold Pipeline CRM",
      body: "Click 'Cold Pipeline' in the Leads toolbar to track outbound prospects and businesses you are actively recruiting before they become inbound leads. When a prospect warms up, promote them with one click.",
    },
    {
      icon: Printer,
      accent: "emerald",
      audience: "admin",
      title: "Printing the Call Sheet",
      body: "Use the 'Print Call Sheet' button near the top right of the Leads tab to open a clean, print-ready table of your active leads — ideal for walking properties or weekly leasing meetings.",
    },
    {
      icon: UserCheck,
      accent: "purple",
      audience: "admin",
      title: "Assigning Leads & Filtering",
      body: "Use the 'Assign To' dropdown inside any lead card to assign ownership to a team member. Filter your pipeline anytime using the pill buttons (Verified Lead, MQL, Prospect, Whale $2.5k+/mo, or New Today).",
    },
    {
      icon: Archive,
      accent: "rose",
      audience: "admin",
      title: "Archiving vs. Deleting Leads",
      body: "Click 'Archive' on a lead card to move inactive prospects out of your main pipeline while keeping their history in the Archive tab. Use 'Delete' only when you want to permanently remove spam or test entries.",
    },
  ],

  tenants: [
    {
      icon: Users,
      accent: "blue",
      audience: "admin",
      title: "Managing Your Tenant Directory",
      body: "Use the Tenant Onboarding & Directory Hub at the top of the Tenants tab to click '+ Add Single Tenant', '✨ Import Lease / Excel / Photo (AI)', or 'Upload CSV / Excel' to bulk-import your rent roll.",
      highlights: [
        "Filter tenants by building or search by business name, contact, or unit",
        "Click any tenant card to expand full lease details, documents, and payment history",
      ],
    },
    {
      icon: CheckCircle2,
      accent: "emerald",
      audience: "admin",
      title: "Quick '$ Log Rent' on Tenant Cards & 1-Tap Receipts",
      body: "When a tenant hands you a check, pays cash, or sends a Zelle or Venmo transfer, click the green '$ Log Rent' button right on their Tenant Card. Pick the payment method pill (Check, Zelle, Venmo, Cash, ACH, Cash App, Wire, Money Order, or Card), enter an optional check/reference number, and save in 1 click.",
      highlights: [
        "Automatically syncs with your 12-Month Rent Ledger and updates collection totals",
        "Instantly print an official PDF Rent Receipt or send a 1-tap SMS / Email confirmation",
      ],
    },
    {
      icon: DollarSign,
      accent: "emerald",
      audience: "admin",
      title: "1-Click Rent Ledger, Payment Instructions & Reminders",
      body: "Open the 'Rent Ledger' to view every tenant's monthly rent status. Selecting a payment method (like Venmo, Zelle, Check, or Cash) or clicking 'Paid' automatically fills the tenant's full monthly obligation and today's date — zero manual typing required.",
      highlights: [
        "Save your Zelle, Venmo, Cash App, and Check drop-off info once in 'Payment Instructions'",
        "Click '🔔 Remind' on unpaid rows to text/email payment instructions, or '🧾 Receipt' on paid rows to issue an official receipt",
      ],
    },
    {
      icon: CalendarClock,
      accent: "amber",
      audience: "admin",
      title: "Automated Lease Expiry Alerts",
      body: "PropOpsIQ automatically monitors every tenant's lease end date and renewal date. Color-coded badges warn you at 90 days (Watch), 60 days (Soon), 30 days (Urgent), and Expired so you never miss a renewal window.",
      highlights: [
        "Customize the alert threshold per tenant (e.g., 90, 120, or 180 days)",
        "Expiring leases also surface in the top-of-dashboard Lease Renewal Alert banner",
      ],
    },
    {
      icon: ShieldCheck,
      accent: "cyan",
      audience: "admin",
      title: "Security Deposit & Document Vault",
      body: "Open the 'Security Deposits' ledger to track deposit amounts held, bank/escrow locations, and refund status. Inside each tenant card, you can also upload signed lease PDFs and addenda to their secure document vault.",
    },
  ],

  propdetails: [
    {
      icon: Building2,
      accent: "blue",
      audience: "admin",
      title: "Adding & Managing Properties",
      body: "Use the top Portfolio Hub ('Add a Property, Import Portfolio, or Log Vacancy') to click '+ Add Property', '⚡ Import Buildings & Tenants' with AI, '+ Add Unleased Space', or '+ Add Parking Lot'. Select any building pill to view its full operational profile.",
      highlights: [
        "New workspaces start 100% clean — or you can load editable sample properties in 1 click",
        "Delete, archive, or print a full report for any property directly from its detail header",
      ],
    },
    {
      icon: Layers,
      accent: "emerald",
      audience: "admin",
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
      audience: "admin",
      title: "Financials, Valuations & Taxes",
      body: "Record purchase price, estimated market value, mortgage debt, annual property taxes, and insurance costs on each building. PropOpsIQ calculates your portfolio equity, cap rate, and net operating metrics automatically.",
    },
    {
      icon: Car,
      accent: "amber",
      audience: "admin",
      title: "Parking Lots & Standalone Assets",
      body: "Switch to the 'Parking Lots' view to track surface lots or auxiliary parcels, including associated buildings, lease renewal dates, and annual city/county tax obligations.",
    },
    {
      icon: Wind,
      accent: "cyan",
      audience: "all",
      title: "HVAC Filter Change Tracker",
      body: "Open the 'Filter Changes' view to track HVAC filter sizes, quantities, last replacement dates, and next due dates across every building. Your maintenance crew can also log filter changes straight from their mobile portal.",
    },
    {
      icon: ClipboardCheck,
      accent: "emerald",
      audience: "all",
      title: "Building Inspections & Compliance",
      body: "Use the 'Inspections' view to log fire extinguisher, sprinkler, elevator, backflow, and roof inspections with pass/fail status, inspector names, and next due dates.",
    },
  ],

  maintenance: [
    {
      icon: Wrench,
      accent: "amber",
      audience: "all",
      title: "Creating & Dispatching Work Orders",
      body: "Use the top Maintenance Dispatch Hub ('Create a Work Order or Dispatch Maintenance') to click '+ New Work Order', manage Subcontractors, or jump to your Mobile Crew Portal. Set priority (Low, Medium, High, Urgent/Emergency), category (Plumbing, HVAC, Electrical, General), and assign a technician.",
      highlights: [
        "Assigned tickets appear immediately on the crew member's mobile portal",
        "Filter tickets by Open, In Progress, Completed, Priority, or Building",
      ],
    },
    {
      icon: QrCode,
      accent: "blue",
      audience: "crew",
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
      audience: "crew",
      title: "Before & After Completion Photos",
      body: "Technicians can snap and upload photos directly from their phone when reporting an issue or marking a work order complete. All photos attach to the ticket card for admin verification.",
    },
    {
      icon: HardHat,
      accent: "purple",
      audience: "admin",
      title: "Subcontractor & Vendor Directory",
      body: "Switch to the 'Subcontractors' sub-tab to keep a searchable directory of licensed plumbers, electricians, HVAC vendors, and roofers with their phone numbers, specialties, and notes.",
    },
  ],

  cleaning: [
    {
      icon: SprayCan,
      accent: "cyan",
      audience: "all",
      title: "Scheduling Cleaning Assignments",
      body: "Use the top Cleaning Dispatch Hub ('Schedule Cleaning & Crew Dispatch') to click '+ New Assignment' or switch between Quick Mode (fast dispatch) and Full Mode (room-by-room checklists and special instructions).",
      highlights: [
        "Track status across Scheduled, In Progress, and Completed assignments",
        "View daily and weekly workload across your cleaning crew",
      ],
    },
    {
      icon: QrCode,
      accent: "emerald",
      audience: "crew",
      title: "Mobile Cleaning Crew Portal",
      body: "Cleaning staff log in at /staff/cleaning on their smartphone using their 6-digit PIN. They can view today's assigned buildings, check off tasks, upload completion photos, and ask PropOpsIQ questions.",
    },
    {
      icon: Camera,
      accent: "blue",
      audience: "crew",
      title: "Photo Verification & Quality Control",
      body: "When a cleaner marks an assignment complete and uploads a photo from their phone, it appears directly inside the admin Cleaning tab with a timestamp so managers can verify quality remotely.",
    },
  ],

  analytics: [
    {
      icon: BarChart3,
      accent: "blue",
      audience: "admin",
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
      audience: "admin",
      title: "AI Weekly Executive Brief & QBR",
      body: "Generate an AI-written Weekly Operations Report or Quarterly Business Review (QBR) summarizing leasing velocity, completed maintenance, upcoming lease renewals, and action items for ownership.",
    },
    {
      icon: PieChart,
      accent: "emerald",
      audience: "admin",
      title: "Historical Portfolio Snapshots",
      body: "Record point-in-time snapshots of your portfolio's occupancy, unit counts, and monthly revenue so you can track growth month over month.",
    },
  ],

  marketing: [
    {
      icon: Megaphone,
      accent: "purple",
      audience: "admin",
      title: "AI Marketing & Leasing Studio",
      body: "Use the Marketing Studio sub-tabs to generate SEO blog articles, press releases, social media posts, and property one-sheets powered by Gemini AI and tailored to your portfolio.",
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
      audience: "admin",
      title: "AI Press Release Generator",
      body: "Announce new tenant signings, building acquisitions, or renovations. Enter a few key facts, choose a tone, and Gemini drafts a publication-ready press release formatted for local media.",
    },
  ],

  "marketing-blog": [
    {
      icon: FileText,
      accent: "emerald",
      audience: "admin",
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
      audience: "admin",
      title: "Property Photo & Media Library",
      body: "Upload high-resolution exterior and interior photos for each building in your portfolio. Choose a Hero Image for each property and reorder gallery photos that appear on your public website and flyers.",
    },
  ],

  "marketing-banner": [
    {
      icon: LayoutTemplate,
      accent: "amber",
      audience: "admin",
      title: "Homepage Hero Banner Manager",
      body: "Customize the rotating hero slides on your public website. Upload custom banner photography, edit headlines and call-to-action buttons, or link slides directly to featured properties.",
    },
  ],

  "marketing-properties": [
    {
      icon: Building2,
      accent: "blue",
      audience: "admin",
      title: "Public Property Listing Creator",
      body: "Create and publish new property listings to your public website with rich descriptions, amenity tags, square footage ranges, and photo galleries.",
    },
  ],

  "marketing-social": [
    {
      icon: Share2,
      accent: "purple",
      audience: "admin",
      title: "Social Media Copy Studio",
      body: "Select any property in your portfolio and generate platform-ready leasing posts for LinkedIn, Facebook, and Instagram — complete with hooks, amenity highlights, and hashtags.",
    },
  ],

  "marketing-one-sheet": [
    {
      icon: FileBadge,
      accent: "emerald",
      audience: "admin",
      title: "Printable Property One-Sheets",
      body: "Select any building to generate a polished, branded 1-page leasing flyer featuring your organization's logo, contact details, property photos, specs, and QR code — ready to print or save as PDF.",
    },
  ],

  archived: [
    {
      icon: RotateCcw,
      accent: "blue",
      audience: "admin",
      title: "Restoring Archived Leads",
      body: "The Archive tab holds leads you've removed from your active pipeline. Click 'Restore' on any archived lead to return it immediately to your active Leads board with all notes and call logs intact.",
    },
    {
      icon: Trash2,
      accent: "rose",
      audience: "admin",
      title: "Permanent Deletion",
      body: "Clicking 'Delete Permanently' inside the Archive tab removes the lead record from your database forever. Only delete leads you are certain you no longer need.",
    },
  ],

  content: [
    {
      icon: Globe,
      accent: "blue",
      audience: "admin",
      title: "Public Website & Content Builder",
      body: "Control everything prospects see on your public leasing website (/site/your-slug or your custom domain). Edit property listings, homepage hero banners, market pages, and company branding.",
    },
  ],

  "content-homepage": [
    {
      icon: LayoutTemplate,
      accent: "blue",
      audience: "admin",
      title: "Homepage Content Editor",
      body: "Customize your public website's headline, subheadline, value propositions, and call-to-action sections. Changes save directly to your organization's live site.",
    },
  ],

  "content-markets": [
    {
      icon: MapPin,
      accent: "emerald",
      audience: "admin",
      title: "Local Market & Area Pages",
      body: "Manage regional market highlights and neighborhood descriptions to boost local search visibility and showcase your market expertise to prospective tenants.",
    },
  ],

  "content-pages": [
    {
      icon: Layers,
      accent: "purple",
      audience: "admin",
      title: "Space Use-Case Pages",
      body: "Configure dedicated landing sections for Office, Retail, Medical, Flex, and Warehouse spaces so prospective tenants can filter by their exact business need.",
    },
  ],

  "content-properties": [
    {
      icon: Building2,
      accent: "cyan",
      audience: "admin",
      title: "Published Property Listings",
      body: "Choose which properties are published on your public website, edit their marketing descriptions, update availability badges (Available, Leased, Coming Soon), and manage listing photos.",
    },
  ],

  settings: [
    {
      icon: CreditCard,
      accent: "emerald",
      audience: "admin",
      title: "Subscription, 14-Day Trial & Stripe Billing",
      body: "View your current plan tier (Starter $99/mo, Growth $249/mo, or Pro $499/mo) and trial countdown at the top of Settings. Click any plan to upgrade via Stripe Checkout in one click, or click 'Manage Billing & Invoices' to update payment methods and download receipts.",
      highlights: [
        "Starter ($99/mo): Up to 5 properties & 3 team members — Property Portfolio, Tenants, Rent Ledger, Maintenance & Staff Mobile PIN Portal",
        "Growth ($249/mo): Up to 25 properties & 10 team members — Rent Ledger, Maintenance, Cleaning, Crew Portals, Inspections, HVAC Filters, Subcontractors, Team Tasks & Reports",
        "Pro ($499/mo): Unlimited properties & team members — Turnkey Public Website Builder, Custom Domain, Marketing Studio, AI Blog & Social Studio, Cold Outreach CRM & Executive QBRs",
      ],
    },
    {
      icon: Palette,
      accent: "blue",
      audience: "admin",
      title: "Organization Profile & Branding",
      body: "Set your company's display name, primary contact email, phone number, city/state, logo URL, and brand colors. These details power your public website, printable property one-sheets, and AI email signatures.",
    },
    {
      icon: Users,
      accent: "purple",
      audience: "all",
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
      audience: "admin",
      title: "Custom Domain Manager (GoDaddy / IONOS / Cloudflare)",
      body: "On the Pro plan, connect your own custom domain (e.g., properties.yourcompany.com) to your public PropOpsIQ website. Enter your domain, add the displayed DNS records at your registrar, and click 'Verify DNS Connection'.",
    },
    {
      icon: KeyRound,
      accent: "amber",
      audience: "admin",
      title: "Password & Account Security",
      body: "Use the Password & Security card in Settings anytime to set or update your account password — even if you originally signed in via Magic Link or Google.",
    },
  ],
};

export const SECTION_CATEGORIES: { key: TabKey; label: string; icon: LucideIcon; description: string }[] = [
  { key: "leads", label: "Leads & CRM", icon: Flame, description: "AI lead scoring, call logs, follow-ups & pipeline" },
  { key: "tenants", label: "Tenants & Rent", icon: Users, description: "Tenant directory, lease alerts & 12-month rent ledger" },
  { key: "propdetails", label: "Properties & Assets", icon: Building2, description: "Buildings, suites, HVAC filters, parking & inspections" },
  { key: "maintenance", label: "Maintenance", icon: Wrench, description: "Work orders, technician dispatch & mobile crew portal" },
  { key: "cleaning", label: "Cleaning", icon: SprayCan, description: "Cleaning schedules, checklists & photo verification" },
  { key: "teamboard", label: "Team & Tasks", icon: MessageSquare, description: "Real-time Comm Board, @mentions & shared/private tasks" },
  { key: "analytics", label: "Analytics & QBR", icon: BarChart3, description: "Occupancy KPIs, AI Weekly Ops Report & snapshots" },
  { key: "marketing-blog", label: "Marketing & AI", icon: Sparkles, description: "SEO blog writer, press releases, social copy & flyers" },
  { key: "content-properties", label: "Website Builder", icon: Globe, description: "Public leasing site, hero banners & property listings" },
  { key: "settings", label: "Settings & Billing", icon: Settings, description: "Plans, Stripe billing, team invites, PINs & domains" },
  { key: "archived", label: "Archived Leads", icon: Archive, description: "Restore inactive prospects or permanently remove spam" },
  { key: "global", label: "Platform AI Tools", icon: Brain, description: "AI Document/Excel intake & Ask PropOpsIQ assistant" },
];

export const TAB_LABELS: Record<TabKey, string> = {
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

// ─── Helper to retrieve combined tips for any category ───────────────────────

export function getTipsForCategory(selectedCategory: TabKey, searchQuery = "", audienceFilter: "all" | "admin" | "crew" = "all"): (Tip & { categoryLabel: string; categoryKey: TabKey })[] {
  const q = searchQuery.trim().toLowerCase();

  const matchesAudience = (tip: Tip) => {
    if (audienceFilter === "all") return true;
    if (audienceFilter === "crew") return tip.audience === "crew" || tip.audience === "all";
    return tip.audience === "admin" || tip.audience === "all" || !tip.audience;
  };

  if (q) {
    const results: (Tip & { categoryLabel: string; categoryKey: TabKey })[] = [];
    const seenTitles = new Set<string>();
    (Object.keys(TIPS) as TabKey[]).forEach((k) => {
      for (const tip of TIPS[k] || []) {
        if (seenTitles.has(tip.title)) continue;
        if (!matchesAudience(tip)) continue;
        if (
          tip.title.toLowerCase().includes(q) ||
          tip.body.toLowerCase().includes(q) ||
          tip.highlights?.some((h) => h.toLowerCase().includes(q)) ||
          TAB_LABELS[k]?.toLowerCase().includes(q)
        ) {
          seenTitles.add(tip.title);
          results.push({ ...tip, categoryLabel: TAB_LABELS[k] || "Guide", categoryKey: k });
        }
      }
    });
    return results;
  }

  const primary = (TIPS[selectedCategory] ?? []).filter(matchesAudience);
  const combined: (Tip & { categoryLabel: string; categoryKey: TabKey })[] = primary.map((t) => ({
    ...t,
    categoryLabel: TAB_LABELS[selectedCategory] || "Current Section",
    categoryKey: selectedCategory,
  }));

  if (selectedCategory.startsWith("marketing-") && combined.length <= 2) {
    const extraKeys: TabKey[] = [
      "marketing-blog",
      "marketing-press",
      "marketing-photos",
      "marketing-banner",
      "marketing-social",
      "marketing-one-sheet",
    ];
    for (const k of extraKeys) {
      if (k === selectedCategory) continue;
      for (const t of (TIPS[k] || []).filter(matchesAudience)) {
        combined.push({ ...t, categoryLabel: TAB_LABELS[k], categoryKey: k });
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
      for (const t of (TIPS[k] || []).filter(matchesAudience)) {
        combined.push({ ...t, categoryLabel: TAB_LABELS[k], categoryKey: k });
      }
    }
  }

  if (selectedCategory !== "global") {
    for (const t of TIPS.global.filter(matchesAudience)) {
      combined.push({ ...t, categoryLabel: "Platform AI Tools", categoryKey: "global" });
    }
  }

  return combined;
}

// ─── Tech Support & Interactive Troubleshooting Guides ────────────────────────

export const TECH_SUPPORT_GUIDES: TechSupportGuide[] = [
  {
    id: "login-access",
    title: "Can't Sign In to Admin Dashboard or Reset Password",
    symptom: "Magic Link email didn't arrive, password isn't working, or Google sign-in redirects back to login.",
    category: "Account & Login",
    icon: KeyRound,
    accent: "amber",
    solutionSummary: "Admin accounts sign in at /admin/login using Password, Magic Link, or Google with the exact work email registered to your workspace.",
    steps: [
      "Go to /admin/login and make sure you are entering the exact email address invited to your organization.",
      "If your password isn't working, switch to the 'Magic Link' tab on the login screen to receive a 1-click sign-in link in your inbox.",
      "Once signed in via Magic Link or Google, open Settings → Password & Account Security to set a permanent password for future logins.",
      "If you are a Maintenance or Cleaning technician, do not use /admin/login — use /staff/maintenance or /staff/cleaning with your 6-digit PIN.",
    ],
    proTip: "Check your spam or promotions folder for emails from PropOpsIQ if a Magic Link takes more than 30 seconds to arrive.",
  },
  {
    id: "crew-pin-portal",
    title: "Field Crew 6-Digit PIN or Mobile Photo Upload Issues",
    symptom: "A technician's 6-digit PIN says invalid, or camera photos won't upload from their smartphone.",
    category: "Crew Mobile Portals",
    icon: Smartphone,
    accent: "emerald",
    solutionSummary: "Each field staff member has a role-specific portal (/staff/maintenance or /staff/cleaning) and an active 6-digit PIN managed in Settings.",
    steps: [
      "Verify the crew member is on the matching portal URL: Maintenance techs must use /staff/maintenance and Cleaners must use /staff/cleaning.",
      "In the Admin Dashboard, open Settings → Team Members, Roles & Crew PINs and confirm the staff member's profile is set to Active and verify their 6-digit PIN.",
      "For photo upload issues on iPhone (Safari) or Android (Chrome), tap the lock/settings icon in the browser address bar and ensure Camera & Photos permissions are set to 'Allow'.",
      "Have the crew member tap 'Add to Home Screen' in their mobile browser to install the PropOpsIQ Crew Web App for 1-tap daily access.",
    ],
    proTip: "You can regenerate or view any technician's 6-digit PIN at any time inside Settings → Team & Access.",
  },
  {
    id: "rent-payments-receipts",
    title: "Logging Cash, Check, Zelle & Venmo Rent + Sending Receipts & Reminders",
    symptom: "You want to log a tenant's rent payment in 1 click, configure your Zelle/Venmo handles, or send an official rent receipt.",
    category: "Rent & Payments",
    icon: DollarSign,
    accent: "emerald",
    solutionSummary: "Use the green '$ Log Rent' button on any Tenant Card or the 1-Click Rent Ledger to log payments with zero processing fees, send reminders, and print/text/email receipts.",
    steps: [
      "From the Tenants Directory: click the green '$ Log Rent' button on any tenant card, tap the payment method pill (Check, Zelle, Venmo, Cash, ACH, Cash App, Wire, Money Order, or Card), add an optional check/reference memo, and click Save.",
      "From the Rent Ledger: open the Rent Ledger view and select a payment method (e.g., Venmo, Zelle, Check, Cash) or click 'Paid' on any row — PropOpsIQ automatically marks the tenant Paid, fills their full monthly obligation, and sets Today's Date.",
      "To set up Payment Instructions: click 'Payment Instructions (Zelle / Venmo / Check)' at the top of the Rent Ledger and save your Zelle handle, Venmo @username, Cash App $cashtag, and Check payable/drop-off address once.",
      "To remind unpaid tenants: filter the Rent Ledger by 'Unpaid' and click '🔔 Remind' on any row to send a 1-tap SMS or Email pre-filled with the tenant's balance due and your saved payment instructions.",
      "To send a receipt: click '🧾 Receipt' on any paid Rent Ledger row (or inside the '$ Log Rent' modal) to print/save an Official Rent Receipt PDF or send a 1-tap text/email confirmation.",
    ],
    proTip: "PropOpsIQ charges $0 / 0% payment processing fees — your tenants pay you directly via Check, Cash, Zelle, Venmo, or ACH and you keep 100% of your rent.",
  },
  {
    id: "ai-import-ocr",
    title: "Importing Rent Rolls, Excel Spreadsheets, or Lease PDFs",
    symptom: "A spreadsheet or PDF didn't import all rows, or tenants weren't linked to a building.",
    category: "AI & Data Import",
    icon: FileSpreadsheet,
    accent: "cyan",
    solutionSummary: "The 'Import Docs / Excel' button in the top bar uses Gemini AI to extract buildings, units, and tenants from spreadsheets, PDFs, or photos.",
    steps: [
      "Click 'Import Docs / Excel' in the top navigation bar of your Admin Dashboard.",
      "Upload an .xlsx, .xls, .csv spreadsheet, a lease PDF, or a clear photo of a rent roll sheet.",
      "Review the interactive preview table before saving — you can edit any building name, suite number, monthly rent, or lease date right in the preview modal.",
      "Make sure the building name on tenant rows matches your property name so PropOpsIQ automatically links each tenant to the right building.",
    ],
    proTip: "If you have a massive workbook with multiple tabs, exporting the active Rent Roll tab as a .csv or single-sheet .xlsx gives the fastest AI extraction.",
  },
  {
    id: "custom-domain-dns",
    title: "Connecting a Custom Domain (GoDaddy, IONOS, Cloudflare)",
    symptom: "Custom domain shows 'DNS Verification Pending' or SSL certificate hasn't activated yet.",
    category: "Domains & Website",
    icon: Globe,
    accent: "blue",
    solutionSummary: "Custom domains require an A record (for root domains) or CNAME record (for subdomains) pointing to PropOpsIQ's edge network.",
    steps: [
      "Open Settings → Custom Domain Manager in your Admin Dashboard (available on the Pro tier).",
      "Enter your desired domain (e.g., yourcompany.com or properties.yourcompany.com) and click Save.",
      "Log in to your domain registrar (GoDaddy, IONOS, Namecheap, or Cloudflare) and open DNS Management.",
      "Add the exact A Record (76.76.21.21) for your root domain (@) and CNAME Record (cname.vercel-dns.com) for 'www', removing any old conflicting A records or domain forwarding.",
      "Return to Settings → Custom Domain Manager and click 'Verify DNS Connection'. Most registrars propagate within 5–30 minutes.",
    ],
    proTip: "If using Cloudflare, set the proxy cloud icon to 'DNS Only (Grey Cloud)' during initial verification so SSL provisions immediately.",
  },
  {
    id: "public-site-visibility",
    title: "Property Listing or Blog Post Not Showing on Public Website",
    symptom: "You added a building or blog article in the dashboard, but visitors don't see it on your public site.",
    category: "Domains & Website",
    icon: LayoutTemplate,
    accent: "purple",
    solutionSummary: "Public websites only display properties and blog posts that are marked 'Published' inside Website Builder and Marketing Studio.",
    steps: [
      "Click 'View Public Site' in the top-right header of your Admin Dashboard to open your live public URL (/site/your-slug).",
      "For Properties: go to the Website Builder ('Content') tab → Published Website Properties and verify the property is toggled to Published with an availability badge.",
      "For Blog Posts: go to Marketing Studio → Blog & SEO Articles and make sure the article status is 'Published' rather than 'Draft'.",
      "For Hero Banners: go to Marketing Studio → Homepage Hero Banner and click 'Save Banner Changes' after uploading or reordering slides.",
    ],
    proTip: "New workspaces start clean by default — your public website will never show placeholder demo buildings unless you explicitly load sample properties.",
  },
  {
    id: "billing-plan-unlock",
    title: "Upgrading Plans, 14-Day Free Trial & Unlocking Locked Tabs",
    symptom: "Cleaning, Marketing Studio, or Custom Domain shows a plan upgrade prompt, or you need a billing receipt.",
    category: "Billing & Plans",
    icon: CreditCard,
    accent: "rose",
    solutionSummary: "Every tier includes a 14-day free trial. You can switch tiers or download invoices anytime in Settings → Subscription & Billing.",
    steps: [
      "Open the Settings tab in your Admin Dashboard and check the Subscription & Billing card at the top.",
      "Starter ($99/mo) covers up to 5 properties & 3 team members, including Tenants, Rent Ledger, Maintenance, and Staff Mobile PIN Portal.",
      "Growth ($249/mo) covers up to 25 properties & 10 team members, including Rent Ledger, Maintenance, Cleaning, Crew Portals, Inspections, HVAC Filters, and Reports.",
      "Pro ($499/mo) unlocks Unlimited properties & team members, plus Turnkey Public Website Builder, Custom Domain hosting, Marketing Studio, AI Blog & Social Studio, Cold Outreach CRM, and Executive QBRs.",
      "After completing Stripe Checkout, your dashboard unlocks new features automatically within seconds — or click 'Manage Billing & Invoices' to download PDF receipts.",
    ],
    proTip: "Save 2 months free (17% off) anytime by switching from monthly to annual billing inside the Stripe customer portal.",
  },
];

// ─── 3-Step Quick-Start Guide for New Users ──────────────────────────────────

export const QUICK_START_STEPS = [
  {
    step: "Step 1",
    title: "Add or AI-Import Your Properties & Rent Roll",
    description:
      "Click 'Import Docs / Excel' in the top bar to upload an existing rent roll spreadsheet or PDF, or click '+ Add Property' in the Properties tab. Want to explore first? Load our 1-click editable sample portfolio.",
    tabKey: "propdetails" as TabKey,
    badge: "Takes 60 seconds",
  },
  {
    step: "Step 2",
    title: "Set Up Your Team & 6-Digit Crew PINs",
    description:
      "Go to Settings → Team Members to invite co-managers by email and create Maintenance or Cleaning crew profiles. Share /staff/maintenance or /staff/cleaning with your field techs so they can log in by PIN.",
    tabKey: "settings" as TabKey,
    badge: "No app store required",
  },
  {
    step: "Step 3",
    title: "Track Rent, Dispatch Tickets & Ask PropOpsIQ",
    description:
      "Use the Rent Ledger to track monthly payments, dispatch work orders with photo verification, and click 'Ask PropOpsIQ' anytime to get instant answers about expiring leases, overdue rent, or hot leads.",
    tabKey: "tenants" as TabKey,
    badge: "Real-time operations",
  },
];

// ─── Basic Questions & FAQ Library ────────────────────────────────────────────

export const BASIC_FAQS: FaqItem[] = [
  {
    id: "faq-import",
    category: "Getting Started",
    question: "How do I move my current properties and tenants into PropOpsIQ?",
    answer:
      "You don't have to type them one by one. Click 'Import Docs / Excel' in the top navigation bar of your dashboard and upload your current rent roll (.xlsx or .csv), lease PDF, or even a smartphone photo of a property sheet. Gemini AI extracts your buildings, units, and tenant records so you can review and save them in one click.",
    relatedTab: "global",
  },
  {
    id: "faq-sample-data",
    category: "Getting Started",
    question: "Does a new account come with fake data or start clean?",
    answer:
      "Every new PropOpsIQ workspace starts 100% clean so your reports and public website only reflect your real business. If you want to test features before importing your own buildings, you can click 'Load Sample Properties' inside the dashboard to load 4 clearly labeled demo properties that you can edit or delete anytime.",
    relatedTab: "propdetails",
  },
  {
    id: "faq-crew-login",
    category: "Crew Portals",
    question: "How do my maintenance technicians and cleaners log in on their phones?",
    answer:
      "Field staff never need an email login or password. In Settings → Team Members, create a Maintenance or Cleaning staff member and PropOpsIQ generates a unique 6-digit PIN. Maintenance techs visit /staff/maintenance and cleaners visit /staff/cleaning on any smartphone, enter their 6-digit PIN, and immediately see their assigned work orders, checklists, and photo upload tools.",
    relatedTab: "maintenance",
  },
  {
    id: "faq-crew-privacy",
    category: "Crew Portals",
    question: "Can maintenance or cleaning crews see my rent roll, tenant leases, or financials?",
    answer:
      "No. Mobile Crew Portals are strictly scoped to operational field tasks (work orders, cleaning checklists, HVAC filter changes, building inspections, and completion photos). Crew members can never access your Rent Ledger, tenant lease amounts, property valuations, or admin settings.",
    relatedTab: "maintenance",
  },
  {
    id: "faq-rent-ledger",
    category: "Daily Operations",
    question: "How do I record monthly rent payments (Check, Cash, Zelle, Venmo) and send receipts or reminders?",
    answer:
      "You can log rent in two fast ways: (1) On any Tenant Card in the Tenants Directory, click the green '$ Log Rent' button, tap a payment method pill (Check, Zelle, Venmo, Cash, ACH, Cash App, Wire, Money Order, or Card), enter an optional check/reference memo, and save — or immediately print/text/email an official receipt. (2) Open the 'Rent Ledger' and pick a payment method or click 'Paid' on any row — PropOpsIQ automatically fills the tenant's full monthly obligation and today's date in 1 click. Use '🔔 Remind' on unpaid rows to text/email payment instructions, or '🧾 Receipt' on paid rows to generate an official printable PDF receipt.",
    relatedTab: "tenants",
  },
  {
    id: "faq-payment-instructions",
    category: "Daily Operations",
    question: "Does PropOpsIQ charge payment processing fees, or can tenants pay me directly via Zelle, Venmo, Cash, or Check?",
    answer:
      "PropOpsIQ charges $0 (0%) payment processing fees and never holds your funds. Your tenants pay you directly the way you already prefer — Check, Cash, Zelle, Venmo, Cash App, ACH, or Wire. Click 'Payment Instructions (Zelle / Venmo / Check)' at the top of the Rent Ledger to save your Zelle handle, Venmo @username, Cash App $cashtag, and Check mailing/drop-off address once, and PropOpsIQ will automatically include them whenever you send a 1-tap rent reminder.",
    relatedTab: "tenants",
  },
  {
    id: "faq-lease-alerts",
    category: "Daily Operations",
    question: "How do automated lease expiration alerts work?",
    answer:
      "PropOpsIQ checks every tenant's lease end date daily. Leases approaching expiration are highlighted with clear badges at 90 days (Watch), 60 days (Soon), 30 days (Urgent), and Expired. You also get a Lease Renewal Alert summary banner at the top of your dashboard so you can start renewal conversations early.",
    relatedTab: "tenants",
  },
  {
    id: "faq-lead-scoring",
    category: "Daily Operations",
    question: "How does AI Lead Scoring decide if a prospect is Hot, Warm, or Nurture?",
    answer:
      "When a prospect submits a form on your website or you log a phone/walk-in lead, PropOpsIQ evaluates their budget, square footage needs, move-in timeline, and business type on a 0–100 scale. Scores of 75–100 are marked Hot Leads, 50–74 are Warm Leads, and under 50 are Nurture. High-value prospects ($2,500+/mo) also receive a Whale badge.",
    relatedTab: "leads",
  },
  {
    id: "faq-public-website",
    category: "Daily Operations",
    question: "How do I view and customize my company's public leasing website?",
    answer:
      "Click 'View Public Site' in the top-right corner of your Admin Header anytime to open your live site (/site/your-company-slug or your custom domain). Use the 'Website Builder' (Content) and 'Marketing Studio' tabs in the dashboard to update your hero banner, publish available properties, upload photo galleries, and publish SEO blog posts.",
    relatedTab: "content-properties",
  },
  {
    id: "faq-data-security",
    category: "Billing & Security",
    question: "Is my portfolio data private and isolated from other PropOpsIQ customers?",
    answer:
      "Yes. Every organization workspace is strictly isolated by a unique Organization ID (org_id) enforced by PostgreSQL Row-Level Security (RLS) policies and server-side authentication checks. Your properties, tenants, documents, and AI assistant queries are 100% private to your organization.",
    relatedTab: "settings",
  },
  {
    id: "faq-plans-trial",
    category: "Billing & Security",
    question: "What happens during the 14-day free trial and how do I change plans?",
    answer:
      "You get 14 days of full access to test PropOpsIQ with your own properties or sample data. You can upgrade, downgrade, or manage billing anytime under Settings → Subscription & Billing. Choose Starter ($99/mo, up to 5 properties & 3 team members), Growth ($249/mo, up to 25 properties & 10 team members + Rent Ledger, Maintenance, Cleaning, Crew Portals, Inspections, HVAC Filters & Reports), or Pro ($499/mo, unlimited properties & team members + Turnkey Public Website Builder, Custom Domain, Marketing Studio, AI Blog & Social Studio, and Cold Outreach CRM).",
    relatedTab: "settings",
  },
];

// ─── Flatten knowledge base into text context for AI Tech Support Assistant ───

export function buildHelpKnowledgeContext(): string {
  const tipLines: string[] = [];
  (Object.keys(TIPS) as TabKey[]).forEach((key) => {
    const label = TAB_LABELS[key];
    for (const tip of TIPS[key] || []) {
      const highlights = tip.highlights?.length ? ` Highlights: ${tip.highlights.join("; ")}` : "";
      tipLines.push(`[${label}] ${tip.title}: ${tip.body}${highlights}`);
    }
  });

  const supportLines = TECH_SUPPORT_GUIDES.map(
    (g) =>
      `[Tech Support - ${g.category}] ${g.title} (Symptom: ${g.symptom}) -> Solution: ${g.solutionSummary} Steps: ${g.steps.join(" | ")}`
  );

  const faqLines = BASIC_FAQS.map((f) => `[FAQ - ${f.category}] Q: ${f.question} A: ${f.answer}`);

  return [
    "=== PROPOPSIQ PRO-TIPS & FEATURE GUIDES ===",
    ...tipLines,
    "",
    "=== TECH SUPPORT & TROUBLESHOOTING GUIDES ===",
    ...supportLines,
    "",
    "=== FREQUENTLY ASKED QUESTIONS ===",
    ...faqLines,
  ].join("\n");
}
