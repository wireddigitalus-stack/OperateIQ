import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgAdmin } from "@/lib/server-auth";
import { hasFeature } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const g = await requireOrgAdmin(req);
    if (!g.ok) return g.res;
    const body = await req.json();
    const { domain } = body;
    // Tenants may only manage their own org. Super-admins in support mode act on the impersonated org.
    const orgId = g.ctx.orgId;
    if (!hasFeature(g.ctx.org.tier, "custom_domain")) {
      return NextResponse.json({ error: "Custom domains are available on the Pro plan." }, { status: 403 });
    }

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

    if (
      cleanDomain === "getoperateiq.com" ||
      cleanDomain === "www.getoperateiq.com" ||
      cleanDomain === "operateiq.com" ||
      cleanDomain === "www.operateiq.com" ||
      cleanDomain.endsWith(".getoperateiq.com") ||
      cleanDomain.endsWith(".operateiq.com") ||
      cleanDomain.endsWith(".vercel.app")
    ) {
      return NextResponse.json(
        { error: "Cannot claim an OpsIQ platform domain as a custom domain." },
        { status: 400 }
      );
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
              r.toLowerCase().replace(/\.$/, "").endsWith("vercel-dns.com")
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

    // Check domain availability and only persist custom_domain when DNS is verified (isConfigured === true)
    if (orgId && supabaseAdmin) {
      // Prevent claiming a domain already connected to another organization.
      const { data: taken } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("custom_domain", cleanDomain)
        .neq("id", orgId)
        .maybeSingle();
      if (taken) {
        return NextResponse.json({ error: "This domain is already connected to another account." }, { status: 409 });
      }
      if (isConfigured) {
        await supabaseAdmin
          .from("organizations")
          .update({
            custom_domain: cleanDomain,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orgId);
      }
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
        ? `DNS successfully configured! ${cleanDomain} is verified and connected to your account.`
        : `DNS is NOT verified yet. Add the DNS record shown below at GoDaddy/IONOS; propagation usually takes 5–30 minutes, then click Verify again to connect ${cleanDomain}.`,
    });
  } catch (error) {
    console.error("[verify-domain] error:", error);
    return NextResponse.json({ error: "Failed to verify domain" }, { status: 500 });
  }
}
