"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Phone, ChevronDown, MapPin } from "lucide-react";
import { COMPANY, GEO_PAGES } from "@/lib/data";

const navLinks = [
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Properties",
    href: "/commercial-real-estate",
    dropdown: [
      { label: "All Properties", href: "/commercial-real-estate" },
      { label: "Office Space", href: "/spaces/office-space-tri-cities-tn" },
      { label: "CoWorking Space", href: "/spaces/coworking-space-bristol-tn" },
      { label: "Retail Storefronts", href: "/spaces/retail-space-bristol-tn" },
      { label: "Warehouse & Industrial", href: "/spaces/industrial-space-tri-cities-tn" },
    ],
  },

  {
    label: "Markets",
    href: "#",
    dropdown: GEO_PAGES.map((g) => ({
      label: `${g.city}, ${g.state}`,
      href: `/markets/${g.slug}`,
    })),
  },
  {
    label: "CoWork",
    href: "/cowork",
  },
  {
    label: "Executive Advisement",
    href: "/executive-advisement",
  },
  {
    label: "Blog",
    href: "/blog",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#080B0F]/98 backdrop-blur-xl border-b border-[rgba(74,222,128,0.1)] ${
          scrolled
            ? "shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
            : "shadow-none"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <Image
                src="/vision-logo.png"
                alt="Vision LLC — Commercial Real Estate Bristol TN"
                width={160}
                height={60}
                className="h-10 w-auto object-contain transition-opacity group-hover:opacity-85"
                priority
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <div
                  key={link.label}
                  className="relative group"
                  onMouseEnter={() => link.dropdown && setOpenDropdown(link.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <Link
                    href={link.href}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md hover:bg-white/5"
                  >
                    {link.label}
                    {link.dropdown && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${
                          openDropdown === link.label ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Link>

                  {link.dropdown && openDropdown === link.label && (
                    <div className="absolute top-full left-0 pt-1 w-56">
                      <div className="glass rounded-xl overflow-hidden shadow-xl border border-[rgba(74,222,128,0.15)]">
                        {link.dropdown.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-[rgba(74,222,128,0.08)] transition-colors"
                          >
                            <MapPin size={12} className="text-[#4ADE80]" />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <a
                href={COMPANY.phoneHref}
                id="nav-phone-cta"
                className="flex items-center gap-2 text-sm font-semibold text-[#4ADE80] hover:text-white transition-colors"
              >
                <Phone size={15} />
                {COMPANY.phone}
              </a>
              <Link
                href="/contact"
                id="nav-contact-cta"
                className="btn-primary text-sm px-5 py-2.5"
              >
                Get in Touch
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              id="mobile-menu-toggle"
              aria-label="Open mobile menu"
              className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay — z-[60] sits above header (z-50) so only drawer X is visible */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Slide-in Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[85vw] max-w-sm bg-[#0D1117] border-l border-[rgba(74,222,128,0.15)] transition-transform duration-300 flex flex-col ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between p-5 border-b border-[rgba(74,222,128,0.1)]">
            <div className="flex items-center">
              <Image
                src="/vision-logo.png"
                alt="Vision LLC"
                width={120}
                height={46}
                className="h-8 w-auto object-contain"
              />
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navLinks.map((link) => (
              <div key={link.label}>
                {link.dropdown ? (
                  <div>
                    <p className="px-3 py-2 text-xs font-bold text-[#4ADE80] uppercase tracking-widest">
                      {link.label}
                    </p>
                    <div className="pl-3 space-y-0.5">
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <div className="w-1 h-1 rounded-full bg-[#4ADE80]" />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex px-3 py-3 rounded-lg text-base font-medium text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile Bottom CTAs */}
          <div className="p-5 border-t border-[rgba(74,222,128,0.1)] space-y-3 safe-bottom">
            <a
              href={COMPANY.phoneHref}
              id="mobile-phone-cta"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)] text-[#4ADE80] font-bold text-base"
            >
              <Phone size={18} />
              {COMPANY.phone}
            </a>
            <Link
              href="/contact"
              id="mobile-contact-cta"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center btn-primary w-full py-3.5 rounded-xl text-base"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
