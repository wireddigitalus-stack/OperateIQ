import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import { PROPERTIES } from "@/lib/data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const AUTH = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Built-in images: the photos attached to the property catalogue (PROPERTIES).
// (The old /public/property-images/ static set was removed.)
const STATIC_PROPERTY_IMAGES: { url: string; label: string }[] = PROPERTIES.flatMap((p) =>
  Array.from(new Set([p.image, ...(p.images ?? [])].filter(Boolean))).map((url, i) => ({
    url,
    label: i === 0 ? p.name : `${p.name} — ${i + 1}`,
  }))
);

// Lists only objects inside the tenant prefix `<orgId>/`.
async function listBucket(bucket: string, orgId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/${bucket}`,
      {
        method: "POST",
        headers: { ...AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: `${orgId}/`, limit: 200, offset: 0, sortBy: { column: "created_at", order: "desc" } }),
      }
    );
    if (!res.ok) return [];
    const files = await res.json();
    if (!Array.isArray(files)) return [];
    return files
      .filter((f: { name?: string; metadata?: { size?: number } }) => f.name && f.metadata?.size)
      .map((f: { name: string }) =>
        `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${orgId}/${f.name}`
      );
  } catch {
    return [];
  }
}

/**
 * GET /api/image-library
 * Returns all available images for use in blog posts:
 *   - built-in property catalogue images (PROPERTIES)
 *   - uploaded images from Supabase property-images bucket
 *   - uploaded images from Supabase blog-images bucket
 */
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  // Fetch both Supabase buckets in parallel
  const [propertyBucketUrls, blogBucketUrls] = await Promise.all([
    listBucket("property-images", orgId),
    listBucket("blog-images", orgId),
  ]);

  // Built-in catalogue images
  const staticImages = STATIC_PROPERTY_IMAGES.map(img => ({
    url: img.url,
    label: img.label,
    source: "static" as const,
    thumbnail: img.url,
  }));

  // Supabase property-images bucket (previously uploaded property photos)
  const propertyUploaded = propertyBucketUrls.map(url => ({
    url,
    label: url.split("/").pop()?.replace(/[-_]/g, " ").replace(/\.\w+$/, "") ?? "Property Photo",
    source: "property-upload" as const,
    thumbnail: url,
  }));

  // Supabase blog-images bucket (images previously uploaded for blog posts)
  const blogUploaded = blogBucketUrls.map(url => ({
    url,
    label: url.split("/").pop()?.replace(/[-_]/g, " ").replace(/\.\w+$/, "") ?? "Blog Photo",
    source: "blog-upload" as const,
    thumbnail: url,
  }));

  return NextResponse.json({
    images: [
      ...blogUploaded,       // Most recently uploaded blog images first
      ...propertyUploaded,   // Then uploaded property photos
      ...staticImages,       // Then hardwired site images
    ],
    counts: {
      blogUploaded: blogUploaded.length,
      propertyUploaded: propertyUploaded.length,
      static: staticImages.length,
    },
  });
}
