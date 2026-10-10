import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = "blog-images";

// Ensure the blog-images bucket exists (public, separate from property-images)
async function ensureBucket() {
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      allowed_mime_types: ["image/webp", "image/jpeg", "image/png", "image/gif"],
      file_size_limit: 5242880, // 5 MB max (after client compression this is always < 500 KB)
    }),
  });
  // 409 Conflict = bucket already exists — safe to ignore
}

/**
 * POST /api/blog-images
 * Accepts a pre-compressed image file (WebP/JPEG) from the client.
 * The client performs all resizing/compression before calling this endpoint,
 * so we receive a small web-ready file and store it directly.
 *
 * FormData fields:
 *   file  — the compressed image blob
 *
 * Returns: { success: true, url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // Guard: reject files over 5 MB (shouldn't happen after client compression, but safety net)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Maximum size after compression is 5 MB." },
        { status: 400 }
      );
    }

    await ensureBucket();

    // Derive extension from mime type or filename
    const mimeToExt: Record<string, string> = {
      "image/webp": "webp",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
    };
    const ext = mimeToExt[file.type] || file.name.split(".").pop()?.toLowerCase() || "webp";
    const filename = `blog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const buffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
      {
        method: "POST",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": file.type || "image/webp",
          "x-upsert": "true",
          "Cache-Control": "max-age=31536000", // 1 year cache — images are immutable
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("[blog-images] Supabase upload error:", err);
      return NextResponse.json({ error: "Storage upload failed. Please try again." }, { status: 500 });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (err) {
    console.error("[blog-images] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/blog-images?url=<encoded-url>
 * Removes an image from Supabase Storage.
 * Optional — the blog post record still needs to be updated separately.
 */
export async function DELETE(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Extract filename from the public URL
  const filename = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!filename) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`,
    {
      method: "DELETE",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[blog-images] Delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
