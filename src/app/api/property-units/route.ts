import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrg } from "@/lib/server-auth";
import { apiErrorResponse, safeJsonBody } from "@/lib/pagination";
import { writeActivityLog } from "@/lib/activity-log";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  "Content-Type": "application/json",
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

export interface PropertyUnitRecord {
  id: string;
  propertyId: string;
  building: string;
  unitNumber: string;
  beds: number;
  baths: number;
  sqft: number;
  marketRent: number;
  status: "occupied" | "vacant" | "turnover" | "notice";
  notes: string;
  updatedAt: string;
}

const VALID_STATUSES = new Set(["occupied", "vacant", "turnover", "notice"]);

function normalizeStatus(raw: unknown): PropertyUnitRecord["status"] {
  const val = String(raw || "vacant").toLowerCase().trim();
  return VALID_STATUSES.has(val) ? (val as PropertyUnitRecord["status"]) : "vacant";
}

function rowToUnit(r: Record<string, unknown>): PropertyUnitRecord {
  return {
    id: String(r.id || ""),
    propertyId: String(r.property_id ?? r.propertyId ?? ""),
    building: String(r.building || ""),
    unitNumber: String(r.unit_number ?? r.unitNumber ?? ""),
    beds: Number(r.beds) || 0,
    baths: Number(r.baths) || 0,
    sqft: Number(r.sqft) || 0,
    marketRent: Number(r.market_rent ?? r.marketRent) || 0,
    status: normalizeStatus(r.status),
    notes: String(r.notes || ""),
    updatedAt: String(r.updated_at ?? r.updatedAt ?? new Date().toISOString()),
  };
}

function isMissingTable(status: number, bodyText: string): boolean {
  return (
    status === 404 ||
    bodyText.includes("PGRST205") ||
    bodyText.includes("42P01") ||
    bodyText.includes("Could not find the table")
  );
}

async function loadFallbackUnits(orgId: string): Promise<PropertyUnitRecord[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=eq.property_units_v1&key=eq.units&select=value`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) return [];
  const rows = await res.json();
  const raw = rows?.[0]?.value;
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.map((item) => rowToUnit(item as Record<string, unknown>)) : [];
  } catch {
    return [];
  }
}

async function saveFallbackUnits(orgId: string, units: PropertyUnitRecord[]): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_content?on_conflict=org_id,section,key`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      org_id: orgId,
      section: "property_units_v1",
      key: "units",
      value: JSON.stringify(units),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fallback unit save failed (${res.status}): ${errText}`);
  }
}

async function readAllUnits(orgId: string): Promise<{ mode: "table" | "fallback"; units: PropertyUnitRecord[] }> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/property_units?org_id=eq.${orgId}&order=building.asc,unit_number.asc&limit=500`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) {
    const errText = await res.text();
    if (isMissingTable(res.status, errText)) {
      const units = await loadFallbackUnits(orgId);
      return { mode: "fallback", units };
    }
    throw new Error(`property_units GET (${res.status}): ${errText}`);
  }
  const rows = await res.json();
  return {
    mode: "table",
    units: Array.isArray(rows) ? rows.map((r) => rowToUnit(r as Record<string, unknown>)) : [],
  };
}

export async function GET(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId } = g.ctx;

  try {
    const { mode, units } = await readAllUnits(orgId);
    return NextResponse.json({ units, storageMode: mode });
  } catch (err) {
    return apiErrorResponse(err, "Failed to load unit inventory.", { route: "/api/property-units", orgId });
  }
}

