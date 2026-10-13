import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin, supabaseAnon } from "@/lib/supabase";
import { BRAND } from "@/lib/brand";
import TenantSiteClient, {
  OrgData,
  FormattedProperty,
} from "./TenantSiteClient";
import { HeroSlideItem } from "@/components/demo-site/AcmeHeroBanner";

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
  const client = supabaseAdmin || supabaseAnon;
  if (client) {
    try {
      const { data: rawProps } = await client
        .from("properties")
        .select("*")
        .eq("org_id", org.id)
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (Array.isArray(rawProps) && rawProps.length > 0) {
        formattedProperties = rawProps.map((p: any) => {
          const sqftNum = Number(p.total_sqft || p.sqft || 0);
          const features = Array.isArray(p.features)
            ? p.features
            : Array.isArray(p.highlights)
              ? p.highlights
              : [];

          return {
            id: p.id || p.slug,
            name: p.name || "Commercial Asset",
            type: p.type || "Commercial Office",
            city: p.city || org.city || "",
            address: [p.address, p.city, p.state].filter(Boolean).join(", "),
            sqft: sqftNum > 0 ? sqftNum.toLocaleString() : "—",
            status: p.status || "Available",
            badge: p.type || "Featured Asset",
            badgeColor: "blue",
            image:
              p.hero_image ||
              (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : null) ||
              p.featured_image ||
              p.image ||
              "/demo-properties/oakridge-professional-plaza.jpg",
            description: p.description || `${p.name} managed by ${org.name}.`,
            highlights: features,
          };
        });
      }
    } catch (err) {
      console.warn("[TenantPublicSite] Error querying properties:", err);
    }
  }

  const heroSlides: HeroSlideItem[] = formattedProperties
    .slice(0, 4)
    .map((p) => ({
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

  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL || BRAND.url.replace(/\/$/, "");
  const canonicalUrl = org.custom_domain
    ? `https://${org.custom_domain}`
    : `${siteBase}/site/${org.slug}`;

  // Structured Schema.org JSON-LD for Generative Engine Optimization (GEO) & Googlebot
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
      {/* ── Ultra SEO & Generative Engine Optimization (GEO) Structured Data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />
      <TenantSiteClient
        initialOrg={org}
        initialProperties={formattedProperties}
        initialHeroSlides={heroSlides}
      />
    </>
  );
}
