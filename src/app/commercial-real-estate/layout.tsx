import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commercial Real Estate Bristol TN/VA | Office, Retail & Industrial | Vision LLC",
  description:
    "Browse Vision LLC's commercial properties in Bristol TN/VA — office suites, retail storefronts, coworking, mixed-use & industrial. Downtown Bristol's largest private owner. Call 423-573-1022.",
  keywords: [
    "commercial real estate Bristol TN",
    "commercial real estate Bristol VA",
    "office space Bristol Tennessee",
    "office space Bristol Virginia",
    "retail space downtown Bristol",
    "commercial property for lease Bristol",
    "coworking Bristol TN",
    "coworking Bristol VA",
    "mixed-use commercial Bristol",
    "executive office suites Bristol",
    "Vision LLC properties",
    "Tri-Cities commercial property",
    "Bristol TN warehouse space",
    "Bristol VA warehouse space",
    "industrial space Sullivan County TN",
    "Downtown Bristol office lease",
  ],
  alternates: {
    canonical: "https://www.teamvisionllc.com/commercial-real-estate",
  },
  openGraph: {
    title: "Commercial Real Estate Portfolio | Vision LLC — Bristol, TN/VA",
    description:
      "Executive offices, retail storefronts, coworking, mixed-use & industrial space in Downtown Bristol, TN/VA. Tri-Cities #1 private commercial property owner. 423-573-1022.",
    url: "https://www.teamvisionllc.com/commercial-real-estate",
    type: "website",
    siteName: "Vision LLC",
    images: [
      {
        url: "https://www.teamvisionllc.com/api/og?title=Commercial+Properties&subtitle=Bristol%2C+TN+%E2%80%94+Office+%C2%B7+Retail+%C2%B7+Industrial+%C2%B7+CoWork&tag=Browse+Listings&type=property",
        width: 1200,
        height: 630,
        alt: "Vision LLC Commercial Properties — Bristol, TN/VA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Commercial Real Estate | Vision LLC — Bristol, TN/VA",
    description:
      "Browse 50+ commercial properties in Downtown Bristol & the Tri-Cities. Office, retail, coworking & industrial. Call 423-573-1022.",
    images: [
      "https://www.teamvisionllc.com/api/og?title=Commercial+Properties&subtitle=Bristol%2C+TN+%E2%80%94+Office+%C2%B7+Retail+%C2%B7+Industrial+%C2%B7+CoWork&tag=Browse+Listings&type=property",
    ],
  },
};

export default function CommercialRealEstateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Vision LLC Commercial Real Estate Listings — Bristol, TN/VA",
            description: "Browse available commercial properties in Downtown Bristol and the Tri-Cities TN/VA region.",
            url: "https://www.teamvisionllc.com/commercial-real-estate",
            numberOfItems: 9,
            itemListOrder: "https://schema.org/ItemListUnordered",
            provider: {
              "@type": "RealEstateAgent",
              name: "Vision LLC",
              url: "https://www.teamvisionllc.com",
              telephone: "+14235731022",
              address: {
                "@type": "PostalAddress",
                streetAddress: "100 5th St., Suite 2W",
                addressLocality: "Bristol",
                addressRegion: "TN",
                postalCode: "37620",
                addressCountry: "US",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: "36.5951",
                longitude: "-82.1887",
              },
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.teamvisionllc.com" },
              { "@type": "ListItem", position: 2, name: "Commercial Real Estate", item: "https://www.teamvisionllc.com/commercial-real-estate" },
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
