import { NextRequest, NextResponse } from "next/server";
import { requireOrg, type RequestContext } from "@/lib/server-auth";
import { getPlan } from "@/lib/plans";
import { writeActivityLog } from "@/lib/activity-log";
import { isSampleProperty, SAMPLE_PROP_BADGE, SAMPLE_PROP_PREFIX } from "@/lib/sample-data";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";

function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || "staff",
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

export interface IntakeRowError {
  row: number;
  name: string;
  message: string;
}

function isValidOptionalDate(val: unknown): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (typeof val !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return false;
  const d = new Date(`${val.trim()}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

/**
 * POST /api/intake/commit
 *
 * Server-side, all-or-nothing bulk import of buildings + property_details + tenants.
 * Validates all rows and plan property limits BEFORE writing any records, and rolls back
 * newly created building rows if tenant insertion fails.
 */
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;
  const actor = actorOf(g.ctx);

  const parsed = await safeJsonBody<{
    tenants?: Record<string, unknown>[];
    autoCreateBuildings?: boolean;
    isSample?: boolean;
    source?: string;
  }>(req);
  if (!parsed.ok) return parsed.res;

  const rawTenants = Array.isArray(parsed.body?.tenants) ? parsed.body.tenants : [];
  const autoCreateBuildings = parsed.body?.autoCreateBuildings !== false;
  const isSample = Boolean(parsed.body?.isSample);
  const sourceLabel = String(parsed.body?.source || "Bulk Intake").slice(0, 80);

  if (rawTenants.length === 0) {
    return NextResponse.json({ ok: false, error: "No tenant rows provided." }, { status: 400 });
  }
  if (rawTenants.length > 500) {
    return NextResponse.json(
      { ok: false, error: "Bulk import is limited to 500 tenant rows per batch." },
      { status: 400 }
    );
  }

  // 1. Upfront row-level validation BEFORE touching Supabase
  const rowErrors: IntakeRowError[] = [];
  rawTenants.forEach((item, idx) => {
    const rowNum = idx + 1;
    const name = String(item?.name ?? "").trim();
    const rawRent = item?.monthlyRent ?? item?.monthly_rent ?? 0;
    const monthlyRent = Number(rawRent);
    const leaseStart = item?.leaseStart ?? item?.lease_start ?? null;
    const leaseEnd = item?.leaseEnd ?? item?.lease_end ?? null;

    if (!name) {
      rowErrors.push({ row: rowNum, name: `Row ${rowNum}`, message: "Tenant name is required." });
      return;
    }
    if (!Number.isFinite(monthlyRent) || monthlyRent < 0 || monthlyRent > 10_000_000) {
      rowErrors.push({ row: rowNum, name, message: "Monthly rent must be a valid non-negative amount." });
      return;
    }
    if (!isValidOptionalDate(leaseStart)) {
      rowErrors.push({ row: rowNum, name, message: "Lease start date must be YYYY-MM-DD." });
      return;
    }
    if (!isValidOptionalDate(leaseEnd)) {
      rowErrors.push({ row: rowNum, name, message: "Lease end date must be YYYY-MM-DD." });
    }
  });

  if (rowErrors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `${rowErrors.length} row${rowErrors.length === 1 ? "" : "s"} failed validation. Nothing was imported.`,
        rowErrors,
      },
      { status: 422 }
    );
  }

  const createdPropertyIds: string[] = [];
  const createdDetailSlugs: string[] = [];

  async function rollbackCreatedBuildings() {
    try {
      if (createdDetailSlugs.length > 0) {
        const encodedSlugs = createdDetailSlugs
          .map((s) => `"${s.replace(/"/g, "")}"`)
          .join(",");
        await fetch(
          `${SUPABASE_URL}/rest/v1/property_details?org_id=eq.${orgId}&property_id=in.(${encodeURIComponent(encodedSlugs)})`,
          { method: "DELETE", headers: HEADERS }
        );
      }
      if (createdPropertyIds.length > 0) {
        const encodedIds = createdPropertyIds
          .map((id) => `"${id.replace(/"/g, "")}"`)
          .join(",");
        await fetch(
          `${SUPABASE_URL}/rest/v1/properties?org_id=eq.${orgId}&id=in.(${encodeURIComponent(encodedIds)})`,
          { method: "DELETE", headers: HEADERS }
        );
      }
    } catch (cleanupErr) {
      console.error("[intake/commit] rollback warning:", cleanupErr);
    }
  }

  try {
    const nowIso = new Date().toISOString();
    const tenantsToInsert = rawTenants.map((item, idx) => {
      const baseNotes = String(item.notes || "").trim();
      const finalNotes =
        isSample && !baseNotes.includes("[SAMPLE]")
          ? `[SAMPLE] ${baseNotes}`.trim()
          : baseNotes;

      return {
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
        lease_start: ((item.leaseStart || item.lease_start || null) as string | null) || null,
        lease_end: ((item.leaseEnd || item.lease_end || null) as string | null) || null,
        renewal_date: ((item.renewalDate || item.renewal_date || null) as string | null) || null,
        lease_alert_days: (item.leaseAlertDays ?? item.lease_alert_days ?? 60) as number | null,
        escalation_pct: Number(item.escalationPct ?? item.escalation_pct) || 0,
        escalation_date: ((item.escalationDate || item.escalation_date || null) as string | null) || null,
        status: String(item.status || "active"),
        notes: finalNotes,
        source_lead_id: String(item.sourceLeadId || item.source_lead_id || ""),
        lease_documents:
          typeof item.leaseDocuments === "string"
            ? item.leaseDocuments
            : JSON.stringify(item.leaseDocuments || []),
        sec_dep_received: Boolean(item.secDepReceived ?? item.sec_dep_received ?? false),
        sec_dep_date: ((item.secDepDate || item.sec_dep_date || null) as string | null) || null,
        sec_dep_status: String(item.secDepStatus || item.sec_dep_status || "no_change"),
        sec_dep_notes: String(item.secDepNotes || item.sec_dep_notes || ""),
        created_at: nowIso,
      };
    });

    const netNewBuildingNames: string[] = [];

    if (autoCreateBuildings) {
      const uniqueBuildingNames = Array.from(
        new Set(tenantsToInsert.map((t) => t.building.trim()).filter(Boolean))
      );

      if (uniqueBuildingNames.length > 0) {
        const existingRes = await fetch(
          `${SUPABASE_URL}/rest/v1/properties?select=id,name,badge&org_id=eq.${orgId}&limit=1000`,
          { headers: HEADERS, cache: "no-store" }
        );
        if (!existingRes.ok) {
          const errText = await existingRes.text();
          return apiErrorResponse(
            new Error(`intake existing properties (${existingRes.status}): ${errText}`),
            "Could not verify existing properties before import.",
            { route: "/api/intake/commit", orgId }
          );
        }
        const existingProps = (await existingRes.json()) as Array<{
          id?: string;
          name?: string;
          badge?: string | null;
        }>;
        const existingNameSet = new Set(
          (Array.isArray(existingProps) ? existingProps : []).map((p) =>
            String(p.name || "").trim().toLowerCase()
          )
        );

        for (const bName of uniqueBuildingNames) {
          if (!existingNameSet.has(bName.toLowerCase())) {
            netNewBuildingNames.push(bName);
          }
        }

        // Enforce plan property limit BEFORE creating any buildings
        const limit = getPlan(g.ctx.org.tier).limits.properties;
        if (!isSample && limit !== null && !g.ctx.isSuperAdmin && netNewBuildingNames.length > 0) {
          const realExistingCount = (Array.isArray(existingProps) ? existingProps : []).filter(
            (p) => !isSampleProperty(p)
          ).length;
          if (realExistingCount + netNewBuildingNames.length > limit) {
            return NextResponse.json(
              {
                ok: false,
                code: "LIMIT_REACHED",
                error: `Your current plan supports up to ${limit} properties (${realExistingCount} existing + ${netNewBuildingNames.length} new in this import). Upgrade in Settings → Billing or assign rows to an existing building.`,
              },
              { status: 403 }
            );
          }
        }

        if (netNewBuildingNames.length > 0) {
          const todayLabel = new Date().toLocaleDateString("en-US");
          const newPropertyRows = netNewBuildingNames.map((bName) => {
            const row: Record<string, unknown> = {
              org_id: orgId,
              name: bName,
              type: "Residential / Mixed-Use",
              address: null,
              city: "",
              sqft: null,
              lease_status: "active",
              badge: isSample ? SAMPLE_PROP_BADGE : null,
              badge_color: isSample ? "#F59E0B" : "#4ADE80",
              description: `Auto-enrolled via PropOpsIQ ${sourceLabel} on ${todayLabel}`,
              features: [],
              images: [],
              hero_image: null,
              in_banner: false,
              published: false,
            };
            if (isSample) {
              row.id = `${SAMPLE_PROP_PREFIX}${crypto.randomUUID()}`;
            }
            return row;
          });

          const propInsertRes = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
            method: "POST",
            headers: { ...HEADERS, Prefer: "return=representation" },
            body: JSON.stringify(newPropertyRows),
          });

          if (!propInsertRes.ok) {
            const errText = await propInsertRes.text();
            return apiErrorResponse(
              new Error(`intake properties POST (${propInsertRes.status}): ${errText}`),
              "Failed to enroll properties for import. Nothing was committed.",
              { route: "/api/intake/commit", orgId }
            );
          }

          const insertedProps = (await propInsertRes.json()) as Array<{ id?: string }>;
          for (const p of Array.isArray(insertedProps) ? insertedProps : []) {
            if (p?.id) createdPropertyIds.push(String(p.id));
          }

          // Batch upsert property_details for net-new buildings
          const detailRows = netNewBuildingNames.map((bName) => {
            const propSlug =
              bName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "") || bName;
            createdDetailSlugs.push(propSlug);
            const unitsCount = tenantsToInsert.filter(
              (t) => t.building.trim().toLowerCase() === bName.toLowerCase()
            ).length;
            return {
              org_id: orgId,
              property_id: propSlug,
              display_name: bName,
              total_units: unitsCount,
              taxes_annual: 0,
              insurance_annual: 0,
              electric_monthly: 0,
              water_monthly: 0,
              other_monthly: 0,
              trend: "stable",
              notes: `Auto-enrolled via ${sourceLabel} with ${unitsCount} unit(s).`,
              updated_at: nowIso,
            };
          });

          const detailsRes = await fetch(
            `${SUPABASE_URL}/rest/v1/property_details?on_conflict=org_id,property_id`,
            {
              method: "POST",
              headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(detailRows),
            }
          );

          if (!detailsRes.ok) {
            const errText = await detailsRes.text();
            await rollbackCreatedBuildings();
            return apiErrorResponse(
              new Error(`intake property_details POST (${detailsRes.status}): ${errText}`),
              "Failed to register property details. Import was rolled back.",
              { route: "/api/intake/commit", orgId }
            );
          }
        }
      }
    }

    // 2. Single atomic batch insert for all tenants
    const tenantRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(tenantsToInsert),
    });

    if (!tenantRes.ok) {
      const errText = await tenantRes.text();
      await rollbackCreatedBuildings();
      return apiErrorResponse(
        new Error(`intake tenants POST (${tenantRes.status}): ${errText}`),
        "Failed to save tenant records. Any newly created buildings were rolled back.",
        { route: "/api/intake/commit", orgId }
      );
    }

    const insertedTenants = (await tenantRes.json()) as unknown[];

    await writeActivityLog({
      org_id: orgId,
      action: "created",
      resource_type: "tenant",
      resource_id: `batch_${Date.now()}`,
      resource_name: `${tenantsToInsert.length} tenants imported (${netNewBuildingNames.length} new buildings)`,
      ...actor,
      metadata: {
        tenants_count: tenantsToInsert.length,
        buildings_created: netNewBuildingNames,
        source: sourceLabel,
        is_sample: isSample,
      },
    });

    return NextResponse.json({
      ok: true,
      buildingsCreated: netNewBuildingNames,
      tenantsCreated: Array.isArray(insertedTenants) ? insertedTenants.length : tenantsToInsert.length,
      tenants: insertedTenants,
    });
  } catch (err) {
    await rollbackCreatedBuildings();
    return apiErrorResponse(
      err,
      "Bulk import failed unexpectedly. Changes were rolled back.",
      { route: "/api/intake/commit", orgId }
    );
  }
}
