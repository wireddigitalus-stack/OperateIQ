import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};
const BUCKET = "property-images";

async function ensureBucket() {
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  // Ignore 409 (already exists)
}

/** GET — fetch all overrides (hero_url + all_urls) */
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/property_image_overrides`,
    { headers: H }
  );
  const data = await res.json();
  return NextResponse.json({ overrides: Array.isArray(data) ? data : [] });
}

/** POST — upload a single image file for a property, append to its gallery */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file       = form.get("file") as File | null;
  const propertyId = form.get("propertyId") as string | null;

  if (!file || !propertyId)
    return NextResponse.json({ error: "file and propertyId required" }, { status: 400 });

  await ensureBucket();

  const ext      = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${propertyId}-${Date.now()}.${ext}`;
  const buffer   = await file.arrayBuffer();

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
    {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": file.type || "image/jpeg",
        "x-upsert": "true",
      },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error("Storage upload error:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;

  // Fetch existing record to merge all_urls
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/property_image_overrides?property_id=eq.${encodeURIComponent(propertyId)}`,
    { headers: H }
  );
  const existing = await existingRes.json();
  const existingRow = Array.isArray(existing) ? existing[0] : null;

  const existingAllUrls: string[] = existingRow?.all_urls || (existingRow?.image_url ? [existingRow.image_url] : []);
  const newAllUrls = [...existingAllUrls, publicUrl];
  const heroUrl = existingRow?.hero_url || existingRow?.image_url || publicUrl;

  // Upsert with merged all_urls + preserve/set hero_url
  await fetch(`${SUPABASE_URL}/rest/v1/property_image_overrides`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      property_id: propertyId,
      image_url:   heroUrl,       // legacy compat field
      hero_url:    heroUrl,
      all_urls:    newAllUrls,
      updated_at:  new Date().toISOString(),
    }),
  });

  return NextResponse.json({ success: true, url: publicUrl });
}

/** PATCH — update hero_url and/or all_urls for a property (no file upload) */
export async function PATCH(req: NextRequest) {
  const { propertyId, heroUrl, allUrls } = await req.json();

  if (!propertyId)
    return NextResponse.json({ error: "propertyId required" }, { status: 400 });

  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (heroUrl !== undefined) { body.hero_url = heroUrl; body.image_url = heroUrl; }
  if (allUrls !== undefined) { body.all_urls = allUrls; }

  // ── Step 1: Try to UPDATE the existing row by property_id ───────────────
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/property_image_overrides?property_id=eq.${encodeURIComponent(propertyId)}`,
    {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(body),
    }
  );

  const updated = await updateRes.json();

  // ── Step 2: If no row existed, INSERT a new one ─────────────────────────
  if (!Array.isArray(updated) || updated.length === 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/property_image_overrides`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ property_id: propertyId, ...body }),
    });
  }

  return NextResponse.json({ success: true });
}


/**
 * DELETE — remove a single image file from Supabase Storage AND update the DB.
 * Body: { propertyId: string, url: string }
 */
export async function DELETE(req: NextRequest) {
  const { propertyId, url } = await req.json();

  if (!propertyId || !url)
    return NextResponse.json({ error: "propertyId and url required" }, { status: 400 });

  // ── 1. Extract the storage filename from the public URL ─────────────────
  // URL format: <SUPABASE_URL>/storage/v1/object/public/property-images/<filename>
  const filename = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];

  if (filename) {
    const deleteRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`,
      {
        method: "DELETE",
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      }
    );
    if (!deleteRes.ok) {
      const err = await deleteRes.text();
      console.error("Storage delete error:", err);
      // Don't hard-fail — still update the DB record so the UI stays consistent
    }
  }

  // ── 2. Fetch the current DB record ──────────────────────────────────────
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/property_image_overrides?property_id=eq.${encodeURIComponent(propertyId)}`,
    { headers: H }
  );
  const existing = await existingRes.json();
  const row = Array.isArray(existing) ? existing[0] : null;

  if (!row) return NextResponse.json({ success: true }); // nothing to update

  // ── 3. Remove the URL from all_urls, promote a new hero if needed ───────
  const prevAll: string[] = Array.isArray(row.all_urls) ? row.all_urls : [];
  const newAll = prevAll.filter((u: string) => u !== url);
  const currentHero: string | null = row.hero_url || row.image_url || null;
  const newHero = currentHero === url ? (newAll[0] ?? null) : currentHero;

  await fetch(`${SUPABASE_URL}/rest/v1/property_image_overrides`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      property_id: propertyId,
      hero_url:    newHero,
      image_url:   newHero, // legacy compat
      all_urls:    newAll,
      updated_at:  new Date().toISOString(),
    }),
  });

  return NextResponse.json({ success: true, remaining: newAll.length });
}
