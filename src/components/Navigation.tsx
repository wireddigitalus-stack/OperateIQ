"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const links = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${
        scrolled || open ? "bg-[#0B1020]/90 backdrop-blur border-b border-[var(--oiq-border)]" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">Log in</Link>
          <Link href="/signup" className="oiq-btn !py-2 text-sm">Start free trial</Link>
        </div>
        <button className="md:hidden text-white" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      {open && (
        <div className="md:hidden px-5 pb-6 flex flex-col gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-slate-200 font-medium">
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="text-slate-200 font-medium">Log in</Link>
          <Link href="/signup" onClick={() => setOpen(false)} className="oiq-btn">Start free trial</Link>
        </div>
      )}
    </header>
  );
}
