import Link from "next/link";
import { Lock } from "lucide-react";
import Logo from "./Logo";
import { BRAND } from "@/lib/brand";

const cols = [
  { title: "Product", links: [["Features", "/features"], ["Pricing", "/pricing"], ["Start free trial", "/signup"]] },
  { title: "Company", links: [["Blog", "/blog/operateiq-early-access-regional-property-owners"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"]] },
];

export default function Footer() {
  return (
    <footer className="oiq-page border-t border-[var(--oiq-border)]">
      <div className="mx-auto max-w-7xl px-5 py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2 space-y-4">
          <Logo />
          <p className="text-sm text-slate-400 max-w-sm">{BRAND.tagline} Rent, tenants, maintenance, crews and reporting — with {BRAND.assistant} built in.</p>
          <div className="pt-1">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300 font-mono tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
              <span>{BRAND.domain}</span>
            </span>
          </div>
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
      <div className="border-t border-[var(--oiq-border)] py-6 px-5 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {BRAND.name} · {BRAND.domain}. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <Link href="/demo-site" className="text-slate-500 hover:text-slate-300 transition-colors">
            Demo Property Site
          </Link>
          <span className="text-slate-700">·</span>
          <Link
            href="/platform"
            className="text-slate-600 hover:text-slate-400 transition-colors inline-flex items-center gap-1 opacity-60 hover:opacity-100"
            title="Master Admin Console"
          >
            <Lock size={11} className="text-slate-600" />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
