import { supabaseAdmin } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/platform";

export type PlatformRole = "super_admin" | "tech_support";

export interface PlatformTeamMember {
  email: string;
  name: string;
  role: "tech_support";
  active: boolean;
  canImpersonate: boolean;
  addedBy: string;
  createdAt: string;
}

const SECTION = "platform_team";
const KEY = "members";

async function getPlatformAnchorOrgId(): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  return data?.[0]?.id ? String(data[0].id) : null;
}

export async function loadPlatformTeam(): Promise<PlatformTeamMember[]> {
  if (!supabaseAdmin) return [];
  const orgId = await getPlatformAnchorOrgId();
  if (!orgId) return [];

  const { data } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("org_id", orgId)
    .eq("section", SECTION)
    .eq("key", KEY)
    .limit(1);

  const raw = data?.[0]?.value;
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as PlatformTeamMember[]) : [];
  } catch {
    return [];
  }
}

export async function savePlatformTeam(members: PlatformTeamMember[]): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error("Database admin client is not configured.");
  }
  const orgId = await getPlatformAnchorOrgId();
  if (!orgId) {
    throw new Error("No platform anchor organization found.");
  }

  const { error } = await supabaseAdmin.from("site_content").upsert(
    {
      org_id: orgId,
      section: SECTION,
      key: KEY,
      value: JSON.stringify(members),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,section,key" }
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function resolvePlatformAccess(email: string | null | undefined): Promise<{
  role: PlatformRole | null;
  canImpersonate: boolean;
}> {
  if (!email) return { role: null, canImpersonate: false };
  const clean = email.trim().toLowerCase();
  if (isSuperAdmin(clean)) {
    return { role: "super_admin", canImpersonate: true };
  }
  const members = await loadPlatformTeam();
  const match = members.find((m) => m.email.trim().toLowerCase() === clean && m.active);
  if (!match) return { role: null, canImpersonate: false };
  return { role: "tech_support", canImpersonate: Boolean(match.canImpersonate) };
}
