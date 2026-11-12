const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

export interface DeletePropertyResult {
  deleted: boolean;
  propertyName: string;
  tenantsDeleted: number;
}

/**
 * Deletes a property strictly within `orgId` and cleans up its orphaned
 * `property_details`, `available_spaces`, `property_units` (table + fallback),
 * `filter_changes`, and optionally all `tenants` assigned to that building.
 */
export async function deletePropertyCascade(
  orgId: string,
  propertyId: string,
  options: { includeTenants?: boolean } = {}
): Promise<DeletePropertyResult> {
  const cleanId = propertyId.trim();
  if (!cleanId) {
    throw new Error("Property ID is required.");
  }

  // 1. Resolve property name & optional custom display_name inside this org before deleting
  const [lookupRes, detailRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/properties?select=id,name&id=eq.${encodeURIComponent(cleanId)}&org_id=eq.${orgId}&limit=1`,
      { headers: H, cache: "no-store" }
    ).catch(() => null),
    fetch(
      `${SUPABASE_URL}/rest/v1/property_details?select=display_name&property_id=eq.${encodeURIComponent(cleanId)}&org_id=eq.${orgId}&limit=1`,
      { headers: H, cache: "no-store" }
    ).catch(() => null),
  ]);
  const foundRows = lookupRes?.ok ? await lookupRes.json().catch(() => []) : [];
  const propRow = Array.isArray(foundRows) && foundRows[0] ? foundRows[0] : null;
  const propertyName = String(propRow?.name || "").trim();

  const detailRows = detailRes?.ok ? await detailRes.json().catch(() => []) : [];
  const displayName = String(detailRows?.[0]?.display_name || "").trim();

  // 2. Delete the property record itself
  const delPropRes = await fetch(
    `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(cleanId)}&org_id=eq.${orgId}`,
    { method: "DELETE", headers: H }
  );
  if (!delPropRes.ok) {
    const errText = await delPropRes.text();
    throw new Error(`properties DELETE (${delPropRes.status}): ${errText}`);
  }

  // 3. Best-effort cleanup of linked child records within the same org
  const cleanupTasks: Promise<unknown>[] = [
    fetch(
      `${SUPABASE_URL}/rest/v1/property_details?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(cleanId)}`,
      { method: "DELETE", headers: H }
    ).catch(() => null),
    fetch(
      `${SUPABASE_URL}/rest/v1/available_spaces?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(cleanId)}`,
      { method: "DELETE", headers: H }
    ).catch(() => null),
    fetch(
      `${SUPABASE_URL}/rest/v1/property_units?org_id=eq.${orgId}&property_id=eq.${encodeURIComponent(cleanId)}`,
      { method: "DELETE", headers: H }
    ).catch(() => null),
  ];

  if (propertyName) {
    cleanupTasks.push(
      fetch(
        `${SUPABASE_URL}/rest/v1/property_units?org_id=eq.${orgId}&building=eq.${encodeURIComponent(propertyName)}`,
        { method: "DELETE", headers: H }
      ).catch(() => null),
      fetch(
        `${SUPABASE_URL}/rest/v1/filter_changes?org_id=eq.${orgId}&property=eq.${encodeURIComponent(propertyName)}`,
        { method: "DELETE", headers: H }
      ).catch(() => null)
    );
  }

  await Promise.all(cleanupTasks);

  // Also clean site_content fallback unit roster if present
  try {
    const fbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/site_content?org_id=eq.${orgId}&section=eq.property_units_v1&key=eq.units&select=value`,
      { headers: H, cache: "no-store" }
    );
    if (fbRes.ok) {
      const fbRows = await fbRes.json().catch(() => []);
      const rawVal = fbRows?.[0]?.value;
      if (rawVal) {
        const parsed = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal;
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((u: Record<string, unknown>) => {
            const uPropId = String(u.propertyId ?? u.property_id ?? "").trim();
            const uBldg = String(u.building || "").trim().toLowerCase();
            if (uPropId === cleanId) return false;
            if (propertyName && uBldg === propertyName.toLowerCase()) return false;
            return true;
          });
          if (filtered.length !== parsed.length) {
            await fetch(`${SUPABASE_URL}/rest/v1/site_content?on_conflict=org_id,section,key`, {
              method: "POST",
              headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify({
                org_id: orgId,
                section: "property_units_v1",
                key: "units",
                value: JSON.stringify(filtered),
                updated_at: new Date().toISOString(),
              }),
            });
          }
        }
      }
    }
  } catch {
    /* non-fatal fallback cleanup */
  }

  // 4. Optional cascading deletion of tenants assigned to this building
  let tenantsDeleted = 0;
  if (options.includeTenants && (propertyName || displayName)) {
    const matchTargets = new Set(
      [propertyName, displayName, cleanId]
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    const tenantListRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?select=id,building&org_id=eq.${orgId}`,
      { headers: H, cache: "no-store" }
    ).catch(() => null);

    if (tenantListRes?.ok) {
      const tenantRows = await tenantListRes.json().catch(() => []);
      const matchingIds = Array.isArray(tenantRows)
        ? tenantRows
            .filter((t: Record<string, unknown>) =>
              matchTargets.has(String(t.building || "").trim().toLowerCase())
            )
            .map((t: Record<string, unknown>) => String(t.id || "").trim())
            .filter(Boolean)
        : [];

      if (matchingIds.length > 0) {
        const inList = matchingIds.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
        const delTenantsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/tenants?org_id=eq.${orgId}&id=in.(${encodeURIComponent(inList)})`,
          {
            method: "DELETE",
            headers: { ...H, Prefer: "return=representation" },
          }
        ).catch(() => null);
        if (delTenantsRes?.ok) {
          const deletedRows = await delTenantsRes.json().catch(() => []);
          tenantsDeleted = Array.isArray(deletedRows) ? deletedRows.length : matchingIds.length;
        }
      }
    }
  }

  return {
    deleted: true,
    propertyName,
    tenantsDeleted,
  };
}
