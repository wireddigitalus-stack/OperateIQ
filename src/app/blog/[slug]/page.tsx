import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Clock, Calendar, User, Tag } from "lucide-react";
import { BLOG_POSTS } from "@/lib/blog-data";
import { COMPANY } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

/** Fetch a post from Supabase (DB edits override static data) */
async function getDbPost(slug: string) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !KEY) return null;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&select=*`,
      {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
        next: { revalidate: 60 }, // cache 60 s — picks up edits quickly without hammering DB on every request
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows[0]) return null;
    const r = rows[0];
    // Normalise DB row → BlogPost shape
    return {
      slug:            r.slug,
      title:           r.title,
      metaTitle:       r.meta_title    || r.title,
      metaDescription: r.meta_description || "",
      category:        r.category       || "Market Reports",
      tags:            r.tags           || [],
      targetKeyword:   r.target_keyword || "",
      readTime:        r.read_time      || 5,
      publishedAt:     r.published_at   || r.created_at,
      updatedAt:       r.updated_at     || undefined,
      author:          r.author         || "Vision LLC Team",
      authorTitle:     r.author_title   || "Vision LLC",
      excerpt:         r.excerpt        || "",
      content:         r.content        || "",
      image:           r.image_url      || undefined,
      imageAlt:        r.image_alt      || undefined,
    };
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // DB record takes priority — so admin edits to meta fields are reflected immediately
  const post = await getDbPost(slug) || BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: [post.targetKeyword, ...post.tags, "Vision LLC"],
    authors: [{ name: post.author }],
    alternates: {
      canonical: `https://www.teamvisionllc.com/blog/${post.slug}`,
    },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: `https://www.teamvisionllc.com/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
      images: [
        {
          url: `https://www.teamvisionllc.com/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(`${post.category} · By ${post.author}`)}&tag=${encodeURIComponent("Vision LLC Blog")}&type=blog`,
          width: 1200,
          height: 630,
          alt: post.metaTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      images: [
        `https://www.teamvisionllc.com/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(`${post.category} · By ${post.author}`)}&tag=${encodeURIComponent("Vision LLC Blog")}&type=blog`,
      ],
    },
  };

}

