import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import {
  Phone,
  ArrowRight,
  TrendingUp,
  Users,
  Globe,
  BarChart3,
  Building2,
  Shield,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import { COMPANY } from "@/lib/data";
import Navigation from "@/components/Navigation";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "C-Suite Executive Advisement & Strategic Consulting | Vision LLC, Bristol TN/VA",
  description:
    "C-suite consulting, strategic planning & government advisement from Vision LLC — led by J. Allen Hurley II. 30+ years of executive leadership. Bristol, TN. Call 423-573-1022.",
  alternates: {
    canonical: "https://www.teamvisionllc.com/executive-advisement",
  },
  openGraph: {
    title: "Executive Advisement & C-Suite Consulting | J. Allen Hurley II | Vision LLC",
    description:
      "C-suite consulting, strategic planning & government advisement from J. Allen Hurley II — 30+ years of real-world executive leadership in the Tri-Cities.",
    url: "https://www.teamvisionllc.com/executive-advisement",
    images: [
      {
        url: "https://www.teamvisionllc.com/api/og?title=Executive+Advisement&subtitle=C-Suite+Consulting+%C2%B7+Strategic+Planning+%E2%80%94+Vision+LLC&tag=Tri-Cities&type=default",
        width: 1200,
        height: 630,
        alt: "Vision LLC Executive Advisement — Bristol, TN/VA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "C-Suite Consulting & Executive Advisement | Vision LLC | Bristol, TN/VA",
    description:
      "Strategic planning, government advisement & executive leadership coaching from Vision LLC. 30+ years of real-world leadership. Bristol, TN.",
    images: [
      "https://www.teamvisionllc.com/api/og?title=Executive+Advisement&subtitle=C-Suite+Consulting+%C2%B7+Strategic+Planning+%E2%80%94+Vision+LLC&tag=Tri-Cities&type=default",
    ],
  },
};

const services = [
  {
    icon: <Users size={24} />,
    title: "Executive Leadership Coaching",
    desc: "Personalized, high-accountability mentorship for C-suite leaders, founders, and senior decision-makers. We work alongside you — not just behind a whiteboard.",
  },
  {
    icon: <TrendingUp size={24} />,
    title: "Strategic Planning & Growth Execution",
    desc: "Practical frameworks that actually get implemented. From market entry strategy to expansion roadmaps — we turn vision into a disciplined, executable plan.",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Operational Alignment & Accountability",
    desc: "Synchronize your people, processes, and systems. Eliminate silos, reduce overhead, and build an organization that scales without breaking.",
  },
  {
    icon: <Building2 size={24} />,
    title: "Planning & Infrastructure",
    desc: "Site selection, facility design, operational flow, and long-range capital planning — all informed by 20+ years of real development and construction experience.",
  },
  {
    icon: <Briefcase size={24} />,
    title: "Real Estate-Driven Business Optimization",
    desc: "We uniquely leverage commercial real estate as a strategic tool — reducing occupancy costs, unlocking equity, and aligning physical space with business objectives.",
  },
];

const divisions = [
  {
    icon: <Shield size={28} />,
    accent: "#4ADE80",
    title: "Government & Public Sector",
    sub: "Public-Private Partnerships · Regulatory Navigation · Grant-Aligned Development",
    desc: "Vision LLC has deep experience bridging the public and private sectors. From navigating regulatory environments to structuring PPP frameworks that unlock federal and state funding, we help government entities and community stakeholders move at the speed of business.",
  },
  {
    icon: <Globe size={28} />,
    accent: "#FACC15",
    title: "Global & National Industry",
    sub: "Construction · Manufacturing · Technology · Professional Services",
    desc: "With established relationships across construction, manufacturing, technology, public safety, and professional services sectors, Vision LLC provides strategic counsel informed by decades of real industry exposure — not just textbook theory.",
  },
  {
    icon: <BarChart3 size={28} />,
    accent: "#60A5FA",
    title: "Private Equity & Strategic Investment",
    sub: "Board Advisory · Portfolio Strategy · Sustainable Scaling",
    desc: "We take active board-level advisory roles in select portfolio companies. Our integrated model means we bring more than capital guidance — we bring operational accountability, real estate strategy, and execution discipline to every investment.",
  },
];

const ecosystem = [
  { label: "Real Estate Ownership", sub: "50+ properties, Downtown Bristol anchor" },
  { label: "Development & Construction", sub: "Historic adaptive reuse, ground-up builds" },
  { label: "Executive Advisement", sub: "30+ years C-suite & strategy expertise" },
  { label: "Private Equity", sub: "Board-level involvement, portfolio scaling" },
];

export default async function ExecutiveAdvisementPage() {
  const cx = await getSiteContent("page:executive-advisement");
  const c = (key: string, fallback: string) => cx[key] || fallback;

  // Build services from overrides
  const liveServices = services.map((s, i) => ({
    ...s,
    title: c(`svc_${i + 1}_title`, s.title),
    desc: c(`svc_${i + 1}_desc`, s.desc),
  }));

  // Build divisions from overrides
  const liveDivisions = divisions.map((d, i) => ({
    ...d,
    title: c(`div_${i + 1}_title`, d.title),
    sub: c(`div_${i + 1}_sub`, d.sub),
    desc: c(`div_${i + 1}_desc`, d.desc),
  }));

  const advisementSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Vision LLC — Executive Advisement",
    description: "C-suite consulting, strategic planning, government advisement & private equity advisory from Vision LLC, led by J. Allen Hurley II. Serving the Tri-Cities TN/VA region.",
    url: "https://www.teamvisionllc.com/executive-advisement",
    telephone: "+14235731022",
    priceRange: "$$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "100 5th St., Suite 2W",
      addressLocality: "Bristol",
      addressRegion: "TN",
      postalCode: "37620",
      addressCountry: "US",
    },
    areaServed: [
      { "@type": "City", name: "Bristol", containedIn: "Tennessee" },
      { "@type": "City", name: "Kingsport", containedIn: "Tennessee" },
      { "@type": "City", name: "Johnson City", containedIn: "Tennessee" },
      { "@type": "City", name: "Abingdon", containedIn: "Virginia" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Executive Advisory Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Executive Leadership Coaching" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Strategic Planning & Growth Execution" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Government & Public Sector Advisory" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Private Equity & Board Advisory" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Real Estate-Driven Business Optimization" } },
      ],
    },
    founder: {
      "@type": "Person",
      name: "J. Allen Hurley II",
      jobTitle: "Chief Executive Officer",
      worksFor: { "@type": "Organization", name: "Vision LLC" },
    },
    parentOrganization: {
      "@type": "Organization",
      name: "Vision LLC",
      url: "https://www.teamvisionllc.com",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.teamvisionllc.com" },
      { "@type": "ListItem", position: 2, name: "Executive Advisement", item: "https://www.teamvisionllc.com/executive-advisement" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(advisementSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Navigation />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0D1117] relative overflow-hidden">
          {/* Ghosted boardroom image */}
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src="/property-images/cowork-conference-room.jpg"
              alt=""
              fill
              className="object-cover object-center"
              style={{ opacity: 0.12 }}
              priority
              aria-hidden="true"
            />
            {/* Left-to-right fade so text stays readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117] via-[#0D1117]/60 to-[#0D1117]/20" />
            {/* Top + bottom vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0D1117]/80 via-transparent to-[#0D1117]" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.1)_0%,transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(74,222,128,0.04)_0%,transparent_55%)]" />
          <div className="max-w-7xl mx-auto relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(250,204,21,0.08)] border border-[rgba(250,204,21,0.2)] text-[#FACC15] text-xs font-bold mb-6 tracking-wider uppercase">
                {c("hero_badge", "Division III — Executive Advisement")}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                {c("hero_heading", "Executive Advisement & C-Suite Consulting").includes("C-Suite") ? (
                  <>Executive Advisement &{" "}<span className="gradient-text-gold">C-Suite Consulting.</span></>
                ) : c("hero_heading", "Executive Advisement & C-Suite Consulting")}
              </h1>
              <p className="text-xl text-gray-300 mb-4 leading-relaxed">
                {c("hero_description", "Vision LLC's Executive Advisement division delivers C-suite consulting and strategic guidance grounded in 30+ years of real-world leadership — not theory.")}
              </p>
              <p className="text-gray-500 mb-10">
                {c("hero_subtext", "We scale WITH you. Hands-on. Accountable. Integrated.")}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/contact" className="btn-primary-cta px-8 py-4">
                  Schedule a Strategy Call <ArrowRight size={17} />
                </Link>
                <a href={COMPANY.phoneHref} className="btn-secondary px-8 py-4">
                  <Phone size={17} /> {COMPANY.phone}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Credibility Bar */}
        <div className="border-y border-[rgba(250,204,21,0.1)] bg-[rgba(250,204,21,0.03)] py-6 px-4">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400">
            <span><strong className="text-white text-lg">30+</strong> Years Executive Experience</span>
            <span><strong className="text-white text-lg">3</strong> Specialized Advisory Divisions</span>
            <span><strong className="text-white text-lg">20+</strong> Years Tri-Cities Market Knowledge</span>
            <span><strong className="text-[#FACC15] text-lg">#1</strong> Integrated CRE + Strategy Firm in Region</span>
          </div>
        </div>

        {/* Core Services */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <div className="section-line mx-auto mb-5" />
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
                {c("services_heading", "Core Advisory Services").includes("Services") ? <>{c("services_heading", "Core Advisory Services").replace("Services", "")}<span className="gradient-text-gold">Services</span></> : c("services_heading", "Core Advisory Services")}
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                {c("services_subtext", "Five integrated service pillars — each designed to move the needle at the executive level.")}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {liveServices.map((s, i) => (
                <div
                  key={s.title}
                  className="glass rounded-2xl p-7 border border-[rgba(250,204,21,0.08)] hover:border-[rgba(250,204,21,0.25)] transition-all group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-[#FACC15] mb-5"
                    style={{ background: "rgba(250,204,21,0.08)" }}
                  >
                    {s.icon}
                  </div>
                  <div className="text-[10px] font-black text-[rgba(250,204,21,0.4)] tracking-[0.15em] uppercase mb-2">
                    0{i + 1}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3 group-hover:text-[#FACC15] transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
              {/* CTA tile */}
              <div className="glass rounded-2xl p-7 border border-[rgba(250,204,21,0.2)] bg-[rgba(250,204,21,0.03)] flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-[#FACC15] uppercase tracking-widest mb-3">
                    Ready to Talk?
                  </p>
                  <h3 className="text-lg font-bold text-white mb-3">
                    Let's Build Your Roadmap
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Strategy calls are free. Insight is immediate. Results are measurable.
                  </p>
                </div>
                <Link href="/contact" className="btn-primary-cta justify-center text-sm py-3">
                  Schedule a Call <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Specialized Divisions */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0D1117]/60">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <div className="section-line mx-auto mb-5" />
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
                Specialized <span className="gradient-text-green">Divisions</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {liveDivisions.map((d) => (
                <div
                  key={d.title}
                  className="glass rounded-2xl p-8 border flex flex-col"
                  style={{ borderColor: `${d.accent}22` }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 flex-shrink-0"
                    style={{ background: `${d.accent}12`, color: d.accent }}
                  >
                    {d.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{d.title}</h3>
                  <p className="text-xs font-semibold mb-4" style={{ color: d.accent }}>
                    {d.sub}
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integrated Ecosystem Advantage */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="section-line mb-5" />
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-5 leading-tight">
                The{" "}
                <span className="gradient-text-gold">Integrated Ecosystem</span>
                {" "}Advantage
              </h2>
              <p className="text-gray-300 text-lg mb-5">
                Vision LLC is the only firm in the Tri-Cities that operates simultaneously across four
                critical domains. This isn't a pitch — it's a structural advantage that directly benefits
                every client we advise.
              </p>
              <p className="text-gray-500 mb-8">
                When your advisor also owns the buildings, builds the facilities, and has board seats
                in the companies they work with — you get strategy that is grounded in reality, not
                PowerPoint decks.
              </p>
              <div className="flex gap-4">
                <Link href="/contact" className="btn-primary-cta py-3 px-7">
                  Start a Conversation <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {ecosystem.map((item, i) => (
                <div
                  key={item.label}
                  className="glass rounded-2xl p-6 border border-[rgba(250,204,21,0.1)] hover:border-[rgba(250,204,21,0.3)] transition-all"
                >
                  <div className="text-3xl font-black text-[#FACC15] mb-2">0{i + 1}</div>
                  <h4 className="text-white font-bold text-sm mb-1">{item.label}</h4>
                  <p className="text-xs text-gray-500">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who We Work With */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0D1117]/40">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
              Who We <span className="gradient-text-green">Work With</span>
            </h2>
            <p className="text-gray-400 mb-10">
              From local founders to national executives — we work with leaders who are serious about growth.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                "Growth-Stage Founders",
                "C-Suite & Board Members",
                "Regional Governments",
                "Private Equity Firms",
                "Healthcare Organizations",
                "Manufacturing Companies",
                "Commercial Developers",
                "Nonprofit Leadership",
              ].map((who) => (
                <span
                  key={who}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-[rgba(250,204,21,0.15)] text-gray-300 bg-[rgba(250,204,21,0.04)]"
                >
                  {who}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="btn-primary-cta px-8 py-4">
                Schedule a Strategy Call <ArrowRight size={17} />
              </Link>
              <a href={COMPANY.phoneHref} className="btn-secondary px-8 py-4">
                <Phone size={17} /> {COMPANY.phone}
              </a>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="glass-strong rounded-3xl p-10 border border-[rgba(250,204,21,0.2)] text-center glow-gold">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-3xl font-black text-white mb-4">
                {c("final_quote", '"The sum of all parts is greater than the whole."')}
              </h2>
              <p className="text-gray-400 mb-2 text-lg italic">{c("final_attribution", "— J. Allen Hurley II")}</p>
              <p className="text-gray-500 mb-10 max-w-lg mx-auto">
                {c("final_subtext", "That's not just a philosophy. It's how we build. How we advise. How we grow — with you.")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact" className="btn-primary-cta py-4 px-8">
                  Book a Strategy Session <ArrowRight size={17} />
                </Link>
                <a href={COMPANY.phoneHref} className="btn-secondary py-4 px-8">
                  <Phone size={17} /> Call Direct: {COMPANY.phone}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
