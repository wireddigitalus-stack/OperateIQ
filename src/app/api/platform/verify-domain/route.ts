import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domain, orgId } = body;

    if (!domain || !domain.trim()) {
      return NextResponse.json({ error: "Domain name is required" }, { status: 400 });
    }

    // Clean domain: strip protocol, port, trailing slashes, www.
    let cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");

    if (!cleanDomain) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    const isSubdomain = cleanDomain.split(".").length > 2 && !cleanDomain.startsWith("www.");
    let isConfigured = false;
    let details: string[] = [];
    let detectedType = isSubdomain ? "CNAME" : "A";

    try {
      if (isSubdomain) {
        // Resolve CNAME
        const cnameRecords = await dns.resolveCname(cleanDomain).catch(() => []);
        if (
          cnameRecords.some(
            (r) =>
              r.toLowerCase().includes("vercel-dns.com") ||
              r.toLowerCase().includes("vercel.app") ||
              r.toLowerCase().includes("operateiq")
          )
        ) {
          isConfigured = true;
          details = cnameRecords;
        } else if (cnameRecords.length > 0) {
          details = cnameRecords;
          // It points somewhere, but maybe not vercel
        }
      } else {
        // Resolve A record for apex
        const aRecords: string[] = await dns.resolve4(cleanDomain).catch(() => [] as string[]);
        if (aRecords.includes("76.76.21.21")) {
          isConfigured = true;
          details = aRecords;
        } else if (aRecords.length > 0) {
          details = aRecords;
        }
      }
    } catch (dnsErr: unknown) {
      console.warn(`[verify-domain] DNS lookup error for ${cleanDomain}:`, dnsErr);
    }

    // Update database if orgId is provided
    if (orgId && supabaseAdmin) {
      await supabaseAdmin
        .from("organizations")
        .update({
          custom_domain: cleanDomain,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
    }

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      isSubdomain,
      recordType: detectedType,
      expectedTarget: isSubdomain ? "cname.vercel-dns.com" : "76.76.21.21",
      currentRecords: details,
      verified: isConfigured,
      message: isConfigured
        ? `DNS successfully configured! ${cleanDomain} is ready for traffic.`
        : `Domain registered in your account. DNS records are propagating (this typically takes 5–30 minutes across GoDaddy and IONOS).`,
    });
  } catch (error) {
    console.error("[verify-domain] error:", error);
    return NextResponse.json({ error: "Failed to verify domain" }, { status: 500 });
  }
}
