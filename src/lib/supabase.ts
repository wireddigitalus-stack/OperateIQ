import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ── Server-side admin client (service role — never expose to browser) ──────────
// Use this in API routes for full DB access (inserts, reads bypassing RLS).
export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null as unknown as ReturnType<typeof createClient>;

// ── Public client (anon key — safe for client components if needed) ───────────
export const supabaseAnon = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null as unknown as ReturnType<typeof createClient>;

// ── Row → Lead mapper (snake_case DB → camelCase TypeScript) ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToLead(row: any) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    name: row.name,
    email: row.email || "",
    phone: row.phone || "",
    spaceType: row.space_type,
    budget: row.budget,
    timeline: row.timeline,
    teamSize: row.team_size,
    additionalInfo: row.additional_info || "",
    score: row.score,
    scoreLabel: row.score_label as "Verified Lead" | "MQL" | "Prospect Lead" | "Potential Spam",
    reasoning: row.reasoning,
    matchedProperties: row.matched_properties || [],
    isWhale: row.is_whale || row.budget >= 4000,
    whaleTier: row.whale_tier || (row.budget >= 8000 ? "gold" : row.budget >= 4000 ? "silver" : null),
    whaleKeywords: row.whale_keywords || [],
    source: row.source || "organic",
    medium: row.medium || "direct",
    campaign: row.campaign || "",
    archivedAt: row.archived_at || null,
    followUpDate: row.follow_up_date || null,
    createdByEmployee: row.created_by_employee || "Staff",
    assignedEmployee: row.assigned_employee || "",
    progress: row.progress || "0-25%",
  };
}
