import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { requireOrg, requireOrgAdmin, type RequestContext } from "@/lib/server-auth";
import {
  apiErrorResponse,
  buildPaginationMeta,
  parseContentRangeTotal,
  parsePagination,
  safeJsonBody,
} from "@/lib/pagination";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || "staff",
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

// GET /api/tenants (supports ?limit=&offset=&status=&building=)
export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const pg = parsePagination(req, { defaultLimit: 250, maxLimit: 1000 });
    const status = req.nextUrl.searchParams.get("status")?.trim();
    const building = req.nextUrl.searchParams.get("building")?.trim();

    let url = `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${orgId}&order=created_at.desc`;
    if (status) url += `&status=eq.${encodeURIComponent(status)}`;
    if (building) url += `&building=eq.${encodeURIComponent(building)}`;

    const res = await fetch(url, {
      headers: {
        ...HEADERS,
        Range: pg.rangeHeader,
        Prefer: "count=exact",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`tenants GET (${res.status}): ${errText}`),
        "Failed to load tenants.",
        { route: "/api/tenants", orgId }
      );
    }

    const tenants = (await res.json()) as unknown[];
    const total = parseContentRangeTotal(res.headers.get("content-range"), tenants.length);

    return NextResponse.json(
      {
        tenants,
        pagination: buildPaginationMeta({
          limit: pg.limit,
          offset: pg.offset,
          total,
          returnedCount: tenants.length,
        }),
      },
      { headers: { "Cache-Control": "no-store, no-cache" } }
    );
  } catch (err) {
    return apiErrorResponse(err, "Failed to load tenants.", { route: "/api/tenants", orgId });
  }
}

