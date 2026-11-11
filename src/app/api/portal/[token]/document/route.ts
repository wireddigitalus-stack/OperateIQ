import { NextRequest, NextResponse } from "next/server";
import { verifyActiveTenantPortalToken } from "@/lib/tenant-portal-token";
import { checkRateLimit, clientIp as getClientIp } from "@/lib/rateLimit";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "tenant-assets";

const encodeStoragePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`portal-doc:${ip}`, 30, 5 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { token } = await context.params;
  const claims = await verifyActiveTenantPortalToken(token);
  if (!claims) {
    return NextResponse.json({ error: "Invalid or expired portal link." }, { status: 403 });
  }

  const idx = Number(req.nextUrl.searchParams.get("index") ?? 0);
  if (!Number.isInteger(idx) || idx < 0 || idx > 50) {
    return NextResponse.json({ error: "Invalid document index." }, { status: 400 });
  }

  const tRes = await fetch(
    `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${encodeURIComponent(claims.orgId)}&id=eq.${encodeURIComponent(claims.tenantId)}&select=lease_documents&limit=1`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }
  );
  if (!tRes.ok) {
    return NextResponse.json({ error: "Document unavailable." }, { status: 404 });
  }
  const rows = (await tRes.json()) as Array<{ lease_documents?: unknown }>;
  const rawDocs = rows[0]?.lease_documents;
  let docs: Array<{ name?: string; url?: string }> = [];
  try {
    docs = typeof rawDocs === "string" ? JSON.parse(rawDocs) : Array.isArray(rawDocs) ? rawDocs : [];
  } catch {
    docs = [];
  }

  const target = docs[idx];
  if (!target?.url) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // Extract storagePath from `/api/tenant-upload?path=...`
  let storagePath = "";
  try {
    const parsedUrl = new URL(target.url, "https://www.propopsiq.com");
    storagePath = (parsedUrl.searchParams.get("path") || "").trim().replace(/^\/+/, "");
  } catch {
    storagePath = "";
  }

  if (!storagePath) {
    // External direct HTTPS URL fallback if older record stored full public URL
    if (target.url.startsWith("https://") && target.url.includes(claims.orgId)) {
      return NextResponse.redirect(target.url);
    }
    return NextResponse.json({ error: "Document path invalid." }, { status: 404 });
  }

  if (!storagePath.startsWith(`${claims.orgId}/`) || storagePath.includes("..")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
      body: JSON.stringify({ expiresIn: 900 }), // 15-minute signed link
    }
  );

  if (!signRes.ok) {
    return NextResponse.json({ error: "Document not found in storage." }, { status: 404 });
  }

  const signedData = await signRes.json();
  const rawSigned: string = signedData.signedURL || signedData.signedUrl || "";
  if (!rawSigned) {
    return NextResponse.json({ error: "Could not sign document URL." }, { status: 500 });
  }

  const fullSignedUrl = rawSigned.startsWith("http")
    ? rawSigned
    : rawSigned.startsWith("/storage/v1")
      ? `${SUPABASE_URL}${rawSigned}`
      : `${SUPABASE_URL}/storage/v1${rawSigned.startsWith("/") ? "" : "/"}${rawSigned}`;

  return NextResponse.redirect(fullSignedUrl);
}
