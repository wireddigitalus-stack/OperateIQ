/**
 * Shared helper — write a single entry to the activity_log table.
 * Called server-side from any API route after a successful mutation.
 * Always awaited — errors are logged to console but never surfaced to the client.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface ActivityPayload {
  actor_email:   string;   // who did it  e.g. "admin@example.com"
  actor_name:    string;   // display name e.g. "Robert"
  action:        "created" | "updated" | "deleted" | "submitted";
  resource_type: "tenant" | "lead" | "maintenance" | "cleaning" | "rent_ledger";
  resource_name: string;   // human label  e.g. "Tin Roof Kitchen"
  resource_id:   string;   // record id
  metadata?:     Record<string, unknown>; // optional extra context
  org_id:        string;   // trusted tenant id (from requireOrg) — required since 002 dropped the DB default
}

export async function writeActivityLog(payload: ActivityPayload): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn("[activity-log] Missing env vars — SUPABASE_URL or SERVICE_KEY not set.");
    return;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_log`, {
      method: "POST",
      headers: {
        "apikey":        SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
      },
      body: JSON.stringify({
        org_id:        payload.org_id,
        actor_email:   payload.actor_email   || "unknown",
        actor_name:    payload.actor_name    || "Staff",
        action:        payload.action,
        resource_type: payload.resource_type,
        resource_name: payload.resource_name || "",
        resource_id:   payload.resource_id   || "",
        metadata:      payload.metadata      || {},
        created_at:    new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[activity-log] Insert failed (${res.status}):`, body);
    }
  } catch (err) {
    console.error("[activity-log] Network error:", err);
  }
}