export async function POST(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;
  const email = user?.email || "admin";
  const name = user?.name || "Owner";

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;

  try {
    const { mode, units: existing } = await readAllUnits(orgId);

    // ── Action: Sync unit roster from active tenants ──────────────────────
    if (body.action === "sync_from_tenants") {
      const tRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${orgId}&select=id,name,building,unit,monthly_rent,status`,
        { headers, cache: "no-store" }
      );
      const tenants: Array<Record<string, unknown>> = tRes.ok ? await tRes.json() : [];
      const existingKeys = new Set(
        existing.map((u) => `${u.building.trim().toLowerCase()}::${u.unitNumber.trim().toLowerCase()}`)
      );

      const newUnits: PropertyUnitRecord[] = [];
      for (const t of Array.isArray(tenants) ? tenants : []) {
        const building = String(t.building || "").trim();
        const unitNumber = String(t.unit || "").trim() || "Main";
        if (!building) continue;
        const key = `${building.toLowerCase()}::${unitNumber.toLowerCase()}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);

        newUnits.push({
          id: crypto.randomUUID(),
          propertyId: "",
          building,
          unitNumber,
          beds: 0,
          baths: 0,
          sqft: 0,
          marketRent: Math.max(0, Number(t.monthly_rent) || 0),
          status: String(t.status || "active") === "active" ? "occupied" : "vacant",
          notes: "",
          updatedAt: new Date().toISOString(),
        });
      }

      if (newUnits.length === 0) {
        return NextResponse.json({ units: existing, addedCount: 0 });
      }

      if (mode === "table") {
        const insRes = await fetch(`${SUPABASE_URL}/rest/v1/property_units`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify(
            newUnits.map((u) => ({
              id: u.id,
              org_id: orgId,
              property_id: u.propertyId,
              building: u.building,
              unit_number: u.unitNumber,
              beds: u.beds,
              baths: u.baths,
              sqft: u.sqft,
              market_rent: u.marketRent,
              status: u.status,
              notes: u.notes,
            }))
          ),
        });
        if (!insRes.ok) {
          const errText = await insRes.text();
          throw new Error(`property_units sync (${insRes.status}): ${errText}`);
        }
      } else {
        const merged = [...existing, ...newUnits].sort((a, b) =>
          `${a.building} ${a.unitNumber}`.localeCompare(`${b.building} ${b.unitNumber}`, undefined, { numeric: true })
        );
        await saveFallbackUnits(orgId, merged);
      }

      await writeActivityLog({
        org_id: orgId,
        actor_email: email || "admin",
        actor_name: name || "Owner",
        action: "created",
        resource_type: "property",
        resource_name: `Synced ${newUnits.length} unit(s) from tenants`,
        resource_id: orgId,
        metadata: { addedCount: newUnits.length },
      });

      const refreshed = await readAllUnits(orgId);
      return NextResponse.json({ units: refreshed.units, addedCount: newUnits.length });
    }

    // ── Create single unit ────────────────────────────────────────────────
    const building = String(body.building || "").trim();
    const unitNumber = String(body.unitNumber ?? body.unit_number ?? "").trim();
    if (!building || !unitNumber) {
      return NextResponse.json({ error: "Building and Unit / Suite # are required." }, { status: 400 });
    }

    const dup = existing.find(
      (u) =>
        u.building.trim().toLowerCase() === building.toLowerCase() &&
        u.unitNumber.trim().toLowerCase() === unitNumber.toLowerCase()
    );
    if (dup) {
      return NextResponse.json(
        { error: `Unit "${unitNumber}" already exists under "${building}".` },
        { status: 409 }
      );
    }

    const created: PropertyUnitRecord = {
      id: crypto.randomUUID(),
      propertyId: String(body.propertyId ?? body.property_id ?? "").trim(),
      building,
      unitNumber,
      beds: Math.max(0, Number(body.beds) || 0),
      baths: Math.max(0, Number(body.baths) || 0),
      sqft: Math.max(0, Math.round(Number(body.sqft) || 0)),
      marketRent: Math.max(0, Math.round((Number(body.marketRent ?? body.market_rent) || 0) * 100) / 100),
      status: normalizeStatus(body.status),
      notes: String(body.notes || "").trim().slice(0, 500),
      updatedAt: new Date().toISOString(),
    };

    if (mode === "table") {
      const insRes = await fetch(`${SUPABASE_URL}/rest/v1/property_units`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          id: created.id,
          org_id: orgId,
          property_id: created.propertyId,
          building: created.building,
          unit_number: created.unitNumber,
          beds: created.beds,
          baths: created.baths,
          sqft: created.sqft,
          market_rent: created.marketRent,
          status: created.status,
          notes: created.notes,
        }),
      });
      if (!insRes.ok) {
        const errText = await insRes.text();
        throw new Error(`property_units POST (${insRes.status}): ${errText}`);
      }
      const rows = await insRes.json();
      const saved = Array.isArray(rows) && rows[0] ? rowToUnit(rows[0] as Record<string, unknown>) : created;
      await writeActivityLog({
        org_id: orgId,
        actor_email: email || "admin",
        actor_name: name || "Owner",
        action: "created",
        resource_type: "property",
        resource_name: `${saved.building} · Unit ${saved.unitNumber}`,
        resource_id: saved.id,
      });
      return NextResponse.json({ unit: saved }, { status: 201 });
    }

    const nextList = [...existing, created].sort((a, b) =>
      `${a.building} ${a.unitNumber}`.localeCompare(`${b.building} ${b.unitNumber}`, undefined, { numeric: true })
    );
    await saveFallbackUnits(orgId, nextList);
    await writeActivityLog({
      org_id: orgId,
      actor_email: email || "admin",
      actor_name: name || "Owner",
      action: "created",
      resource_type: "property",
      resource_name: `${created.building} · Unit ${created.unitNumber}`,
      resource_id: created.id,
    });
    return NextResponse.json({ unit: created }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "Failed to save unit.", { route: "/api/property-units", orgId });
  }
}

