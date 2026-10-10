import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = "property-images";

async function ensureBucket() {
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  // 409 = already exists — safe to ignore
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = (form.get("type") as string) || "image";

  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  await ensureBucket();

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `hero-${type}-${Date.now()}.${ext}`;
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
