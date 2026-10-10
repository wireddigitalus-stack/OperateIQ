"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, MapPin, Facebook, Linkedin, Youtube, ArrowRight } from "lucide-react";
import { COMPANY, GEO_PAGES, SPACE_TYPE_PAGES } from "@/lib/data";
import SafeEmail from "@/components/SafeEmail";

interface FooterOverrides {
  tagline?: string;
  facebook_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [overrides, setOverrides] = useState<FooterOverrides>({});

  useEffect(() => {
    fetch("/api/site-content")
      .then(r => r.json())
      .then(data => {
        const items: { section: string; key: string; value: string }[] = data.items || [];
        const footerItems = items.filter(i => i.section === "footer");
        const o: FooterOverrides = {};
        for (const item of footerItems) {
          (o as Record<string, string>)[item.key] = item.value;
        }
        setOverrides(o);
      })
      .catch(() => { /* use defaults */ });
  }, []);

  const tagline = overrides.tagline ?? "The Tri-Cities\u2019 premier commercial real estate, development & executive advisement firm — rooted in Bristol for 20+ years.";
  const facebookUrl = overrides.facebook_url ?? "https://www.facebook.com/profile.php?id=100063475843769";
  const linkedinUrl = overrides.linkedin_url ?? "https://www.linkedin.com/company/visionllc/posts/?feedView=all";
  const youtubeUrl = overrides.youtube_url ?? "https://www.youtube.com/@visionllc204";

  return (
    <footer className="bg-[#080B0F] border-t border-[rgba(74,222,128,0.1)]">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-6">

          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-flex mb-6">
              <Image
                src="/vision-logo.png"
                alt="Vision LLC — Commercial Real Estate Bristol TN"
                width={160}
                height={60}
                className="h-10 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {tagline}
            </p>
            <div className="flex items-center gap-3">
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Vision LLC on Facebook"
                className="w-9 h-9 rounded-lg border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-gray-400 hover:text-[#4ADE80] hover:border-[rgba(74,222,128,0.5)] transition-colors">
                <Facebook size={16} />
              </a>
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Vision LLC on LinkedIn"
                className="w-9 h-9 rounded-lg border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-gray-400 hover:text-[#4ADE80] hover:border-[rgba(74,222,128,0.5)] transition-colors">
                <Linkedin size={16} />
              </a>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="Vision LLC on YouTube"
                className="w-9 h-9 rounded-lg border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-gray-400 hover:text-[#4ADE80] hover:border-[rgba(74,222,128,0.5)] transition-colors">
                <Youtube size={16} />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">Services</h3>
            <ul className="space-y-3">
              {[
                { label: "All Listings", href: "/commercial-real-estate" },
                { label: "Bristol CoWork", href: "/cowork" },
                { label: "Executive Advisement", href: "/executive-advisement" },
                { label: "Development", href: "/commercial-real-estate" },
                { label: "About Vision LLC", href: "/about" },
                { label: "Blog", href: "/blog" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#4ADE80] transition-colors group">
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#4ADE80]" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Space Types — keyword landing pages for SEO internal links */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">Find Space</h3>
            <ul className="space-y-3">
              {SPACE_TYPE_PAGES.map((page) => (
                <li key={page.slug}>
                  <Link href={`/spaces/${page.slug}`}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#4ADE80] transition-colors group">
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#4ADE80]" />
                    {page.badge} Space
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link href="/commercial-real-estate"
                  className="text-sm text-[#4ADE80] hover:text-white transition-colors font-semibold">
                  All Properties →
                </Link>
              </li>
            </ul>
          </div>

          {/* Markets — GEO pages for SEO */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">Markets Served</h3>
            <ul className="space-y-3">
              {GEO_PAGES.map((geo) => (
                <li key={geo.slug}>
                  <Link href={`/markets/${geo.slug}`}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#4ADE80] transition-colors group">
                    <MapPin size={12} className="text-[#4ADE80] flex-shrink-0" />
                    {geo.city}, {geo.state}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link href="/markets" className="text-sm text-[#4ADE80] hover:text-white transition-colors font-semibold">
                  All Markets →
                </Link>
              </li>
              <li className="pt-3 lg:hidden">
                <Link href="/admin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4ADE80] transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] inline-block" />
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">Contact Us</h3>
            <ul className="space-y-4">
              <li>
                <a href={COMPANY.phoneHref} id="footer-phone"
                  className="flex items-start gap-3 text-sm text-gray-400 hover:text-[#4ADE80] transition-colors group">
                  <Phone size={15} className="mt-0.5 text-[#4ADE80] flex-shrink-0" />
                  <span>{COMPANY.phone}</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-400 hover:text-[#4ADE80] transition-colors">
                <Mail size={15} className="mt-0.5 text-[#4ADE80] flex-shrink-0" />
                <SafeEmail className="break-all" />
              </li>
              <li>
                <a href="https://maps.google.com/?q=100+5th+St+Bristol+TN+37620" target="_blank" rel="noopener noreferrer"
                  id="footer-address"
                  className="flex items-start gap-3 text-sm text-gray-400 hover:text-[#4ADE80] transition-colors">
                  <MapPin size={15} className="mt-0.5 text-[#4ADE80] flex-shrink-0" />
                  <span>{COMPANY.fullAddress}</span>
                </a>
              </li>
            </ul>

            <div className="mt-6 p-4 rounded-xl border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.05)]">
              <p className="text-xs text-gray-400 mb-3">Ready to find your space?</p>
              <Link href="/contact" id="footer-contact-cta"
                className="btn-primary w-full justify-center py-2.5 text-sm">
                Schedule a Tour
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[rgba(74,222,128,0.07)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            © {currentYear} Vision LLC. All rights reserved. | Bristol, TN/VA
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
            <Link href="/sitemap-page" className="hover:text-gray-400 transition-colors">Sitemap</Link>
            <span className="flex items-center gap-1">
              Powered by{" "}
              <span className="text-[#4ADE80] font-semibold">Gemini AI</span>
            </span>
            <Link href="/admin" id="footer-admin-link"
              className="hidden lg:flex items-center gap-1.5 hover:text-[#4ADE80] transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] inline-block" />
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
