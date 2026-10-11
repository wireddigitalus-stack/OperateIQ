"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Lightbulb, ChevronRight } from "lucide-react";

// ─── Tip Data ─────────────────────────────────────────────────────────────────

type Tip = { title: string; body: string; emoji: string };

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

const TIPS: Record<TabKey, Tip[]> = {
  teamboard: [
    {
      emoji: "💬",
      title: "Team Comm Board",
      body: "Use the Comm Board sub-tab to post updates, log issues, and discuss operations with the rest of the staff in real-time. It polls automatically.",
    },
    {
      emoji: "✅",
      title: "Shared Task Board",
      body: "Switch to the Task List sub-tab to manage team to-dos. Mark items as in-progress or done, assign staff members, and track due dates.",
    }
  ],
  global: [],
  leads: [
    {
      emoji: "🌡️",
      title: "Lead Temperature",
      body: "Every lead gets a Score (0–100). Hot Lead = 75+, Warm Lead = 50–74, Nurture = below 50. The AI updates scores automatically based on budget, timeline, and fit.",
    },
    {
      emoji: "📞",
      title: "Printing the Call Sheet",
      body: "Use the green '🖨️ Print Call Sheet' button near the top right of the Leads tab. A clean, formatted list of every lead opens — ready to print or save as PDF.",
    },
    {
      emoji: "🐋",
      title: "Whale Detector",
      body: "The Whale badge (🐋) automatically flags leads with large team sizes or high budgets. These are priority prospects — contact them first.",
    },
    {
      emoji: "🔍",
      title: "Filtering Leads",
      body: "Use the colored filter buttons (Hot, Warm, Nurture, Whale, New Today) to narrow your list before printing the call sheet — only the filtered leads will appear on the printed page.",
    },
    {
      emoji: "📋",
      title: "Call Log",
      body: "Click the phone icon on any lead to log a call. You can record the outcome (Interested, Left Voicemail, etc.) and add notes. This keeps your team on the same page.",
    },
    {
      emoji: "⭐",
      title: "Starring a Lead",
      body: "Click the star ⭐ icon to mark a lead as high priority. Starred leads float to the top so they're easy to find.",
    },
    {
      emoji: "🤖",
      title: "AI Chat Leads",
      body: "When a visitor chats with the AI Space Advisor and shares contact info, it auto-creates a lead in your dashboard tagged 'ai-chat.' These visitors have already engaged with your property info — they're warm by default.",
    },
    {
      emoji: "📍",
      title: "Lead Source Tracking",
      body: "Every lead is tagged with its source: website form, AI chat, QR code (in-person), Facebook, or Instagram. Use these tags to see which channels bring the most qualified prospects. Check Analytics for a full breakdown.",
    },
    {
      emoji: "📦",
      title: "Archiving Old Leads",
      body: "Don't delete dead leads — archive them. Click the archive icon to move them off your active list. They're kept forever in the Archive tab and can be restored any time if they come back.",
    },
    {
      emoji: "💬",
      title: "Lead Comments & Notes",
      body: "Click 'Add Note' on any lead to log internal team commentary — follow-up outcomes, showing feedback, or pricing discussions. Notes are timestamped and visible to all admins.",
    },
  ],
  tenants: [
    {
      emoji: "📥",
      title: "Importing Tenants from Excel",
      body: "Click '+ Add Tenant' then choose 'Import from Excel / CSV'. Upload your spreadsheet and the system will auto-map the columns to tenant profiles — you can edit every field after.",
    },
    {
      emoji: "🏢",
      title: "Property Dropdown",
      body: "The Building / Property field is a dropdown menu of all properties in the portfolio. Select the correct property to ensure the tenant shows up on the right Property Details card. No more typing property names by hand.",
    },
    {
      emoji: "🎤",
      title: "Voice Input (Speech-to-Text)",
      body: "Look for the small microphone icon (🎤) next to text fields. Click it, speak, and the text fills in automatically. Works in Chrome, Edge, and Safari. Great for quickly entering contact names, notes, and unit numbers without typing.",
    },
    {
      emoji: "💰",
      title: "Fee Tracking",
      body: "Each tenant tracks multiple fee types: Monthly Rent, Utilities Fee, NNN Fee (Triple Net), Cleaning Fee, CAM Fee, and NN Fee. All fees display as color-coded chips on the tenant card for quick reference.",
    },
    {
      emoji: "🔄",
      title: "Renewal Escalation %",
      body: "Set the 'Renewal Escalation %' to track annual rent increases. The system calculates and displays the dollar increase automatically. The 'Auto Renewal Date' field tracks when the renewal kicks in.",
    },
    {
      emoji: "🖨️",
      title: "Printing the Tenant Roster",
      body: "Use the 'Print Roster' button to generate a clean PDF of all current tenants — great for weekly team reviews.",
    },
    {
      emoji: "📁",
      title: "Tenant Profiles",
      body: "Each tenant card stores their name, unit, phone, email, lease dates, and payment status. Click on a tenant to expand or edit their profile.",
    },
    {
      emoji: "💬",
      title: "Tenant Notes",
      body: "Click 'Add Note' on any tenant card to log internal team commentary — lease renewal discussions, maintenance issues, or payment follow-ups. Notes are timestamped with the author's name and visible to all admins.",
    },
    {
      emoji: "📊",
      title: "Activity Trail",
      body: "Every tenant action — adding, editing, status changes, and notes — is logged in the Activity tab with the name of the admin who performed it. Use this for audit trails and team accountability.",
    },
    // ── Rent Ledger tips ──
    {
      emoji: "💰",
      title: "Rent Ledger — How It Works",
      body: "Open the green Rent Ledger panel at the top of this tab. Select a month, click 'Generate' to auto-populate rows for all active tenants. Rent amounts pull directly from each tenant's card — no manual entry needed.",
    },
    {
      emoji: "💾",
      title: "Rent Ledger — Auto-Save",
      body: "Every field change in the Rent Ledger saves automatically in the background. Even if the browser closes, your data persists. The Submit button doesn't save — it locks the month as a permanent record.",
    },
    {
      emoji: "➕",
      title: "Rent Ledger — Fee Columns",
      body: "Fee columns (NN, NNN, Utility, Cleaning, and CAM) now auto-fill directly from each tenant's card when you generate a new month. No more searching through contracts to find the split amounts.",
    },
    {
      emoji: "✅",
      title: "Rent Ledger — Smart Totals",
      body: "When you click the 'Paid' checkmark for a tenant, the system automatically sums up the Base Rent and all individual fees to calculate the total amount paid in one click.",
    },
    {
      emoji: "💳",
      title: "Rent Ledger — Payment Type",
      body: "Use the Type dropdown to record how each payment was received: ACH, Cash, or Check. This helps your bookkeeper reconcile deposits and creates a clear audit trail.",
    },
    {
      emoji: "🔒",
      title: "Rent Ledger — Submitting a Month",
      body: "Click 'Submit' at the bottom to lock all entries for that month. Once submitted, fields become read-only. The record appears in Payment Records with the date and name of who submitted it.",
    },
    {
      emoji: "📥",
      title: "Rent Ledger — Export & Print",
      body: "Click 'CSV' to download a spreadsheet of the current month (or any history month). Click 'Print' for a formatted printout. Great for monthly reporting.",
    },
    {
      emoji: "💲",
      title: "Rent Ledger — Late Fees",
      body: "Enter late fee amounts as a dollar value in the Late Fee column. Since different tenants have different terms, this is a manual entry so you can apply the correct penalty per lease agreement.",
    },
  ],
  propdetails: [
    {
      emoji: "🎯",
      title: "Occupancy Ring — What It Measures",
      body: "The circular gauge on each property card is your Occupancy Rate: (matched tenants ÷ Total Units) × 100%. Green = fully occupied, yellow = partially filled, gray = no tenants linked. It pulls tenant data live from the Tenants tab.",
    },
    {
      emoji: "🔢",
      title: "Set Total Units First",
      body: "Expand 'Property Financials' on any card and set the Total Units field to the real number of leasable units. Without this, the system defaults to counting linked tenants — which always shows 100%. For accurate occupancy, set the real count (e.g., City Centre = 20 units).",
    },
    {
      emoji: "💰",
      title: "P&L Financials",
      body: "Each property card tracks Revenue (sum of tenant rents), Expenses (city/county taxes, insurance, fire/security, gas, internet, electric, water, and other), and Net P&L. Enter annual figures in 'Property Financials' and the system auto-calculates monthly breakdowns (Total / 12).",
    },
    {
      emoji: "📊",
      title: "Portfolio KPI Bar",
      body: "The summary bar at the top shows total properties, total tenants, combined revenue, and net P&L across your entire portfolio. These numbers update automatically as you add tenants and fill in property financials.",
    },
    {
      emoji: "🏢",
      title: "How Tenants Link to Properties",
      body: "Tenants connect to properties by the property selected in the dropdown on the Tenants tab. The match is exact — select 'Sample Office Building' and the tenant appears on that property's card here. If a tenant doesn't match any property, it shows in an orange 'Unassigned Tenants' section at the bottom so nothing gets lost.",
    },
    {
      emoji: "⚡",
      title: "Unassigned Tenants",
      body: "If any tenants have an old or mismatched building name, they'll appear in an orange 'Unassigned Tenants' section below the property cards. To fix: go to the Tenants tab, edit the tenant, and select the correct property from the dropdown.",
    },
    {
      emoji: "⚠️",
      title: "Lease Expiry Alerts",
      body: "Tenants with leases expiring within 90 days show a yellow 'Xd left' badge. Expired leases show red. A banner at the bottom of the tab warns you of total upcoming expirations — use this to plan renewal conversations early.",
    },
    {
      emoji: "📈",
      title: "Vacancy Trend Tracking",
      body: "Set each property's trend to Improving (↑), Stable (→), or Declining (↓) in the financials section. This shows as a colored badge on the card header — helpful for quarterly reviews and investor reporting.",
    },
    {
      emoji: "🖨️",
      title: "Print Portfolio Report",
      body: "Click 'Print Report' to generate a formatted portfolio summary with every property's occupancy, revenue, expenses, P&L, tenant list, and lease dates. Use 'Save as PDF' in the print dialog for a clean one-click investor report.",
    },
    {
      emoji: "📉",
      title: "P&L History Chart",
      body: "The Portfolio P&L History chart shows revenue and expense trends over time. Each time you save property financials, a snapshot is recorded. Over weeks and months this builds into a visual trend line for board meetings and lender reviews.",
    },
    {
      emoji: "🏆",
      title: "CEO Overview Card",
      body: "The top-level Portfolio Overview card gives you the executive summary: total portfolio value, weighted occupancy across all properties, average rent per unit, and overall health score. It's designed to answer 'how's the portfolio doing?' in one glance.",
    },
    {
      emoji: "➕",
      title: "Adding a New Property",
      body: "Click the green '+ Add Property' button in the header. Fill in the name, type, city, address, and square footage. The property appears immediately as a new card with its own occupancy ring, financials accordion, and tenant matching — no code changes needed.",
    },
    {
      emoji: "✏️",
      title: "Renaming a Property",
      body: "Click the pencil icon (✏️) next to any property name to rename it. This sets an internal 'display name' that controls how it appears in the dashboard and printed reports. The original system name is preserved underneath so nothing else breaks. Hit Enter or click Save to commit.",
    },
    {
      emoji: "🗑️",
      title: "Removing a Custom Property",
      body: "Properties you added through the dashboard show a small 'Remove' link in the card header. Click it and confirm to permanently delete. Note: the 9 original SEO-linked properties cannot be deleted — only renamed.",
    },
    {
      emoji: "📉",
      title: "Missed Revenue Tracking",
      body: "The Executive Overview KPI card now features a 'Missed Revenue' metric. This sums up the potential monthly rents of all vacant suites and buildings so owners can track unrealized income in one click.",
    },
    {
      emoji: "🔑",
      title: "Adding Unleased Spaces",
      body: "Scroll to the bottom of the Prop Details tab and click '+ Add Unleased Space' to register a vacant suite or building with its expected monthly rent and square footage. They are listed under 'Available Properties'.",
    },
  ],
  maintenance: [
    {
      emoji: "🔧",
      title: "Creating a Work Order",
      body: "Click '+ New Work Order' to log a maintenance request. Set priority (Low / Medium / High / Urgent) and assign it to a team member. The ticket appears instantly in both the admin dashboard and the staff portal.",
    },
    {
      emoji: "🖨️",
      title: "Printing Work Orders",
      body: "The 'Print Work Orders' button generates a formatted list of all active maintenance tickets — perfect for your maintenance crew.",
    },
    {
      emoji: "✅",
      title: "Completing Jobs from the Portal",
      body: "Staff complete jobs directly from /staff/maintenance. They tap 'Complete', then log notes about the work performed, actual time spent (in minutes), and close the ticket. All metadata is saved to the admin dashboard.",
    },
    {
      emoji: "📱",
      title: "Mobile Home Screen Apps",
      body: "The Maintenance and Cleaning portals now function as standalone apps. When staff 'Add to Home Screen' on their iPhones or Androids, they get a dedicated app experience with the Hammer or Broom icon and direct access to their dashboard.",
    },
    {
      emoji: "🏢",
      title: "Tenant & Unit Tracking",
      body: "You can now specify both the Business Name (Tenant) and the Unit Number on every maintenance ticket. This makes it easy for the crew to find the right door even if they haven't memorized all the addresses yet.",
    },
    {
      emoji: "🔥",
      title: "Security & Fire Category",
      body: "Added a dedicated 'Security/Fire' category for tracking inspections, alarms, and safety-related work orders.",
    },
    {
      emoji: "🛠️",
      title: "Parts Needed Workflow",
      body: "If a tech discovers they need parts, they tap 'Need Parts' in the completion sheet. The ticket flips back to 'Scheduled' with a dedicated parts_needed flag in the database — visible as an orange badge in both the staff portal and admin queue so you know exactly which jobs are waiting on materials.",
    },
    {
      emoji: "📱",
      title: "Staff Portal Access",
      body: "Your maintenance team has a dedicated portal at /staff/maintenance. They log in with a 6-digit PIN (no email needed) and see their assigned tickets. The portal has two views: 'My Tickets' (assigned to them) and 'All Open' (every pending job). Manage PINs in Settings > Portal Access.",
    },
    {
      emoji: "📸",
      title: "Photo Documentation",
      body: "Staff can attach photos to work orders from their portal — perfect for documenting issues before and after repair. Photos sync to the admin dashboard in real-time.",
    },
    {
      emoji: "💬",
      title: "Admin Notes on Tickets",
      body: "Click 'Add Note' on any work order from the admin dashboard. Notes are timestamped with the author's name and visible to all admins — great for tracking updates, vendor calls, or scheduling changes.",
    },
    {
      emoji: "🚨",
      title: "Priority Levels Matter",
      body: "Set priority correctly: Urgent = safety hazard or water leak (respond same-day), High = tenant can't operate normally, Medium = cosmetic or minor, Low = scheduled improvement. Your team should tackle Urgent first — always.",
    },
    {
      emoji: "📊",
      title: "Activity Trail",
      body: "Every maintenance action — creation, status change, completion, and parts request — is logged in the Activity tab with the name of the person who performed it. Use this for accountability and reporting.",
    },
  ],
  cleaning: [
    {
      emoji: "📅",
      title: "Creating Cleaning Jobs",
      body: "Click '+ New Job' in the Cleaning tab to create a task. Assign it to a staff member, set the area/zone, and it appears instantly in both the dashboard and the staff portal.",
    },
    {
      emoji: "🖨️",
      title: "Printing the Cleaning Schedule",
      body: "Use the 'Print Schedule' button to hand a printed weekly schedule to your cleaning crew — no login required for them.",
    },
    {
      emoji: "✅",
      title: "Completing Jobs from the Portal",
      body: "Cleaning staff tap 'Complete' on their assigned job, then log notes (what was cleaned, any issues found) and actual time spent. The completion flows back to the admin dashboard with full details.",
    },
    {
      emoji: "📱",
      title: "Staff Portal Access",
      body: "Cleaning staff have their own portal at /staff/cleaning. They log in with a 6-digit PIN and see their assigned tasks. The portal works on any phone browser — no app download needed.",
    },
    {
      emoji: "🏢",
      title: "Cleaning Areas",
      body: "Tasks are organized by property area: lobbies, restrooms, common areas, offices, and exteriors. Each area can have different frequencies (daily, weekly, bi-weekly) so you can customize the schedule to each building.",
    },
    {
      emoji: "📊",
      title: "Activity Trail",
      body: "Every cleaning action — job creation, assignment, and completion — is logged in the Activity tab with the staff member's name and timestamp. Use this for accountability reviews and tenant reporting.",
    },
  ],
  analytics: [
    {
      emoji: "📊",
      title: "Dashboard Overview",
      body: "The Analytics tab shows lead trends, conversion rates, pipeline health, and source breakdowns over time. Use it in team meetings to report on the month's activity — no manual spreadsheet work needed.",
    },
    {
      emoji: "🤖",
      title: "AI Market Brief",
      body: "The AI-generated Market Brief at the top summarizes what your lead data is telling you in plain English — no spreadsheets needed.",
    },
    {
      emoji: "📈",
      title: "Reading the Charts",
      body: "Hover over any bar or data point on the charts for an exact number. The charts auto-scale based on your current lead volume.",
    },
    {
      emoji: "📍",
      title: "Lead Source Breakdown",
      body: "See which channels (website, AI chat, QR codes, Facebook, Instagram) are generating the most leads. Use this to double down on what's working and adjust spend on what isn't.",
    },
    {
      emoji: "🔄",
      title: "Pipeline Health",
      body: "The pipeline breakdown shows how many leads are Hot, Warm, or Nurture. A healthy pipeline has leads across all stages. If everything is Nurture, your qualification criteria may be too strict. If everything is Hot, you might not be capturing enough top-of-funnel.",
    },
    {
      emoji: "📥",
      title: "Export for Meetings",
      body: "Screenshot or print the Analytics view for team meetings. The AI Market Brief at the top gives you a ready-to-read executive summary — no prep needed.",
    },
  ],
  marketing: [
    {
      emoji: "📣",
      title: "Marketing Hub",
      body: "The Marketing tab is your content command center. Pick a sub-tab to create press releases, blog articles, manage photos, update the homepage banner, add properties, or generate AI social copy.",
    },
    {
      emoji: "📲",
      title: "Social Capture Links",
      body: "Need links for social posts? Go to Settings > Social Capture Links to copy property-specific URLs for FB and IG. Each link highlights the featured property on the landing page — great for cohesive campaigns.",
    },
    {
      emoji: "🎯",
      title: "The Content Pipeline",
      body: "Best workflow: 1) Add/update a property in Properties tab → 2) Upload photos in Photos → 3) Generate social copy in Social → 4) Create a blog post in Blog → 5) Update the banner in Banner. Each step builds on the previous one.",
    },
    {
      emoji: "📡",
      title: "Market Intel Radar",
      body: "Don't forget the Market Intel sub-tab. It scans real-time news for companies expanding, relocating, or signing leases in your market — giving you leads before they even start looking.",
    },
  ],
  "marketing-press": [
    {
      emoji: "🗞️",
      title: "When to Write a Press Release",
      body: "Use press releases for signed leases, new property additions, business expansions, and community milestones. Local media actively picks up commercial real estate news.",
    },
    {
      emoji: "✏️",
      title: "Keep It Newsworthy",
      body: "A strong release answers: Who? What? Where? When? Why does it matter? Lead with the most important fact in the first paragraph — editors decide in seconds.",
    },
    {
      emoji: "📧",
      title: "Where to Submit",
      body: "Target your local newspaper, business journal, and TV news desks. Paste the full release in the email body with the headline as the subject line — no attachments.",
    },
  ],
  "marketing-blog": [
    {
      emoji: "📝",
      title: "Blog = Local SEO",
      body: "Blog posts help your site rank for searches like 'office space [your city]' or 'commercial real estate [your region].' One post per month keeps you visible in Google.",
    },
    {
      emoji: "🔗",
      title: "Always Link to Listings",
      body: "Every blog post should link to at least one relevant property. This drives readers directly to your available spaces and improves on-site time.",
    },
    {
      emoji: "🔄",
      title: "Repurpose Content",
      body: "A single blog post can become 3–4 social media posts, an email newsletter, and a press release angle. Write once, distribute everywhere.",
    },
    {
      emoji: "📤",
      title: "Mobile Photo Uploads",
      body: "You can upload featured photos directly from your phone inside the Blog Editor. The system compresses large phone photos to fast-loading WebP images before uploading.",
    },
    {
      emoji: "📥",
      title: "Importing Static Articles",
      body: "Static posts coded directly in the site cannot be edited until imported. Click the 'Import' button on the blog list to move them to the database to manage photos and copy.",
    },
    {
      emoji: "🤖",
      title: "AI SEO Check Panel",
      body: "Use the AI SEO Panel in the blog editor to check character counts, review Google search appearance previews, and audit target keyword density before publishing.",
    },
  ],
  "marketing-photos": [
    {
      emoji: "📸",
      title: "Upload Multiple Photos at Once",
      body: "In the Property Gallery Manager, click the green 'Add' button on any property card. You can select multiple images at the same time — hold Shift or Cmd/Ctrl to pick several files. They all upload together and are added to that property's gallery instantly.",
    },
    {
      emoji: "⭐",
      title: "Setting the Hero Image",
      body: "The hero image is the one shown on listing cards, the homepage banner, and one-sheet PDFs. To set it: expand a property card with the arrow button, hover over any photo in the grid, then click the yellow ★ star icon. A 'HERO' badge will appear on that photo.",
    },
    {
      emoji: "🗂️",
      title: "Managing & Removing Photos",
      body: "Expand any property by clicking the arrow button on its card. Hover over a photo to reveal the action buttons: ★ to make it the hero, or the red trash icon to remove it. Removed photos are taken down immediately — no refresh needed.",
    },
    {
      emoji: "🔢",
      title: "Photo Count Badge",
      body: "The small blue number badge on each property thumbnail shows how many photos are currently uploaded for that property. A badge means you have custom gallery photos live. No badge means only the default site image is in use.",
    },
    {
      emoji: "🌐",
      title: "Changes Go Live Instantly",
      body: "All photos are stored in Supabase cloud storage — not on the server. The moment you upload or change the hero, it updates on the live website for all visitors. No redeploy needed.",
    },
    {
      emoji: "🏢",
      title: "What Photos to Capture",
      body: "For each property aim for: exterior street view, lobby or entry, main workspace, any standout features (exposed brick, high ceilings, kitchen, bar), and amenity spaces. 4–6 strong photos per property is the sweet spot for the gallery carousel.",
    },
  ],
  "marketing-banner": [
    {
      emoji: "🎨",
      title: "One Message at a Time",
      body: "The most effective banners have a single clear headline and one CTA button. Avoid crowding text — visitors make a decision in under 3 seconds.",
    },
    {
      emoji: "🔄",
      title: "Refresh Quarterly",
      body: "Update the banner to reflect what's most important right now: a new property, a seasonal message, or a market update. Stale banners signal inactivity to visitors.",
    },
    {
      emoji: "📱",
      title: "Always Check Mobile",
      body: "After any banner change, view the site on your phone. The headline and button should be fully visible without scrolling on a 6-inch screen.",
    },
  ],
  "marketing-properties": [
    {
      emoji: "🏗️",
      title: "Fill Every Field",
      body: "Complete property descriptions power AI social copy, blog content, and one-sheet PDFs. The more detail you add, the better the AI output — don't skip features or the description.",
    },
    {
      emoji: "📍",
      title: "Use Location Keywords",
      body: "Include nearby landmarks and neighborhoods in descriptions (e.g., 'steps from downtown Main Street,' 'minutes from the interstate'). This improves local SEO and AI content quality.",
    },
    {
      emoji: "🔢",
      title: "Verify Square Footage",
      body: "Always double-check sq. ft. before publishing — it's the first number prospects ask about. Inconsistencies between the listing and the space hurt credibility fast.",
    },
  ],
  "marketing-social": [
    {
      emoji: "⚡",
      title: "Full Content Package in 10 Seconds",
      body: "Pick your property, set a tone, then type a quick hook in the 'What's the hook?' field — e.g. \"First month free\" or \"Just renovated the lobby\" — and click Generate. You get Facebook, Instagram, LinkedIn, a Story caption, and 20 hashtags all at once.",
    },
    {
      emoji: "✏️",
      title: "The Hook Field is Your Secret Weapon",
      body: "The hook field tells the AI what's special right now. Try: \"Move-in ready\", \"Limited availability — only 2 suites left\", \"New signage and parking just added\", or \"Book a tour this week and get first month free\". The more specific you are, the better the copy.",
    },
    {
      emoji: "#️⃣",
      title: "Hashtag Bank — Use the First Comment",
      body: "Click 'Copy all' next to the Hashtag Bank, then on Instagram paste them as the FIRST COMMENT on your post — not in the caption. This keeps captions clean and readable while still getting full hashtag reach.",
    },
    {
      emoji: "📖",
      title: "Story Caption = Overlay Text",
      body: "The Story Caption is ultra-short (under 12 words) and designed to be typed or pasted as a text overlay on your Instagram or Facebook Story photo or video. Pair it with a bold font and a CTA sticker.",
    },
    {
      emoji: "💼",
      title: "Don't Skip LinkedIn",
      body: "LinkedIn is where business owners and investors look for commercial space. Post the LinkedIn copy on Tuesday, Wednesday, or Thursday between 8–10am ET — those 3 days get 3× the reach of Fridays or weekends.",
    },
    {
      emoji: "📅",
      title: "Schedule Everything at Once",
      body: "After generating, copy the Facebook and Instagram posts into Meta Business Suite (business.facebook.com) to schedule both platforms at the same time. Best times: Tuesday–Thursday 9am–1pm for FB, 11am–1pm for IG.",
    },
  ],
  "marketing-intel": [
    {
      emoji: "📡",
      title: "What the Radar Scans",
      body: "Market Intel scans Google News, BusinessWire, and PR Newswire in real-time for keywords like 'office relocation,' 'expanding operations,' 'new headquarters,' and 'commercial lease' — focused on your state, region, and city.",
    },
    {
      emoji: "🔥",
      title: "Understanding Scores",
      body: "Gemini AI reads every headline and rates it: 🔥 Hot = company actively relocating or expanding near us, 🟡 Warm = expansion that could target our area, ❄️ Cold = CRE-related but unlikely prospect. Irrelevant items are auto-filtered out entirely.",
    },
    {
      emoji: "🎯",
      title: "Actioning a Hot Lead",
      body: "When you see a 🔥 Hot signal, click to expand it and read the AI analysis. Then click 'Read Article' for the full story. If it's legit, note the company name and reach out directly — you now know they're in the market before your competitors do.",
    },
    {
      emoji: "⏱️",
      title: "How Often to Scan",
      body: "Click 'Scan Now' once daily — ideally Monday and Wednesday mornings. News feeds update throughout the day, so morning scans catch the previous day's press releases and announcements.",
    },
    {
      emoji: "📋",
      title: "Pair with Google Alerts",
      body: "For 24/7 coverage, set up free Google Alerts for phrases like: 'relocating headquarters [your state]', 'new office [your region]', 'expanding operations [your city].' Alerts go to your inbox so you catch signals even between dashboard scans.",
    },
    {
      emoji: "🧠",
      title: "Why Warm Signals Matter",
      body: "Don't ignore 🟡 Warm signals — a company expanding anywhere in your region could be persuaded to choose your city. Track warm companies over weeks; if the same name appears multiple times, that's a pattern worth a cold outreach.",
    },
    {
      emoji: "🚀",
      title: "Phase 3 Roadmap",
      body: "This is Phase 2 (RSS + AI scoring). Phase 3 will add job posting monitoring (companies posting roles in your market = expansion signal), SEC filing analysis for lease expirations, and automatic weekly email digests of hot leads.",
    },
  ],
  "marketing-one-sheet": [
    {
      emoji: "🏢",
      title: "What Is a One-Sheet?",
      body: "A Property One-Sheet is a single-page branded PDF brochure for a property. It includes the photo, description, features, specs, and OperateIQ's contact info — perfect for a site tour or email attachment.",
    },
    {
      emoji: "🖨️",
      title: "How to Generate a PDF",
      body: "Click a property card to select it (it glows green), then click 'Generate One-Sheet PDF'. A new window opens with the brochure. In the print dialog, choose 'Save as PDF', Paper: Letter, Margins: None.",
    },
    {
      emoji: "📧",
      title: "When to Use It",
      body: "Email it to a prospect before a showing, print a stack for open houses, or include it in a lease proposal folder. Looks professional every time.",
    },
    {
      emoji: "🔄",
      title: "Always Up to Date",
      body: "The one-sheet pulls live data from the OperateIQ platform. Any time property info is updated in the system, the next generated PDF reflects those changes automatically.",
    },
  ],
  archived: [
    {
      emoji: "📦",
      title: "What's in the Archive?",
      body: "Archived leads are contacts who didn't convert, went cold, or were disqualified. They're kept here for reference — you can restore any lead to active at any time.",
    },
    {
      emoji: "♻️",
      title: "Restoring a Lead",
      body: "Click the restore icon on any archived lead to move them back to the active Leads tab. Useful when a cold lead re-engages after a few months.",
    },
    {
      emoji: "🔎",
      title: "Mining the Archive",
      body: "Review archived leads monthly. Market conditions change — someone who said 'not now' 3 months ago might be ready today. A quick call to archived leads costs nothing and can surface hidden revenue.",
    },
    {
      emoji: "📊",
      title: "Archive Tells a Story",
      body: "Your archive size shows how many prospects you've engaged total. Use this number in meetings: 'We've engaged 200+ commercial prospects this quarter' — even if most didn't convert, it proves pipeline activity.",
    },
  ],
  settings: [
    {
      emoji: "👤",
      title: "Managing Team Access",
      body: "The Portal Access section manages who can log into the Admin, Maintenance, and Cleaning portals. Each person gets a 6-digit PIN — no email/password needed for staff portals. Add or remove team members and manage PINs right from the staff list.",
    },
    {
      emoji: "🔑",
      title: "Staff PIN System",
      body: "Maintenance and cleaning staff log in using a 6-digit PIN on a keypad — no Gmail required. PINs are fully editable: click the pencil icon next to any staff member's PIN to type a custom one, or click the dice icon to auto-generate a random 6-digit PIN. Changes save instantly. Default PIN for new staff is 123456 — change it immediately.",
    },
    {
      emoji: "🔄",
      title: "Resetting a PIN",
      body: "Lost or compromised PIN? Click the pencil icon on the staff row, then the dice button to generate a new random PIN instantly. The old PIN stops working immediately — share the new one via text using the copy button.",
    },
    {
      emoji: "🔔",
      title: "Email Notifications",
      body: "The Notifications section shows exactly who receives email alerts and what triggers them. Currently, new leads from the chatbot and contact form automatically email the recipients configured in LEAD_NOTIFY_TO. SMS alerts and per-user customization are coming soon.",
    },
    {
      emoji: "📊",
      title: "Data Export",
      body: "Download all leads as a CSV file from the Data Import/Export section. The export includes every field: name, email, phone, score, source, status, notes, and timestamps. Great for importing into a CRM or sharing with partners.",
    },
    {
      emoji: "📒",
      title: "QuickBooks Desktop Export",
      body: "Export your tenant data directly for QuickBooks Desktop. Go to Settings → Data Import/Export and click 'Export for QuickBooks'. You'll get two files: an IIF file (QuickBooks native import) with customer lists and monthly invoices, plus an Excel rent roll. Import the IIF in QB via File → Utilities → Import → IIF Files.",
    },
    {
      emoji: "📲",
      title: "Social Capture Links",
      body: "The Social Capture Links card gives you ready-to-copy URLs for Facebook and Instagram posts. Each link can feature a specific property — so when you post about a specific building, the landing page highlights it with a hero card, photo, and CTA. Just click the 📘 FB or 📷 IG button next to the property to copy the link.",
    },
    {
      emoji: "🔗",
      title: "How Featured Links Work",
      body: "When you copy a link like '/l/fb?feature=sample-office', anyone clicking that link from your Facebook post sees a branded page with that property front and center — big hero image, description, tags, and a 'View This Property' button. Other properties still appear below. No feature param = all properties shown equally.",
    },
    {
      emoji: "🤝",
      title: "QR Meet Pages",
      body: "Each team member has a personal QR code page at yoursite.com/meet/[name]. When scanned in person, prospects fill out a quick form and the lead is auto-captured in your dashboard tagged 'qr / in-person' with the team member's name as the campaign source.",
    },
    {
      emoji: "👁️",
      title: "Activity Log Identity",
      body: "Every action in the dashboard is logged with the name of the admin who performed it — not just 'Admin.' The system reads your name from your user profile. Make sure each admin account has a proper name set in the staff list for accurate audit trails.",
    },
    {
      emoji: "🛡️",
      title: "AI Login Guard Score",
      body: "The AI Login Guard monitors login attempts and calculates a real-time Security Score (0–100). Standard logins from authorized emails at typical hours maintain a high score, while anomalies or blocked attempts drop the score to signal possible threats.",
    },
    {
      emoji: "🚨",
      title: "Evaluating Login Anomalies",
      body: "The AI checks for parameters like unusual login hours (e.g. 3 AM logins), unrecognized email signatures, and brute-force patterns. You can test the system's response by clicking 'Simulate Login Threat' to run a demo evaluation safely.",
    },
    {
      emoji: "🗑️",
      title: "Danger Zone",
      body: "The red 'Delete All Leads' button permanently removes every lead from the database. You must type the exact confirmation phrase to proceed. This cannot be undone — always export a CSV backup first.",
    },
  ],

  content: [
    {
      emoji: "🗺️",
      title: "Page Map Blueprint",
      body: "Click the 'Page Map' header at the top to open an interactive wireframe of your homepage. Each section is drawn as a mini blueprint — click any block to instantly jump to that section's editor fields below.",
    },
    {
      emoji: "🔗",
      title: "Section ↔ Editor Sync",
      body: "When you click a section on the Page Map, animated connector lines link the wireframe block to its editor. The active section glows green on both the map and the editor card so you always know exactly what you're editing.",
    },
    {
      emoji: "📝",
      title: "Editing Content",
      body: "Expand any section to see its editable fields — headlines, descriptions, stats, button text. Type your changes and they're tracked instantly. The blue badge shows how many fields you've customized in each section.",
    },
    {
      emoji: "↩️",
      title: "Reverting to Defaults",
      body: "Every field has a revert button (↩️). Click it to delete your customization and restore the original text — no need to remember what the default was.",
    },
    {
      emoji: "💾",
      title: "Saving Changes",
      body: "Hit the green Save button at the top to push all your edits live. Changes appear on the website within 60 seconds — no deploy or code changes needed.",
    },
    {
      emoji: "🎨",
      title: "Color-Coded Sections",
      body: "Each section on the Page Map has its own color: Hero=green, Stats=blue, Services=purple, Reviews=pink, FAQ=yellow, CTA=orange, Footer=slate. This makes it easy to identify sections at a glance.",
    },
  ],
  "content-homepage": [
    {
      emoji: "🗺️",
      title: "Page Map Blueprint",
      body: "Click the 'Page Map' header at the top to open an interactive wireframe of your homepage. Each section is drawn as a mini blueprint — click any block to instantly jump to that section's editor fields below.",
    },
    {
      emoji: "📝",
      title: "Editing Content",
      body: "Expand any section to see its editable fields — headlines, descriptions, stats, button text. Type your changes and they're tracked instantly. The blue badge shows how many fields you've customized in each section.",
    },
    {
      emoji: "💾",
      title: "Saving Changes",
      body: "Hit the green Save button at the top to push all your edits live. Changes appear on the website within 60 seconds — no deploy or code changes needed.",
    },
    {
      emoji: "🎨",
      title: "Color-Coded Sections",
      body: "Each section on the Page Map has its own color: Hero=green, Stats=blue, Services=purple, Reviews=pink, FAQ=yellow, CTA=orange, Footer=slate. This makes it easy to identify sections at a glance.",
    },
  ],
  "content-markets": [
    {
      emoji: "🔴",
      title: "SEO Importance Badges",
      body: "Every field has a colored badge: 🔴 Critical SEO = changes here directly affect Google rankings. 🟡 Important = helps SEO but less risky. 🟢 Safe to Edit = change freely without SEO impact.",
    },
    {
      emoji: "📏",
      title: "Character Counters",
      body: "SEO titles should be 50–60 characters. Meta descriptions should be 140–160 characters. The counter turns green when you're in the ideal range, yellow when close, and red when too short or too long.",
    },
    {
      emoji: "🔑",
      title: "Keyword Checker",
      body: "For critical fields (H1, SEO Title, Meta Description), the system checks if your key SEO keywords are still present. If you accidentally delete a keyword like your city name or 'commercial real estate' — you'll see a red warning immediately.",
    },
    {
      emoji: "🔍",
      title: "Google Search Preview",
      body: "On meta description fields, you'll see a live preview of exactly how your page will look in Google search results. If the title gets cut off or the description is too long, you'll see it happen in real-time.",
    },
    {
      emoji: "👁️",
      title: "View SEO Original",
      body: "If you change a field, a 'View SEO Original' button appears. Click it to see the professionally written original text — perfect for reference if you want to keep the same keyword structure.",
    },
    {
      emoji: "🛡️",
      title: "Safe Fields to Edit Freely",
      body: "Fields marked 🟢 Safe to Edit — like population, median income, employers, highways — have zero SEO impact. Change these any time without worrying about rankings.",
    },
    {
      emoji: "❓",
      title: "FAQ Best Practices",
      body: "FAQ questions should match how real people search on Google (e.g., 'How much does office space cost in [your city]?'). Google can display these directly in search results as rich snippets — powerful free exposure.",
    },
    {
      emoji: "↩️",
      title: "One-Click Reset",
      body: "Made a mistake? Every field has a Reset button that instantly restores the SEO-optimized original text. No guessing what it used to say.",
    },
  ],
  "content-pages": [
    {
      emoji: "🔴",
      title: "SEO Importance Badges",
      body: "Every field has a colored badge: 🔴 Critical SEO = changes here directly affect Google rankings. 🟡 Important = helps SEO but less risky. 🟢 Safe to Edit = change freely without SEO impact.",
    },
    {
      emoji: "📏",
      title: "Character Counters",
      body: "SEO titles should be 50–60 characters. Meta descriptions should be 140–160 characters. The counter turns green when you're in the ideal range, yellow when close, and red when too short or too long.",
    },
    {
      emoji: "🔑",
      title: "Keyword Checker",
      body: "For critical fields (H1, SEO Title, Meta Description), the system checks if your key SEO keywords are still present. A red warning appears if important keywords like 'office space,' your city, or your region are removed.",
    },
    {
      emoji: "🔍",
      title: "Google Search Preview",
      body: "On meta description fields, you'll see a live preview of exactly how your page will look in Google search results. Watch in real-time as you type to ensure your listing looks professional.",
    },
    {
      emoji: "💡",
      title: "Benefit & FAQ Editing",
      body: "Benefits and FAQ answers are marked 🟡 Important — they support SEO but won't break rankings if you adjust them. Keep the general topic and keywords, but feel free to rewrite the phrasing.",
    },
    {
      emoji: "📋",
      title: "Flex Space & Services Pages",
      body: "The Flex Space and Services pages have many fields because they're content-rich pages. Focus on the 🔴 Critical fields first (hero heading, descriptions). The 🟢 Safe fields like pricing plans and client types can be edited freely.",
    },
    {
      emoji: "👁️",
      title: "View SEO Original",
      body: "Changed something and not sure if it's better? Click 'View SEO Original' to compare your edit against the professionally optimized original text.",
    },
    {
      emoji: "↩️",
      title: "One-Click Reset",
      body: "Made a mistake? Every field has a Reset button that instantly restores the original text. Your edit history is tracked until you save — so nothing is lost.",
    },
  ],
  "content-properties": [
    {
      emoji: "📸",
      title: "Property Photos",
      body: "Upload and manage photos for each property. Set a hero image that appears on listing cards and one-sheet PDFs. Changes go live instantly.",
    },
    {
      emoji: "⭐",
      title: "Setting the Hero Image",
      body: "The hero image is shown on listing cards and the homepage. Hover over a photo and click the star icon to set it as the hero.",
    },
    {
      emoji: "🔢",
      title: "Photo Count",
      body: "The blue number badge shows how many photos each property has. Aim for 4–6 strong photos per property for the best gallery experience.",
    },
  ],
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProTipsProps {
  activeTab: TabKey;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProTips({ activeTab }: ProTipsProps) {
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [pulse, setPulse] = useState(false);
  const prevTab = useRef<TabKey | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Pulse the button whenever the tab changes (after first render)
  useEffect(() => {
    if (prevTab.current !== null && prevTab.current !== activeTab) {
      setPulse(true);
      setSelectedIdx(0);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
    prevTab.current = activeTab;
  }, [activeTab]);

  // Reset tip index when tab changes
  useEffect(() => {
    setSelectedIdx(0);
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
    setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Use only tab-specific tips — no global filler
  const tabTips = TIPS[activeTab] ?? [];
  const allTips = tabTips.length > 0 ? tabTips : [{ emoji: "💡", title: "Tips Coming Soon", body: "Feature-specific tips for this section are being added. Check back soon!" }];
  const current = allTips[selectedIdx] ?? allTips[0];

  const tabLabel: Record<TabKey, string> = {
    leads: "Leads",
    tenants: "Tenants",
    propdetails: "Property Details",
    maintenance: "Maintenance",
    cleaning: "Cleaning",
    analytics: "Analytics",
    marketing: "Marketing",
    "marketing-press": "Press Releases",
    "marketing-blog": "Blog Articles",
    "marketing-photos": "Property Photos",
    "marketing-banner": "Homepage Banner",
    "marketing-properties": "Add Property",
    "marketing-social": "Social Copy",
    "marketing-intel": "Market Intel",
    "marketing-one-sheet": "One-Sheet",
    archived: "Archive",
    content: "Content",
    "content-homepage": "Homepage Editor",
    "content-markets": "Market Pages",
    "content-pages": "Space & Pages",
    "content-properties": "Properties",
    settings: "Settings",
    teamboard: "Team Board",
    global: "General",
  };

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Pro Tips"
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center
          bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-lg
          shadow-[0_0_20px_rgba(56,189,248,0.45)] hover:shadow-[0_0_30px_rgba(56,189,248,0.65)]
          hover:scale-110 active:scale-95 transition-all duration-200 select-none
          ${pulse ? "animate-bounce" : ""}`}
        title="Pro Tips"
      >
        ?
        {/* Ripple ring when pulsing */}
        {pulse && (
          <span className="absolute inset-0 rounded-full border-2 border-sky-400 animate-ping opacity-60 pointer-events-none" />
        )}
      </button>

      {/* ── Modal backdrop + panel ── */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-6">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Panel */}
          <div
            ref={modalRef}
            className="relative w-full max-w-md sm:max-w-sm bg-[#0d1117] border border-white/15 rounded-3xl shadow-[0_0_60px_rgba(56,189,248,0.18)] overflow-hidden
              animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-300"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_14px_rgba(59,130,246,0.35)]">
                  <Lightbulb size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-white leading-none">Pro Tips</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {tabLabel[activeTab]} · {allTips.length} tip{allTips.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] flex items-center justify-center transition-colors"
              >
                <X size={13} className="text-gray-400" />
              </button>
            </div>

            {/* Tip list sidebar + content */}
            <div className="flex" style={{ minHeight: 320 }}>
              {/* Left: tip list */}
              <div className="w-36 flex-shrink-0 border-r border-[rgba(255,255,255,0.06)] py-3 overflow-y-auto">
                {allTips.length === 0 && (
                  <p className="text-[10px] text-gray-600 px-4 py-3">No tips yet.</p>
                )}
                {tabTips.length > 0 && (
                  <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest px-4 pb-1 pt-1">
                    {tabLabel[activeTab]}
                  </p>
                )}
                {allTips.map((tip, i) => (
                  <button
                    key={`tip-${i}`}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-all group ${
                      selectedIdx === i
                        ? "bg-white/[0.06] border-r-2 border-sky-400"
                        : "hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <span className="text-sm leading-none flex-shrink-0">{tip.emoji}</span>
                    <span className={`text-[10px] font-semibold leading-tight line-clamp-2 ${selectedIdx === i ? "text-sky-400" : "text-gray-400 group-hover:text-gray-300"}`}>
                      {tip.title}
                    </span>
                  </button>
                ))}

              </div>

              {/* Right: tip content */}
              <div className="flex-1 p-5 flex flex-col justify-between">
                {current && (
                  <div key={selectedIdx} className="animate-in fade-in duration-200">
                    <div className="text-4xl mb-3">{current.emoji}</div>
                    <h3 className="text-sm font-black text-white mb-2 leading-tight">{current.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{current.body}</p>
                  </div>
                )}

                {/* Navigation arrows */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                  <button
                    onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                    disabled={selectedIdx === 0}
                    className="text-[10px] text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors font-semibold"
                  >
                    ← Prev
                  </button>
                  <span className="text-[10px] text-gray-700">
                    {selectedIdx + 1} / {allTips.length}
                  </span>
                  <button
                    onClick={() => setSelectedIdx((i) => Math.min(allTips.length - 1, i + 1))}
                    disabled={selectedIdx === allTips.length - 1}
                    className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-[#4ADE80] disabled:opacity-30 transition-colors font-semibold"
                  >
                    Next <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-[rgba(0,0,0,0.3)] border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between">
              <p className="text-[9px] text-gray-700">
                OperateIQ Property Operations Platform
              </p>
              <button
                onClick={() => setOpen(false)}
                className="text-[10px] font-black text-[#4ADE80] hover:underline"
              >
                Got it ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
