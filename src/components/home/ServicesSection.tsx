import Link from "next/link";
import { Building2, Hammer, TrendingUp, ArrowRight } from "lucide-react";
import { SERVICES } from "@/lib/data";

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 size={28} />,
  Hammer: <Hammer size={28} />,
  TrendingUp: <TrendingUp size={28} />,
};

const hrefMap: Record<string, string> = {
  leasing: "/commercial-real-estate",
  development: "/development",
  advisement: "/executive-advisement",
};

interface ServicesOverrides {
  section_heading_1?: string;
  section_heading_2?: string;
  section_subtext?: string;
  card_1_title?: string;
  card_1_short?: string;
  card_1_desc?: string;
  card_2_title?: string;
  card_2_short?: string;
  card_2_desc?: string;
  card_3_title?: string;
  card_3_short?: string;
  card_3_desc?: string;
}

export default function ServicesSection({ overrides }: { overrides?: ServicesOverrides }) {
  const o = overrides || {};

  const heading1 = o.section_heading_1 ?? "Three Integrated Divisions.";
  const heading2 = o.section_heading_2 ?? "One Hands-On Philosophy.";
  const sectionSubtext = o.section_subtext ??
    "Vision operates through three complementary divisions — from initial strategy through leasing, development, construction, and long-term advisory. No hand-offs. No silos. Just results.";

  // Merge CMS overrides for each card
  const services = SERVICES.map((service, idx) => {
    const i = idx + 1;
    return {
      ...service,
      title: o[`card_${i}_title` as keyof ServicesOverrides] ?? service.title,
      shortDesc: o[`card_${i}_short` as keyof ServicesOverrides] ?? service.shortDesc,
      description: o[`card_${i}_desc` as keyof ServicesOverrides] ?? service.description,
    };
  });

  return (
    <section id="services" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <div className="section-line mb-4" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
            {heading1}{" "}
            <span className="gradient-text-green">{heading2}</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            {sectionSubtext}
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <Link
              key={service.id}
              href={hrefMap[service.id]}
              id={`service-card-${service.id}`}
              className="group relative glass rounded-2xl p-8 property-card border border-[rgba(74,222,128,0.1)] hover:border-[rgba(74,222,128,0.35)] transition-all duration-300 cursor-pointer block"
            >
              {/* Number */}
              <span className="absolute top-6 right-6 text-5xl font-black text-white/5 group-hover:text-[#4ADE80]/10 transition-colors select-none">
                0{idx + 1}
              </span>

              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] flex items-center justify-center text-[#4ADE80] mb-6 group-hover:bg-[rgba(74,222,128,0.15)] group-hover:border-[rgba(74,222,128,0.4)] group-hover:shadow-[0_0_20px_rgba(74,222,128,0.15)] transition-all">
                {iconMap[service.icon]}
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#4ADE80] transition-colors">
                {service.title}
              </h3>
              <p className="text-sm text-[#4ADE80] font-semibold mb-4">{service.shortDesc}</p>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">{service.description}</p>

              <ul className="space-y-2 mb-6">
                {service.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-sm font-semibold text-[#4ADE80] group-hover:gap-3 transition-all">
                Learn More <ArrowRight size={15} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
