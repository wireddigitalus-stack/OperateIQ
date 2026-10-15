import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { PLANS, FEATURE_LABELS, type Feature } from "@/lib/plans";
import PricingTable from "@/components/marketing/PricingTable";

export const metadata: Metadata = {
  title: `Pricing | ${BRAND.name}`,
  description: `Simple ${BRAND.name} pricing — Starter, Growth and Pro plans with a free trial.`,
};

const ALL = Object.keys(FEATURE_LABELS) as Feature[];

export default function PricingPage() {
  return (
    <div className="oiq-page">
      <section className="oiq-glow pt-36 pb-16 px-5 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white">Pricing that <span className="oiq-grad-text">scales with you</span></h1>
        <p className="mt-5 text-lg text-slate-300">Every plan starts with a free trial. Upgrade or downgrade anytime.</p>
      </section>
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-7xl"><PricingTable /></div>
      </section>
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-5xl oiq-card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--oiq-border)]">
                <th className="text-left p-3 sm:p-4 text-slate-400 font-medium">Compare features</th>
                {PLANS.map((p) => <th key={p.id} className="p-3 sm:p-4 text-white font-semibold">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {ALL.map((f) => (
                <tr key={f} className="border-b border-[var(--oiq-border)] last:border-0">
                  <td className="p-3 sm:p-4 text-slate-300">{FEATURE_LABELS[f]}</td>
                  {PLANS.map((p) => (
                    <td key={p.id} className="p-3 sm:p-4 text-center">
                      {p.features.includes(f)
                        ? <Check size={18} className="inline text-[var(--oiq-cyan)]" />
                        : <Minus size={18} className="inline text-slate-600" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
