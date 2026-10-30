import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = "property-images";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif"];
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

async function ensureBucket() {
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  // 409 = already exists — safe to ignore
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const rawType = (form.get("type") as string) || "image";

  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const isVideo = rawType === "video" || file.type.startsWith("video/");
  const type = isVideo ? "video" : "image";
  const maxFileSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;

  if (file.size > maxFileSize) {
    return NextResponse.json(
      { error: `File exceeds ${isVideo ? "50MB" : "10MB"} limit.` },
      { status: 400 }
    );
  }
  const isAllowed =
    allowedTypes.includes(file.type.toLowerCase()) ||
    (!isVideo && !file.type && IMAGE_EXT_RE.test(file.name));
  if (!isAllowed) {
    return NextResponse.json(
      {
        error: isVideo
          ? "Unsupported file type. Allowed: MP4, WEBM, MOV."
          : "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF, HEIC.",
      },
      { status: 400 }
    );
  }

  await ensureBucket();

  const defaultExt = isVideo ? "mp4" : "jpg";
  const rawExt = file.name.split(".").pop()?.toLowerCase() || defaultExt;
  const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : defaultExt;
  // Objects are namespaced per tenant: <orgId>/hero-....
  const filename = `${orgId}/hero-${type}-${Date.now()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: "POST",
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      "Content-Type": file.type || (type === "video" ? "video/mp4" : "image/jpeg"),
      "x-upsert": "true",
    },
    body: buffer,
  });

  if (!res.ok) { const err = await res.text(); return NextResponse.json({ error: err }, { status: 500 }); }
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
  return NextResponse.json({ success: true, url });
}