export async function PATCH(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;
  const email = user?.email || "admin";
  const name = user?.name || "Owner";

  const parsed = await safeJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const id = String(req.nextUrl.searchParams.get("id") || body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Unit id is required." }, { status: 400 });
  }

  try {
    const { mode, units } = await readAllUnits(orgId);
    const current = units.find((u) => u.id === id);
    if (!current) {
      return NextResponse.json({ error: "Unit not found." }, { status: 404 });
    }

    const updated: PropertyUnitRecord = {
      ...current,
      building: body.building !== undefined ? String(body.building).trim() || current.building : current.building,
      unitNumber: body.unitNumber !== undefined ? String(body.unitNumber).trim() || current.unitNumber : current.unitNumber,
      beds: body.beds !== undefined ? Math.max(0, Number(body.beds) || 0) : current.beds,
      baths: body.baths !== undefined ? Math.max(0, Number(body.baths) || 0) : current.baths,
      sqft: body.sqft !== undefined ? Math.max(0, Math.round(Number(body.sqft) || 0)) : current.sqft,
      marketRent:
        body.marketRent !== undefined
          ? Math.max(0, Math.round((Number(body.marketRent) || 0) * 100) / 100)
          : current.marketRent,
      status: body.status !== undefined ? normalizeStatus(body.status) : current.status,
      notes: body.notes !== undefined ? String(body.notes).trim().slice(0, 500) : current.notes,
      updatedAt: new Date().toISOString(),
    };

    if (mode === "table") {
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/property_units?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
        {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=representation" },
          body: JSON.stringify({
            building: updated.building,
            unit_number: updated.unitNumber,
            beds: updated.beds,
            baths: updated.baths,
            sqft: updated.sqft,
            market_rent: updated.marketRent,
            status: updated.status,
            notes: updated.notes,
            updated_at: updated.updatedAt,
          }),
        }
      );
      if (!patchRes.ok) {
        const errText = await patchRes.text();
        throw new Error(`property_units PATCH (${patchRes.status}): ${errText}`);
      }
    } else {
      const nextList = units.map((u) => (u.id === id ? updated : u));
      await saveFallbackUnits(orgId, nextList);
    }

    await writeActivityLog({
      org_id: orgId,
      actor_email: email || "admin",
      actor_name: name || "Owner",
      action: "updated",
      resource_type: "property",
      resource_name: `${updated.building} · Unit ${updated.unitNumber}`,
      resource_id: updated.id,
      metadata: { status: updated.status, marketRent: updated.marketRent },
    });

    return NextResponse.json({ unit: updated });
  } catch (err) {
    return apiErrorResponse(err, "Failed to update unit.", { route: "/api/property-units", orgId });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await requireOrg(req);
  if (!g.ok) return g.res;
  const { orgId, user } = g.ctx;
  const email = user?.email || "admin";
  const name = user?.name || "Owner";

  const id = String(req.nextUrl.searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Unit id is required." }, { status: 400 });
  }

  try {
    const { mode, units } = await readAllUnits(orgId);
    const target = units.find((u) => u.id === id);

    if (mode === "table") {
      const delRes = await fetch(
        `${SUPABASE_URL}/rest/v1/property_units?id=eq.${encodeURIComponent(id)}&org_id=eq.${orgId}`,
        { method: "DELETE", headers }
      );
      if (!delRes.ok) {
        const errText = await delRes.text();
        throw new Error(`property_units DELETE (${delRes.status}): ${errText}`);
      }
    } else {
      await saveFallbackUnits(
        orgId,
        units.filter((u) => u.id !== id)
      );
    }

    if (target) {
      await writeActivityLog({
        org_id: orgId,
        actor_email: email || "admin",
        actor_name: name || "Owner",
        action: "deleted",
        resource_type: "property",
        resource_name: `${target.building} · Unit ${target.unitNumber}`,
        resource_id: id,
      });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiErrorResponse(err, "Failed to delete unit.", { route: "/api/property-units", orgId });
  }
}
