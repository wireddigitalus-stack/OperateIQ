import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireOrg, type RequestContext } from "@/lib/server-auth";
import { getPlan } from "@/lib/plans";
import { writeActivityLog } from "@/lib/activity-log";
import { isSampleProperty, SAMPLE_PROP_BADGE, SAMPLE_PROP_PREFIX } from "@/lib/sample-data";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";
import { redactSensitivePii } from "@/lib/lease-extraction";

function actorOf(ctx: RequestContext) {
  return {
    actor_email: ctx.user?.email || "staff",
    actor_name: ctx.user?.name || ctx.staff?.name || "Staff",
  };
}

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
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

interface LeaseDocEntry {
  name: string;
  url: string;
  uploadedAt: string;
}

function isValidOptionalDate(val: unknown): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (typeof val !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return false;
  const d = new Date(`${val.trim()}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function parseDocsArray(raw: unknown): LeaseDocEntry[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is LeaseDocEntry =>
        Boolean(d && typeof d === "object" && typeof (d as LeaseDocEntry).url === "string")
    );
  } catch {
    return [];
  }
}

function isSafeOrgDocUrl(url: string, orgId: string): boolean {
  if (!url.startsWith("/api/tenant-upload?path=")) return false;
  try {
    const q = new URL(url, "https://propopsiq.com").searchParams.get("path") || "";
    const normalized = q.trim().replace(/^\/+/, "");
    return normalized.startsWith(`${orgId}/`) && !normalized.includes("..");
  } catch {
    return false;
  }
}

function mergeLeaseDocuments(
  baseRaw: unknown,
  sourceDocUrl: string,
  sourceDocName: string,
  orgId: string,
  nowIso: string
): { json: string; attachedNew: boolean } {
  const docs = parseDocsArray(baseRaw);
  const cleanUrl = sourceDocUrl.trim();
  if (cleanUrl && isSafeOrgDocUrl(cleanUrl, orgId)) {
    const exists = docs.some((d) => d.url === cleanUrl);
    if (!exists) {
      docs.push({
        name: (sourceDocName || "Lease Agreement").trim().slice(0, 140),
        url: cleanUrl,
        uploadedAt: nowIso,
      });
      return { json: JSON.stringify(docs), attachedNew: true };
    }
  }
  return { json: JSON.stringify(docs), attachedNew: false };
}

function isMissingTable(status: number, bodyText: string): boolean {
  return (
    status === 404 ||
    bodyText.includes("PGRST205") ||
    bodyText.includes("42P01") ||
    bodyText.includes("Could not find the table")
  );
}

function addDaysIso(isoDate: string, days: number): string {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
    ? new Date(`${isoDate}T00:00:00Z`)
    : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * POST /api/intake/commit
 *
 * Server-side bulk import & upsert of:
 * 1. properties + property_details (enriched with asset type, address, city, sqft)
 * 2. tenants (insert net-new + optional idempotent update of existing duplicates + attached lease_documents)
 * 3. property_units (Unit Roll auto-sync)
 * 4. filter_changes (HVAC preventative schedule auto-seeding when specified in lease)
 */
export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;
  const actor = actorOf(g.ctx);

  const parsed = await safeJsonBody<{
    tenants?: Record<string, unknown>[];
    autoCreateBuildings?: boolean;
    upsertDuplicates?: boolean;
    syncUnits?: boolean;
    isSample?: boolean;
    source?: string;
  }>(req);
  if (!parsed.ok) return parsed.res;

  const rawTenantsAll = Array.isArray(parsed.body?.tenants) ? parsed.body.tenants : [];
  const autoCreateBuildings = parsed.body?.autoCreateBuildings !== false;
  const defaultUpsertDuplicates = Boolean(parsed.body?.upsertDuplicates);
  const syncUnitsEnabled = parsed.body?.syncUnits !== false;
  const requestedSample = Boolean(parsed.body?.isSample);
  const sourceLabel = String(parsed.body?.source || "Bulk Intake").slice(0, 80);
  const isSample =
    requestedSample && rawTenantsAll.length <= 25 && sourceLabel.toLowerCase().includes("sample");

  if (rawTenantsAll.length === 0) {
    return NextResponse.json({ ok: false, error: "No tenant rows provided." }, { status: 400 });
  }
  if (rawTenantsAll.length > 500) {
    return NextResponse.json(
      { ok: false, error: "Bulk import is limited to 500 tenant rows per batch." },
      { status: 400 }
    );
  }

  // Separate explicitly skipped duplicate rows before validation
  let skippedCount = 0;
  const rawTenants: Record<string, unknown>[] = [];
  for (const item of rawTenantsAll) {
    if (String(item?.duplicateAction || "").toLowerCase() === "skip") {
      skippedCount++;
      continue;
    }
    rawTenants.push(item);
  }

  if (rawTenants.length === 0) {
    return NextResponse.json({
      ok: true,
      buildingsCreated: [],
      tenantsCreated: 0,
      tenantsUpdated: 0,
      tenantsSkipped: skippedCount,
      unitsSynced: 0,
      hvacSchedulesCreated: 0,
      docsAttached: 0,
      tenants: [],
    });
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
    const escalationDate = item?.escalationDate ?? item?.escalation_date ?? null;

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
      return;
    }
    if (!isValidOptionalDate(escalationDate)) {
      rowErrors.push({ row: rowNum, name, message: "Escalation date must be YYYY-MM-DD." });
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
    const todayIso = nowIso.slice(0, 10);

    // Fetch existing org tenants for duplicate/upsert matching
    const existingTenantsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?select=id,name,email,building,unit,lease_documents&org_id=eq.${orgId}&limit=1500`,
      { headers: HEADERS, cache: "no-store" }
    );
    const existingTenantRows = (
      existingTenantsRes.ok ? await existingTenantsRes.json() : []
    ) as Array<{
      id: string;
      name?: string;
      email?: string;
      building?: string;
      unit?: string;
      lease_documents?: string;
    }>;

    const existingById = new Map<string, (typeof existingTenantRows)[number]>();
    const existingByBldgUnit = new Map<string, (typeof existingTenantRows)[number]>();
    const existingByEmail = new Map<string, (typeof existingTenantRows)[number]>();

    for (const et of Array.isArray(existingTenantRows) ? existingTenantRows : []) {
      if (!et?.id) continue;
      existingById.set(String(et.id), et);
      const bKey = String(et.building || "").trim().toLowerCase();
      const uKey = String(et.unit || "").trim().toLowerCase();
      if (bKey && uKey) {
        existingByBldgUnit.set(`${bKey}::${uKey}`, et);
      }
      const eKey = String(et.email || "").trim().toLowerCase();
      if (eKey) {
        existingByEmail.set(eKey, et);
      }
    }

    let docsAttachedCount = 0;

    interface PreparedTenantEntry {
      mode: "insert" | "update";
      targetId: string;
      dbRow: Record<string, unknown>;
      meta: {
        propertyType: string;
        propertyAddress: string;
        propertyCity: string;
        unitSqft: number;
        beds: number;
        baths: number;
        hvacFilterIntervalDays: number;
      };
    }

    const preparedEntries: PreparedTenantEntry[] = rawTenants.map((item, idx) => {
      const rawNotes = redactSensitivePii(String(item.notes || "").trim());
      const finalNotes =
        isSample && !rawNotes.includes("[SAMPLE]")
          ? `[SAMPLE] ${rawNotes}`.trim()
          : rawNotes;

      const building = String(item.building || "").trim();
      const unit = String(item.unit || "").trim();
      const email = String(item.email || "").trim();

      const dupAction = String(
        item.duplicateAction || (defaultUpsertDuplicates ? "update" : "create")
      ).toLowerCase();
      const explicitTargetId = String(item.existingTenantId || "").trim();

      let matchedExisting: (typeof existingTenantRows)[number] | undefined;
      if (!isSample && dupAction === "update") {
        if (explicitTargetId && existingById.has(explicitTargetId)) {
          matchedExisting = existingById.get(explicitTargetId);
        } else if (building && unit) {
          matchedExisting = existingByBldgUnit.get(
            `${building.toLowerCase()}::${unit.toLowerCase()}`
          );
        }
        if (!matchedExisting && email) {
          matchedExisting = existingByEmail.get(email.toLowerCase());
        }
      }

      const sourceDocUrl = String(item.sourceDocUrl || "").trim();
      const sourceDocName = String(item.sourceDocName || "").trim();
      const baseDocs = matchedExisting
        ? matchedExisting.lease_documents
        : item.leaseDocuments ?? "[]";
      const mergedDocs = mergeLeaseDocuments(
        baseDocs,
        sourceDocUrl,
        sourceDocName,
        orgId,
        nowIso
      );
      if (mergedDocs.attachedNew) {
        docsAttachedCount++;
      }

      const targetId = matchedExisting
        ? matchedExisting.id
        : (item.id as string) || `tenant_${Date.now()}_${idx}`;

      const rawStatus = String(item.status || "active");
      const safeStatus = ["active", "pending", "expired"].includes(rawStatus)
        ? rawStatus
        : "active";

      const dbRow: Record<string, unknown> = {
        org_id: orgId,
        id: targetId,
        name: redactSensitivePii(String(item.name || "").trim()),
        contact_name: redactSensitivePii(String(item.contactName || item.contact_name || "").trim()),
        email,
        phone: String(item.phone || "").trim(),
        building,
        unit,
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
        escalation_date:
          ((item.escalationDate || item.escalation_date || null) as string | null) || null,
        status: safeStatus,
        notes: finalNotes,
        source_lead_id: String(item.sourceLeadId || item.source_lead_id || ""),
        lease_documents: mergedDocs.json,
        sec_dep_received: Boolean(item.secDepReceived ?? item.sec_dep_received ?? false),
        sec_dep_date: ((item.secDepDate || item.sec_dep_date || null) as string | null) || null,
        sec_dep_status: String(item.secDepStatus || item.sec_dep_status || "no_change"),
        sec_dep_notes: redactSensitivePii(String(item.secDepNotes || item.sec_dep_notes || "")),
      };

      if (!matchedExisting) {
        dbRow.created_at = nowIso;
      }

      return {
        mode: matchedExisting ? "update" : "insert",
        targetId,
        dbRow,
        meta: {
          propertyType: String(item.propertyType || "").trim(),
          propertyAddress: String(item.propertyAddress || "").trim(),
          propertyCity: String(item.propertyCity || "").trim(),
          unitSqft: Math.max(0, Math.round(Number(item.unitSqft) || 0)),
          beds: Math.max(0, Number(item.beds) || 0),
          baths: Math.max(0, Number(item.baths) || 0),
          hvacFilterIntervalDays:
            item.createHvacSchedule === false
              ? 0
              : Math.max(0, Math.round(Number(item.hvacFilterIntervalDays) || 0)),
        },
      };
    });

    const netNewBuildingNames: string[] = [];
    const propertyIdByLowerName = new Map<string, string>();

    // Always inspect existing properties so we know property UUIDs for Unit Roll sync
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

    for (const p of Array.isArray(existingProps) ? existingProps : []) {
      const pName = String(p?.name || "").trim();
      if (pName && p?.id) {
        propertyIdByLowerName.set(pName.toLowerCase(), String(p.id));
      }
    }

    if (autoCreateBuildings) {
      const uniqueBuildingNames = Array.from(
        new Set(
          preparedEntries
            .map((e) => String(e.dbRow.building || "").trim())
            .filter(Boolean)
        )
      );

      for (const bName of uniqueBuildingNames) {
        if (!propertyIdByLowerName.has(bName.toLowerCase())) {
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
          const matchingEntries = preparedEntries.filter(
            (e) => String(e.dbRow.building || "").trim().toLowerCase() === bName.toLowerCase()
          );

          const detectedType =
            matchingEntries
              .map((e) => e.meta.propertyType)
              .find((t) => t && t !== "Mixed-Use") ||
            matchingEntries.map((e) => e.meta.propertyType).find(Boolean) ||
            "Residential / Mixed-Use";

          const detectedAddress =
            matchingEntries.map((e) => e.meta.propertyAddress).find(Boolean) ||
            (/^\d+\s+\S+/.test(bName) ? bName : null);

          const detectedCity =
            matchingEntries.map((e) => e.meta.propertyCity).find(Boolean) || "";

          const totalSqft = matchingEntries.reduce((sum, e) => sum + (e.meta.unitSqft || 0), 0);

          const row: Record<string, unknown> = {
            org_id: orgId,
            name: bName,
            type: detectedType,
            address: detectedAddress,
            city: detectedCity,
            sqft: totalSqft > 0 ? totalSqft : null,
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

        const insertedProps = (await propInsertRes.json()) as Array<{ id?: string; name?: string }>;
        for (const p of Array.isArray(insertedProps) ? insertedProps : []) {
          if (p?.id) {
            createdPropertyIds.push(String(p.id));
            if (p.name) {
              propertyIdByLowerName.set(String(p.name).trim().toLowerCase(), String(p.id));
            }
          }
        }

        // Batch upsert property_details keyed by actual property UUID
        const detailRows = netNewBuildingNames.map((bName) => {
          const propId =
            propertyIdByLowerName.get(bName.trim().toLowerCase()) ||
            bName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "") ||
            bName;
          createdDetailSlugs.push(propId);
          const unitsCount = preparedEntries.filter(
            (e) => String(e.dbRow.building || "").trim().toLowerCase() === bName.toLowerCase()
          ).length;
          return {
            org_id: orgId,
            property_id: propId,
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

    // 2. Execute batch INSERT for net-new tenants + PATCH for updated duplicate tenants
    const entriesToInsert = preparedEntries.filter((e) => e.mode === "insert");
    const entriesToUpdate = preparedEntries.filter((e) => e.mode === "update");
    const committedTenants: unknown[] = [];

    if (entriesToInsert.length > 0) {
      const tenantRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
        method: "POST",
        headers: { ...HEADERS, Prefer: "return=representation" },
        body: JSON.stringify(entriesToInsert.map((e) => e.dbRow)),
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

      const inserted = (await tenantRes.json()) as unknown[];
      if (Array.isArray(inserted)) {
        committedTenants.push(...inserted);
      }
    }

    for (const upd of entriesToUpdate) {
      const { id: _ignoreId, org_id: _ignoreOrg, ...patchFields } = upd.dbRow;
      void _ignoreId;
      void _ignoreOrg;
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tenants?id=eq.${encodeURIComponent(upd.targetId)}&org_id=eq.${orgId}`,
        {
          method: "PATCH",
          headers: { ...HEADERS, Prefer: "return=representation" },
          body: JSON.stringify(patchFields),
        }
      );
      if (patchRes.ok) {
        const patched = (await patchRes.json()) as unknown[];
        if (Array.isArray(patched) && patched[0]) {
          committedTenants.push(patched[0]);
        }
      }
    }

    // 3. Auto-sync Unit Roll (property_units) for non-sample imports (non-fatal)
    let unitsSyncedCount = 0;
    if (!isSample && syncUnitsEnabled) {
      try {
        const uRes = await fetch(
          `${SUPABASE_URL}/rest/v1/property_units?org_id=eq.${orgId}&limit=1000`,
          { headers: HEADERS, cache: "no-store" }
        );
        if (uRes.ok) {
          const existingUnits = (await uRes.json()) as Array<Record<string, unknown>>;
          const unitByKey = new Map<string, Record<string, unknown>>();
          for (const u of Array.isArray(existingUnits) ? existingUnits : []) {
            const b = String(u.building || "").trim().toLowerCase();
            const un = String(u.unit_number || "").trim().toLowerCase();
            if (b && un) unitByKey.set(`${b}::${un}`, u);
          }

          const newUnitRows: Record<string, unknown>[] = [];
          const seenBatchUnitKeys = new Set<string>();

          for (const entry of preparedEntries) {
            const building = String(entry.dbRow.building || "").trim();
            const unitNumber = String(entry.dbRow.unit || "").trim() || "Main";
            if (!building) continue;
            const key = `${building.toLowerCase()}::${unitNumber.toLowerCase()}`;
            if (seenBatchUnitKeys.has(key)) continue;
            seenBatchUnitKeys.add(key);

            const propId = propertyIdByLowerName.get(building.toLowerCase()) || "";
            const marketRent = Math.max(0, Number(entry.dbRow.monthly_rent) || 0);
            const unitStatus =
              String(entry.dbRow.status || "active") === "expired" ? "notice" : "occupied";

            const existingUnit = unitByKey.get(key);
            if (!existingUnit) {
              newUnitRows.push({
                id: crypto.randomUUID(),
                org_id: orgId,
                property_id: propId,
                building,
                unit_number: unitNumber,
                beds: entry.meta.beds,
                baths: entry.meta.baths,
                sqft: entry.meta.unitSqft,
                market_rent: marketRent,
                status: unitStatus,
                notes: "",
              });
            } else if (
              existingUnit.id &&
              ((Number(existingUnit.sqft) === 0 && entry.meta.unitSqft > 0) ||
                String(existingUnit.status || "") === "vacant")
            ) {
              await fetch(
                `${SUPABASE_URL}/rest/v1/property_units?id=eq.${encodeURIComponent(String(existingUnit.id))}&org_id=eq.${orgId}`,
                {
                  method: "PATCH",
                  headers: { ...HEADERS, Prefer: "return=minimal" },
                  body: JSON.stringify({
                    property_id: existingUnit.property_id || propId,
                    sqft:
                      Number(existingUnit.sqft) > 0
                        ? Number(existingUnit.sqft)
                        : entry.meta.unitSqft,
                    market_rent:
                      Number(existingUnit.market_rent) > 0
                        ? Number(existingUnit.market_rent)
                        : marketRent,
                    status: unitStatus,
                  }),
                }
              );
              unitsSyncedCount++;
            }
          }

          if (newUnitRows.length > 0) {
            const insUnitsRes = await fetch(`${SUPABASE_URL}/rest/v1/property_units`, {
              method: "POST",
              headers: { ...HEADERS, Prefer: "resolution=ignore-duplicates,return=minimal" },
              body: JSON.stringify(newUnitRows),
            });
            if (insUnitsRes.ok) {
              unitsSyncedCount += newUnitRows.length;
            }
          }
        } else {
          // Fallback site_content storage mode if property_units table is absent
          const errText = await uRes.text().catch(() => "");
          if (isMissingTable(uRes.status, errText)) {
            const fbRes = await fetch(
              `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=eq.property_units_v1&key=eq.units&select=value`,
              { headers: HEADERS, cache: "no-store" }
            );
            const fbRows = fbRes.ok ? await fbRes.json() : [];
            const rawVal = fbRows?.[0]?.value;
            const parsedFb: Array<Record<string, unknown>> = rawVal
              ? typeof rawVal === "string"
                ? JSON.parse(rawVal)
                : rawVal
              : [];
            const list = Array.isArray(parsedFb) ? [...parsedFb] : [];
            const seen = new Set(
              list.map(
                (u) =>
                  `${String(u.building || "").trim().toLowerCase()}::${String(u.unitNumber || u.unit_number || "").trim().toLowerCase()}`
              )
            );
            for (const entry of preparedEntries) {
              const building = String(entry.dbRow.building || "").trim();
              const unitNumber = String(entry.dbRow.unit || "").trim() || "Main";
              if (!building) continue;
              const key = `${building.toLowerCase()}::${unitNumber.toLowerCase()}`;
              if (seen.has(key)) continue;
              seen.add(key);
              list.push({
                id: crypto.randomUUID(),
                propertyId: propertyIdByLowerName.get(building.toLowerCase()) || "",
                building,
                unitNumber,
                beds: entry.meta.beds,
                baths: entry.meta.baths,
                sqft: entry.meta.unitSqft,
                marketRent: Math.max(0, Number(entry.dbRow.monthly_rent) || 0),
                status:
                  String(entry.dbRow.status || "active") === "expired" ? "notice" : "occupied",
                notes: "",
                updatedAt: nowIso,
              });
              unitsSyncedCount++;
            }
            if (unitsSyncedCount > 0) {
              await fetch(
                `${SUPABASE_URL}/rest/v1/site_content?on_conflict=org_id,section,key`,
                {
                  method: "POST",
                  headers: {
                    ...HEADERS,
                    Prefer: "resolution=merge-duplicates,return=minimal",
                  },
                  body: JSON.stringify({
                    org_id: orgId,
                    section: "property_units_v1",
                    key: "units",
                    value: JSON.stringify(list),
                    updated_at: nowIso,
                  }),
                }
              );
            }
          }
        }
      } catch (unitSyncErr) {
        console.warn("[intake/commit] Non-fatal property_units sync warning:", unitSyncErr);
      }
    }

    // 4. Auto-seed HVAC Filter Schedule (filter_changes) when lease specifies filter interval
    let hvacSchedulesCreated = 0;
    if (!isSample) {
      try {
        const hvacCandidates = preparedEntries.filter(
          (e) => e.meta.hvacFilterIntervalDays > 0 && String(e.dbRow.building || "").trim()
        );
        if (hvacCandidates.length > 0) {
          const seenProps = new Set<string>();
          for (const hc of hvacCandidates) {
            const propName = String(hc.dbRow.building || "").trim();
            const propLower = propName.toLowerCase();
            if (seenProps.has(propLower)) continue;
            seenProps.add(propLower);

            const checkRes = await fetch(
              `${SUPABASE_URL}/rest/v1/filter_changes?select=id&org_id=eq.${orgId}&property=eq.${encodeURIComponent(propName)}&limit=1`,
              { headers: HEADERS, cache: "no-store" }
            );
            const existingFilter = checkRes.ok ? await checkRes.json() : [];
            if (Array.isArray(existingFilter) && existingFilter.length > 0) continue;

            const days = hc.meta.hvacFilterIntervalDays;
            const unitLabel = String(hc.dbRow.unit || "").trim();
            const filterRow = {
              org_id: orgId,
              id: `filt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              property: propName,
              last_changed: todayIso,
              next_due: addDaysIso(todayIso, days),
              notes: `Every ${days} days per lease (${unitLabel ? `${unitLabel} — ` : ""}${String(hc.dbRow.name || "")})`,
              updated_by: actor.actor_name,
              updated_at: nowIso,
            };

            const fIns = await fetch(
              `${SUPABASE_URL}/rest/v1/filter_changes?on_conflict=org_id,property`,
              {
                method: "POST",
                headers: {
                  ...HEADERS,
                  Prefer: "resolution=merge-duplicates,return=minimal",
                },
                body: JSON.stringify(filterRow),
              }
            );
            if (fIns.ok) {
              hvacSchedulesCreated++;
            }
          }
        }
      } catch (hvacErr) {
        console.warn("[intake/commit] Non-fatal filter_changes seed warning:", hvacErr);
      }
    }

    await writeActivityLog({
      org_id: orgId,
      action: "created",
      resource_type: "tenant",
      resource_id: `batch_${Date.now()}`,
      resource_name: `${entriesToInsert.length} created, ${entriesToUpdate.length} updated (${netNewBuildingNames.length} new buildings)`,
      ...actor,
      metadata: {
        tenants_created: entriesToInsert.length,
        tenants_updated: entriesToUpdate.length,
        tenants_skipped: skippedCount,
        buildings_created: netNewBuildingNames,
        units_synced: unitsSyncedCount,
        docs_attached: docsAttachedCount,
        hvac_schedules_created: hvacSchedulesCreated,
        source: sourceLabel,
        is_sample: isSample,
      },
    });

    return NextResponse.json({
      ok: true,
      buildingsCreated: netNewBuildingNames,
      tenantsCreated: entriesToInsert.length,
      tenantsUpdated: entriesToUpdate.length,
      tenantsSkipped: skippedCount,
      unitsSynced: unitsSyncedCount,
      docsAttached: docsAttachedCount,
      hvacSchedulesCreated,
      tenants: committedTenants,
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