// POST /api/tenants — create single or batch
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;
  const actor = actorOf(g.ctx);

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const isBatch =
      Array.isArray(body) ||
      (Boolean(body) && typeof body === "object" && Array.isArray((body as { tenants?: unknown }).tenants));
    const rawList: Record<string, unknown>[] = isBatch
      ? Array.isArray(body)
        ? (body as Record<string, unknown>[])
        : ((body as { tenants: Record<string, unknown>[] }).tenants ?? [])
      : [body as Record<string, unknown>];

    if (!rawList.length || rawList.length > 500) {
      return NextResponse.json({ error: "Provide between 1 and 500 tenant records." }, { status: 400 });
    }

    const tenants = rawList.map((item, idx) => ({
      org_id: orgId,
      id: (item.id as string) || `tenant_${Date.now()}_${idx}`,
      name: String(item.name || "").trim(),
      contact_name: String(item.contactName || item.contact_name || "").trim(),
      email: String(item.email || "").trim(),
      phone: String(item.phone || "").trim(),
      building: String(item.building || "").trim(),
      unit: String(item.unit || "").trim(),
      rep: String(item.rep || "").trim(),
      monthly_rent: Number(item.monthlyRent ?? item.monthly_rent) || 0,
      utilities_fee: Number(item.utilitiesFee ?? item.utilities_fee) || 0,
      security_deposit: Number(item.securityDeposit ?? item.security_deposit) || 0,
      nnn_fee: Number(item.nnnFee ?? item.nnn_fee) || 0,
      cleaning_fee: Number(item.cleaningFee ?? item.cleaning_fee) || 0,
      cam_fee: Number(item.camFee ?? item.cam_fee) || 0,
      nn_fee: Number(item.nnFee ?? item.nn_fee) || 0,
      lease_start: (item.leaseStart || item.lease_start || null) as string | null,
      lease_end: (item.leaseEnd || item.lease_end || null) as string | null,
      renewal_date: (item.renewalDate || item.renewal_date || null) as string | null,
      lease_alert_days: (item.leaseAlertDays ?? item.lease_alert_days ?? null) as number | null,
      escalation_pct: Number(item.escalationPct ?? item.escalation_pct) || 0,
      escalation_date: (item.escalationDate || item.escalation_date || null) as string | null,
      status: String(item.status || "active"),
      notes: String(item.notes || "").trim(),
      source_lead_id: String(item.sourceLeadId || item.source_lead_id || ""),
      lease_documents:
        typeof item.leaseDocuments === "string"
          ? item.leaseDocuments
          : JSON.stringify(item.leaseDocuments || []),
      sec_dep_received: Boolean(item.secDepReceived ?? item.sec_dep_received ?? false),
      sec_dep_date: (item.secDepDate || item.sec_dep_date || null) as string | null,
      sec_dep_status: String(item.secDepStatus || item.sec_dep_status || "no_change"),
      sec_dep_notes: String(item.secDepNotes || item.sec_dep_notes || ""),
      created_at: new Date().toISOString(),
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(isBatch ? tenants : tenants[0]),
    });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`tenants POST (${res.status}): ${errText}`),
        "Failed to save tenant record.",
        { route: "/api/tenants", orgId }
      );
    }

    const insertedData = await res.json();

    if (!isBatch && tenants[0].source_lead_id) {
      try {
        const leadUrl = `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(tenants[0].source_lead_id)}&org_id=eq.${orgId}`;
        await fetch(leadUrl, {
          method: "PATCH",
          headers: { ...HEADERS, Prefer: "return=minimal" },
          body: JSON.stringify({
            archived_at: new Date().toISOString(),
          }),
        });

        await writeActivityLog({
          ...actor,
          org_id: orgId,
          action: "updated",
          resource_type: "lead",
          resource_name: tenants[0].name,
          resource_id: tenants[0].source_lead_id,
          metadata: {
            reason: "converted_to_tenant",
            tenant_id: tenants[0].id,
            tenant_name: tenants[0].name,
          },
        });
      } catch (leadErr) {
        console.error("Failed to auto-archive source lead:", leadErr);
      }
    }

    await writeActivityLog({
      ...actor,
      org_id: orgId,
      action: "created",
      resource_type: "tenant",
      resource_name: isBatch ? `${tenants.length} tenants imported` : tenants[0].name,
      resource_id: isBatch ? `batch_${Date.now()}` : tenants[0].id,
      metadata: { count: tenants.length, isBatch },
    });

    return NextResponse.json({
      success: true,
      count: tenants.length,
      tenant: isBatch ? insertedData : tenants[0],
      tenants: insertedData,
    });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save tenant record.", { route: "/api/tenants", orgId });
  }
}

