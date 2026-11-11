import { NextRequest, NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { writeActivityLog } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

const EXPORT_TABLES = [
  "properties",
  "property_details",
  "property_units",
  "available_spaces",
  "parking_lots",
  "tenants",
  "rent_payments",
  "expenses",
  "maintenance_tickets",
  "cleaning_assignments",
  "filter_changes",
  "building_inspections",
  "subcontractor_contacts",
  "todos",
  "call_logs",
  "leads",
  "sales_leads",
  "blog_posts",
  "site_content",
  "site_settings",
  "portfolio_snapshots",
  "activity_log",
] as const;

export async function GET(req: NextRequest) {
  const g = await requireOrgAdmin(req);
  if (!g.ok) return g.res;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { orgId, org, user } = g.ctx;
  if (!(await checkRateLimit(`acct-export:${orgId}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Too many export requests. Please wait before exporting again." },
      { status: 429 }
    );
  }

  const bundle: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    exported_by: user?.email || "admin",
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      tier: org.tier,
      subscription_status: org.subscription_status,
      trial_ends_at: org.trial_ends_at,
      custom_domain: org.custom_domain,
      contact_email: org.contact_email,
      contact_phone: org.contact_phone,
      customer_code: org.customer_code,
    },
  };

  const results = await Promise.all(
    EXPORT_TABLES.map(async (table) => {
      try {
        const { data } = await supabaseAdmin!
          .from(table)
          .select("*")
          .eq("org_id", orgId)
          .limit(10000);
        return [table, data || []] as const;
      } catch {
        return [table, []] as const;
      }
    })
  );

  for (const [table, rows] of results) {
    bundle[table] = rows;
  }

  // Team members without exposing raw PINs
  try {
    const { data: team } = await supabaseAdmin
      .from("allowed_users")
      .select("id, email, name, role, active, created_at")
      .eq("org_id", orgId);
    bundle.team_members = team || [];
  } catch {
    bundle.team_members = [];
  }

  await writeActivityLog({
    actor_email: user?.email || "admin",
    actor_name: user?.name || "Admin",
    org_id: orgId,
    action: "exported",
    resource_type: "organization",
    resource_name: org.name,
    resource_id: orgId,
  });

  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `propopsiq_export_${org.slug || "workspace"}_${datePart}.json`;

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
