import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "maintenance-photos";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Used by the admin Maintenance tab and the PIN-based maintenance crew portal.
export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { allowStaff: true });
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const ext = (file.name.split(".").pop()?.toLowerCase() || "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
    // Object paths are always namespaced by the caller's org
    const filename = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Ensure bucket exists (idempotent)
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });

    // Upload file
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
      console.error("[maintenance/upload] Storage error:", err);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[maintenance/upload] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
