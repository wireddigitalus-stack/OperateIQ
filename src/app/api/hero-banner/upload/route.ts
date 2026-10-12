import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";

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
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const rawType = (form.get("type") as string) || "image";
  const type = rawType === "video" ? "video" : "image";

  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  await ensureBucket();

  const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "jpg";
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
