import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireOrg } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = "tenant-assets";

const supabaseAdmin = createClient(SUPABASE_URL, KEY, {
  auth: { persistSession: false },
});

const ALLOWED_EXTS = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"]);
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const encodeStoragePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

async function ensureBucket() {
  try {
    const headers = {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    };
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
    });
    if (!res.ok) {
      await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
      });
    }
  } catch (err) {
    console.error("[tenant-upload] ensureBucket error:", err);
  }
}

/** Confirms the tenant id belongs to the caller's org. */
async function tenantInOrg(tenantId: string, orgId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .eq("org_id", orgId)
    .maybeSingle();
  return !!data;
}

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;

  const storagePath = (req.nextUrl.searchParams.get("path") || "").trim().replace(/^\/+/, "");
  if (!storagePath || !storagePath.startsWith(`${g.ctx.orgId}/`) || storagePath.includes("..")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodeStoragePath(storagePath)}`,
    {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    }
  );

  if (!signRes.ok) {
    const errText = await signRes.text();
    return NextResponse.json({ error: `Failed to sign URL: ${errText}` }, { status: 404 });
  }

  const signedData = await signRes.json();
  const rawSigned: string = signedData.signedURL || signedData.signedUrl || "";
  if (!rawSigned) {
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
  }

  const fullSignedUrl = rawSigned.startsWith("http")
    ? rawSigned
    : rawSigned.startsWith("/storage/v1")
      ? `${SUPABASE_URL}${rawSigned}`
      : `${SUPABASE_URL}/storage/v1${rawSigned.startsWith("/") ? "" : "/"}${rawSigned}`;

  return NextResponse.redirect(fullSignedUrl);
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Signed URL generation for direct browser-to-Supabase upload (bypasses 4.5MB Vercel serverless limit)
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const filename = body.filename as string | undefined;
      const tenantId = body.tenantId as string | undefined;
      const fileSize = body.size !== undefined ? Number(body.size) : undefined;
      const mimeType = typeof body.contentType === "string" ? body.contentType.toLowerCase() : "";

      if (!filename || !tenantId) {
        return NextResponse.json({ error: "Filename and tenant ID are required." }, { status: 400 });
      }
      if (fileSize !== undefined && fileSize > MAX_BYTES) {
        return NextResponse.json({ error: "File is too large. Maximum size is 10MB." }, { status: 400 });
      }

      const lastDotIndex = filename.lastIndexOf(".");
      const baseName = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
      const ext = (lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1).toLowerCase() : "").replace(/[^a-z0-9]/g, "");
      if (!ALLOWED_EXTS.has(ext) || (mimeType && !ALLOWED_MIMES.has(mimeType))) {
        return NextResponse.json(
          { error: "Invalid file type. Allowed formats: PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP." },
          { status: 400 }
        );
      }

      if (!(await tenantInOrg(tenantId, orgId))) {
        return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
      }

      await ensureBucket();

      const safeTenantId = tenantId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "tenant";
      const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60).toLowerCase() || "document";
      // Always namespace objects under the caller's org
      const storagePath = `${orgId}/${safeTenantId}/${Date.now()}-${cleanBaseName}.${ext}`;

      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUploadUrl(storagePath, { upsert: true });

      if (error || !data) {
        console.error("[tenant-upload] createSignedUploadUrl error:", error);
        return NextResponse.json(
          { error: error?.message || "Failed to create signed upload URL." },
          { status: 500 }
        );
      }

      const proxyUrl = `/api/tenant-upload?path=${encodeURIComponent(storagePath)}`;

      return NextResponse.json({
        success: true,
        path: storagePath,
        token: data.token,
        signedUrl: data.signedUrl,
        url: proxyUrl,
        publicUrl: proxyUrl,
        filename,
      });
    }

    // 2. Multipart form data fallback (for smaller files or legacy callers)
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const tenantId = form.get("tenantId") as string | null;

    if (!file || !tenantId) {
      return NextResponse.json({ error: "File and tenant ID are required." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large. Maximum size is 10MB." }, { status: 400 });
    }

    const lastDotIndex = file.name.lastIndexOf(".");
    const baseName = lastDotIndex !== -1 ? file.name.slice(0, lastDotIndex) : file.name;
    const ext = (lastDotIndex !== -1 ? file.name.slice(lastDotIndex + 1).toLowerCase() : "").replace(/[^a-z0-9]/g, "");
    const normalizedMime = (file.type || "").toLowerCase();

    if (!ALLOWED_EXTS.has(ext) || (normalizedMime && !ALLOWED_MIMES.has(normalizedMime))) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed formats: PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP." },
        { status: 400 }
      );
    }

    if (!(await tenantInOrg(tenantId, orgId))) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    await ensureBucket();

    const safeTenantId = tenantId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "tenant";
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60).toLowerCase() || "document";
    const storagePath = `${orgId}/${safeTenantId}/${Date.now()}-${cleanBaseName}.${ext}`;

    const buffer = await file.arrayBuffer();
    const fileContentType = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeStoragePath(storagePath)}`,
      {
        method: "POST",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": fileContentType,
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("[tenant-upload] Storage upload error:", errText);
      return NextResponse.json({ error: `Upload to storage failed: ${errText}` }, { status: 500 });
    }

    const proxyUrl = `/api/tenant-upload?path=${encodeURIComponent(storagePath)}`;
    return NextResponse.json({ success: true, url: proxyUrl, name: file.name });
  } catch (err: any) {
    console.error("[tenant-upload] POST error:", err);
    return NextResponse.json({ error: err.message || "Unexpected server error during upload." }, { status: 500 });
  }
}
