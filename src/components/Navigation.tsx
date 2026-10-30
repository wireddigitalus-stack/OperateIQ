"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isSuperAdmin } from "@/lib/platform";

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
  const [superAdmin, setSuperAdmin] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setSuperAdmin(isSuperAdmin(data.session?.user?.email));
    });
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
      setSuperAdmin(isSuperAdmin(session?.user?.email));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transform-gpu transition-all duration-300 ease-out ${
        scrolled || open ? "oiq-liquid-nav-scrolled" : "oiq-liquid-nav"
      }`}
    >
      {/* Subtle top-edge liquid specular sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {/* Subtle bottom-edge cyan/indigo refraction line */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/45 to-transparent transition-opacity duration-300 ${
          scrolled ? "opacity-100" : "opacity-45"
        }`}
      />

      <nav className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop Liquid Frosted Capsule Nav */}
        <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/[0.035] border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_20px_rgba(0,0,0,0.25)]">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(`${l.href}/`));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/25 to-sky-400/20 text-sky-300 border border-sky-400/30 shadow-[0_0_14px_rgba(56,189,248,0.18)]"
                    : "text-slate-200 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {signedIn ? (
            <Link href={superAdmin ? "/platform" : "/admin"} className="oiq-btn !py-2 text-sm">
              {superAdmin ? "Master Console" : "Go to Dashboard"}
            </Link>
          ) : (
            <>
              <Link
                href="/admin/login"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                Log in
              </Link>
              <Link href="/signup" className="oiq-btn !py-2 text-sm">
                Start free trial
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2.5 -mr-2 rounded-xl text-white bg-white/[0.04] border border-white/10 active:scale-95 transition-transform"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden px-5 pb-6 pt-2 flex flex-col gap-2 border-t border-white/[0.08] bg-[#080C18]/98">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(`${l.href}/`));
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`px-3.5 py-2.5 rounded-xl text-base font-semibold transition-colors ${
                  active
                    ? "bg-sky-500/15 text-sky-300 border border-sky-400/25"
                    : "text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <div className="pt-2 mt-1 border-t border-white/[0.08] flex flex-col gap-2.5">
            {signedIn ? (
              <Link href={superAdmin ? "/platform" : "/admin"} onClick={() => setOpen(false)} className="oiq-btn">
                {superAdmin ? "Master Console" : "Go to Dashboard"}
              </Link>
            ) : (
              <>
                <Link
                  href="/admin/login"
                  onClick={() => setOpen(false)}
                  className="py-2.5 px-3.5 rounded-xl text-center text-base text-slate-200 font-semibold bg-white/[0.04] border border-white/10"
                >
                  Log in
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="oiq-btn">
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
