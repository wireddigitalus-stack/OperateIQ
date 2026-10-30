import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOrgAdmin, requireSuperAdmin } from "@/lib/server-auth";
import { getCustomerCode } from "@/lib/platform";

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

    // Lookup by id: platform super-admins or org admins of that org.
    if (id) {
      const sa = await requireSuperAdmin(req);
      if (!sa.ok) {
        const g = await requireOrgAdmin(req);
        if (!g.ok) return g.res;
        if (g.ctx.orgId !== id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      const [{ data: org }, { data: profileSetting }] = await Promise.all([
        supabaseAdmin.from("organizations").select("*").eq("id", id).maybeSingle(),
        supabaseAdmin
          .from("site_settings")
          .select("value")
          .eq("org_id", id)
          .eq("key", "org_profile")
          .maybeSingle(),
      ]);
      if (!org) {
        return NextResponse.json({ organization: null });
      }
      const prof = ((profileSetting?.value || {}) as Record<string, unknown>);
      const organization = {
        ...org,
        customer_code: getCustomerCode(
          org.id,
          typeof prof.customer_code === "string" ? prof.customer_code : null
        ),
        city: typeof prof.city === "string" ? prof.city : "",
        state: typeof prof.state === "string" ? prof.state : "",
        address: typeof prof.address === "string" ? prof.address : "",
        description: typeof prof.description === "string" ? prof.description : "",
      };
      return NextResponse.json({ organization });
    }

    // Full list: platform super-admins only.
    const sa = await requireSuperAdmin(req);
    if (!sa.ok) return sa.res;
    const [{ data: orgs }, { data: profileSettings }] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("site_settings")
        .select("org_id, value")
        .eq("key", "org_profile"),
    ]);
    const profMap = new Map<string, Record<string, unknown>>();
    (profileSettings || []).forEach((s: { org_id: string; value: unknown }) => {
      if (s.org_id && s.value && typeof s.value === "object") {
        profMap.set(s.org_id, s.value as Record<string, unknown>);
      }
    });
    const enriched = (orgs || []).map((o: { id: string } & Record<string, unknown>) => {
      const prof = profMap.get(o.id) || {};
      return {
        ...o,
        customer_code: getCustomerCode(
          o.id,
          typeof prof.customer_code === "string" ? prof.customer_code : null
        ),
      };
    });
    return NextResponse.json({ organizations: enriched });
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
    const { name, slug, contact_email, contact_phone, brand_name } = body;
    const tier = TIERS.includes(body.tier) ? body.tier : "starter";
    const subscription_status = STATUSES.includes(body.subscription_status) ? body.subscription_status : "trialing";

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const cleanBrandName = brand_name ? String(brand_name).trim() : cleanName;
    const cleanSlug = String(slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").trim();
    const trial_ends_at =
      subscription_status === "trialing"
        ? new Date(Date.now() + 14 * 86400_000).toISOString()
        : null;

    const { data: newOrg, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: cleanName,
        slug: cleanSlug,
        tier,
        subscription_status,
        trial_ends_at,
        brand_name: cleanBrandName,
        contact_email: contact_email?.trim() ? String(contact_email).toLowerCase().trim() : null,
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

    const customerCode = getCustomerCode(newOrg.id);

    await supabaseAdmin
      .from("site_settings")
      .upsert(
        {
          org_id: newOrg.id,
          key: "org_profile",
          value: {
            customer_code: customerCode,
            city: "",
            state: "",
            address: "",
            description: "",
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,key" }
      )
      .then(() => {}, () => {});

    if (contact_email && String(contact_email).trim()) {
      await supabaseAdmin
        .from("allowed_users")
        .insert({
          org_id: newOrg.id,
          email: String(contact_email).toLowerCase().trim(),
          name: cleanBrandName || cleanName,
          role: "owner",
          active: true,
        })
        .then(() => {}, () => {});
    }

    return NextResponse.json({
      success: true,
      organization: { ...newOrg, customer_code: customerCode },
    });
  } catch (error) {
    console.error("[platform/organizations] POST error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}

/**
 * PATCH
 *  • Super-admin: may update tier / subscription_status / trial_ends_at / extend_trial_days / custom_domain / brand_name / contact / branding / profile of any org.
 *  • Org owner/admin: may update ONLY their own active org's brand_name, contact_email, contact_phone,
 *    brand_logo_url, brand_primary_color, brand_accent_color, profile (city, state, address, description),
 *    or clear custom_domain. (Setting a custom domain goes through /api/platform/verify-domain.)
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database connection not ready" }, { status: 503 });
    }
    const body = await req.json();
    const {
      tier,
      subscription_status,
      trial_ends_at,
      extend_trial_days,
      custom_domain,
      brand_name,
      contact_email,
      contact_phone,
      brand_logo_url,
      brand_primary_color,
      brand_accent_color,
      city,
      state,
      address,
      description,
    } = body;
    const updates: Record<string, unknown> = {};
    let targetId: string;

    const sa = await requireSuperAdmin(req);
    if (sa.ok && body.id) {
      targetId = body.id;
      if (tier !== undefined) {
        if (!TIERS.includes(tier)) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
        updates.tier = tier;
      }
      if (subscription_status !== undefined) {
        if (!STATUSES.includes(subscription_status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        updates.subscription_status = subscription_status;
      }
      if (trial_ends_at !== undefined) {
        updates.trial_ends_at = trial_ends_at ? String(trial_ends_at) : null;
      }
      if (extend_trial_days !== undefined && Number(extend_trial_days) > 0) {
        const { data: currentOrg } = await supabaseAdmin
          .from("organizations")
          .select("trial_ends_at")
          .eq("id", targetId)
          .maybeSingle();
        const existingEnd = currentOrg?.trial_ends_at ? new Date(currentOrg.trial_ends_at).getTime() : 0;
        const baseTime = Math.max(Date.now(), Number.isFinite(existingEnd) ? existingEnd : 0);
        updates.trial_ends_at = new Date(baseTime + Number(extend_trial_days) * 86400_000).toISOString();
        updates.subscription_status = "trialing";
      } else if (updates.subscription_status === "trialing" && trial_ends_at === undefined) {
        const { data: currentOrg } = await supabaseAdmin
          .from("organizations")
          .select("trial_ends_at")
          .eq("id", targetId)
          .maybeSingle();
        const existingEnd = currentOrg?.trial_ends_at ? new Date(currentOrg.trial_ends_at).getTime() : 0;
        if (!existingEnd || !Number.isFinite(existingEnd) || existingEnd <= Date.now()) {
          updates.trial_ends_at = new Date(Date.now() + 14 * 86400_000).toISOString();
        }
      }
      if (custom_domain !== undefined) updates.custom_domain = custom_domain ? String(custom_domain).trim().toLowerCase() : null;
      if (brand_name !== undefined) updates.brand_name = brand_name ? String(brand_name).trim() : null;
    } else {
      const g = await requireOrgAdmin(req);
      if (!g.ok) return g.res;
      targetId = g.ctx.orgId; // never trust body.id for tenants
      if (tier !== undefined || subscription_status !== undefined || trial_ends_at !== undefined || extend_trial_days !== undefined) {
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

    if (contact_email !== undefined) updates.contact_email = contact_email ? String(contact_email).trim().slice(0, 200) : null;
    if (contact_phone !== undefined) updates.contact_phone = contact_phone ? String(contact_phone).trim().slice(0, 60) : null;
    if (brand_logo_url !== undefined) updates.brand_logo_url = brand_logo_url ? String(brand_logo_url).trim().slice(0, 500) : null;
    if (brand_primary_color !== undefined) updates.brand_primary_color = brand_primary_color ? String(brand_primary_color).trim().slice(0, 40) : null;
    if (brand_accent_color !== undefined) updates.brand_accent_color = brand_accent_color ? String(brand_accent_color).trim().slice(0, 40) : null;

    const hasProfileFields =
      city !== undefined || state !== undefined || address !== undefined || description !== undefined;

    if (!Object.keys(updates).length && !hasProfileFields) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    let updatedOrg: Record<string, unknown> | null = null;
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("organizations")
        .update(updates)
        .eq("id", targetId)
        .select()
        .single();
      if (error) throw error;
      updatedOrg = data as Record<string, unknown>;
    } else {
      const { data } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();
      updatedOrg = (data as Record<string, unknown>) || { id: targetId };
    }

    if (hasProfileFields) {
      const { data: existingProfile } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("org_id", targetId)
        .eq("key", "org_profile")
        .maybeSingle();
      const prev = ((existingProfile?.value || {}) as Record<string, unknown>);
      const nextProfile = {
        customer_code: getCustomerCode(
          targetId,
          typeof prev.customer_code === "string" ? prev.customer_code : null
        ),
        city: city !== undefined ? (city ? String(city).trim().slice(0, 120) : "") : (typeof prev.city === "string" ? prev.city : ""),
        state: state !== undefined ? (state ? String(state).trim().slice(0, 60) : "") : (typeof prev.state === "string" ? prev.state : ""),
        address: address !== undefined ? (address ? String(address).trim().slice(0, 240) : "") : (typeof prev.address === "string" ? prev.address : ""),
        description: description !== undefined ? (description ? String(description).trim().slice(0, 2000) : "") : (typeof prev.description === "string" ? prev.description : ""),
      };
      await supabaseAdmin
        .from("site_settings")
        .upsert(
          {
            org_id: targetId,
            key: "org_profile",
            value: nextProfile,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "org_id,key" }
        );
      updatedOrg = { ...updatedOrg, ...nextProfile };
    } else {
      updatedOrg = {
        ...updatedOrg,
        customer_code: getCustomerCode(targetId),
      };
    }

    return NextResponse.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error("[platform/organizations] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
