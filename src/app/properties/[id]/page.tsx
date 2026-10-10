import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { MapPin, Phone, ArrowRight, Check, ArrowLeft, Star } from "lucide-react";
import { PROPERTIES, COMPANY } from "@/lib/data";
import Navigation from "@/components/Navigation";
import LeaseBotTrigger from "@/components/LeaseBotTrigger";
import CustomSearchCTA from "@/components/CustomSearchCTA";
import PropertyGallery from "@/components/PropertyGallery";
import { fetchImageOverrides, resolveHeroImage, resolveAllImages } from "@/lib/property-image-overrides";
import { getPropertyOverrides } from "@/lib/site-content";
import SafeEmail from "@/components/SafeEmail";


type Props = { params: Promise<{ id: string }> };

export const dynamicParams = true; // allow dynamic property pages without rebuild

async function getDynamicProperty(id: string) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !KEY) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?id=eq.${id}&published=eq.true&select=*`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows[0]) return null;
    const p = rows[0];
    return {
      id: p.id, name: p.name, type: p.type, address: p.address, city: p.city, sqft: p.sqft || "TBD",
      status: p.lease_status === "available" ? "Available" : p.lease_status === "leased" ? "Leased" : "Coming Soon",
      badge: p.badge || p.type, badgeColor: "green",
      image: p.hero_image || (p.images?.[0] ?? ""),
      images: p.images || [],
      imageAlt: p.name,
      description: p.description || "",
      features: p.features || [],
    };
  } catch { return null; }
}

export async function generateStaticParams() {
  return PROPERTIES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const property = PROPERTIES.find((p) => p.id === id) || await getDynamicProperty(id);
  if (!property) return { title: "Property Not Found | Vision LLC" };

  // Build a proper meta description — not a raw text slice that cuts mid-sentence
  const city = property.city || "Bristol, TN";
  const rawDesc = property.description || "";
  const shortDesc = rawDesc.length > 100
    ? rawDesc.substring(0, rawDesc.lastIndexOf(" ", 100)) + "."
    : rawDesc;
  const metaDesc = `${property.name} — ${property.type} in ${city}. ${shortDesc} Vision LLC. Call 423-573-1022.`.substring(0, 155);

  // Use the actual city in the title — not a hardcoded "Bristol TN/VA"
  const cityShort = city.replace(", Tennessee", ", TN").replace(", Virginia", ", VA");
  const ogTitle = encodeURIComponent(property.name);
  const ogSubtitle = encodeURIComponent(`${property.type} · ${city} · ${property.sqft} sqft`);
  const ogTag = encodeURIComponent(property.status === "Available" ? "Available Now" : property.status);
  const ogUrl = `https://www.teamvisionllc.com/api/og?title=${ogTitle}&subtitle=${ogSubtitle}&tag=${ogTag}&type=property`;
  return {
    title: `${property.name} | ${property.type} in ${cityShort} | Vision LLC`,
    description: metaDesc,
    alternates: {
      canonical: `https://www.teamvisionllc.com/properties/${id}`,
    },
    openGraph: {
      title: `${property.name} | Vision LLC`,
      description: metaDesc,
      url: `https://www.teamvisionllc.com/properties/${id}`,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${property.name} — ${property.type} in ${city}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${property.name} | Vision LLC`,
      description: metaDesc,
      images: [ogUrl],
    },
  };
}


export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  let property = PROPERTIES.find((p) => p.id === id) || await getDynamicProperty(id);
  if (!property) notFound();

  // ── Apply CMS text overrides (from admin Property Editor) ─────────────
  const propOverrides = await getPropertyOverrides();
  const po = propOverrides[id];
  if (po) {
    property = {
      ...property,
      name: po.name || property.name,
      type: po.type || property.type,
      city: po.city || property.city,
      sqft: po.sqft || property.sqft,
      status: po.status || property.status,
      badge: po.badge ?? property.badge,
      description: po.description || property.description,
      features: po.features ? po.features.split("\n").filter(Boolean) : property.features,
      ...(po.address ? { address: po.address } : {}),
      ...(po.imageAlt ? { imageAlt: po.imageAlt } : {}),
    };
  }

  // ── Resolve images: override table wins over static data ─────────────────
  const overrides = await fetchImageOverrides();
  const images: string[] = resolveAllImages(
    property.id,
    (property as any).images,
    (property as any).image,
    overrides
  );
  const heroImage: string = resolveHeroImage(property.id, (property as any).image, overrides) || images[0] || "";

  const badgeColors: Record<string, string> = {
    green: "bg-[rgba(74,222,128,0.12)] text-[#4ADE80] border-[rgba(74,222,128,0.3)]",
    gold: "bg-[rgba(250,204,21,0.12)] text-[#FACC15] border-[rgba(250,204,21,0.3)]",
    blue: "bg-[rgba(96,165,250,0.12)] text-[#60A5FA] border-[rgba(96,165,250,0.3)]",
    gray: "bg-[rgba(156,163,175,0.12)] text-[#9CA3AF] border-[rgba(156,163,175,0.3)]",
  };

  // ── JSON-LD Schema ─────────────────────────────────────────────────────────
  const listingSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.name,
    description: property.description,
    url: `https://www.teamvisionllc.com/properties/${property.id}`,
    image: heroImage ? [`https://www.teamvisionllc.com${heroImage}`] : [],
    address: {
      "@type": "PostalAddress",
      streetAddress: (property as any).address || "Downtown Bristol",
      addressLocality: property.city.replace(", TN", "").replace(", VA", ""),
      addressRegion: property.city.includes("VA") ? "VA" : "TN",
      postalCode: "37620",
      addressCountry: "US",
    },
    floorSize: {
      "@type": "QuantitativeValue",
      value: property.sqft,
      unitCode: "FTK",
      unitText: "square feet",
    },
    amenityFeature: property.features.map((f: string) => ({
      "@type": "LocationFeatureSpecification",
      name: f,
      value: true,
    })),
    offers: {
      "@type": "Offer",
      businessFunction: "https://purl.org/goodrelations/v1#LeaseOut",
      availability: property.status === "Available"
        ? "https://schema.org/InStock"
        : property.status === "Coming Soon"
          ? "https://schema.org/PreOrder"
          : "https://schema.org/SoldOut",
      seller: {
        "@type": "Organization",
        name: "Vision LLC",
        telephone: "+14235731022",
        url: "https://www.teamvisionllc.com",
      },
    },
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `Vision LLC — ${property.name}`,
    description: property.description.substring(0, 200),
    url: `https://www.teamvisionllc.com/properties/${property.id}`,
    telephone: "+14235731022",
    address: {
      "@type": "PostalAddress",
      streetAddress: "100 5th St., Suite 2W",
      addressLocality: "Bristol",
      addressRegion: "TN",
      postalCode: "37620",
      addressCountry: "US",
    },
    hasMap: `https://maps.google.com/?q=${encodeURIComponent(property.city)}`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.teamvisionllc.com" },
      { "@type": "ListItem", position: 2, name: "Properties", item: "https://www.teamvisionllc.com/commercial-real-estate" },
      { "@type": "ListItem", position: 3, name: property.name, item: `https://www.teamvisionllc.com/properties/${property.id}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Navigation />
      <main>
        {/* Back nav */}
        <div className="pt-24 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Link
            href="/commercial-real-estate"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#4ADE80] transition-colors"
          >
            <ArrowLeft size={14} /> Back to All Properties
          </Link>
        </div>

        {/* ── Hero Gallery ─────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 pb-10">
          <div className="max-w-7xl mx-auto">
            <PropertyGallery
              images={images}
              heroImage={heroImage}
              propertyName={property.name}
              badge={property.badge}
              badgeColorClass={badgeColors[property.badgeColor] || badgeColors.green}
              status={property.status}
            />
          </div>
        </section>


        {/* Content */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2">
              <div className="mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{property.type}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">{property.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
                <MapPin size={14} className="text-[#4ADE80]" />
                {property.address || property.city}
                <span className="mx-2 text-gray-700">·</span>
                {property.sqft} sqft
              </div>

              <div className="section-line mb-6" />
              <h2 className="text-xl font-bold text-white mb-4">About This Property</h2>
              <p className="text-gray-300 text-base leading-relaxed mb-8">{property.description}</p>

              {/* Video Embed */}
              {(property as any).videoUrl && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.2)] flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14v14l11-7-11-7z" fill="#FACC15"/></svg>
                    </span>
                    Take a Virtual Tour
                  </h2>
                  <div className="relative rounded-2xl overflow-hidden border border-[rgba(74,222,128,0.12)] bg-[#111827]" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={(property as any).videoUrl}
                      title={`${property.name} — Video Tour`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              )}

              <h2 className="text-xl font-bold text-white mb-4">Features & Amenities</h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {property.features.map((f: string) => (
                  <div key={f} className="flex items-center gap-3 glass rounded-xl p-3 border border-[rgba(74,222,128,0.08)]">
                    <Check size={15} className="text-[#4ADE80] flex-shrink-0" />
                    <span className="text-sm text-gray-300">{f}</span>
                  </div>
                ))}
              </div>

              {/* Location */}
              <h2 className="text-xl font-bold text-white mb-3">Location</h2>
              <p className="text-gray-400 text-sm">
                Located in the heart of the Tri-Cities commercial corridor — serving Bristol TN/VA, Kingsport, Johnson City, and the broader Northeast Tennessee/Southwest Virginia region.
              </p>
            </div>

            {/* Sidebar CTA */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
              <div className="glass rounded-2xl p-6 border border-[rgba(74,222,128,0.15)]">
                <h3 className="text-lg font-bold text-white mb-1">Interested in This Space?</h3>
                <p className="text-sm text-gray-400 mb-6">Our team responds within one business day. Inquire today to schedule a tour.</p>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="text-white font-medium">{property.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Size</span>
                    <span className="text-white font-medium">{property.sqft} sqft</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="text-[#4ADE80] font-medium">{property.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Market</span>
                    <span className="text-white font-medium">{property.city}</span>
                  </div>
                </div>

                <a href={COMPANY.phoneHref} className="btn-primary w-full justify-center mb-3">
                  <Phone size={16} /> Call {COMPANY.phone}
                </a>
                <Link href="/contact" className="btn-secondary w-full justify-center mb-4">
                  Send Inquiry <ArrowRight size={16} />
                </Link>
                <LeaseBotTrigger propertyName={property.name} variant="detail" />

                <p className="text-center text-xs text-gray-600 mt-4">
                  <SafeEmail className="hover:underline text-[#4ADE80]" />
                </p>
              </div>

              {/* Google Review CTA */}
              {(property as any).reviewUrl && (
                <a
                  href={(property as any).reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-2xl p-5 border border-[rgba(250,204,21,0.2)] hover:border-[rgba(250,204,21,0.4)] transition-all group flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.2)] flex items-center justify-center flex-shrink-0 group-hover:bg-[rgba(250,204,21,0.18)] transition-colors">
                    <Star size={20} className="text-[#FACC15]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-[#FACC15] transition-colors">Leave Us a Review</p>
                    <p className="text-xs text-gray-500">Share your experience on Google</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-600 ml-auto group-hover:text-[#FACC15] transition-colors" />
                </a>
              )}
              </div>
            </div>
          </div>
        </section>

        {/* Other properties */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-[rgba(74,222,128,0.08)] bg-[#0D1117]/50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-black text-white mb-8">Other Available Properties</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PROPERTIES.filter((p) => p.id !== property.id).slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  href={`/properties/${p.id}`}
                  className="group glass rounded-xl overflow-hidden border border-[rgba(74,222,128,0.08)] hover:border-[rgba(74,222,128,0.25)] transition-all"
                >
                  <div className="relative h-36 bg-[#111827]">
                    {(p as any).image && (
                      <Image src={(p as any).image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/60 to-transparent" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-white group-hover:text-[#4ADE80] transition-colors">{p.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{p.city} · {p.sqft} sqft</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <CustomSearchCTA />
      </main>
    </>
  );
}
