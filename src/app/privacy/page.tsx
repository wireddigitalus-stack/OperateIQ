import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND.name}`,
  description: `How ${BRAND.name} collects, uses and protects your information.`,
};

const SECTIONS = [
  ["Information we collect", "Account details you provide (name, email, company), the property and tenant data you enter into the service, and basic usage analytics such as pages visited and device type."],
  ["How we use it", `To provide and improve ${BRAND.name}, support your account, process billing, and send service-related messages. We do not sell your data.`],
  ["Customer data isolation", "Each organization's data is logically isolated with database-level row security. Staff access is limited to support you when you request it."],
  ["AI features", `${BRAND.assistant} and AI reports process your data only to generate responses for your account. Your data is not used to train third-party models.`],
  ["Sub-processors", "We use trusted infrastructure providers for hosting, database, email delivery and payments. A current list is available on request."],
  ["Retention & deletion", "You can export or delete your data at any time. Deleted accounts are purged from production systems within 30 days."],
  ["Contact", "Questions about this policy can be sent through our contact page."],
];

export default function PrivacyPage() {
  return (
    <div className="oiq-page pt-32 pb-24 px-5">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
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
