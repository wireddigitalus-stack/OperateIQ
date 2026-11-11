// ─────────────────────────────────────────────────────────────────────────────
// Sample / Demo Data Hygiene Helpers
//
// Sample records let new landlords explore PropOpsIQ without polluting their
// public website, counting against plan property caps, or leaving undeletable
// rows in their workspace.
// ─────────────────────────────────────────────────────────────────────────────

export const SAMPLE_PROP_PREFIX = "sample_";
export const SAMPLE_PROP_BADGE = "Sample (Demo)";
export const SAMPLE_TENANT_MARKER = "[SAMPLE]";

export function isSampleProperty(row: {
  id?: string | null;
  badge?: string | null;
} | null | undefined): boolean {
  if (!row) return false;
  const id = String(row.id || "");
  const badge = String(row.badge || "");
  return id.startsWith(SAMPLE_PROP_PREFIX) || badge === SAMPLE_PROP_BADGE;
}

export function isSampleTenant(row: {
  notes?: string | null;
} | null | undefined): boolean {
  if (!row) return false;
  return String(row.notes || "").includes(SAMPLE_TENANT_MARKER);
}

/**
 * Editable sample properties tailored for small & mid-size landlords (residential
 * and mixed-use) — always seeded unpublished (`published: false`, `in_banner: false`)
 * so they never appear on a public listing site.
 */
export const SAMPLE_LANDLORD_PROPERTIES = [
  {
    name: "Maple Court Apartments",
    type: "Small Multifamily",
    address: "412 Maple Ave",
    city: "Asheville, NC",
    sqft: "6,400",
    description:
      "Sample 8-unit brick apartment building (six 2BR/1BA and two 1BR/1BA units) with off-street parking and shared laundry.",
    features: ["8 Residential Units", "Off-Street Parking", "On-Site Laundry", "Sample Data"],
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Oak Street Duplex",
    type: "Duplex / Triplex",
    address: "118 Oak Street",
    city: "Knoxville, TN",
    sqft: "2,650",
    description:
      "Sample side-by-side 3BR/2BA residential duplex with separate utility meters and fenced backyards.",
    features: ["2 Units (3BR/2BA)", "Separate Meters", "Private Yards", "Sample Data"],
    image:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Main Street Mixed-Use",
    type: "Mixed-Use",
    address: "205 E Main St",
    city: "Johnson City, TN",
    sqft: "5,200",
    description:
      "Sample ground-floor corner storefront with four renovated 1BR loft apartments on the second floor.",
    features: ["1 Ground-Floor Retail", "4 Upstairs Lofts", "Keyless Entry", "Sample Data"],
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Cedar Ridge Single-Family",
    type: "Single-Family Rental",
    address: "89 Cedar Ridge Ln",
    city: "Bristol, VA",
    sqft: "1,850",
    description:
      "Sample 3BR/2.5BA single-family rental home with two-car garage on an annual residential lease.",
    features: ["Single-Family 3BR/2.5BA", "2-Car Garage", "Annual Lease", "Sample Data"],
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
  },
];
