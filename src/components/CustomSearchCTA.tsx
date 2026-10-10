import Link from "next/link";
import { Building2, Key, Search, ArrowRight, Phone } from "lucide-react";

const PILLARS = [
  {
    icon: Building2,
    title: "Custom Build-Outs",
    desc: "Raw square footage transformed to your exact spec — we manage design, permitting, and every detail.",
    color: "#4ADE80",
    bg: "rgba(74,222,128,0.07)",
    border: "rgba(74,222,128,0.15)",
  },
  {
    icon: Key,
    title: "Turn-Key Ready",
    desc: "Move in tomorrow. Fully finished, furnished, and configured — zero friction, zero buildout stress.",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.07)",
    border: "rgba(96,165,250,0.15)",
  },
  {
    icon: Search,
    title: "Off-Market Access",
    desc: "We source deals that never hit the listing page — across the entire Tri-Cities region.",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.07)",
    border: "rgba(167,139,250,0.15)",
  },
];

export default function CustomSearchCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Outer card */}
        <div
          className="relative rounded-3xl overflow-hidden p-8 sm:p-12"
          style={{
            background: "rgba(10,14,20,0.85)",
            border: "1px solid rgba(74,222,128,0.18)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.03), 0 0 60px rgba(74,222,128,0.07), 0 0 120px rgba(96,165,250,0.04)",
          }}
        >
          {/* Ambient gradient background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 75% 50%, rgba(96,165,250,0.06) 0%, transparent 55%), radial-gradient(ellipse at 25% 50%, rgba(74,222,128,0.06) 0%, transparent 55%)",
            }}
          />

          {/* Top accent line */}
          <div
            className="absolute top-0 left-12 right-12 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(74,222,128,0.4), rgba(96,165,250,0.4), transparent)",
            }}
          />

          {/* Two-column layout */}
          <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* ── Left: Copy ── */}
            <div>
              <p className="text-[11px] font-black text-[#4ADE80] uppercase tracking-[0.2em] mb-4">
                Custom Property Search
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-[1.1] mb-5">
                Don&apos;t See the Right Space?{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ADE80] to-[#60A5FA]">
                  We&apos;ll Source It.
                </span>
              </h2>
              <p className="text-[15px] text-gray-400 leading-relaxed mb-8 max-w-lg">
                From raw square footage to fully finished suites — if it exists in the
                Tri-Cities market, we can find it, negotiate it, or build it. Tell us
                exactly what your business needs and we&apos;ll handle the rest.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-black bg-gradient-to-r from-[#4ADE80] to-[#22C55E] hover:opacity-90 transition-opacity"
                  style={{ boxShadow: "0 4px 20px rgba(74,222,128,0.3)" }}
                >
                  Tell Us What You Need <ArrowRight size={15} />
                </Link>
                <a
                  href="tel:+14235731022"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-gray-300 border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.25)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-all"
                >
                  <Phone size={14} /> 423-573-1022
                </a>
              </div>
            </div>

            {/* ── Right: Pillars ── */}
            <div className="grid gap-3">
              {PILLARS.map(({ icon: Icon, title, desc, color, bg, border }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.01]"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${color}1A` }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white mb-1">{title}</p>
                    <p className="text-[12px] text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
