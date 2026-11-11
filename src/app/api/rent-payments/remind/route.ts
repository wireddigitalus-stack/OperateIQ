import { NextRequest, NextResponse } from "next/server";
import { requireOrg, type RequestContext } from "@/lib/server-auth";
import { createTenantPortalToken } from "@/lib/tenant-portal-token";
import { sendEmail, emailConfigured, escapeHtml, platformUrl } from "@/lib/email";
import { writeActivityLog } from "@/lib/activity-log";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || "staff",
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

function fmtMoney(n: number): string {
  const hasCents = n % 1 !== 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[parseInt(m, 10) - 1] || ym} ${y || ""}`.trim();
}

function rowDue(r: Record<string, unknown>): number {
  return (
    (Number(r.rent_due) || 0) +
    (Number(r.nn_fee) || 0) +
    (Number(r.nnn_fee) || 0) +
    (Number(r.utility_fee) || 0) +
    (Number(r.cleaning_fee) || 0) +
    (Number(r.cam_fee) || 0) +
    (Number(r.late_fee) || 0)
  );
}

/**
 * POST /api/rent-payments/remind
 *
 * Sends branded HTML rent reminders, past-due notices, or paid receipts via Resend
 * to a single tenant (`paymentId`) or all unpaid tenants for `month` (`mode: "bulk_unpaid"`).
 */
export async function POST(req: NextRequest) {
  const g = await requireOrg(req, { requireFeature: "rent_ledger" });
  if (!g.ok) return g.res;
  const { orgId, org } = g.ctx;

  if (!emailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        emailConfigured: false,
        error: "Transactional email (RESEND_API_KEY) is not configured yet in your environment.",
      },
      { status: 503 }
    );
  }

  const parsed = await safeJsonBody<{
    month?: string;
    paymentId?: string;
    kind?: "reminder" | "late_notice" | "receipt";
    mode?: "single" | "bulk_unpaid";
  }>(req);
  if (!parsed.ok) return parsed.res;

  const month = String(parsed.body?.month || "").trim();
  const paymentId = String(parsed.body?.paymentId || "").trim();
  const kind = parsed.body?.kind || "reminder";
  const mode = parsed.body?.mode || (paymentId ? "single" : "bulk_unpaid");

  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Valid month (YYYY-MM) is required." }, { status: 400 });
  }

  try {
    const [paymentsRes, tenantsRes, contentRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${orgId}&month=eq.${encodeURIComponent(month)}&limit=500`,
        { headers: HEADERS, cache: "no-store" }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${orgId}&select=id,name,contact_name,email,building,unit&limit=1000`,
        { headers: HEADERS, cache: "no-store" }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=in.(rent_ledger,portal_tokens)&limit=200`,
        { headers: HEADERS, cache: "no-store" }
      ),
    ]);

    const allPayments = paymentsRes.ok ? ((await paymentsRes.json()) as Array<Record<string, unknown>>) : [];
    const allTenants = tenantsRes.ok ? ((await tenantsRes.json()) as Array<Record<string, unknown>>) : [];
    const contentRows = contentRes.ok ? ((await contentRes.json()) as Array<{ section: string; key: string; value: string }>) : [];

    const tenantMap = new Map<string, Record<string, unknown>>();
    for (const t of allTenants) {
      if (t.id) tenantMap.set(String(t.id), t);
    }

    const versionMap = new Map<string, number>();
    let inst: Record<string, string> = {};
    for (const row of contentRows) {
      if (row.section === "portal_tokens" && row.key.startsWith("v:")) {
        versionMap.set(row.key.slice(2), Number(row.value) || 1);
      } else if (row.section === "rent_ledger" && row.key === "payment_instructions" && row.value) {
        try {
          inst = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
        } catch {
          inst = {};
        }
      }
    }

    const targets =
      mode === "single"
        ? allPayments.filter((p) => String(p.id) === paymentId)
        : allPayments.filter((p) => !p.paid && rowDue(p) - (Number(p.amount_paid) || 0) > 0.009);

    if (targets.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skippedNoEmail: 0,
        message: "No matching rent rows required an email.",
      });
    }

    const orgName = org.name || "Property Management";
    const monthLabel = fmtMonthLabel(month);
    const instLines: string[] = [];
    if (inst.zelle) instLines.push(`<li><strong>Zelle:</strong> ${escapeHtml(inst.zelle)}</li>`);
    if (inst.venmo) instLines.push(`<li><strong>Venmo:</strong> ${escapeHtml(inst.venmo)}</li>`);
    if (inst.cashApp) instLines.push(`<li><strong>Cash App:</strong> ${escapeHtml(inst.cashApp)}</li>`);
    if (inst.checkPayableTo) {
      instLines.push(
        `<li><strong>Check payable to:</strong> ${escapeHtml(inst.checkPayableTo)}${inst.checkAddress ? ` (${escapeHtml(inst.checkAddress)})` : ""}</li>`
      );
    }

    let sent = 0;
    let skippedNoEmail = 0;

    for (const p of targets) {
      const tenantId = String(p.tenant_id || "");
      const tenant = tenantMap.get(tenantId);
      const email = String(tenant?.email || "").trim();
      if (!email) {
        skippedNoEmail++;
        continue;
      }

      const tenantName = String(p.tenant_name || tenant?.name || "Resident");
      const unitLabel = `${p.building || tenant?.building || ""}${p.unit || tenant?.unit ? ` · Unit ${p.unit || tenant?.unit}` : ""}`.trim();
      const totalDueAmt = rowDue(p);
      const paidAmt = Number(p.amount_paid) || 0;
      const balanceAmt = Math.max(0, totalDueAmt - paidAmt);
      const lateFeeAmt = Number(p.late_fee) || 0;

      const token = tenantId
        ? createTenantPortalToken({
            orgId,
            tenantId,
            version: versionMap.get(tenantId) || 1,
          })
        : null;
      const portalLink = token ? `${platformUrl()}/portal/${token}` : null;

      let subject = `Rent Reminder — ${monthLabel} (${unitLabel || orgName})`;
      let heading = `${monthLabel} Rent Statement`;
      let accent = "#0284c7";
      let intro = `Friendly reminder from <strong>${escapeHtml(orgName)}</strong> that your ${escapeHtml(monthLabel)} balance of <strong>${escapeHtml(fmtMoney(balanceAmt))}</strong> is due for <strong>${escapeHtml(unitLabel || "your unit")}</strong>.`;

      if (kind === "late_notice" || lateFeeAmt > 0) {
        subject = `Past-Due Rent Notice — ${monthLabel} (${unitLabel || orgName})`;
        heading = `Past-Due Rent Notice`;
        accent = "#dc2626";
        intro = `Our records show an unpaid balance of <strong>${escapeHtml(fmtMoney(balanceAmt))}</strong>${lateFeeAmt > 0 ? ` (including a ${escapeHtml(fmtMoney(lateFeeAmt))} late fee)` : ""} for <strong>${escapeHtml(unitLabel || "your unit")}</strong>. Please submit payment promptly or notify us if already sent.`;
      } else if (kind === "receipt") {
        subject = `Paid Rent Receipt — ${monthLabel} (${unitLabel || orgName})`;
        heading = `Official Rent Payment Receipt`;
        accent = "#059669";
        intro = `Thank you! <strong>${escapeHtml(orgName)}</strong> recorded <strong>${escapeHtml(fmtMoney(paidAmt))}</strong> for <strong>${escapeHtml(unitLabel || "your unit")}</strong> (${escapeHtml(monthLabel)}). Remaining balance: <strong>${escapeHtml(fmtMoney(balanceAmt))}</strong>.`;
      }

      const ok = await sendEmail({
        to: email,
        replyTo: g.ctx.user?.email || undefined,
        subject,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#080C14;color:#f8fafc;border-radius:16px">
          <div style="font-size:17px;font-weight:900;color:#38bdf8;margin-bottom:14px">${escapeHtml(orgName)}</div>
          <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff">${heading}</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1">Hi ${escapeHtml(tenantName.split(" ")[0])},<br/><br/>${intro}</p>
          ${
            kind !== "receipt" && instLines.length > 0
              ? `<div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 18px;margin-bottom:18px;font-size:13px;color:#e2e8f0">
                  <div style="font-weight:700;margin-bottom:6px;color:#94a3b8">Payment Methods</div>
                  <ul style="margin:0;padding-left:18px;line-height:1.7">${instLines.join("")}</ul>
                </div>`
              : ""
          }
          ${
            portalLink
              ? `<div style="margin:22px 0">
                  <a href="${escapeHtml(portalLink)}" style="display:inline-block;padding:12px 22px;background:${accent};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:800;font-size:13px">Open My Resident Portal →</a>
                </div>`
              : ""
          }
          <p style="margin:16px 0 0;font-size:11px;color:#64748b">Sent via PropOpsIQ on behalf of ${escapeHtml(orgName)}.</p>
        </div>`,
      });

      if (ok) sent++;
    }

    await writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "updated",
      resource_type: "rent_ledger",
      resource_id: month,
      resource_name: `Sent ${sent} ${kind.replace("_", " ")} email(s) for ${monthLabel}`,
      metadata: { month, kind, mode, sent, skippedNoEmail },
    });

    return NextResponse.json({ ok: true, sent, skippedNoEmail, emailConfigured: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to send rent emails.", {
      route: "/api/rent-payments/remind",
      orgId,
    });
  }
}
