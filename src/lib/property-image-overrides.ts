/**
 * Server-side helper — fetches the property_image_overrides table from Supabase
 * and returns a lookup map of { propertyId → { heroUrl, allUrls } }.
 *
 * Called by server components (PropertiesSection, CRE page, property detail page)
 * so that admin photo uploads are reflected on public pages immediately.
 *
 * Uses cache: "no-store" to always return the latest data.
 */

export interface ImageOverride {
  heroUrl: string | null;
  allUrls: string[];
}

export type OverrideMap = Record<string, ImageOverride>;

export async function fetchImageOverrides(): Promise<OverrideMap> {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !KEY) return {};

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/property_image_overrides?select=property_id,hero_url,image_url,all_urls`,
      {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store", // always fresh — admin changes must show immediately
      }
    );

    if (!res.ok) return {};
    const rows = await res.json();
    if (!Array.isArray(rows)) return {};

    const map: OverrideMap = {};
    for (const row of rows) {
      if (!row.property_id) continue;
      map[row.property_id] = {
        heroUrl: row.hero_url || row.image_url || null,
        allUrls: Array.isArray(row.all_urls)
          ? row.all_urls
          : row.image_url
          ? [row.image_url]
          : [],
      };
    }
    return map;
  } catch {
    return {};
  }
}

/** Resolve the best hero image URL for a property (override wins over static data) */
export function resolveHeroImage(
  propertyId: string,
  staticImage: string | undefined,
  overrides: OverrideMap
): string {
  return overrides[propertyId]?.heroUrl || staticImage || "";
}

/**
 * Resolve the full image array for a property, with the hero image ALWAYS first.
 * Falls back to static data if no DB override exists.
 */
export function resolveAllImages(
  propertyId: string,
  staticImages: string[] | undefined,
  staticImage: string | undefined,
  overrides: OverrideMap
): string[] {
  const override = overrides[propertyId];
  if (override?.allUrls?.length) {
    const hero = override.heroUrl;
    if (hero && override.allUrls.includes(hero)) {
      // Put hero first, then the rest in their original order
      return [hero, ...override.allUrls.filter(u => u !== hero)];
    }
    return override.allUrls;
  }
  if (staticImages?.length) return staticImages;
  if (staticImage) return [staticImage];
  return [];
}
