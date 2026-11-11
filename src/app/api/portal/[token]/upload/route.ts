import { NextRequest, NextResponse } from "next/server";
import { verifyActiveTenantPortalToken } from "@/lib/tenant-portal-token";
import { checkRateLimit, clientIp as getClientIp } from "@/lib/rateLimit";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "maintenance-photos";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
]);
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`portal-upload:${ip}`, 10, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "Upload rate limit reached. Try again shortly." }, { status: 429 });
  }

  const { token } = await context.params;
  const claims = await verifyActiveTenantPortalToken(token);
  if (!claims) {
    return NextResponse.json({ error: "Invalid portal link." }, { status: 403 });
  }

  try {
    // Verify tenant still belongs to org
    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${encodeURIComponent(claims.orgId)}&id=eq.${encodeURIComponent(claims.tenantId)}&select=id&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
    );
    const tRows = tRes.ok ? ((await tRes.json()) as unknown[]) : [];
    if (!Array.isArray(tRows) || tRows.length === 0) {
      return NextResponse.json({ error: "Invalid portal link." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Photo exceeds 8 MB limit." }, { status: 400 });
    }

    const isAllowed =
      ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()) ||
      (!file.type && IMAGE_EXT_RE.test(file.name));
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Unsupported image format. Please upload JPEG, PNG, WEBP, or HEIC." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const ext = (file.name.split(".").pop()?.toLowerCase() || "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
    const filename = `${claims.orgId}/portal/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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
      return NextResponse.json({ error: "Failed to upload photo." }, { status: 500 });
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Failed to process photo upload." }, { status: 500 });
  }
}
