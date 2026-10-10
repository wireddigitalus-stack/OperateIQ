import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "crew-photos";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

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
