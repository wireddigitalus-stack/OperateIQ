import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireOrg } from "@/lib/server-auth";
import { apiErrorResponse } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "tenant-assets";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "heic"]);

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function ensurePrivateBucket() {
  try {
    const h = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    };
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
    });
  } catch {
    // ignore if exists
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Receipt file is required." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Receipt must be under 10 MB." }, { status: 413 });
    }

    const rawName = file.name || "receipt.pdf";
    const ext = (rawName.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json(
        { error: "Receipt must be a PDF, JPG, PNG, WEBP, or HEIC file." },
        { status: 415 }
      );
    }

    await ensurePrivateBucket();

    const safeBase = rawName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    const storagePath = `${orgId}/expenses/${Date.now()}_${safeBase || "receipt"}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: file.type || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
      upsert: false,
    });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return NextResponse.json({
      url: `/api/tenant-upload?path=${encodeURIComponent(storagePath)}`,
      name: rawName,
      storagePath,
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to upload expense receipt.", {
      route: "/api/expenses/upload",
      orgId,
    });
  }
}
