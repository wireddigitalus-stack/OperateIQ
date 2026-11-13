import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/server-auth";
import { createTenantPortalToken } from "@/lib/tenant-portal-token";
import { sendEmail, emailConfigured, escapeHtml, platformUrl } from "@/lib/email";
import { isSubscriptionActive } from "@/lib/plans";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function getTenantPortalVersion(orgId: string, tenantId: string): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${encodeURIComponent(orgId)}&section=eq.portal_tokens&key=eq.${encodeURIComponent(`v:${tenantId}`)}&limit=1`,
    { headers: HEADERS, cache: "no-store" }
  );
  if (!res.ok) return 1;
  const rows = (await res.json()) as Array<{ value?: string }>;
  return rows[0]?.value ? Number(rows[0].value) || 1 : 1;
}

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, org, isSuperAdmin } = g.ctx;

  if (!isSuperAdmin && !isSubscriptionActive(org)) {
    return NextResponse.json(
      { error: "An active subscription is required to issue resident portal links." },
      { status: 402 }
    );
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId")?.trim();
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  }

  try {
    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(tenantId)}&select=id,name,email,building,unit&limit=1`,
      { headers: HEADERS, cache: "no-store" }
    );
    const rows = tRes.ok ? ((await tRes.json()) as Array<Record<string, unknown>>) : [];
    if (!rows[0]) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    const version = await getTenantPortalVersion(orgId, tenantId);
    const token = createTenantPortalToken({ orgId, tenantId, version });
    const url = `${platformUrl()}/portal/${token}`;

    return NextResponse.json({ ok: true, token, url, emailConfigured: emailConfigured() });
  } catch (err) {
    return apiErrorResponse(err, "Failed to generate resident portal link.", {
      route: "/api/tenants/portal-link",
      orgId,
    });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, org, isSuperAdmin } = g.ctx;

  if (!isSuperAdmin && !isSubscriptionActive(org)) {
    return NextResponse.json(
      { error: "An active subscription is required to manage resident portal links." },
      { status: 402 }
    );
  }

  const parsed = await safeJsonBody<{
    tenantId?: string;
    action?: "send_email" | "rotate";
  }>(req);
  if (!parsed.ok) return parsed.res;

  const tenantId = String(parsed.body?.tenantId || "").trim();
  const action = parsed.body?.action || "send_email";

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  }

  try {
    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${encodeURIComponent(orgId)}&id=eq.${encodeURIComponent(tenantId)}&select=id,name,contact_name,email,building,unit&limit=1`,
      { headers: HEADERS, cache: "no-store" }
    );
    const rows = tRes.ok ? ((await tRes.json()) as Array<Record<string, unknown>>) : [];
    const tenant = rows[0];
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    let version = await getTenantPortalVersion(orgId, tenantId);

    if (action === "rotate") {
      version += 1;
      await fetch(`${SUPABASE_URL}/rest/v1/site_content?on_conflict=org_id,section,key`, {
        method: "POST",
        headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          org_id: orgId,
          section: "portal_tokens",
          key: `v:${tenantId}`,
          value: String(version),
          updated_at: new Date().toISOString(),
        }),
      });
    }

    const token = createTenantPortalToken({ orgId, tenantId, version });
    const url = `${platformUrl()}/portal/${token}`;

    if (action === "send_email") {
      const toEmail = String(tenant.email || "").trim();
      if (!toEmail) {
        return NextResponse.json(
          { error: "This tenant has no email address on file. Add an email or copy the link instead." },
          { status: 400 }
        );
      }
      if (!emailConfigured()) {
        return NextResponse.json(
          { error: "Transactional email (RESEND_API_KEY) is not configured yet — copy the portal link directly.", url },
          { status: 503 }
        );
      }

      const orgName = org.name || "Property Management";
      const unitLabel = `${tenant.building || ""}${tenant.unit ? ` · Unit ${tenant.unit}` : ""}`.trim();
      const firstName = String(tenant.contact_name || tenant.name || "Resident").split(" ")[0];

      // Check whether this org has expanded the Resident Portal to include rent balance & receipts
      let includeBilling = false;
      try {
        const settingsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${encodeURIComponent(orgId)}&section=eq.resident_portal&key=eq.settings&select=value&limit=1`,
          { headers: HEADERS, cache: "no-store" }
        );
        if (settingsRes.ok) {
          const sRows = (await settingsRes.json()) as Array<{ value?: string }>;
          if (sRows[0]?.value) {
            const parsedSettings =
              typeof sRows[0].value === "string" ? JSON.parse(sRows[0].value) : sRows[0].value;
            includeBilling = Boolean(parsedSettings?.includeBilling);
          }
        }
      } catch {
        includeBilling = false;
      }

      const portalCapabilitiesText = includeBilling
        ? "submit maintenance requests with photos, download lease documents and paid rent receipts, and view your rent balance &amp; payment instructions"
        : "submit maintenance requests with photos, track work order status, and download your lease documents";

      const sent = await sendEmail({
        to: toEmail,
        subject: `Your Resident Portal Link — ${orgName}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;margin:0 auto;padding:28px;background:#080C14;color:#f8fafc;border-radius:16px">
          <div style="font-size:18px;font-weight:900;color:#38bdf8;margin-bottom:16px">${escapeHtml(orgName)}</div>
          <h2 style="margin:0 0 10px;font-size:20px;color:#ffffff">Welcome to Your Resident Portal</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1">
            Hi ${escapeHtml(firstName)}, bookmark this personal link for <strong>${escapeHtml(unitLabel || "your unit")}</strong> to ${portalCapabilitiesText} — no password required.
          </p>
          <div style="margin:24px 0">
            <a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 24px;background:linear-gradient(135deg,#0284c7,#4f46e5);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px">Open My Resident Portal →</a>
          </div>
          <p style="margin:18px 0 0;font-size:12px;color:#64748b">
            Please keep this link private — it is unique to your lease.
          </p>
        </div>`,
      });

      if (!sent) {
        return NextResponse.json({ error: "Email delivery failed. You can still copy and text the link.", url }, { status: 502 });
      }
    }

    return NextResponse.json({ ok: true, url, version });
  } catch (err) {
    return apiErrorResponse(err, "Failed to process resident portal link.", {
      route: "/api/tenants/portal-link",
      orgId,
    });
  }
}
