import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { requireOrgAdmin } from "@/lib/server-auth";
import { sendEmail, emailConfigured, escapeHtml, platformUrl } from "@/lib/email";
import { isSubscriptionActive } from "@/lib/plans";
import { apiErrorResponse } from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

async function runDailyOpsForOrg(orgId: string, orgName: string, contactEmail: string | null) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayOfMonth = now.getDate();

  let lateFeesApplied = 0;
  let expiringLeasesAlerted = 0;

  // 1. Check org's late_fee_policy
  const policyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=eq.rent_ledger&key=eq.late_fee_policy&select=value&limit=1`,
    { headers: HEADERS, cache: "no-store" }
  );
  if (policyRes.ok) {
    const pRows = (await policyRes.json()) as Array<{ value?: string }>;
    if (pRows[0]?.value) {
      try {
        const policy = JSON.parse(pRows[0].value);
        if (policy?.autoApply && dayOfMonth > (Number(policy.dueDay) || 1) + (Number(policy.graceDays) || 5)) {
          const rpRes = await fetch(
            `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${ym}&paid=eq.false&late_fee=eq.0&is_submitted=eq.false&limit=500`,
            { headers: HEADERS, cache: "no-store" }
          );
          if (rpRes.ok) {
            const unpaidRows = (await rpRes.json()) as Array<Record<string, unknown>>;
            for (const r of unpaidRows) {
              const baseRent = Number(r.rent_due) || 0;
              if (baseRent <= 0) continue;
              let fee =
                policy.feeType === "percent"
                  ? Math.round(baseRent * ((Number(policy.feeAmount) || 5) / 100) * 100) / 100
                  : Number(policy.feeAmount) || 50;
              if (Number(policy.maxFee) > 0 && fee > Number(policy.maxFee)) {
                fee = Number(policy.maxFee);
              }
              if (fee <= 0) continue;
              const uRes = await fetch(
                `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&id=eq.${encodeURIComponent(String(r.id))}`,
                {
                  method: "PATCH",
                  headers: HEADERS,
                  body: JSON.stringify({ late_fee: fee }),
                }
              );
              if (uRes.ok) lateFeesApplied++;
            }
          }
        }
      } catch {
        // Ignore malformed policy
      }
    }
  }

  // 2. Check leases expiring in exactly 60 or 30 days for owner email digest
  if (contactEmail && emailConfigured()) {
    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${orgId}&status=eq.active&lease_end=not.is.null&select=id,name,building,unit,lease_end,monthly_rent&limit=500`,
      { headers: HEADERS, cache: "no-store" }
    );
    if (tRes.ok) {
      const tenants = (await tRes.json()) as Array<Record<string, unknown>>;
      const milestoneTenants = tenants.filter((t) => {
        if (!t.lease_end) return false;
        const days = Math.ceil((new Date(String(t.lease_end)).getTime() - now.getTime()) / 86_400_000);
        return days === 60 || days === 30 || days === 14;
      });

      if (milestoneTenants.length > 0) {
        const listHtml = milestoneTenants
          .map(
            (t) =>
              `<li><strong>${escapeHtml(String(t.name))}</strong> (${escapeHtml(String(t.building || ""))}${t.unit ? ` · ${escapeHtml(String(t.unit))}` : ""}) — expires <strong>${escapeHtml(String(t.lease_end))}</strong></li>`
          )
          .join("");
        const sent = await sendEmail({
          to: contactEmail,
          subject: `[Lease Renewal Alert] ${milestoneTenants.length} lease(s) approaching expiration — ${orgName}`,
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
            <h2 style="margin:0 0 10px;color:#0284c7">Upcoming Lease Expirations</h2>
            <p style="font-size:14px;color:#475569">The following active leases in <strong>${escapeHtml(orgName)}</strong> hit a renewal milestone today:</p>
            <ul style="font-size:13px;line-height:1.7;color:#1e293b">${listHtml}</ul>
            <a href="${platformUrl()}/admin?tab=tenants" style="display:inline-block;margin-top:14px;padding:10px 18px;background:#0284c7;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px">Review Leases in PropOpsIQ →</a>
          </div>`,
        });
        if (sent) expiringLeasesAlerted = milestoneTenants.length;
      }
    }
  }

  return { orgId, lateFeesApplied, expiringLeasesAlerted };
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized cron invocation." }, { status: 401 });
  }

  try {
    const orgsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id,name,contact_email,subscription_status,trial_ends_at&limit=200`,
      { headers: HEADERS, cache: "no-store" }
    );
    const orgs = orgsRes.ok ? ((await orgsRes.json()) as Array<Record<string, unknown>>) : [];
    const results = [];
    for (const o of orgs) {
      if (
        !isSubscriptionActive({
          subscription_status: (o.subscription_status as string) || null,
          trial_ends_at: (o.trial_ends_at as string) || null,
        })
      ) {
        continue;
      }
      results.push(
        await runDailyOpsForOrg(
          String(o.id),
          String(o.name || "Portfolio"),
          (o.contact_email as string) || null
        )
      );
    }
    return NextResponse.json({ ok: true, processedOrgs: results.length, results });
  } catch (err) {
    return apiErrorResponse(err, "Daily ops cron failed.", { route: "/api/cron/daily-ops" });
  }
}

export async function POST(req: NextRequest) {
  // Allows an org admin to trigger their own org's daily check manually from the UI
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  try {
    const summary = await runDailyOpsForOrg(
      g.ctx.orgId,
      g.ctx.org.name,
      g.ctx.user?.email || null
    );
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return apiErrorResponse(err, "Failed to run daily automation check.", {
      route: "/api/cron/daily-ops",
      orgId: g.ctx.orgId,
    });
  }
}
