"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { supabaseBrowser } from "@/lib/supabase-browser";

const links = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { href: "/demo-site", label: "Live Demo" },
  { label: "Help & Support", href: "/help" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transform-gpu transition-all duration-300 ease-out ${
        scrolled || open
          ? "bg-[#0B1020]/85 backdrop-blur-md border-white/[0.08] shadow-lg shadow-black/20"
          : "bg-transparent border-transparent backdrop-blur-none"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(`${l.href}/`));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-semibold transition-colors ${
                  active ? "text-sky-400" : "text-slate-300 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="hidden md:flex items-center gap-3">
          {signedIn ? (
            <Link href="/admin" className="oiq-btn !py-2 text-sm">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/admin/login" className="text-sm font-medium text-slate-300 hover:text-white">Log in</Link>
              <Link href="/signup" className="oiq-btn !py-2 text-sm">Start free trial</Link>
            </>
          )}
        </div>
        <button className="md:hidden p-2.5 -mr-2 text-white" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      {open && (
        <div className="md:hidden px-5 pb-6 flex flex-col gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2 text-base text-slate-200 font-medium">
              {l.label}
            </Link>
          ))}
          {signedIn ? (
            <Link href="/admin" onClick={() => setOpen(false)} className="oiq-btn">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/admin/login" onClick={() => setOpen(false)} className="py-2 text-base text-slate-200 font-medium">Log in</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="oiq-btn">Start free trial</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
