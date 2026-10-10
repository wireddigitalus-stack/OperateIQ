import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { FEATURES } from "@/components/marketing/features";

export const metadata: Metadata = {
  title: `Features | ${BRAND.name}`,
  description: `Every module in ${BRAND.name}: rent ledger, tenants, maintenance, crews, inspections, AI reports and a website builder.`,
};

export default function FeaturesPage() {
  return (
    <div className="oiq-page">
      <section className="oiq-glow pt-36 pb-16 px-5 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white">One platform. <span className="oiq-grad-text">Every workflow.</span></h1>
        <p className="mt-5 text-lg text-slate-300 max-w-2xl mx-auto">From the rent roll to the boiler room, {BRAND.name} covers the day-to-day of running property.</p>
      </section>
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-5xl space-y-5">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="oiq-card p-6 md:p-8 flex gap-5 items-start">
              <div className="w-12 h-12 rounded-xl oiq-grad-bg flex items-center justify-center shrink-0"><Icon size={24} className="text-white" /></div>
              <div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <p className="mt-2 text-slate-400">{body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-14">
          <Link href="/pricing" className="oiq-btn">Compare plans</Link>
        </div>
      </section>
    </div>
  );
}
