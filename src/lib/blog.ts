import { BLOG_POSTS, type BlogPost } from "@/lib/blog-data";

// Public blog reads use the ANON key + status=published only (RLS-enforced),
// so drafts can never leak to the public site.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPost(r: any): BlogPost {
  return {
    slug: r.slug,
    title: r.title,
    metaTitle: r.meta_title || r.title,
    metaDescription: r.meta_description || "",
    category: r.category || "Insights",
    tags: r.tags || [],
    targetKeyword: r.target_keyword || "",
    readTime: r.read_time || 5,
    publishedAt: r.published_at || r.created_at,
    updatedAt: r.updated_at || undefined,
    author: r.author || "",
    authorTitle: r.author_title || "",
    excerpt: r.excerpt || "",
    content: r.content || "",
    image: r.image_url || undefined,
    imageAlt: r.image_alt || undefined,
  };
}

async function query(params: string): Promise<BlogPost[]> {
  if (!URL || !KEY) return [];
  try {
    const res = await fetch(`${URL}/rest/v1/blog_posts?status=eq.published&${params}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()).map(toPost);
  } catch {
    return [];
  }
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const db = await query("order=published_at.desc");
  const seen = new Set(db.map((p) => p.slug));
  return [...db, ...BLOG_POSTS.filter((p) => !seen.has(p.slug))];
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const [db] = await query(`slug=eq.${encodeURIComponent(slug)}&select=*`);
  return db || BLOG_POSTS.find((p) => p.slug === slug) || null;
}
