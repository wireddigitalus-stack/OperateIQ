import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Lock, ArrowRight } from "lucide-react";
import { supabaseAdmin, supabaseAnon } from "@/lib/supabase";
import { BRAND } from "@/lib/brand";
import { DEFAULT_PLATFORM_ORG_ID } from "@/lib/platform";
import { isSubscriptionActive } from "@/lib/plans";
import { getRequestContext } from "@/lib/server-auth";
import { isSampleProperty } from "@/lib/sample-data";
import TenantSiteClient, {
  OrgData,
  FormattedProperty,
} from "./TenantSiteClient";
import { HeroSlideItem } from "@/components/demo-site/AcmeHeroBanner";
import { safeJsonLd } from "@/lib/json-ld";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

interface ResolvedTenantOrg extends OrgData {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
  site_published: boolean;
}

async function getOrgBySlug(slug: string): Promise<ResolvedTenantOrg | null> {
  const client = supabaseAdmin || supabaseAnon;
  if (!client) return null;
  try {
    const { data: org, error } = await client
      .from("organizations")
      .select(
        "id, name, slug, tier, subscription_status, trial_ends_at, created_at, custom_domain, contact_email, contact_phone, brand_name, brand_logo_url, brand_primary_color, brand_accent_color"
      )
      .eq("slug", slug.toLowerCase().trim())
      .maybeSingle();

    if (error || !org) {
      if (error) console.error("[getOrgBySlug] Error fetching org:", error);
      return null;
    }

    let explicitSitePublished: boolean | undefined;
    const enriched: ResolvedTenantOrg = {
      ...(org as OrgData),
      subscription_status: (org as any).subscription_status ?? null,
      trial_ends_at: (org as any).trial_ends_at ?? null,
      created_at: (org as any).created_at ?? null,
      site_published: false,
    };

    try {
      const { data: profileRow } = await client
        .from("site_settings")
        .select("value")
        .eq("org_id", org.id)
        .eq("key", "org_profile")
        .maybeSingle();

      if (profileRow?.value) {
        const profile =
          typeof profileRow.value === "string"
            ? JSON.parse(profileRow.value)
            : profileRow.value;
        if (profile && typeof profile === "object") {
          if (profile.city) enriched.city = profile.city;
          if (profile.state) enriched.state = profile.state;
          if (profile.address) enriched.address = profile.address;
          if (profile.description || profile.tagline || profile.bio) {
            enriched.description = profile.description || profile.tagline || profile.bio;
          }
          if (typeof profile.site_published === "boolean") {
            explicitSitePublished = profile.site_published;
          }
        }
      }
    } catch {
      // Optional enrichment
    }

    if (typeof explicitSitePublished === "boolean") {
      enriched.site_published = explicitSitePublished;
    } else if (org.custom_domain) {
      enriched.site_published = true;
    } else if (org.id !== DEFAULT_PLATFORM_ORG_ID) {
      try {
        const { data: pubRows } = await client
          .from("properties")
          .select("id, badge")
          .eq("org_id", org.id)
          .eq("published", true)
          .limit(10);
        enriched.site_published =
          Array.isArray(pubRows) && pubRows.some((p) => !isSampleProperty(p));
      } catch {
        enriched.site_published = false;
      }
    }

    return enriched;
  } catch (err) {
    console.error("[getOrgBySlug] Unexpected error:", err);
    return null;
  }
}

async function getFirstPropertyPhoto(orgId: string): Promise<string | null> {
  const client = supabaseAdmin || supabaseAnon;
  if (!client) return null;
  try {
    const { data } = await client
      .from("properties")
      .select("id, badge, hero_image, images")
      .eq("org_id", orgId)
      .eq("published", true)
      .limit(10);

    const realRow = Array.isArray(data)
      ? data.find((r) => !isSampleProperty(r))
      : null;
    if (!realRow) return null;

    const firstFromImages =
      Array.isArray(realRow.images) && typeof realRow.images[0] === "string"
        ? realRow.images[0]
        : null;
    return realRow.hero_image || firstFromImages || null;
  } catch {
    return null;
  }
}

