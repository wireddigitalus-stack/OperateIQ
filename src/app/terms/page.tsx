import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Terms of Service | ${BRAND.name}` };

const SECTIONS = [
  ["Acceptance", `By creating an account or using ${BRAND.name}, you agree to these terms.`],
  ["Accounts", "You are responsible for your account credentials and for all activity under your organization."],
  ["Subscriptions & billing", "Paid plans renew automatically until canceled. Trials convert to paid only if you add a payment method."],
  ["Your data", "You own the data you put into the service. We process it only to provide the service, and you can export or delete it at any time."],
  ["Acceptable use", "Do not misuse the service, attempt to access other customers' data, or use it for unlawful purposes."],
  ["Changes", "We may update these terms; material changes will be communicated in advance."],
];

export default function TermsPage() {
  return (
    <div className="oiq-page pt-32 pb-24 px-5">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-500">Draft — to be reviewed by counsel before launch.</p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map(([h, b]) => (
            <section key={h}>
              <h2 className="text-xl font-semibold text-white">{h}</h2>
              <p className="mt-2 text-slate-400">{b}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
