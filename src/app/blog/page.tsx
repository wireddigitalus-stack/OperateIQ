import type { Metadata } from "next";
import Link from "next/link";
import { Clock, BookOpen } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getPublishedPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: `Blog | ${BRAND.name}`,
  description: `Guides and insights on property operations, maintenance, leasing and portfolio management from ${BRAND.name}.`,
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="oiq-page">
      <section className="oiq-glow pt-36 pb-14 px-5 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white">The <span className="oiq-grad-text">{BRAND.name}</span> Blog</h1>
        <p className="mt-5 text-lg text-slate-300 max-w-2xl mx-auto">Practical playbooks for running property operations smarter.</p>
      </section>
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-6xl">
          {posts.length === 0 ? (
            <div className="oiq-card p-12 text-center max-w-xl mx-auto">
              <BookOpen className="mx-auto text-[var(--oiq-cyan)]" size={32} />
              <h2 className="mt-4 text-xl font-semibold text-white">First posts coming soon</h2>
              <p className="mt-2 text-slate-400">We&apos;re writing guides on rent collection, maintenance workflows, inspections and more.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="oiq-card overflow-hidden group hover:border-[var(--oiq-indigo)]/50 transition-colors">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.imageAlt || p.title} className="w-full h-44 object-cover" />
                  )}
                  <div className="p-6">
                    <p className="text-xs font-semibold text-[var(--oiq-cyan)] uppercase tracking-wider">{p.category}</p>
                    <h2 className="mt-2 text-lg font-semibold text-white group-hover:text-[var(--oiq-cyan)] transition-colors">{p.title}</h2>
                    <p className="mt-2 text-sm text-slate-400 line-clamp-3">{p.excerpt}</p>
                    <p className="mt-4 text-xs text-slate-500 flex items-center gap-2">
                      {fmt(p.publishedAt)} · <Clock size={12} /> {p.readTime} min
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