function isOrgPubliclyLive(org: ResolvedTenantOrg): boolean {
  if (!org.site_published) return false;
  return isSubscriptionActive({
    subscription_status: org.subscription_status,
    trial_ends_at: org.trial_ends_at,
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) {
    return {
      title: `Site Not Found | ${BRAND.name}`,
      robots: { index: false, follow: false },
    };
  }

  const displayBrand = org.brand_name || org.name;

  if (!isOrgPubliclyLive(org)) {
    return {
      title: `${displayBrand} | Private Portfolio`,
      description: `This portfolio website is currently private.`,
      robots: {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      },
    };
  }

  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL || BRAND.url.replace(/\/$/, "");
  const canonicalUrl = org.custom_domain
    ? `https://${org.custom_domain}`
    : `${siteBase}/site/${org.slug}`;

  const description =
    org.description ||
    `Explore available rentals, suites, and properties managed by ${displayBrand}.`;

  const photo = await getFirstPropertyPhoto(org.id);
  const ogImageUrl =
    photo ||
    `${siteBase}/api/og?title=${encodeURIComponent(displayBrand)}&subtitle=${encodeURIComponent(description)}&tag=${encodeURIComponent(org.city || "Property Portfolio")}&type=property`;

  return {
    title: `${displayBrand} | Property Listings & Management`,
    description,
    metadataBase: new URL(siteBase),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${displayBrand} | Property Listings & Management`,
      description,
      url: canonicalUrl,
      siteName: displayBrand,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: displayBrand,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayBrand} | Property Listings & Management`,
      description,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function TenantPublicSitePage({ params }: Props) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  if (!org) {
    notFound();
  }

  const publiclyLive = isOrgPubliclyLive(org);
  let viewerCanPreviewDraft = false;

  if (!publiclyLive) {
    try {
      const ctx = await getRequestContext();
      if (
        ctx &&
        (ctx.isSuperAdmin ||
          ctx.orgId === org.id ||
          ctx.memberships.some((m) => m.org_id === org.id))
      ) {
        viewerCanPreviewDraft = true;
      }
    } catch {
      viewerCanPreviewDraft = false;
    }
  }

  // Gate unpublished / inactive sites from anonymous visitors & search engines
  if (!publiclyLive && !viewerCanPreviewDraft) {
    const displayBrand = org.brand_name || org.name;
    return (
      <div className="min-h-screen bg-[#060911] text-white flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-3xl bg-[#0B1222] border border-white/10 p-8 sm:p-10 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400">
            <Lock size={24} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-sky-400">
              Unpublished Portfolio
            </p>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {displayBrand}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              This property website hasn&apos;t been published yet. If you manage this workspace, sign in to preview or publish your site in Site Builder.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/admin?tab=content"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all"
            >
              <span>Workspace Sign In</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 font-semibold text-xs transition-all"
            >
              <Building2 size={13} />
              <span>{BRAND.name}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let formattedProperties: FormattedProperty[] = [];
  const siteContent: Record<string, Record<string, string>> = {};
  let heroSlides: HeroSlideItem[] = [];

  const client = supabaseAdmin || supabaseAnon;
  if (client) {
    try {
      const [propsRes, contentRes, imgOverridesRes, heroSettingRes] = await Promise.all([
        client
          .from("properties")
          .select("*")
          .eq("org_id", org.id)
          .eq("published", true)
          .order("created_at", { ascending: false }),
        client
          .from("site_content")
          .select("section, key, value")
          .eq("org_id", org.id),
        client
          .from("property_image_overrides")
          .select("property_id, hero_url, all_urls")
          .eq("org_id", org.id),
        client
          .from("site_settings")
          .select("value")
          .eq("org_id", org.id)
          .eq("key", "hero_config")
          .maybeSingle(),
      ]);

      if (Array.isArray(contentRes.data)) {
        for (const row of contentRes.data as { section: string; key: string; value: string }[]) {
          if (!siteContent[row.section]) siteContent[row.section] = {};
          siteContent[row.section][row.key] = row.value;
        }
      }

      const imgMap = new Map<string, { hero_url?: string; all_urls?: string[] }>();
      if (Array.isArray(imgOverridesRes.data)) {
        for (const row of imgOverridesRes.data as { property_id: string; hero_url?: string; all_urls?: string[] }[]) {
          imgMap.set(row.property_id, row);
        }
      }

      const rawProps = Array.isArray(propsRes.data)
        ? propsRes.data.filter((p: any) => !isSampleProperty(p))
        : [];

      if (rawProps.length > 0) {
        formattedProperties = rawProps.map((p: any) => {
          const propId = String(p.id || p.slug);
          const propOverrides = siteContent[`property:${propId}`] || {};
          const imgOverride = imgMap.get(propId);

          const rawSqft = propOverrides.sqft || p.sqft || p.total_sqft;
          const formattedSqft =
            typeof rawSqft === "number" && rawSqft > 0
              ? rawSqft.toLocaleString()
              : typeof rawSqft === "string" && rawSqft.trim()
              ? rawSqft.trim()
              : "—";

          const overrideFeatures = propOverrides.features
            ? propOverrides.features
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
            : null;

          const features =
            overrideFeatures ||
            (Array.isArray(p.features)
              ? p.features
              : Array.isArray(p.highlights)
              ? p.highlights
              : []);

          const overrideImages =
            Array.isArray(imgOverride?.all_urls) && imgOverride!.all_urls.length > 0
              ? imgOverride!.all_urls
              : Array.isArray(p.images)
              ? p.images.filter((u: unknown) => typeof u === "string")
              : [];

          const isDemoOrg = org.id === DEFAULT_PLATFORM_ORG_ID;
          const primaryImage =
            imgOverride?.hero_url ||
            overrideImages[0] ||
            p.hero_image ||
            p.featured_image ||
            p.image ||
            (isDemoOrg
              ? "/demo-properties/oakridge-professional-plaza.jpg"
              : "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80");

          const resolvedName = propOverrides.name || p.name || "Property Listing";
          const resolvedCity = propOverrides.city || p.city || org.city || "";
          const resolvedAddress =
            propOverrides.address ||
            [p.address, resolvedCity, p.state].filter(Boolean).join(", ");
          const resolvedType = propOverrides.type || p.type || "Rental Property";
          const resolvedStatus = propOverrides.status || p.lease_status || p.status || "Available";
          const resolvedBadge = propOverrides.badge || p.badge || resolvedType || "Available";

          return {
            id: propId,
            name: resolvedName,
            type: resolvedType,
            city: resolvedCity,
            address: resolvedAddress,
            sqft: formattedSqft,
            status: resolvedStatus,
            badge: resolvedBadge,
            badgeColor: p.badge_color || "blue",
            image: primaryImage,
            images: overrideImages.length > 0 ? overrideImages : [primaryImage],
            description:
              propOverrides.description ||
              p.description ||
              `${resolvedName} managed by ${org.brand_name || org.name}.`,
            highlights: features,
          };
        });
      }

      // Resolve custom Hero Banner slides if configured in Site Builder
      const rawHeroVal = heroSettingRes.data?.value;
      const heroCfg =
        typeof rawHeroVal === "string"
          ? (() => {
              try {
                return JSON.parse(rawHeroVal);
              } catch {
                return null;
              }
            })()
          : rawHeroVal;

      if (heroCfg && Array.isArray(heroCfg.slides) && heroCfg.slides.length > 0) {
        const enabledSlides = [...heroCfg.slides]
          .filter((s: any) => s && s.enabled !== false)
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

        heroSlides = enabledSlides
          .map((s: any, idx: number): HeroSlideItem | null => {
            if (s.type === "property" && s.propertyId) {
              const match = formattedProperties.find((fp) => fp.id === s.propertyId);
              if (match) {
                return {
                  propertyId: match.id,
                  name: s.label || match.name,
                  tagline: match.description?.slice(0, 80) || match.type,
                  submarket: s.location || match.city || match.type,
                  image: s.imageUrl || match.image,
                  type: match.type,
                  featuredSuite: match.status,
                  suiteSpecs: match.sqft !== "—" ? `${match.sqft} sq ft` : "",
                  rate: "Contact for pricing",
                  badge: match.badge,
                };
              }
            }
            if (s.imageUrl) {
              return {
                propertyId: s.propertyId || `slide-${idx}`,
                name: s.label || org.brand_name || org.name,
                tagline: org.description?.slice(0, 80) || "Featured Property",
                submarket: s.location || org.city || "Featured",
                image: s.imageUrl,
                type: "Featured",
                featuredSuite: "Available",
                suiteSpecs: "",
                rate: "Contact for pricing",
                badge: "Featured",
              };
            }
            return null;
          })
          .filter((item): item is HeroSlideItem => item !== null);
      }
    } catch (err) {
      console.warn("[TenantPublicSite] Error querying properties/content:", err);
    }
  }

  if (heroSlides.length === 0) {
    heroSlides = formattedProperties.slice(0, 4).map((p) => ({
      propertyId: p.id,
      name: p.name,
      tagline: p.description?.slice(0, 80) || p.type,
      submarket: p.city || p.type,
      image: p.image,
      type: p.type,
      featuredSuite: p.status,
      suiteSpecs: p.sqft !== "—" ? `${p.sqft} sq ft` : "",
      rate: "Contact for pricing",
      badge: p.badge,
    }));
  }

  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL || BRAND.url.replace(/\/$/, "");
  const canonicalUrl = org.custom_domain
    ? `https://${org.custom_domain}`
    : `${siteBase}/site/${org.slug}`;

  const jsonLdData = publiclyLive
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "RealEstateAgent",
            "@id": `${canonicalUrl}#organization`,
            name: org.brand_name || org.name,
            url: canonicalUrl,
            description:
              org.description ||
              `Residential and commercial properties managed by ${org.brand_name || org.name}.`,
            telephone: org.contact_phone || undefined,
            email: org.contact_email || undefined,
            address: (org.city || formattedProperties[0]?.city)
              ? {
                  "@type": "PostalAddress",
                  addressLocality: org.city || formattedProperties[0]?.city,
                  addressCountry: "US",
                }
              : undefined,
          },
          ...formattedProperties.map((prop) => ({
            "@type": "RealEstateListing",
            "@id": `${canonicalUrl}#listing-${prop.id}`,
            name: prop.name,
            description: prop.description,
            image: prop.image,
            category: prop.type,
            availableAtOrFrom: {
              "@type": "Place",
              name: prop.name,
              address: {
                "@type": "PostalAddress",
                streetAddress: prop.address,
                addressLocality: prop.city,
                addressCountry: "US",
              },
            },
          })),
        ],
      }
    : null;

  return (
    <>
      {jsonLdData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdData) }}
        />
      )}
      <TenantSiteClient
        initialOrg={org}
        initialProperties={formattedProperties}
        initialHeroSlides={heroSlides}
        initialSiteContent={siteContent}
        sitePublished={publiclyLive}
      />
    </>
  );
}
