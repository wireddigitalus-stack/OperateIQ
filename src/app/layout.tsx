import type { Metadata } from "next";
import Script from "next/script";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import NavigationConditional from "@/components/NavigationConditional";
import FooterConditional from "@/components/FooterConditional";
import AIChatWidgetConditional from "@/components/AIChatWidgetConditional";
import MobileStickyBar from "@/components/MobileStickyBar";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import UnsupportedBrowserBanner from "@/components/UnsupportedBrowserBanner";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dm-sans",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  themeColor: "#080C14",
  metadataBase: new URL("https://www.teamvisionllc.com"),
  title: {
    default: "Vision LLC | Downtown Bristol's #1 Commercial Real Estate Company",
    template: "%s | Vision LLC",
  },
  description:
    "Vision LLC — Downtown Bristol's premier commercial real estate firm. Office space, retail, coworking & executive consulting across the Tri-Cities TN/VA region.",
  keywords: [
    "commercial real estate Bristol TN",
    "commercial real estate Bristol VA",
    "Tri-Cities commercial real estate",
    "office space downtown Bristol",
    "Bristol CoWork",
    "executive advisement Tri-Cities",
    "Vision LLC Bristol",
    "Sullivan County commercial real estate",
  ],
  authors: [{ name: "Vision LLC" }],
  creator: "Vision LLC",
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.teamvisionllc.com",
    siteName: "Vision LLC",
    title: "Vision LLC | Tri-Cities Commercial Real Estate Leader",
    description:
      "The largest private commercial property owner in Downtown Bristol, TN/VA. Serving the entire Tri-Cities region.",
    images: [
      {
        url: "https://www.teamvisionllc.com/vision-social.png",
        width: 1200,
        height: 630,
        alt: "Vision LLC — Commercial Real Estate Bristol TN",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vision LLC | Commercial Real Estate Leader in the Tri-Cities",
    description:
      "Award-winning commercial real estate, development & executive consulting across Bristol, Kingsport, Johnson City & the Tri-Cities.",
    images: [
      "https://www.teamvisionllc.com/vision-social.png",
    ],
  },

  // Pre-launch: noindex everywhere until NEXT_PUBLIC_ALLOW_INDEXING=true
  robots:
    process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true"
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`}>
      <head>
        {/* Google Analytics: add a NEW OperateIQ GA4 property here when ready */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="msapplication-TileColor" content="#080C14" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "RealEstateAgent",
              name: "Vision LLC",
              alternateName: "Team Vision LLC",
              url: "https://www.teamvisionllc.com",
              logo: "https://www.teamvisionllc.com/logo.png",
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
              areaServed: [
                { "@type": "City", name: "Bristol", containedIn: "Tennessee" },
                { "@type": "City", name: "Bristol", containedIn: "Virginia" },
                { "@type": "City", name: "Kingsport", containedIn: "Tennessee" },
                { "@type": "City", name: "Johnson City", containedIn: "Tennessee" },
                { "@type": "City", name: "Abingdon", containedIn: "Virginia" },
                { "@type": "City", name: "Gate City", containedIn: "Virginia" },
                { "@type": "City", name: "Elizabethton", containedIn: "Tennessee" },
                { "@type": "City", name: "Blountville", containedIn: "Tennessee" },
              ],
              description:
                "Vision LLC is the largest private commercial property owner in Downtown Bristol and an award-winning developer specializing in historic adaptive reuse across the Tri-Cities region.",
              foundingDate: "2002",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "47",
                bestRating: "5",
              },
              priceRange: "$$",
              currenciesAccepted: "USD",
              paymentAccepted: "Cash, Check, Wire Transfer",
              sameAs: [
                "https://www.facebook.com/profile.php?id=100063475843769",
                "https://www.linkedin.com/company/visionllc/posts/?feedView=all",
                "https://www.youtube.com/@visionllc204",
              ],
              hasMap: "https://maps.google.com/?q=100+5th+St+Bristol+TN+37620",
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "08:00",
                closes: "17:00",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Vision LLC",
              url: "https://www.teamvisionllc.com",
              description: "Commercial real estate, development & executive advisement across the Tri-Cities TN/VA region.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://www.teamvisionllc.com/commercial-real-estate?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="bg-mesh antialiased">
        <UnsupportedBrowserBanner />
        <AnalyticsTracker />
        <NavigationConditional />
        <main className="pb-20 lg:pb-0">{children}</main>
        <FooterConditional />
        <AIChatWidgetConditional />
        <MobileStickyBar />
      </body>
    </html>
  );
}
