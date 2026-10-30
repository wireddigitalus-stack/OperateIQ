import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "crew-photos";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif"];
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Used by crew completion sheets (PIN-based staff portals) and admins.
export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
  }
  const isAllowedImage =
    ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
    (!file.type && IMAGE_EXT_RE.test(file.name));
  if (!isAllowedImage) {
    return NextResponse.json({ error: "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF, HEIC." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  // Object paths are always namespaced by the caller's org
  const filename = `${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.\.+/g, "_")}`;

  // Ensure bucket exists (idempotent — ignores if already exists)
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });

  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: bytes,
  });

  if (!upload.ok) {
    const err = await upload.text();
    console.error("Photo upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
  return NextResponse.json({ url });
}