// PATCH /api/tenants?id=xxx — update fields
export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;
  const actor = actorOf(g.ctx);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  const map: Record<string, string> = {
    name: "name",
    contactName: "contact_name",
    email: "email",
    phone: "phone",
    building: "building",
    unit: "unit",
    rep: "rep",
    monthlyRent: "monthly_rent",
    utilitiesFee: "utilities_fee",
    securityDeposit: "security_deposit",
    nnnFee: "nnn_fee",
    cleaningFee: "cleaning_fee",
    camFee: "cam_fee",
    nnFee: "nn_fee",
    leaseStart: "lease_start",
    leaseEnd: "lease_end",
    renewalDate: "renewal_date",
    leaseAlertDays: "lease_alert_days",
    escalationPct: "escalation_pct",
    escalationDate: "escalation_date",
    status: "status",
    notes: "notes",
    sourceLeadId: "source_lead_id",
    leaseDocuments: "lease_documents",
    secDepReceived: "sec_dep_received",
    secDepDate: "sec_dep_date",
    secDepStatus: "sec_dep_status",
    secDepNotes: "sec_dep_notes",
  };

  const patch: Record<string, unknown> = {};
  Object.entries(map).forEach(([js, db]) => {
    if (body[js] !== undefined) patch[db] = body[js];
  });

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY;
  const url = `${SUPABASE_URL}/rest/v1/tenants?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`;

  async function attemptPatch(fields: Record<string, unknown>): Promise<NextResponse> {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: authKey,
        Authorization: `Bearer ${authKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(fields),
    });

    const responseText = await res.text();

    if (res.status === 204 || res.status === 200) {
      let rows: unknown = null;
      try {
        rows = JSON.parse(responseText);
      } catch {
        /* ignore */
      }
      if (Array.isArray(rows) && rows.length === 0) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }

      const frontendChanges = body._changes as Record<string, { from: unknown; to: unknown }> | undefined;
      let metadata: Record<string, unknown>;

      if (frontendChanges && Object.keys(frontendChanges).length > 0) {
        metadata = Object.fromEntries(
          Object.entries(frontendChanges).map(([field, { from, to }]) => [
            field,
            `${from ?? "—"} → ${to ?? "—"}`,
          ])
        );
      } else {
        const keys = Object.keys(patch).map((k) => k.replace(/_/g, " "));
        metadata = {
          changed:
            keys.length <= 2 ? keys.join(", ") : `${keys.slice(0, 2).join(", ")} +${keys.length - 2} more`,
        };
      }

      await writeActivityLog({
        ...actor,
        org_id: orgId,
        action: "updated",
        resource_type: "tenant",
        resource_name: (body.name as string) || (id as string),
        resource_id: id as string,
        metadata,
      });
      return NextResponse.json({ success: true });
    }

    if (res.status === 400 && responseText.includes("column")) {
      const match = responseText.match(/Could not find the '(\w+)' column/);
      if (match) {
        const badCol = match[1];
        console.warn(`[tenants PATCH] Column '${badCol}' missing — skipping and retrying.`);
        const reduced = { ...fields };
        delete reduced[badCol];
        if (Object.keys(reduced).length === 0) {
          return apiErrorResponse(
            new Error(`Missing column ${badCol} in tenants`),
            "Database schema update required. Please contact support.",
            { route: "/api/tenants", orgId }
          );
        }
        return attemptPatch(reduced);
      }
    }

    return apiErrorResponse(
      new Error(`tenants PATCH (${res.status}): ${responseText}`),
      "Failed to save tenant changes.",
      { route: "/api/tenants", orgId }
    );
  }

  try {
    return await attemptPatch(patch);
  } catch (err) {
    return apiErrorResponse(err, "Failed to save tenant changes.", { route: "/api/tenants", orgId });
  }
}

// DELETE /api/tenants?id=xxx or ?clear_sample=1
export async function DELETE(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    if (req.nextUrl.searchParams.get("clear_sample") === "1") {
      const delRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${orgId}&notes=ilike.*%5BSAMPLE%5D*`,
        { method: "DELETE", headers: HEADERS }
      );
      if (!delRes.ok) {
        const errText = await delRes.text();
        return apiErrorResponse(
          new Error(`tenants clear_sample (${delRes.status}): ${errText}`),
          "Failed to clear sample tenants.",
          { route: "/api/tenants", orgId }
        );
      }
      await writeActivityLog({
        ...actorOf(g.ctx),
        org_id: orgId,
        action: "deleted",
        resource_type: "tenant",
        resource_name: "Cleared sample demo tenants",
        resource_id: "sample_batch",
      });
      return NextResponse.json({ success: true });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`, {
      method: "DELETE",
      headers: HEADERS,
    });

    if (!res.ok) {
      const errText = await res.text();
      return apiErrorResponse(
        new Error(`tenants DELETE (${res.status}): ${errText}`),
        "Failed to delete tenant.",
        { route: "/api/tenants", orgId }
      );
    }

    await writeActivityLog({
      ...actorOf(g.ctx),
      org_id: orgId,
      action: "deleted",
      resource_type: "tenant",
      resource_name: req.nextUrl.searchParams.get("name") || id,
      resource_id: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete tenant.", { route: "/api/tenants", orgId });
  }
}