function renderContent(content: string) {
  const sections = content.split(/\n\n(?=##\s)/);
  return sections.map((section, i) => {
    const lines = section.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, j) => {
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${i}-${j}`} className="text-2xl font-black text-white mt-10 mb-4 leading-tight">
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("**") && line.endsWith("**")) {
        elements.push(
          <p key={`bold-${i}-${j}`} className="font-bold text-white mt-4 mb-2">
            {line.replace(/\*\*/g, "")}
          </p>
        );
      } else if (line.trim() !== "") {
        // Parse inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, k) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={k} className="text-white font-bold">{part.replace(/\*\*/g, "")}</strong>;
          }
          return part;
        });
        elements.push(
          <p key={`p-${i}-${j}`} className="text-gray-300 leading-relaxed mb-4 text-base">
            {rendered}
          </p>
        );
      }
    });

    return <div key={`section-${i}`}>{elements}</div>;
  });
}

const categoryColors: Record<string, string> = {
  "Market Reports": "bg-[rgba(74,222,128,0.1)] text-[#4ADE80] border-[rgba(74,222,128,0.25)]",
  "Business Insights": "bg-[rgba(96,165,250,0.1)] text-[#60A5FA] border-[rgba(96,165,250,0.25)]",
  "Development": "bg-[rgba(250,204,21,0.1)] text-[#FACC15] border-[rgba(250,204,21,0.25)]",
  "Executive Advisement": "bg-[rgba(167,139,250,0.1)] text-[#A78BFA] border-[rgba(167,139,250,0.25)]",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  // DB record takes priority — admin edits (images, content, meta) show immediately
  const post = await getDbPost(slug) || BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  // JSON-LD schemas
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    keywords: post.targetKeyword,
    author: {
      "@type": "Organization",
      name: "Vision LLC",
      url: "https://www.teamvisionllc.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Vision LLC",
      url: "https://www.teamvisionllc.com",
      logo: {
        "@type": "ImageObject",
        url: "https://www.teamvisionllc.com/vision-logo.png",
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    url: `https://www.teamvisionllc.com/blog/${post.slug}`,
    mainEntityOfPage: `https://www.teamvisionllc.com/blog/${post.slug}`,
    articleSection: post.category,
    wordCount: post.content.split(/\s+/).length,
    inLanguage: "en-US",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.teamvisionllc.com" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.teamvisionllc.com/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://www.teamvisionllc.com/blog/${post.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Back nav */}
      <div className="pt-24 pb-0 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#4ADE80] transition-colors">
          <ArrowLeft size={14} /> Back to Blog
        </Link>
      </div>

      {/* Article Header */}
      <article className="px-4 sm:px-6 lg:px-8 pt-8 pb-20" itemScope itemType="https://schema.org/BlogPosting">
        <div className="max-w-3xl mx-auto">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${categoryColors[post.category] || categoryColors["Market Reports"]}`}>
              {post.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={11} /> {post.readTime} min read
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar size={11} /> {formatDate(post.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <h1 itemProp="headline" className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-lg text-gray-400 leading-relaxed mb-8 border-l-2 border-[rgba(74,222,128,0.4)] pl-4">
            {post.excerpt}
          </p>

          {/* Author */}
          <div className="flex items-center gap-3 pb-8 border-b border-[rgba(74,222,128,0.1)] mb-8">
            <div className="w-10 h-10 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] flex items-center justify-center">
              <User size={18} className="text-[#4ADE80]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white" itemProp="author">{post.author}</p>
              <p className="text-xs text-gray-500">{post.authorTitle}</p>
            </div>
          </div>

          {/* Hero image */}
          {post.image && (
            <div className="relative w-full rounded-2xl overflow-hidden mb-10" style={{ aspectRatio: "16/7" }}>
              <Image
                src={post.image}
                alt={post.imageAlt || post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
              {post.imageAlt && (
                <p className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-[10px] text-gray-400 bg-black/60 backdrop-blur-sm">{post.imageAlt}</p>
              )}
            </div>
          )}

          {/* Article Body */}
          <div itemProp="articleBody">
            {renderContent(post.content)}
          </div>

          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-[rgba(74,222,128,0.1)]">
            <p className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest mb-3">Topics</p>
            <div className="flex flex-wrap gap-2">
              {(post.tags as string[]).map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-gray-400">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTA block */}
          <div className="mt-12 glass-strong rounded-2xl p-8 border border-[rgba(74,222,128,0.2)] glow-green text-center">
            <h3 className="text-xl font-black text-white mb-2">
              Ready to talk commercial real estate?
            </h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              Our team has 20+ years of experience in the Tri-Cities market. Let's find the right space for your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact" id={`blog-post-cta-${slug}`} className="btn-primary py-3 px-6">
                Schedule a Tour <ArrowRight size={16} />
              </Link>
              <a href={COMPANY.phoneHref} id={`blog-post-phone-${slug}`} className="btn-secondary py-3 px-6">
                Call {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[rgba(74,222,128,0.08)]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6">
              More from Vision LLC
            </h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  id={`blog-related-${rp.slug}`}
                  className="group glass rounded-xl border border-[rgba(74,222,128,0.08)] hover:border-[rgba(74,222,128,0.3)] p-5 flex flex-col property-card transition-all"
                >
                  <span className={`inline-flex items-center self-start px-2.5 py-1 rounded-lg text-[11px] font-bold border mb-3 ${categoryColors[rp.category] || categoryColors["Market Reports"]}`}>
                    {rp.category}
                  </span>
                  <h3 className="text-sm font-bold text-white mb-2 group-hover:text-[#4ADE80] transition-colors leading-snug">
                    {rp.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-auto pt-3 border-t border-[rgba(255,255,255,0.05)]">
                    <Clock size={10} /> {rp.readTime} min
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
