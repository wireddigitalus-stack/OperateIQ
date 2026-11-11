import { NextRequest, NextResponse } from "next/server";
import { verifyTenantPortalToken } from "@/lib/tenant-portal-token";
import { checkRateLimit, clientIp as getClientIp } from "@/lib/rateLimit";
import { writeActivityLog } from "@/lib/activity-log";
import { sendEmail, escapeHtml, platformUrl } from "@/lib/email";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function currentMonthYm(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function rowTotalDue(r: Record<string, unknown>): number {
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

async function resolveValidPortalTenant(token: string) {
  const claims = verifyTenantPortalToken(token);
  if (!claims) return null;

  const [tenantRes, orgRes, contentRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${encodeURIComponent(claims.orgId)}&id=eq.${encodeURIComponent(claims.tenantId)}&limit=1`,
      { headers: HEADERS, cache: "no-store" }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(claims.orgId)}&select=id,name,slug,brand_name,brand_logo_url,brand_primary_color,contact_email,contact_phone&limit=1`,
      { headers: HEADERS, cache: "no-store" }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${encodeURIComponent(claims.orgId)}&section=in.(rent_ledger,portal_tokens)&limit=100`,
      { headers: HEADERS, cache: "no-store" }
    ),
  ]);

  if (!tenantRes.ok || !orgRes.ok) return null;
  const tenants = (await tenantRes.json()) as Array<Record<string, unknown>>;
  const orgs = (await orgRes.json()) as Array<Record<string, unknown>>;
  const tenant = tenants[0];
  const org = orgs[0];
  if (!tenant || !org) return null;

  const contentRows = contentRes.ok ? ((await contentRes.json()) as Array<{ section: string; key: string; value: string }>) : [];
  const tokenVersionRow = contentRows.find(
    (r) => r.section === "portal_tokens" && r.key === `v:${claims.tenantId}`
  );
  const requiredVersion = tokenVersionRow ? Number(tokenVersionRow.value) || 1 : 1;
  if (claims.v < requiredVersion) {
    return null; // Revoked / rotated portal link
  }

  let paymentInstructions: Record<string, string> = {};
  const instRow = contentRows.find(
    (r) => r.section === "rent_ledger" && r.key === "payment_instructions"
  );
  if (instRow?.value) {
    try {
      paymentInstructions =
        typeof instRow.value === "string" ? JSON.parse(instRow.value) : instRow.value;
    } catch {
      paymentInstructions = {};
    }
  }

  return { claims, tenant, org, paymentInstructions };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`portal-get:${ip}`, 60, 5 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const { token } = await context.params;
    const resolved = await resolveValidPortalTenant(token);
    if (!resolved) {
      return NextResponse.json(
        { error: "This resident portal link is invalid or has expired. Please request a fresh link from your property manager." },
        { status: 404 }
      );
    }

    const { claims, tenant, org, paymentInstructions } = resolved;
    const month = currentMonthYm();

    // Fetch tenant's rent payment rows & maintenance tickets in parallel
    const building = String(tenant.building || "").trim();
    const unit = String(tenant.unit || "").trim();
    const tenantName = String(tenant.name || "").trim();

    const [paymentsRes, maintRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${encodeURIComponent(claims.orgId)}&tenant_id=eq.${encodeURIComponent(claims.tenantId)}&order=month.desc&limit=36`,
        { headers: HEADERS, cache: "no-store" }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/maintenance_tickets?org_id=eq.${encodeURIComponent(claims.orgId)}&order=created_at.desc&limit=100`,
        { headers: HEADERS, cache: "no-store" }
      ),
    ]);

    const rawPayments = paymentsRes.ok ? ((await paymentsRes.json()) as Array<Record<string, unknown>>) : [];
    const allMaint = maintRes.ok ? ((await maintRes.json()) as Array<Record<string, unknown>>) : [];

    // Filter maintenance tickets strictly belonging to this resident's unit or name
    const residentTickets = allMaint
      .filter((t) => {
        const tTenant = String(t.tenant || "").trim().toLowerCase();
        const tBuilding = String(t.building || "").trim().toLowerCase();
        const tUnit = String(t.unit || "").trim().toLowerCase();
        if (tenantName && tTenant === tenantName.toLowerCase()) return true;
        if (building && unit && tBuilding === building.toLowerCase() && tUnit === unit.toLowerCase()) {
          return true;
        }
        return false;
      })
      .slice(0, 25)
      .map((t) => ({
        id: String(t.id || ""),
        title: String(t.title || ""),
        description: String(t.description || ""),
        category: String(t.category || "General"),
        priority: Number(t.priority) || 3,
        status: String(t.status || "open"),
        scheduledDate: (t.scheduled_date as string) || null,
        completedDate: (t.completed_date as string) || null,
        photoUrl: (t.photo_url as string) || null,
        createdAt: String(t.created_at || ""),
      }));

    // Compute current month statement + prior carry-forward balance + receipts
    const currentRow = rawPayments.find((p) => String(p.month) === month) || null;
    const baseMonthlyObligation =
      (Number(tenant.monthly_rent) || 0) +
      (Number(tenant.utilities_fee) || 0) +
      (Number(tenant.nnn_fee) || 0) +
      (Number(tenant.cam_fee) || 0) +
      (Number(tenant.cleaning_fee) || 0) +
      (Number(tenant.nn_fee) || 0);

    const currentDue = currentRow ? rowTotalDue(currentRow) : baseMonthlyObligation;
    const currentPaid = currentRow ? Number(currentRow.amount_paid) || 0 : 0;
    const currentRemaining = Math.max(0, currentDue - currentPaid);

    const priorArrears = rawPayments
      .filter((p) => String(p.month || "") < month)
      .reduce((sum, p) => {
        const rem = Math.max(0, rowTotalDue(p) - (Number(p.amount_paid) || 0));
        return sum + rem;
      }, 0);

    const receipts = rawPayments
      .filter((p) => (Number(p.amount_paid) || 0) > 0)
      .map((p) => ({
        id: String(p.id || ""),
        month: String(p.month || ""),
        totalDue: rowTotalDue(p),
        amountPaid: Number(p.amount_paid) || 0,
        paid: Boolean(p.paid),
        paymentType: String(p.payment_type || "Payment"),
        paymentDate: (p.payment_date as string) || null,
        lateFee: Number(p.late_fee) || 0,
      }));

    let parsedDocs: Array<{ name: string; uploadedAt?: string }> = [];
    try {
      const rawDocs =
        typeof tenant.lease_documents === "string"
          ? JSON.parse(tenant.lease_documents)
          : tenant.lease_documents;
      if (Array.isArray(rawDocs)) {
        parsedDocs = rawDocs.map((d: { name?: string; uploadedAt?: string }, idx: number) => ({
          name: String(d?.name || `Lease Document ${idx + 1}`),
          uploadedAt: d?.uploadedAt || undefined,
        }));
      }
    } catch {
      parsedDocs = [];
    }

    return NextResponse.json(
      {
        organization: {
          name: String(org.brand_name || org.name || "Property Management"),
          logoUrl: (org.brand_logo_url as string) || null,
          primaryColor: String(org.brand_primary_color || "#0EA5E9"),
          contactEmail: (org.contact_email as string) || null,
          contactPhone: (org.contact_phone as string) || null,
        },
        tenant: {
          name: tenantName,
          contactName: String(tenant.contact_name || tenantName),
          building,
          unit,
          leaseStart: (tenant.lease_start as string) || null,
          leaseEnd: (tenant.lease_end as string) || null,
          status: String(tenant.status || "active"),
          securityDeposit: Number(tenant.security_deposit) || 0,
          secDepReceived: Boolean(tenant.sec_dep_received),
        },
        billing: {
          currentMonth: month,
          baseRent: currentRow ? Number(currentRow.rent_due) || 0 : Number(tenant.monthly_rent) || 0,
          feesTotal: currentRow
            ? (Number(currentRow.nn_fee) || 0) +
              (Number(currentRow.nnn_fee) || 0) +
              (Number(currentRow.utility_fee) || 0) +
              (Number(currentRow.cleaning_fee) || 0) +
              (Number(currentRow.cam_fee) || 0)
            : (Number(tenant.utilities_fee) || 0) +
              (Number(tenant.nnn_fee) || 0) +
              (Number(tenant.cam_fee) || 0) +
              (Number(tenant.cleaning_fee) || 0) +
              (Number(tenant.nn_fee) || 0),
          lateFee: currentRow ? Number(currentRow.late_fee) || 0 : 0,
          currentDue,
          currentPaid,
          currentRemaining,
          priorArrears,
          totalBalanceDue: currentRemaining + priorArrears,
          paidInFull: currentRemaining + priorArrears <= 0.009,
          paymentInstructions,
        },
        receipts,
        documents: parsedDocs.map((d, index) => ({
          index,
          name: d.name,
          uploadedAt: d.uploadedAt || null,
          downloadUrl: `/api/portal/${encodeURIComponent(token)}/document?index=${index}`,
        })),
        tickets: residentTickets,
      },
      { headers: { "Cache-Control": "no-store, no-cache" } }
    );
  } catch (err) {
    return apiErrorResponse(err, "Failed to load resident portal.", { route: "/api/portal/[token]" });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`portal-post:${ip}`, 12, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many submissions. Please wait a few minutes." }, { status: 429 });
  }

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  try {
    const { token } = await context.params;
    const resolved = await resolveValidPortalTenant(token);
    if (!resolved) {
      return NextResponse.json({ error: "Invalid or expired portal link." }, { status: 403 });
    }

    const { claims, tenant, org } = resolved;
    const action = String(body.action || "");
    const tenantName = String(tenant.name || "Resident");
    const building = String(tenant.building || "");
    const unit = String(tenant.unit || "");
    const unitLabel = `${building}${unit ? ` · Unit ${unit}` : ""}`.trim() || "Unit";
    const landlordEmail =
      String(org.contact_email || process.env.CONTACT_NOTIFY_TO || "").trim();

    if (action === "maintenance_request") {
      const title = String(body.title || "").trim().slice(0, 140);
      const description = String(body.description || "").trim().slice(0, 2000);
      const category = String(body.category || "General").trim().slice(0, 50);
      const urgency = String(body.urgency || "normal").toLowerCase();
      const permissionToEnter = Boolean(body.permissionToEnter);
      const photoUrl = typeof body.photoUrl === "string" && body.photoUrl.trim() ? body.photoUrl.trim() : null;

      if (!title || description.length < 5) {
        return NextResponse.json(
          { error: "Please provide a brief issue title and description." },
          { status: 400 }
        );
      }

      const priority = urgency === "emergency" ? 1 : urgency === "soon" ? 2 : 3;
      const entryNote = permissionToEnter
        ? "Resident granted permission to enter unit."
        : "Resident requested advance notice before entry.";

      const ticket = {
        org_id: claims.orgId,
        id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        description,
        building,
        unit,
        tenant: tenantName,
        category,
        priority,
        status: "open",
        assigned_to: "",
        reported_by: `${tenantName} (Resident Portal)`,
        estimated_cost: 0,
        actual_cost: 0,
        estimated_hours: 0,
        scheduled_date: null,
        completed_date: null,
        notes: entryNote,
        parts_needed: false,
        source: "tenant_portal",
        billable: false,
        material_amount: 0,
        photo_url: photoUrl,
        created_at: new Date().toISOString(),
        first_response_at: null,
        completed_at: null,
      };

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/maintenance_tickets`, {
        method: "POST",
        headers: { ...HEADERS, Prefer: "return=representation" },
        body: JSON.stringify(ticket),
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        return apiErrorResponse(
          new Error(`portal maintenance POST (${insertRes.status}): ${errText}`),
          "Could not submit maintenance request.",
          { route: "/api/portal/[token]", orgId: claims.orgId }
        );
      }

      await writeActivityLog({
        org_id: claims.orgId,
        actor_email: String(tenant.email || "resident@portal"),
        actor_name: `${tenantName} (Resident)`,
        action: "created",
        resource_type: "maintenance",
        resource_id: ticket.id,
        resource_name: `${title} (${unitLabel})`,
        metadata: { source: "tenant_portal", urgency, category, permissionToEnter },
      });

      if (landlordEmail) {
        await sendEmail({
          to: landlordEmail,
          replyTo: typeof tenant.email === "string" && tenant.email ? tenant.email : undefined,
          subject: `[Maintenance Request] ${unitLabel} — ${title}`,
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
            <h2 style="margin:0 0 8px;color:#0284c7">New Resident Maintenance Request</h2>
            <p style="margin:0 0 16px;font-size:14px;color:#475569">
              <strong>${escapeHtml(tenantName)}</strong> (${escapeHtml(unitLabel)}) submitted a work order via the Resident Portal.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-size:13px;line-height:1.6">
              <div><strong>Issue:</strong> ${escapeHtml(title)}</div>
              <div><strong>Category:</strong> ${escapeHtml(category)} · <strong>Urgency:</strong> ${escapeHtml(urgency.toUpperCase())}</div>
              <div><strong>Entry Permission:</strong> ${escapeHtml(entryNote)}</div>
              <div style="margin-top:8px"><strong>Details:</strong><br/>${escapeHtml(description)}</div>
              ${photoUrl ? `<div style="margin-top:10px"><a href="${escapeHtml(photoUrl)}" style="color:#0284c7;font-weight:600">View Attached Photo →</a></div>` : ""}
            </div>
            <div style="margin-top:20px">
              <a href="${platformUrl()}/admin?tab=maintenance" style="display:inline-block;padding:10px 18px;background:#0284c7;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px">Open Maintenance Dispatch</a>
            </div>
          </div>`,
        });
      }

      return NextResponse.json({ ok: true, ticketId: ticket.id });
    }

    if (action === "payment_notice") {
      const amount = Number(body.amount) || 0;
      const method = String(body.method || "Zelle / Transfer").trim().slice(0, 40);
      const reference = String(body.reference || "").trim().slice(0, 120);
      if (amount <= 0 || amount > 1_000_000) {
        return NextResponse.json({ error: "Please enter a valid payment amount." }, { status: 400 });
      }

      const month = currentMonthYm();
      const stamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const noteEntry = `[Resident reported $${amount.toLocaleString()} via ${method} on ${stamp}${reference ? ` · Ref: ${reference}` : ""}]`;

      // Attach note to current month's rent_payments row if present (never marks paid=true without landlord verification)
      const existingRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${encodeURIComponent(claims.orgId)}&tenant_id=eq.${encodeURIComponent(claims.tenantId)}&month=eq.${month}&limit=1`,
        { headers: HEADERS, cache: "no-store" }
      );
      const existingRows = existingRes.ok ? ((await existingRes.json()) as Array<Record<string, unknown>>) : [];

      if (existingRows[0]?.id) {
        const prevNotes = String(existingRows[0].notes || "").trim();
        const mergedNotes = prevNotes ? `${prevNotes} | ${noteEntry}` : noteEntry;
        await fetch(
          `${SUPABASE_URL}/rest/v1/rent_payments?org_id=eq.${encodeURIComponent(claims.orgId)}&id=eq.${encodeURIComponent(String(existingRows[0].id))}`,
          {
            method: "PATCH",
            headers: HEADERS,
            body: JSON.stringify({ notes: mergedNotes }),
          }
        );
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/rent_payments`, {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            id: `rp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            org_id: claims.orgId,
            tenant_id: claims.tenantId,
            tenant_name: tenantName,
            building,
            unit,
            month,
            rent_due: Number(tenant.monthly_rent) || 0,
            nn_fee: Number(tenant.nn_fee) || 0,
            nnn_fee: Number(tenant.nnn_fee) || 0,
            utility_fee: Number(tenant.utilities_fee) || 0,
            cleaning_fee: Number(tenant.cleaning_fee) || 0,
            cam_fee: Number(tenant.cam_fee) || 0,
            late_fee: 0,
            amount_paid: 0,
            paid: false,
            payment_type: "",
            payment_date: null,
            notes: noteEntry,
            is_submitted: false,
          }),
        });
      }

      await writeActivityLog({
        org_id: claims.orgId,
        actor_email: String(tenant.email || "resident@portal"),
        actor_name: `${tenantName} (Resident)`,
        action: "updated",
        resource_type: "rent_ledger",
        resource_id: claims.tenantId,
        resource_name: `${tenantName} reported $${amount.toLocaleString()} sent via ${method}`,
        metadata: { month, amount, method, reference },
      });

      if (landlordEmail) {
        await sendEmail({
          to: landlordEmail,
          replyTo: typeof tenant.email === "string" && tenant.email ? tenant.email : undefined,
          subject: `[Rent Sent Notice] ${tenantName} (${unitLabel}) — $${amount.toLocaleString()} via ${method}`,
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
            <h2 style="margin:0 0 8px;color:#059669">Resident Reported Payment Sent</h2>
            <p style="margin:0 0 14px;font-size:14px;color:#475569">
              <strong>${escapeHtml(tenantName)}</strong> (${escapeHtml(unitLabel)}) reported sending a rent payment. Verify receipt in your bank/app and mark Paid in your Rent Ledger.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-size:13px;line-height:1.6">
              <div><strong>Amount Reported:</strong> $${escapeHtml(amount.toLocaleString())}</div>
              <div><strong>Method:</strong> ${escapeHtml(method)}</div>
              ${reference ? `<div><strong>Reference / Memo:</strong> ${escapeHtml(reference)}</div>` : ""}
            </div>
            <div style="margin-top:20px">
              <a href="${platformUrl()}/admin?tab=rentledger" style="display:inline-block;padding:10px 18px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px">Verify in Rent Ledger</a>
            </div>
          </div>`,
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported portal action." }, { status: 400 });
  } catch (err) {
    return apiErrorResponse(err, "Failed to process portal submission.", { route: "/api/portal/[token]" });
  }
}
