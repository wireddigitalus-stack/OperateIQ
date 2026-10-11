import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    const id = req.nextUrl.searchParams.get("id");
    const domain = req.nextUrl.searchParams.get("domain");

    if (!supabaseAdmin) {
      if (slug === "wired-digital" || slug === "wireddigitalllc") {
        return NextResponse.json({
          organization: {
            id: "11111111-2222-3333-4444-555555555555",
            name: "WIRED DIGITAL LLC",
            slug: "wired-digital",
            tier: "pro",
            subscription_status: "active",
            contact_email: "wireddigitalus@gmail.com",
            brand_name: "WIRED DIGITAL LLC",
            custom_domain: null,
          },
        });
      }
      return NextResponse.json({
        organizations: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            name: "OperateIQ Demo",
            slug: "operateiq-demo",
            tier: "pro",
            subscription_status: "active",
          },
          {
            id: "11111111-2222-3333-4444-555555555555",
            name: "WIRED DIGITAL LLC",
            slug: "wired-digital",
            tier: "pro",
            subscription_status: "active",
            contact_email: "wireddigitalus@gmail.com",
            brand_name: "WIRED DIGITAL LLC",
          },
        ],
      });
    }

    if (slug) {
      const cleanSlug = slug.toLowerCase().trim();
      let { data: org } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .ilike("slug", cleanSlug)
        .maybeSingle();

      if (!org && (cleanSlug === "wired-digital" || cleanSlug === "wireddigitalllc")) {
        const { data: created } = await supabaseAdmin
          .from("organizations")
          .upsert(
            {
              name: "WIRED DIGITAL LLC",
              slug: "wired-digital",
              tier: "pro",
              subscription_status: "active",
              contact_email: "wireddigitalus@gmail.com",
              brand_name: "WIRED DIGITAL LLC",
            },
            { onConflict: "slug" }
          )
          .select()
          .single();
        org = created;
      }
      return NextResponse.json({ organization: org });
    }

    if (id) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return NextResponse.json({ organization: org });
    }

    if (domain) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("custom_domain", domain.toLowerCase().trim())
        .maybeSingle();
      return NextResponse.json({ organization: org });
    }

    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    return NextResponse.json({ organizations: orgs || [] });
  } catch (error) {
    console.error("[platform/organizations] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection not ready" }, { status: 503 });
    }

    const body = await req.json();
    const { name, slug, tier = "starter", contact_email, contact_phone, subscription_status = "trialing" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).trim();

    const { data: newOrg, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: name.trim(),
        slug: cleanSlug,
        tier,
        subscription_status,
        contact_email: contact_email?.trim() || null,
        contact_phone: contact_phone?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "An organization with this slug already exists" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, organization: newOrg });
  } catch (error) {
    console.error("[platform/organizations] POST error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection not ready" }, { status: 503 });
    }

    const body = await req.json();
    const { id, tier, subscription_status, custom_domain, brand_name } = body;

    if (!id) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (tier !== undefined) updates.tier = tier;
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (custom_domain !== undefined) updates.custom_domain = custom_domain?.trim() || null;
    if (brand_name !== undefined) updates.brand_name = brand_name?.trim() || null;
    updates.updated_at = new Date().toISOString();

    const { data: updatedOrg, error } = await supabaseAdmin
      .from("organizations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error("[platform/organizations] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
