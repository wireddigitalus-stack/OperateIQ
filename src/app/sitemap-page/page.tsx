import type { Metadata } from "next";
import Link from "next/link";
import { GEO_PAGES, PROPERTIES } from "@/lib/data";
import { BLOG_POSTS } from "@/lib/blog-data";
import { MapPin, Building2, FileText, Globe, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Site Map | Vision LLC",
  description:
    "A complete directory of all pages on the Vision LLC commercial real estate platform serving the Tri-Cities, TN/VA region.",
  alternates: {
    canonical: "https://www.teamvisionllc.com/sitemap-page",
  },
};

// ─── Static pages ─────────────────────────────────────────────────────────────

const MAIN_PAGES = [
  { href: "/",                        label: "Home",                    desc: "Vision LLC — Tri-Cities Commercial Real Estate" },
  { href: "/commercial-real-estate",  label: "Commercial Real Estate",  desc: "Browse available commercial spaces" },
  { href: "/markets",                 label: "Markets Overview",        desc: "Regional market intelligence and trends" },
  { href: "/cowork",                  label: "CoWork Bristol",          desc: "Flexible coworking and private office space" },
  { href: "/executive-advisement",    label: "Executive Advisement",    desc: "Strategic real estate advisory services" },
  { href: "/about",                   label: "About Vision LLC",        desc: "Our team, mission, and local commitment" },
  { href: "/contact",                 label: "Contact",                 desc: "Get in touch with our team" },
  { href: "/blog",                    label: "Blog",                    desc: "Market insights and commercial real estate guides" },
];

// ─── Section component ────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accent + "22" }}
        >
          <Icon size={17} style={{ color: accent }} />
        </div>
        <h2 className="text-base font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </section>
  );
}

function LinkCard({
  href,
  label,
  desc,
  accent = "#4ADE80",
  external = false,
}: {
  href: string;
  label: string;
  desc?: string;
  accent?: string;
  external?: boolean;
}) {
  const inner = (
    <div
      className="group flex items-start gap-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-200 cursor-pointer"
    >
      <ChevronRight
        size={14}
        className="mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        style={{ color: accent }}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white leading-snug truncate">{label}</p>
        {desc && (
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{desc}</p>
        )}
      </div>
    </div>
  );

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link href={href}>{inner}</Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SitemapPage() {
  return (
    <main className="min-h-screen bg-[#080C14] text-white pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-black text-[#4ADE80] uppercase tracking-[0.2em] mb-3">
            Site Map
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
            Everything on Vision LLC
          </h1>
          <p className="text-sm text-gray-400 max-w-xl">
            A complete directory of every page on our platform — from commercial listings
            and market reports to blog articles and local area guides.
          </p>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-gray-600 hover:text-[#4ADE80] transition-colors border border-[rgba(255,255,255,0.08)] px-3 py-1.5 rounded-lg"
            >
              🤖 View XML Sitemap (for search engines)
            </a>
          </div>
        </div>

        {/* Main Pages */}
        <Section icon={Globe} title="Main Pages" accent="#4ADE80">
          {MAIN_PAGES.map((p) => (
            <LinkCard key={p.href} href={p.href} label={p.label} desc={p.desc} accent="#4ADE80" />
          ))}
        </Section>

        {/* Properties */}
        <Section icon={Building2} title="Properties" accent="#60A5FA">
          {PROPERTIES.map((p) => (
            <LinkCard
              key={p.id}
              href={`/properties/${p.id}`}
              label={p.name}
              desc={(p as { address?: string }).address ?? p.id}
              accent="#60A5FA"
            />
          ))}
        </Section>

        {/* Market Pages */}
        <Section icon={MapPin} title="Local Market Guides" accent="#F59E0B">
          {GEO_PAGES.map((g) => (
            <LinkCard
              key={g.slug}
              href={`/markets/${g.slug}`}
              label={`${g.city}, ${g.state}`}
              desc={`Commercial real estate in ${g.city}, ${g.state}`}
              accent="#F59E0B"
            />
          ))}
        </Section>

        {/* Blog Posts */}
        <Section icon={FileText} title="Blog &amp; Insights" accent="#A78BFA">
          {BLOG_POSTS.map((post) => (
            <LinkCard
              key={post.slug}
              href={`/blog/${post.slug}`}
              label={post.title}
              desc={new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              accent="#A78BFA"
            />
          ))}
        </Section>

      </div>
    </main>
  );
}
