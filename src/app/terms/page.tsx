import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Terms of Service & Beta Program Terms | ${BRAND.name}`,
  description: `Terms governing your use of the ${BRAND.name} property operations platform and Early Access Beta Program.`,
};

interface TermSection {
  title: string;
  paragraphs: string[];
}

const SECTIONS: TermSection[] = [
  {
    title: "1. Agreement to Terms",
    paragraphs: [
      `These Terms of Service ("Terms") govern access to and use of the ${BRAND.name} platform, websites, mobile crew portals, and related services (collectively, the "Service") operated by Wired Digital LLC d/b/a ${BRAND.name} ("${BRAND.name}", "we", "us", or "our"). By creating a workspace, clicking to accept these Terms, or using the Service, you ("Customer", "you") agree to be bound by these Terms on behalf of yourself and the organization you represent.`,
    ],
  },
  {
    title: "2. Early Access & Beta Program Terms",
    paragraphs: [
      `Certain workspaces or features may be offered as part of an Early Access, Pilot, or Beta Program ("Beta Features"). Beta Features are provided to help small and mid-size property owners evaluate workflows and shape product development.`,
      `During an active Beta or Trial period: (a) you agree to provide candid operational feedback when reasonably requested; (b) features, interfaces, and limits may evolve iteratively; and (c) Beta Features are provided "AS IS" without service-level credits. Promotional or founder pricing offered to Beta participants applies for the duration specified on your order or billing screen.`,
    ],
  },
  {
    title: "3. Accounts, Roles & Crew PIN Access",
    paragraphs: [
      `You are responsible for maintaining the confidentiality of account credentials, magic links, and 6-digit field crew PINs issued within your workspace, and for all actions taken by team members, property managers, maintenance technicians, or cleaning staff you authorize.`,
      `You may deactivate any team member or crew PIN immediately from Settings → Team & Access. Notify us promptly at ${BRAND.email} if you suspect unauthorized access to your workspace.`,
    ],
  },
  {
    title: "4. Customer Data Ownership, Export & Deletion",
    paragraphs: [
      `You retain all right, title, and interest in and to all property records, tenant rosters, lease details, rent ledgers, photos, maintenance logs, and other content submitted to your workspace ("Customer Data").`,
      `You grant ${BRAND.name} a limited, non-exclusive license to host, process, transmit, and display Customer Data solely as necessary to provide, secure, and support the Service for your workspace. Workspace owners and administrators can export a complete JSON archive of their workspace data at any time from Settings → Data & Workspace, and workspace owners can permanently delete their workspace from the same screen.`,
    ],
  },
  {
    title: "5. Public Portfolio Sites & Custom Domains",
    paragraphs: [
      `New workspaces start with their public listing website unpublished and hidden from search engines by default. If you choose to publish your portfolio website or connect a custom domain, you are solely responsible for the accuracy, legality, and Fair Housing compliance of all listings, photos, pricing, and statements published on your site.`,
    ],
  },
  {
    title: "6. AI-Assisted Features (OpsIQ)",
    paragraphs: [
      `The Service includes optional AI-powered tools (${BRAND.assistant}), such as rent-roll OCR intake, operational summaries, and draft communications. AI outputs are generated probabilistically and may contain errors or omissions. You are responsible for reviewing and verifying all imported figures, rent ledger entries, lease dates, and communications before relying on them or sending them to tenants.`,
    ],
  },
  {
    title: "7. Operational Software Only — No Legal, Tax, or Fair Housing Advice",
    paragraphs: [
      `${BRAND.name} provides operational recordkeeping software — not legal, accounting, tax, brokerage, or compliance advice. Landlord-tenant laws, security deposit rules, late-fee caps, notice periods, and Fair Housing obligations vary by federal, state, and local jurisdiction. Consult qualified legal or tax counsel regarding leases, notices, fee structures, and regulatory compliance in your market.`,
    ],
  },
  {
    title: "8. Free Trials, Subscriptions & Cancellation",
    paragraphs: [
      `New workspaces receive a free trial for the number of days stated at signup without requiring a payment method upfront. Paid subscriptions are billed monthly or annually in advance via Stripe and renew automatically unless canceled prior to the renewal date.`,
      `You may upgrade, downgrade, or cancel your subscription at any time from Settings → Plan & Billing (Stripe Billing Portal). Cancellations take effect at the end of the current paid billing cycle. Except where required by law, paid subscription fees are non-refundable once a billing period has begun.`,
    ],
  },
  {
    title: "9. Acceptable Use",
    paragraphs: [
      `You agree not to: (a) attempt to probe, scan, bypass, or test the multi-tenant boundaries, authentication controls, or rate limits of the Service; (b) upload unlawful, infringing, defamatory, or malicious content; (c) send unsolicited bulk spam through the Service; or (d) resell or sublicense the Service without written permission.`,
    ],
  },
  {
    title: "10. Warranties & Limitation of Liability",
    paragraphs: [
      `EXCEPT AS EXPRESSLY STATED HEREIN, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.`,
      `TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER ${BRAND.name.toUpperCase()} NOR ITS SUPPLIERS SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, RENTS, REVENUE, OR DATA. OUR AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES PAID BY YOU TO ${BRAND.name.toUpperCase()} IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100).`,
    ],
  },
  {
    title: "11. Updates & Contact",
    paragraphs: [
      `We may update these Terms from time to time as the Service evolves. If we make material changes, we will notify workspace owners by email or in-app notice at least 14 days before the updated Terms take effect.`,
      `Questions about these Terms can be sent to ${BRAND.email} or submitted through our Contact page.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="oiq-page pt-32 pb-24 px-5">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-sky-300 text-xs font-semibold mb-4">
          Effective Date: November 10, 2026
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Terms of Service &amp; Beta Program Terms
        </h1>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          Plain-language terms governing your {BRAND.name} workspace, data ownership, and Early Access Beta participation. See also our{" "}
          <Link href="/privacy" className="text-sky-400 hover:underline font-medium">
            Privacy Policy
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
        </div>
      </div>
    </div>
  );
}
