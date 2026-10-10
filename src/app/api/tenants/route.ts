import { NextRequest, NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HEADERS = {
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// GET /api/tenants
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tenants?order=created_at.desc`,
    { headers: HEADERS, cache: "no-store" }  // always fresh — never serve stale after a save
  );
  if (!res.ok) {
    console.error("tenants GET error:", await res.text());
    return NextResponse.json({ tenants: [] });
  }
  const tenants = await res.json();
  return NextResponse.json({ tenants }, {
    headers: { "Cache-Control": "no-store, no-cache" },
  });
}

// POST /api/tenants — create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenant = {
      id: `tenant_${Date.now()}`,
      name: body.name?.trim() || "",
      contact_name: body.contactName?.trim() || "",
      email: body.email?.trim() || "",
      phone: body.phone?.trim() || "",
      building: body.building?.trim() || "",
      unit: body.unit?.trim() || "",
      rep: body.rep?.trim() || "",
      monthly_rent: Number(body.monthlyRent) || 0,
      utilities_fee: Number(body.utilitiesFee) || 0,
      security_deposit: Number(body.securityDeposit) || 0,
      nnn_fee: Number(body.nnnFee) || 0,
      cleaning_fee: Number(body.cleaningFee) || 0,
      cam_fee: Number(body.camFee) || 0,
      nn_fee: Number(body.nnFee) || 0,
      lease_start: body.leaseStart || null,
      lease_end: body.leaseEnd || null,
      renewal_date: body.renewalDate || null,
      lease_alert_days: body.leaseAlertDays ?? null,
      escalation_pct: Number(body.escalationPct) || 0,
      escalation_date: body.escalationDate || null,
      status: body.status || "active",
      notes: body.notes?.trim() || "",
      source_lead_id: body.sourceLeadId || "",
      lease_documents: body.leaseDocuments || "[]",
      sec_dep_received: body.secDepReceived ?? false,
      sec_dep_date: body.secDepDate || null,
      sec_dep_status: body.secDepStatus || "no_change",
      sec_dep_notes: body.secDepNotes || "",
      created_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
      method: "POST",
      headers: { ...HEADERS, "Prefer": "return=representation" },
      body: JSON.stringify(tenant),
    });

    if (!res.ok) {
      console.error("tenants POST error:", await res.text());
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    // Auto-archive source lead if converted from a lead
    if (tenant.source_lead_id) {
      try {
        const leadUrl = `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(tenant.source_lead_id)}`;
        await fetch(leadUrl, {
          method: "PATCH",
          headers: { ...HEADERS, "Prefer": "return-minimal" },
          body: JSON.stringify({
            archived_at: new Date().toISOString(),
          }),
        });

        writeActivityLog({
          actor_email:   body.actorEmail  || "unknown",
          actor_name:    body.actorName || body.actorEmail?.split("@")[0] || "Staff",
          action:        "updated",
          resource_type: "lead",
          resource_name: tenant.name,
          resource_id:   tenant.source_lead_id,
          metadata: { reason: "converted_to_tenant", tenant_id: tenant.id, tenant_name: tenant.name },
        });
      } catch (leadErr) {
        console.error("Failed to auto-archive source lead:", leadErr);
      }
    }

    // Audit log — fire and forget
    writeActivityLog({
      actor_email:   body.actorEmail  || "unknown",
      actor_name:    body.actorName || body.actorEmail?.split("@")[0] || "Staff",
      action:        "created",
      resource_type: "tenant",
      resource_name: tenant.name,
      resource_id:   tenant.id,
      metadata: { building: tenant.building, unit: tenant.unit, monthly_rent: tenant.monthly_rent, source_lead_id: tenant.source_lead_id },
    });

    return NextResponse.json({ success: true, tenant });
  } catch (err) {
    console.error("tenants POST catch:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// PATCH /api/tenants?id=xxx — update fields
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const map: Record<string, string> = {
    name: "name", contactName: "contact_name", email: "email", phone: "phone",
    building: "building", unit: "unit", rep: "rep",
    monthlyRent: "monthly_rent", utilitiesFee: "utilities_fee",
    securityDeposit: "security_deposit", nnnFee: "nnn_fee",
    cleaningFee: "cleaning_fee", camFee: "cam_fee", nnFee: "nn_fee",
    leaseStart: "lease_start", leaseEnd: "lease_end", renewalDate: "renewal_date",
    leaseAlertDays: "lease_alert_days",
    escalationPct: "escalation_pct", escalationDate: "escalation_date",
    status: "status", notes: "notes",
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
  const url = `${SUPABASE_URL}/rest/v1/tenants?id=eq.${encodeURIComponent(id)}`;

  // Attempt PATCH — if Supabase returns 400 "column not found", strip that column and retry
  async function attemptPatch(fields: Record<string, unknown>): Promise<NextResponse> {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "apikey": authKey,
        "Authorization": `Bearer ${authKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(fields),
    });

    const responseText = await res.text();

    if (res.status === 204 || res.status === 200) {
      // Build human-readable metadata from the frontend diff (_changes) if provided
      const frontendChanges = body._changes as Record<string, { from: unknown; to: unknown }> | undefined;
      let metadata: Record<string, unknown>;

      if (frontendChanges && Object.keys(frontendChanges).length > 0) {
        // Show "field: old → new" for each changed field (max 3 shown as chips)
        metadata = Object.fromEntries(
          Object.entries(frontendChanges).map(([field, { from, to }]) => [
            field,
            `${from ?? "—"} → ${to ?? "—"}`,
          ])
        );
      } else {
        // Fallback: list which patch keys were touched
        const keys = Object.keys(patch).map(k => k.replace(/_/g, " "));
        metadata = { changed: keys.length <= 2 ? keys.join(", ") : `${keys.slice(0, 2).join(", ")} +${keys.length - 2} more` };
      }

      writeActivityLog({
        actor_email:   (body.actorEmail as string) || "unknown",
        actor_name:    (body.actorName as string) || (body.actorEmail as string)?.split("@")[0] || "Staff",
        action:        "updated",
        resource_type: "tenant",
        resource_name: (body.name       as string) || (id as string),
        resource_id:   id as string,
        metadata,
      });
      return NextResponse.json({ success: true });
    }


    // If Supabase complains about a missing column, strip it and retry once
    if (res.status === 400 && responseText.includes("column")) {
      const match = responseText.match(/Could not find the '(\w+)' column/);
      if (match) {
        const badCol = match[1];
        console.warn(`[tenants PATCH] Column '${badCol}' missing — skipping and retrying. Run: ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ${badCol} ...`);
        const reduced = { ...fields };
        delete reduced[badCol];
        if (Object.keys(reduced).length === 0) {
          return NextResponse.json({ error: `Column '${badCol}' missing in Supabase. Run migration SQL.` }, { status: 500 });
        }
        return attemptPatch(reduced);
      }
    }

    let sbError = responseText;
    try { sbError = JSON.parse(responseText)?.message || responseText; } catch { /* ignore */ }
    console.error("[tenants PATCH] error:", res.status, sbError);
    return NextResponse.json({ error: `Save failed (${res.status}): ${sbError}` }, { status: 500 });
  }

  return attemptPatch(patch);
}
// DELETE /api/tenants?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: HEADERS,
  });

  if (!res.ok) {
    console.error("tenants DELETE error:", await res.text());
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  // Audit log — fire and forget
  writeActivityLog({
    actor_email:   req.nextUrl.searchParams.get("actorEmail") || "unknown",
    actor_name:    req.nextUrl.searchParams.get("actorName") || req.nextUrl.searchParams.get("actorEmail")?.split("@")[0] || "Staff",
    action:        "deleted",
    resource_type: "tenant",
    resource_name: req.nextUrl.searchParams.get("name")       || id,
    resource_id:   id,
  });

  return NextResponse.json({ success: true });
}
