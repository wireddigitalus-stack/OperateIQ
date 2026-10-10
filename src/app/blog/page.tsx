import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Tag, BookOpen } from "lucide-react";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog-data";

export const metadata: Metadata = {
  title: "Commercial Real Estate Blog | Tri-Cities Market Insights | Vision LLC",
  description:
    "Expert commercial real estate insights from Vision LLC — Bristol TN/VA, Tri-Cities market analysis, coworking trends & development news. Written by the team that owns it.",
  keywords: [
    "Bristol TN commercial real estate blog",
    "Bristol VA commercial real estate blog",
    "Tri-Cities market insights",
    "CRE news Bristol Tennessee",
    "CRE news Bristol Virginia",
    "commercial property blog Kingsport Johnson City",
    "coworking trends Bristol TN",
    "coworking trends Bristol VA",
    "downtown Bristol development news",
  ],
  alternates: { canonical: "https://www.teamvisionllc.com/blog" },
  openGraph: {
    title: "Tri-Cities CRE Blog | Market Insights & News | Vision LLC",
    description: "Expert market analysis, business insights, and development news from the Tri-Cities region — written by the team that owns and operates it.",
    url: "https://www.teamvisionllc.com/blog",
    siteName: "Vision LLC",
    type: "website",
    images: [
      {
        url: "https://www.teamvisionllc.com/api/og?title=CRE+Intelligence&subtitle=Market+Insights+%C2%B7+Bristol%2C+TN+%E2%80%94+Tri-Cities+Region&tag=Vision+LLC+Blog&type=blog",
        width: 1200,
        height: 630,
        alt: "Vision LLC Blog — Commercial Real Estate Insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tri-Cities CRE Blog | Vision LLC",
    description:
      "Expert market analysis, business insights, and development news from the Tri-Cities region.",
    images: [
      "https://www.teamvisionllc.com/api/og?title=CRE+Intelligence&subtitle=Market+Insights+%C2%B7+Bristol%2C+TN+%E2%80%94+Tri-Cities+Region&tag=Vision+LLC+Blog&type=blog",
    ],
  },
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getDbPosts(): Promise<BlogPost[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?status=eq.published&order=published_at.desc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const rows: {
      slug: string; title: string; meta_title: string; meta_description: string;
      category: string; tags: string[]; read_time: number; published_at: string;
      author: string; author_title: string; excerpt: string; content: string;
      image_url?: string; image_alt?: string;
    }[] = await res.json();
    return rows.map(r => ({
      slug:            r.slug,
      title:           r.title,
      metaTitle:       r.meta_title,
      metaDescription: r.meta_description,
      category:        r.category,
      tags:            r.tags || [],
      targetKeyword:   "",
      readTime:        r.read_time,
      publishedAt:     r.published_at,
      author:          r.author,
      authorTitle:     r.author_title,
      excerpt:         r.excerpt,
      content:         r.content,
      image:           r.image_url || undefined,
      imageAlt:        r.image_alt || undefined,
    }));
  } catch { return []; }
}

const categoryColors: Record<string, string> = {
  "Market Reports": "bg-[rgba(74,222,128,0.1)] text-[#4ADE80] border-[rgba(74,222,128,0.25)]",
  "Market Insights": "bg-[rgba(74,222,128,0.1)] text-[#4ADE80] border-[rgba(74,222,128,0.25)]",
  "Business Insights": "bg-[rgba(96,165,250,0.1)] text-[#60A5FA] border-[rgba(96,165,250,0.25)]",
  "Development": "bg-[rgba(250,204,21,0.1)] text-[#FACC15] border-[rgba(250,204,21,0.25)]",
  "Executive Advisement": "bg-[rgba(167,139,250,0.1)] text-[#A78BFA] border-[rgba(167,139,250,0.25)]",
  "Investment": "bg-[rgba(251,146,60,0.1)] text-[#FB923C] border-[rgba(251,146,60,0.25)]",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPage() {
  const dbPosts = await getDbPosts();
  // Merge: DB posts first (newest), then static posts — deduplicate by slug
  const slugsSeen = new Set(dbPosts.map(p => p.slug));
  const allPosts: BlogPost[] = [...dbPosts, ...BLOG_POSTS.filter(p => !slugsSeen.has(p.slug))];
  const [featured, ...rest] = allPosts;

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Vision LLC CRE Intelligence Blog",
    description: "Expert commercial real estate insights, market analysis, and development news covering Bristol TN/VA and the Tri-Cities region.",
    url: "https://www.teamvisionllc.com/blog",
    publisher: {
      "@type": "Organization",
      name: "Vision LLC",
      url: "https://www.teamvisionllc.com",
      logo: {
        "@type": "ImageObject",
        url: "https://www.teamvisionllc.com/vision-logo.png",
      },
    },
    blogPost: allPosts.slice(0, 5).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.metaDescription,
      url: `https://www.teamvisionllc.com/blog/${post.slug}`,
      datePublished: post.publishedAt,
      author: { "@type": "Organization", name: "Vision LLC" },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.teamvisionllc.com" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.teamvisionllc.com/blog" },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(74,222,128,0.07)_0%,transparent_60%)]" />
        <div className="max-w-7xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] text-xs font-bold mb-6 tracking-wider uppercase">
            <BookOpen size={12} />
            Vision LLC Insights
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
            Commercial Real Estate{" "}
            <span className="gradient-text-green">Intelligence</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Expert market analysis, business insights, and development news from
            the Tri-Cities region — written by the team that owns and operates it.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href={`/blog/${featured.slug}`}
            id={`blog-featured-${featured.slug}`}
            className="group block glass rounded-3xl border border-[rgba(74,222,128,0.1)] hover:border-[rgba(74,222,128,0.3)] overflow-hidden transition-all duration-300 property-card"
          >
            <div className="grid lg:grid-cols-5 gap-0">
              {/* Image or colour accent panel */}
              <div className="lg:col-span-2 min-h-[220px] relative overflow-hidden">
                {featured.image ? (
                  <Image
                    src={featured.image}
                    alt={featured.imageAlt || featured.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[rgba(74,222,128,0.12)] via-[rgba(74,222,128,0.04)] to-transparent flex items-center justify-center p-10">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.25)] flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={28} className="text-[#4ADE80]" />
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${categoryColors[featured.category] || categoryColors["Market Reports"]}`}>
                        {featured.category}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="lg:col-span-3 p-8 lg:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} />
                    {featured.readTime} min read
                  </span>
                  <span>{formatDate(featured.publishedAt)}</span>
                  <span className="text-[#4ADE80] font-semibold uppercase tracking-widest text-[10px]">
                    Featured
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 group-hover:text-[#4ADE80] transition-colors">
                  {featured.title}
                </h2>
                <p className="text-gray-400 text-base leading-relaxed mb-6">
                  {featured.excerpt}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {featured.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-gray-500">
                      <Tag size={9} />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-[#4ADE80] group-hover:gap-4 transition-all">
                  Read Article <ArrowRight size={15} />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Article Grid */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-black text-white uppercase tracking-widest mb-8">
            All Articles
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                id={`blog-card-${post.slug}`}
                className="group glass rounded-2xl border border-[rgba(74,222,128,0.08)] hover:border-[rgba(74,222,128,0.3)] overflow-hidden flex flex-col property-card transition-all duration-300"
              >
                {/* Image or accent panel */}
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  {post.image ? (
                    <Image
                      src={post.image}
                      alt={post.imageAlt || post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${categoryColors[post.category] ? "" : ""}`}
                      style={{ background: "linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(74,222,128,0.02) 100%)" }}>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${categoryColors[post.category] || categoryColors["Market Reports"]}`}>
                        {post.category}
                      </span>
                    </div>
                  )}
                  {/* Category badge overlay when image exists */}
                  {post.image && (
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold backdrop-blur-sm bg-[rgba(5,8,15,0.88)] border border-[rgba(255,255,255,0.08)] ${categoryColors[post.category] || categoryColors["Market Reports"]}`}>
                        {post.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Category badge when no image */}
                  {!post.image && (
                    <span className={`inline-flex items-center self-start px-2.5 py-1 rounded-lg text-[11px] font-bold border mb-3 ${categoryColors[post.category] || categoryColors["Market Reports"]}`}>
                      {post.category}
                    </span>
                  )}
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#4ADE80] transition-colors leading-snug flex-1">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-600 mt-auto pt-3 border-t border-[rgba(255,255,255,0.05)]">
                    <span className="flex items-center gap-1.5">
                      <Clock size={10} />
                      {post.readTime} min
                    </span>
                    <span className="flex items-center gap-1 text-[#4ADE80] font-semibold group-hover:gap-2 transition-all">
                      Read <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[rgba(74,222,128,0.08)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
            Ready to explore commercial real estate in the{" "}
            <span className="gradient-text-green">Tri-Cities?</span>
          </h2>
          <p className="text-gray-400 mb-8">
            Our team lives and works in this market. Let's find your space.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" id="blog-cta-contact" className="btn-primary py-4 px-8">
              Schedule a Consultation <ArrowRight size={17} />
            </Link>
            <Link href="/markets" id="blog-cta-markets" className="btn-secondary py-4 px-8">
              Explore Our Markets
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
