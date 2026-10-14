/**
 * site-content.ts — Server-side helper to fetch editable content overrides.
 *
 * Components call `getSiteContent("hero")` at render time.
 * Returns a map of key → value for that section.
 * Missing keys = use hardcoded defaults in the component.
 */

import { DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform-org";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_ORG_ID = DEFAULT_PLATFORM_ORG_ID;

export type ContentMap = Record<string, string>;

/**
 * Fetch all overrides for a given section (e.g., "hero", "stats").
 * Returns an object like { headline: "...", subtext: "..." }.
 * If the table doesn't exist or the fetch fails, returns {}.
 */
export async function getSiteContent(section: string, orgId: string = DEFAULT_ORG_ID): Promise<ContentMap> {
  try {
    const effectiveOrgId = orgId || DEFAULT_ORG_ID;
    const orgFilter = `&org_id=eq.${encodeURIComponent(effectiveOrgId)}`;
    const url = `${SUPABASE_URL}/rest/v1/site_content?section=eq.${encodeURIComponent(section)}&select=key,value${orgFilter}`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return {};

    const rows: { key: string; value: string }[] = await res.json();
    const map: ContentMap = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  } catch {
    return {};
  }
}

export const getSectionContent = getSiteContent;

/**
 * Fetch ALL sections at once (used by pages to avoid multiple fetches).
 */
export async function getAllSiteContent(orgId: string = DEFAULT_ORG_ID): Promise<Record<string, ContentMap>> {
  try {
    const effectiveOrgId = orgId || DEFAULT_ORG_ID;
    const orgFilter = `&org_id=eq.${encodeURIComponent(effectiveOrgId)}`;
    const url = `${SUPABASE_URL}/rest/v1/site_content?select=section,key,value${orgFilter}`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return {};

    const rows: { section: string; key: string; value: string }[] = await res.json();
    const result: Record<string, ContentMap> = {};
    for (const row of rows) {
      if (!result[row.section]) result[row.section] = {};
      result[row.section][row.key] = row.value;
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Fetch all property-related overrides (sections starting with "property:").
 * Returns { "city-centre": { name: "...", description: "..." }, ... }
 */
export async function getPropertyOverrides(orgId: string = DEFAULT_ORG_ID): Promise<Record<string, ContentMap>> {
  try {
    const effectiveOrgId = orgId || DEFAULT_ORG_ID;
    const orgFilter = `&org_id=eq.${encodeURIComponent(effectiveOrgId)}`;
    const url = `${SUPABASE_URL}/rest/v1/site_content?section=like.property:*&select=section,key,value${orgFilter}`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return {};

    const rows: { section: string; key: string; value: string }[] = await res.json();
    const result: Record<string, ContentMap> = {};
    for (const row of rows) {
      // section is "property:city-centre" → extract "city-centre"
      const propId = row.section.replace("property:", "");
      if (!result[propId]) result[propId] = {};
      result[propId][row.key] = row.value;
    }
    return result;
  } catch {
    return {};
  }
}
