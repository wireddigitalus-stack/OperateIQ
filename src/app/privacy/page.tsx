import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND.name}`,
  description: `How ${BRAND.name} collects, isolates, processes, and protects your property and tenant data.`,
};

interface PrivacySection {
  title: string;
  paragraphs: string[];
}

const SUBPROCESSORS = [
  {
    name: "Supabase",
    purpose: "Managed PostgreSQL database, authentication, and encrypted file storage",
    location: "United States",
  },
  {
    name: "Vercel",
    purpose: "Application hosting, TLS edge routing, and serverless execution",
    location: "United States / Global Edge",
  },
  {
    name: "Stripe",
    purpose: "Subscription billing, payment card processing, and customer billing portal",
    location: "United States",
  },
  {
    name: "Resend",
    purpose: "Transactional emails (account verification, team invites, support & lead alerts)",
    location: "United States",
  },
  {
    name: "Cloudflare",
    purpose: "Bot protection (Turnstile) and DNS security",
    location: "Global",
  },
  {
    name: "Google Cloud (Gemini API)",
    purpose: "On-demand AI features (rent-roll OCR intake, OpsIQ assistant, and operational summaries)",
    location: "United States",
  },
];

const SECTIONS: PrivacySection[] = [
  {
    title: "1. Information We Collect",
    paragraphs: [
      `Account & Workspace Information: When you register for ${BRAND.name}, we collect your name, email address, portfolio/company name, optional phone number, and authentication credentials (or Google OAuth identifier). Billing card details are collected directly by Stripe and never touch ${BRAND.name} servers.`,
      `Operational Portfolio Data: We store the property records, tenant contact details, lease dates, rent payment entries, security deposit records, maintenance tickets, crew photos, and notes you or your team enter into your workspace.`,
      `Technical & Security Telemetry: We record essential session cookies, rate-limit counters, and workspace audit logs (such as sign-ins, team invitations, and record updates) to protect accounts against abuse.`,
    ],
  },
  {
    title: "2. How We Use Information",
    paragraphs: [
      `We use the information we collect strictly to: (a) provision, operate, and secure your workspace; (b) authenticate team members and field crew PIN sessions; (c) process subscription billing via Stripe; (d) deliver transactional emails you or your visitors trigger; and (e) provide customer support when you request help.`,
      `We never sell, rent, or broker your personal information, tenant rosters, or rent roll data to advertisers, data brokers, or third parties.`,
    ],
  },
  {
    title: "3. Multi-Tenant Data Isolation & Support Access",
    paragraphs: [
      `Every organization's records are scoped to a dedicated organization identifier (org_id) enforced on the server and backed by PostgreSQL Row-Level Security (RLS). Unpublished workspace websites are hidden from search engines by default.`,
      `Authorized ${BRAND.name} platform support personnel access a customer workspace only to troubleshoot an issue or assist with data onboarding, and any support session is recorded in an immutable audit log.`,
    ],
  },
  {
    title: `4. AI Processing (${BRAND.assistant} & OCR Intake)`,
    paragraphs: [
      `When you invoke an AI tool — such as uploading a rent roll spreadsheet/photo to Fast Intake or asking ${BRAND.assistant} a question — only the workspace context needed to fulfill that specific request is sent over TLS to the Google Gemini API.`,
      `We use paid API access where API prompts and responses are not used by Google to train foundation models, and we never share one customer's data with another customer's AI context.`,
    ].map((s) => s.replace("${BRAND.assistant}", BRAND.assistant)),
  },
  {
    title: "5. Self-Serve Data Export, Retention & Deletion",
    paragraphs: [
      `You are in full control of your workspace data. Workspace owners and administrators can download a complete machine-readable JSON export of their properties, tenants, rent ledger, tickets, and logs at any time from Settings → Data & Workspace.`,
      `Workspace owners can also permanently delete their entire workspace from Settings → Data & Workspace. Deleting a workspace immediately removes your organization and cascading operational records from the active production database (and cancels any active Stripe subscription); residual encrypted database backups age out automatically within 30 days.`,
    ],
  },
  {
    title: "6. Cookies & Local Storage",
    paragraphs: [
      `We use strictly necessary authentication cookies (Supabase session tokens, active-workspace preference, and signed HttpOnly crew PIN cookies) and local browser storage for UI preferences. We do not run third-party behavioral advertising trackers inside your dashboard.`,
    ],
  },
  {
    title: "7. Contact Us",
    paragraphs: [
      `For privacy questions, data access requests, or security disclosures, email ${BRAND.email} or reach out via our Contact page.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="oiq-page pt-32 pb-24 px-5">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-emerald-300 text-xs font-semibold mb-4">
          Effective Date: November 10, 2026
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          How {BRAND.name} collects, isolates, and protects landlord and tenant operational data. See also our{" "}
          <Link href="/terms" className="text-sky-400 hover:underline font-medium">
            Terms of Service &amp; Beta Program Terms
          </Link>
          .
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((sec) => (
            <section
              key={sec.title}
              className="rounded-2xl bg-white/[0.02] border border-white/[0.07] p-6 space-y-3"
            >
              <h2 className="text-lg font-semibold text-white">{sec.title}</h2>
              {sec.paragraphs.map((p, idx) => (
                <p key={idx} className="text-sm text-slate-300 leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          ))}

          {/* Sub-processors table */}
          <section className="rounded-2xl bg-white/[0.02] border border-white/[0.07] p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">8. Infrastructure Sub-Processors</h2>
              <p className="text-sm text-slate-400 mt-1">
                We rely on the following vetted infrastructure providers to deliver {BRAND.name}:
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-white/[0.04] text-slate-300 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Provider</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Region</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-slate-300">
                  {SUBPROCESSORS.map((sp) => (
                    <tr key={sp.name}>
                      <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{sp.name}</td>
                      <td className="px-4 py-3 text-slate-300">{sp.purpose}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{sp.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
