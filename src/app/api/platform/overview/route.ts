import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;
  try {
    if (!supabaseAdmin) {
      // In development or before Supabase service role key is fully connected
      return NextResponse.json({
        organizations: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            name: "OperateIQ Demo",
            slug: "operateiq-demo",
            tier: "pro",
            subscription_status: "active",
            created_at: new Date().toISOString(),
            contact_email: "demo@operateiq.com",
            properties_count: 2,
            tenants_count: 0,
            tickets_count: 0,
          },
        ],
        stats: {
          totalOrgs: 1,
          totalProperties: 2,
          totalTenants: 0,
          activeSubscriptions: 1,
          trialing: 0,
        },
      });
    }

    // 1. Fetch all organizations
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (orgsError) {
      console.warn("[platform/overview] organizations table not yet migrated, using initial fallback:", orgsError.message);
      return NextResponse.json({
        organizations: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            name: "OperateIQ Demo",
            slug: "operateiq-demo",
            tier: "pro",
            subscription_status: "active",
            created_at: new Date().toISOString(),
            contact_email: "demo@operateiq.com",
            properties_count: 2,
            tenants_count: 0,
            tickets_count: 0,
          },
        ],
        stats: {
          totalOrgs: 1,
          totalProperties: 2,
          totalTenants: 0,
          activeSubscriptions: 1,
          trialing: 0,
        },
      });
    }

    // 2. Fetch counts per organization
    const { data: properties } = await supabaseAdmin
      .from("properties")
      .select("id, org_id");

    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, org_id");

    const { data: tickets } = await supabaseAdmin
      .from("maintenance_tickets")
      .select("id, org_id, status");

    const propsMap: Record<string, number> = {};
    const tenantsMap: Record<string, number> = {};
    const ticketsMap: Record<string, number> = {};

    (properties || []).forEach((p: { org_id: string }) => {
      propsMap[p.org_id] = (propsMap[p.org_id] || 0) + 1;
    });

    (tenants || []).forEach((t: { org_id: string }) => {
      tenantsMap[t.org_id] = (tenantsMap[t.org_id] || 0) + 1;
    });

    (tickets || []).forEach((tk: { org_id: string; status: string }) => {
      if (tk.status === "open" || tk.status === "in_progress") {
        ticketsMap[tk.org_id] = (ticketsMap[tk.org_id] || 0) + 1;
      }
    });

    const enrichedOrgs = (orgs || []).map((org: { id: string; subscription_status: string }) => ({
      ...org,
      properties_count: propsMap[org.id] || 0,
      tenants_count: tenantsMap[org.id] || 0,
      tickets_count: ticketsMap[org.id] || 0,
    }));

    const stats = {
      totalOrgs: enrichedOrgs.length,
      totalProperties: Object.values(propsMap).reduce((a, b) => a + b, 0),
      totalTenants: Object.values(tenantsMap).reduce((a, b) => a + b, 0),
      activeSubscriptions: enrichedOrgs.filter((o: { subscription_status: string }) => o.subscription_status === "active").length,
      trialing: enrichedOrgs.filter((o: { subscription_status: string }) => o.subscription_status === "trialing").length,
    };

    return NextResponse.json({
      organizations: enrichedOrgs,
      stats,
    });
  } catch (error) {
    console.error("[platform/overview] error:", error);
    return NextResponse.json(
      { error: "Failed to load platform overview" },
      { status: 500 }
    );
  }
}
