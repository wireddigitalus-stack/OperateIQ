import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const AUTH = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Static images that ship with the codebase in /public/property-images/
// These are the known images — add new ones here when added to /public
const STATIC_PROPERTY_IMAGES = [
  { filename: "commercial-city-centre-exterior.jpg",    label: "City Centre — Exterior" },
  { filename: "commercial-executive-entry.jpg",         label: "Executive Entry" },
  { filename: "commercial-vision-office.jpg",           label: "Vision Office" },
  { filename: "commercial-centerpoint-mall.jpg",        label: "Centerpoint Mall" },
  { filename: "commercial-centerpoint-2.jpg",           label: "Centerpoint — Interior" },
  { filename: "centerpoint2.jpg",                       label: "Centerpoint 2" },
  { filename: "cowork-shared-office.jpg",               label: "CoWork — Shared Office" },
  { filename: "cowork-private-office.jpg",              label: "CoWork — Private Office" },
  { filename: "cowork-conference-room.jpg",             label: "CoWork — Conference Room" },
  { filename: "cowork-lobby-waiting.jpg",               label: "CoWork — Lobby" },
  { filename: "development-event-space-after.jpg",      label: "Event Space" },
  { filename: "development-construction.jpg",           label: "Construction" },
  { filename: "development-red-pepper-transform.jpg",   label: "Red Pepper Transformation" },
  { filename: "1913-W--state- Exterior.jpg",            label: "1913 W State — Exterior" },
  { filename: "1913-state-drone3.jpeg",                 label: "1913 State — Drone" },
  { filename: "628-StateStreet.jpg",                    label: "628 State Street" },
  { filename: "628-state-street-pic-inside.jpg",        label: "628 State — Interior" },
  { filename: "815-Shelby-St.jpg",                      label: "815 Shelby Street" },
  { filename: "Jamestown @ Shelby.jpeg",                label: "Jamestown at Shelby" },
  { filename: "Foundation-c.jpg",                       label: "Foundation C" },
  { filename: "Foundation-d.jpg",                       label: "Foundation D" },
  { filename: "Foundation-dkk.jpg",                     label: "Foundation DKK" },
  { filename: "Foundation-dn.jpg",                      label: "Foundation DN" },
  { filename: "Foundation-du.png",                      label: "Foundation DU" },
];

async function listBucket(bucket: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/${bucket}`,
      {
        method: "POST",
        headers: { ...AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200, offset: 0, sortBy: { column: "created_at", order: "desc" } }),
      }
    );
    if (!res.ok) return [];
    const files = await res.json();
    if (!Array.isArray(files)) return [];
    return files
      .filter((f: { name?: string; metadata?: { size?: number } }) => f.name && f.metadata?.size)
      .map((f: { name: string }) =>
        `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${f.name}`
      );
  } catch {
    return [];
  }
}

/**
 * GET /api/image-library
 * Returns all available images for use in blog posts:
 *   - static property images from /public/property-images/
 *   - uploaded images from Supabase property-images bucket
 *   - uploaded images from Supabase blog-images bucket
 */
export async function GET() {
  // Fetch both Supabase buckets in parallel
  const [propertyBucketUrls, blogBucketUrls] = await Promise.all([
    listBucket("property-images"),
    listBucket("blog-images"),
  ]);

  // Build static images as absolute-style paths (Next.js serves /public as /)
  const staticImages = STATIC_PROPERTY_IMAGES.map(img => ({
    url: `/property-images/${img.filename}`,
    label: img.label,
    source: "static" as const,
    thumbnail: `/property-images/${img.filename}`,
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
