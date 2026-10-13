import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Clock } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getPublishedPost } from "@/lib/blog";
import { resolveOrgIdBySlug } from "@/lib/public-org";

type Props = { params: Promise<{ slug: string }> };

async function getTenantOrgId(): Promise<string | undefined> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) return undefined;
  const orgId = await resolveOrgIdBySlug(tenantSlug);
  return orgId || undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const orgId = await getTenantOrgId();
  const post = await getPublishedPost((await params).slug, orgId);
  if (!post) return {};
  return {
    title: `${post.metaTitle} | ${BRAND.name}`,
    description: post.metaDescription,
    openGraph: { title: post.metaTitle, description: post.metaDescription, type: "article", publishedTime: post.publishedAt },
  };
}

// Minimal markdown: ## headings, **bold** lines, inline **bold**, paragraphs.
function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="text-2xl font-bold text-white mt-10 mb-4">{line.slice(3)}</h2>;
    if (!line.trim()) return null;
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, k) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={k} className="text-white">{part.slice(2, -2)}</strong> : part
    );
    return <p key={i} className="text-slate-300 leading-relaxed mb-4">{parts}</p>;
  });
}

export default async function BlogPostPage({ params }: Props) {
  const orgId = await getTenantOrgId();
  const post = await getPublishedPost((await params).slug, orgId);
  if (!post) notFound();

  return (
    <div className="oiq-page pt-32 pb-24 px-5">
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> All posts</Link>
        <p className="mt-8 text-xs font-semibold text-[var(--oiq-cyan)] uppercase tracking-wider">{post.category}</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-white leading-tight">{post.title}</h1>
        <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
          {post.author && <>{post.author} · </>}
          {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · <Clock size={14} /> {post.readTime} min read
        </p>
        {post.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image} alt={post.imageAlt || post.title} className="mt-8 w-full rounded-2xl" />
        )}
        <div className="mt-10">{renderContent(post.content)}</div>
        <div className="mt-16 oiq-card oiq-glow p-8 text-center">
          <h2 className="text-2xl font-bold text-white">Run your properties on {BRAND.name}</h2>
          <Link href="/signup" className="oiq-btn mt-5">Start free trial</Link>
        </div>
      </article>
    </div>
  );
}
