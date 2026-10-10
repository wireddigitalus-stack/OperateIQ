"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS, FEATURE_LABELS, TRIAL_DAYS } from "@/lib/plans";

export default function PricingTable() {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="flex justify-center mb-10">
        <div className="oiq-card p-1 inline-flex text-sm">
          {[false, true].map((a) => (
            <button
              key={String(a)}
              onClick={() => setAnnual(a)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${annual === a ? "oiq-grad-bg text-white" : "text-slate-300"}`}
            >
              {a ? "Annual · 2 months free" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => {
          const prev = PLANS[PLANS.indexOf(p) - 1];
          const shown = prev ? p.features.filter((f) => !prev.features.includes(f)) : p.features;
          return (
            <div
              key={p.id}
              className={`oiq-card p-8 flex flex-col relative ${p.highlight ? "ring-2 ring-[var(--oiq-indigo)] shadow-[0_20px_60px_-20px_rgba(99,102,241,.6)]" : ""}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-8 text-xs font-bold px-3 py-1 rounded-full oiq-grad-bg text-white">Most popular</span>
              )}
              <h3 className="text-xl font-bold text-white">{p.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{p.blurb}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-5xl font-extrabold text-white">${annual ? Math.round(p.annual / 12) : p.monthly}</span>
                <span className="text-slate-400 mb-2">/mo</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{annual ? `Billed $${p.annual.toLocaleString()} yearly` : "Billed monthly"}</p>
              <p className="text-sm text-slate-300 mt-4">
                {p.limits.properties ? `Up to ${p.limits.properties} properties` : "Unlimited properties"} ·{" "}
                {p.limits.users ? `${p.limits.users} users` : "unlimited users"}
              </p>
              <Link href={`/signup?plan=${p.id}`} className={`mt-6 ${p.highlight ? "oiq-btn" : "oiq-btn-ghost"}`}>
                Start {TRIAL_DAYS}-day free trial
              </Link>
              <ul className="mt-8 space-y-3 text-sm">
                {prev && <li className="text-slate-400 font-medium">Everything in {prev.name}, plus:</li>}
                {shown.map((f) => (
                  <li key={f} className="flex gap-2 text-slate-200">
                    <Check size={16} className="text-[var(--oiq-cyan)] mt-0.5 shrink-0" /> {FEATURE_LABELS[f]}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
