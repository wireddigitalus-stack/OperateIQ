import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestContext, requireOrgAdmin, requireSuperAdmin } from "@/lib/server-auth";

// Fields safe to expose for public site rendering (slug / domain lookups).
const PUBLIC_ORG_FIELDS =
  "id,name,slug,tier,custom_domain,brand_name,brand_logo_url,brand_primary_color,brand_accent_color,contact_email,contact_phone";

const TIERS = ["starter", "growth", "pro"] as const;
const STATUSES = ["trialing", "active", "past_due", "canceled", "paused"] as const;

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection not ready" }, { status: 503 });
    }
    const slug = req.nextUrl.searchParams.get("slug");
    const id = req.nextUrl.searchParams.get("id");
    const domain = req.nextUrl.searchParams.get("domain");

    // Public lookups (used to render tenant public sites) — public fields only.
    if (slug) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select(PUBLIC_ORG_FIELDS)
        .eq("slug", slug.toLowerCase().trim())
        .maybeSingle();
      return NextResponse.json({ organization: org || null });
    }
    if (domain) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select(PUBLIC_ORG_FIELDS)
        .eq("custom_domain", domain.toLowerCase().trim().replace(/^www\./, ""))
        .maybeSingle();
      return NextResponse.json({ organization: org || null });
    }

    // Lookup by id: members of that org or super-admins.
    if (id) {
      const ctx = await getRequestContext(req);
      const allowed = ctx && (ctx.isSuperAdmin || ctx.memberships.some((m) => m.org_id === id));
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { data: org } = await supabaseAdmin.from("organizations").select("*").eq("id", id).maybeSingle();
      return NextResponse.json({ organization: org });
    }

    // Full list: platform super-admins only.
    const sa = await requireSuperAdmin(req);
    if (!sa.ok) return sa.res;
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
    const sa = await requireSuperAdmin(req);
    if (!sa.ok) return sa.res;
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection not ready" }, { status: 503 });
    }

    const body = await req.json();
    const { name, slug, contact_email, contact_phone } = body;
    const tier = TIERS.includes(body.tier) ? body.tier : "starter";
    const subscription_status = STATUSES.includes(body.subscription_status) ? body.subscription_status : "trialing";

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const cleanSlug = String(slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").trim();

    const { data: newOrg, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: String(name).trim(),
        slug: cleanSlug,
        tier,
        subscription_status,
        brand_name: String(name).trim(),
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

/**
 * PATCH
 *  • Super-admin: may update tier / subscription_status / custom_domain / brand_name of any org.
 *  • Org owner/admin: may update ONLY their own active org's brand_name, or clear custom_domain.
 *    (Setting a custom domain goes through /api/platform/verify-domain.)
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection not ready" }, { status: 503 });
    }
    const body = await req.json();
    const { tier, subscription_status, custom_domain, brand_name } = body;
    const updates: Record<string, unknown> = {};
    let targetId: string;

    const sa = await requireSuperAdmin(req);
    if (sa.ok) {
      targetId = body.id;
      if (!targetId) return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
      if (tier !== undefined) {
        if (!TIERS.includes(tier)) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
        updates.tier = tier;
      }
      if (subscription_status !== undefined) {
        if (!STATUSES.includes(subscription_status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        updates.subscription_status = subscription_status;
      }
      if (custom_domain !== undefined) updates.custom_domain = custom_domain ? String(custom_domain).trim().toLowerCase() : null;
      if (brand_name !== undefined) updates.brand_name = brand_name ? String(brand_name).trim() : null;
    } else {
      const g = await requireOrgAdmin(req);
      if (!g.ok) return g.res;
      targetId = g.ctx.orgId; // never trust body.id for tenants
      if (tier !== undefined || subscription_status !== undefined) {
        return NextResponse.json({ error: "Plan changes must be made through billing." }, { status: 403 });
      }
      if (custom_domain !== undefined) {
        if (custom_domain) {
          return NextResponse.json({ error: "Use the domain verification flow to connect a domain." }, { status: 400 });
        }
        updates.custom_domain = null;
      }
      if (brand_name !== undefined) updates.brand_name = brand_name ? String(brand_name).trim().slice(0, 120) : null;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    updates.updated_at = new Date().toISOString();

    const { data: updatedOrg, error } = await supabaseAdmin
      .from("organizations")
      .update(updates)
      .eq("id", targetId)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error("[platform/organizations] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
