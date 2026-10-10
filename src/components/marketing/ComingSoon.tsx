import Link from "next/link";
import { BRAND } from "@/lib/brand";

// Placeholder used by /signup and /login until Phase 3 (auth + Stripe) lands.
export default function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="oiq-page oiq-glow min-h-screen flex items-center justify-center px-5 pt-16">
      <div className="oiq-card p-10 max-w-md text-center">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-4 text-slate-400">{body}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/pricing" className="oiq-btn">View plans</Link>
          <Link href="/contact" className="oiq-btn-ghost">Contact {BRAND.name}</Link>
        </div>
      </div>
    </div>
  );
}
