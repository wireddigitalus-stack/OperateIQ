// Static blog posts (none by default). Posts are managed in the dashboard (blog_posts table).

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  tags: string[];
  targetKeyword: string;
  readTime: number;
  publishedAt: string;
  updatedAt?: string;    // when content was last meaningfully updated (for dateModified in schema)
  author: string;
  authorTitle: string;
  excerpt: string;
  content: string;
  image?: string;       // optional hero image path (relative to /public)
  imageAlt?: string;   // alt text for the image
}

export const BLOG_POSTS: BlogPost[] = [];
