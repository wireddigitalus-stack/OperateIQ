import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { TRIAL_DAYS } from "@/lib/plans";
import { FEATURES } from "@/components/marketing/features";
import PricingTable from "@/components/marketing/PricingTable";
import HeroPropertyBackground from "@/components/marketing/HeroPropertyBackground";
import MockDemoCard from "@/components/marketing/MockDemoCard";
import ProWebsiteShowcaseCard from "@/components/marketing/ProWebsiteShowcaseCard";

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
};

const STEPS = [
  { n: "01", title: "Create your account", body: `Pick a plan and start a ${TRIAL_DAYS}-day free trial. No card required.` },
  { n: "02", title: "Add properties & tenants", body: "Import tenants from a spreadsheet and add your buildings in minutes." },
  { n: "03", title: "Invite your team", body: "Give managers dashboard access and crews a PIN-based mobile portal." },
  { n: "04", title: "Run on autopilot", body: `Rent, tickets, crews and reports in one place — with ${BRAND.assistant} on call.` },
];

const FAQS = [
  { q: `Who is ${BRAND.name} for?`, a: "Independent owners and small-to-mid-size management companies running commercial, mixed-use or residential portfolios who have outgrown spreadsheets." },
  { q: "Do I need a credit card for the trial?", a: `No. Every plan includes a ${TRIAL_DAYS}-day free trial with full access to that plan's features.` },
  { q: "Can I change plans later?", a: "Yes — upgrade or downgrade any time. Changes are prorated automatically." },
  { q: "Is my data separate from other customers?", a: "Yes. Every account is fully isolated at the database level with row-level security." },
  { q: "Does my team need to install anything?", a: "No. The dashboard runs in the browser and crew portals work on any phone — no app store required." },
  { q: "Can I get a website for my properties?", a: "Growth includes a basic listings site. Pro adds the full website builder, blog, SEO tools and a custom domain." },
];

export default function HomePage() {
  return (
    <div className="oiq-page">
      {/* Hero with Panoramic Property-to-Data Atmospheric Background */}
      <section className="relative oiq-glow pt-36 pb-24 px-5 overflow-hidden">
        {/* Cinematic Property-to-Data Faded Background Banner */}
        <HeroPropertyBackground />

        {/* Hero Copy & CTA Floating Above Background */}
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border border-[var(--oiq-border)] text-slate-300 bg-black/40 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--oiq-cyan)]" /> Meet {BRAND.assistant}, your AI operations assistant
          </span>
          <h1 className="mt-6 text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05] drop-shadow-md">
            Property operations,<br /><span className="oiq-grad-text">intelligence Platform.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto drop-shadow-sm font-medium">
            Rent, tenants, maintenance, cleaning crews, inspections and reporting — one platform built for small and mid-size property owners.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="oiq-btn text-base shadow-xl">Start {TRIAL_DAYS}-day free trial <ArrowRight size={18} /></Link>
            <Link href="/features" className="oiq-btn-ghost text-base backdrop-blur-md">See all features</Link>
          </div>
          <p className="mt-4 text-xs text-slate-400 font-medium">No credit card required · Cancel anytime</p>
        </div>

        {/* Clean, Spacious Apple/iOS Frosted Glass Mock Demo Card */}
        <div className="relative z-10">
          <MockDemoCard />
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-5">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Everything you need to run your portfolio</h2>
            <p className="mt-4 text-slate-400">Replace the spreadsheets, group texts and sticky notes with one system your whole team actually uses.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="oiq-card p-6 hover:border-[var(--oiq-indigo)]/50 transition-colors">
                <div className="w-10 h-10 rounded-lg oiq-grad-bg flex items-center justify-center"><Icon size={20} className="text-white" /></div>
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-5 border-y border-[var(--oiq-border)] bg-white/[0.015]">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-14">Up and running in an afternoon</h2>
          <div className="grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n}>
                <p className="text-4xl font-extrabold oiq-grad-text">{s.n}</p>
                <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Turnkey Property Website Showcase Card (Included with Pro) */}
      <ProWebsiteShowcaseCard />

      {/* Pricing */}
      <section id="pricing" className="py-24 px-5">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Simple pricing that grows with you</h2>
            <p className="mt-4 text-slate-400">Start small, unlock more as your portfolio grows.</p>
          </div>
          <PricingTable />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-5 border-t border-[var(--oiq-border)]">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="oiq-card p-5 group">
                <summary className="cursor-pointer font-semibold text-white list-none flex justify-between">
                  {f.q}<span className="text-slate-500 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-5xl oiq-card oiq-glow p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to run smarter?</h2>
          <p className="mt-4 text-slate-300">Join owners who've traded spreadsheets for real Property Intelligence.</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-300">
            {["Free for " + TRIAL_DAYS + " days", "No credit card", "Cancel anytime"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-[var(--oiq-cyan)]" />{t}</li>
            ))}
          </ul>
          <Link href="/signup" className="oiq-btn mt-8 text-base">Start free trial <ArrowRight size={18} /></Link>
        </div>
      </section>
    </div>
  );
}
