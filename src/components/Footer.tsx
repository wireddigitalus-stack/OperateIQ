import Link from "next/link";
import Logo from "./Logo";
import { BRAND } from "@/lib/brand";

const cols = [
  { title: "Product", links: [["Features", "/features"], ["Pricing", "/pricing"], ["Start free trial", "/signup"]] },
  { title: "Company", links: [["Blog", "/blog"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"]] },
];

export default function Footer() {
  return (
    <footer className="oiq-page border-t border-[var(--oiq-border)]">
      <div className="mx-auto max-w-7xl px-5 py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2 space-y-4">
          <Logo />
          <p className="text-sm text-slate-400 max-w-sm">{BRAND.tagline} Rent, tenants, maintenance, crews and reporting — with {BRAND.assistant} built in.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{c.title}</p>
            <ul className="space-y-2">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-slate-300 hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--oiq-border)] py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
      </div>
    </footer>
  );
}
