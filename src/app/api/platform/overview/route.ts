import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server-auth";
import { getCustomerCode } from "@/lib/platform";

export async function GET(req: NextRequest) {
  const sa = await requireSuperAdmin(req);
  if (!sa.ok) return sa.res;
  try {
    if (!supabaseAdmin) {
      // In development or before Supabase service role key is fully connected
      const demoId = "00000000-0000-0000-0000-000000000001";
      return NextResponse.json({
        organizations: [
          {
            id: demoId,
            customer_code: getCustomerCode(demoId),
            name: "OpsIQ Demo",
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
        signups: [],
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
      const demoId = "00000000-0000-0000-0000-000000000001";
      return NextResponse.json({
        organizations: [
          {
            id: demoId,
            customer_code: getCustomerCode(demoId),
            name: "OpsIQ Demo",
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
        signups: [],
        stats: {
          totalOrgs: 1,
          totalProperties: 2,
          totalTenants: 0,
          activeSubscriptions: 1,
          trialing: 0,
        },
      });
    }

    // 2. Fetch counts per organization & signups
    const [
      { data: properties },
      { data: tenants },
      { data: tickets },
      { data: rawSignups },
    ] = await Promise.all([
      supabaseAdmin.from("properties").select("id, org_id"),
      supabaseAdmin.from("tenants").select("id, org_id"),
      supabaseAdmin.from("maintenance_tickets").select("id, org_id, status"),
      supabaseAdmin
        .from("contact_submissions")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(100),
    ]);

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
      customer_code: getCustomerCode(org.id),
      properties_count: propsMap[org.id] || 0,
      tenants_count: tenantsMap[org.id] || 0,
      tickets_count: ticketsMap[org.id] || 0,
    }));

    const enrichedSignups = (rawSignups || []).map((s: { org_id?: string | null } & Record<string, unknown>) => ({
      ...s,
      ...(s.org_id ? { customer_code: getCustomerCode(s.org_id) } : {}),
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
      signups: enrichedSignups,
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
