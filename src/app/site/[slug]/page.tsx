import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin, supabaseAnon } from "@/lib/supabase";
import { BRAND } from "@/lib/brand";
import TenantSiteClient, {
  OrgData,
  FormattedProperty,
} from "./TenantSiteClient";
import { HeroSlideItem } from "@/components/demo-site/AcmeHeroBanner";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getOrgBySlug(slug: string): Promise<OrgData | null> {
  const client = supabaseAdmin || supabaseAnon;
  if (!client) return null;
  try {
    const { data: org, error } = await client
      .from("organizations")
      .select(
        "id, name, slug, tier, custom_domain, contact_email, contact_phone, brand_name, brand_logo_url, brand_primary_color, brand_accent_color"
      )
      .eq("slug", slug.toLowerCase().trim())
      .maybeSingle();

    if (error || !org) {
      if (error) console.error("[getOrgBySlug] Error fetching org:", error);
      return null;
    }

    const enriched: OrgData = { ...(org as OrgData) };
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
        }
      }
    } catch {
      // Optional enrichment
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
      .select("hero_image, images")
      .eq("org_id", orgId)
      .eq("published", true)
      .limit(1)
      .maybeSingle();

    const firstFromImages =
      Array.isArray(data?.images) && typeof data.images[0] === "string"
        ? data.images[0]
        : null;
    return data?.hero_image || firstFromImages || null;
  } catch {
    return null;
  }
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

  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL || BRAND.url.replace(/\/$/, "");
  const canonicalUrl = org.custom_domain
    ? `https://${org.custom_domain}`
    : `${siteBase}/site/${org.slug}`;

  const description =
    org.description ||
    `Explore commercial suites, retail spaces, and properties managed by ${org.name}.`;

  const photo = await getFirstPropertyPhoto(org.id);
  const ogImageUrl =
    photo ||
    `${siteBase}/api/og?title=${encodeURIComponent(org.name)}&subtitle=${encodeURIComponent(description)}&tag=${encodeURIComponent(org.city || "Property Portfolio")}&type=property`;

  return {
    title: `${org.name} | Property Showcase & Leasing`,
    description,
    metadataBase: new URL(siteBase),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${org.name} | Commercial & Residential Properties`,
      description,
      url: canonicalUrl,
      siteName: org.name,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: org.name,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${org.name} | Commercial & Residential Properties`,
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

      const rawProps = propsRes.data;
      if (Array.isArray(rawProps) && rawProps.length > 0) {
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

          const primaryImage =
            imgOverride?.hero_url ||
            overrideImages[0] ||
            p.hero_image ||
            p.featured_image ||
            p.image ||
            "/demo-properties/oakridge-professional-plaza.jpg";

          const resolvedName = propOverrides.name || p.name || "Commercial Asset";
          const resolvedCity = propOverrides.city || p.city || org.city || "";
          const resolvedAddress =
            propOverrides.address ||
            [p.address, resolvedCity, p.state].filter(Boolean).join(", ");
          const resolvedType = propOverrides.type || p.type || "Commercial Office";
          const resolvedStatus = propOverrides.status || p.lease_status || p.status || "Available";
          const resolvedBadge = propOverrides.badge || p.badge || resolvedType || "Featured Asset";

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
              `${resolvedName} managed by ${org.name}.`,
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
                  suiteSpecs: match.sqft !== "—" ? `${match.sqft} RSF` : "",
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
      suiteSpecs: p.sqft !== "—" ? `${p.sqft} RSF` : "",
      rate: "Contact for pricing",
      badge: p.badge,
    }));
  }

  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL || BRAND.url.replace(/\/$/, "");
  const canonicalUrl = org.custom_domain
    ? `https://${org.custom_domain}`
    : `${siteBase}/site/${org.slug}`;

  const jsonLdData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateAgent",
        "@id": `${canonicalUrl}#organization`,
        name: org.name,
        url: canonicalUrl,
        description:
          org.description ||
          `Premier commercial and residential properties managed by ${org.name}.`,
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />
      <TenantSiteClient
        initialOrg={org}
        initialProperties={formattedProperties}
        initialHeroSlides={heroSlides}
        initialSiteContent={siteContent}
      />
    </>
  );
}
