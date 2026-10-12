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

async function ensureBucket() {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
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

      if (!filename || !tenantId) {
        return NextResponse.json({ error: "Filename and tenant ID are required." }, { status: 400 });
      }
      if (!(await tenantInOrg(tenantId, orgId))) {
        return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
      }

      await ensureBucket();

      const safeTenantId = tenantId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "tenant";
      const lastDotIndex = filename.lastIndexOf(".");
      const baseName = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
      const ext = (lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1).toLowerCase() : "pdf").replace(/[^a-z0-9]/g, "") || "pdf";
      const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60).toLowerCase() || "document";
      // Always namespace objects under the caller's org
      const path = `${orgId}/${safeTenantId}/${Date.now()}-${cleanBaseName}.${ext}`;

      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUploadUrl(path, { upsert: true });

      if (error || !data) {
        console.error("[tenant-upload] createSignedUploadUrl error:", error);
        return NextResponse.json(
          { error: error?.message || "Failed to create signed upload URL." },
          { status: 500 }
        );
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

      return NextResponse.json({
        success: true,
        path,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl,
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
    if (!(await tenantInOrg(tenantId, orgId))) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File is too large. Maximum size is 50MB." }, { status: 400 });
    }

    await ensureBucket();

    const safeTenantId = tenantId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "tenant";
    const lastDotIndex = file.name.lastIndexOf(".");
    const baseName = lastDotIndex !== -1 ? file.name.slice(0, lastDotIndex) : file.name;
    const ext = (lastDotIndex !== -1 ? file.name.slice(lastDotIndex + 1).toLowerCase() : "pdf").replace(/[^a-z0-9]/g, "") || "pdf";
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60).toLowerCase() || "document";
    const filename = `${orgId}/${safeTenantId}/${Date.now()}-${cleanBaseName}.${ext}`;

    const buffer = await file.arrayBuffer();
    const fileContentType = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
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

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    return NextResponse.json({ success: true, url: publicUrl, name: file.name });
  } catch (err: any) {
    console.error("[tenant-upload] POST error:", err);
    return NextResponse.json({ error: err.message || "Unexpected server error during upload." }, { status: 500 });
  }
}
