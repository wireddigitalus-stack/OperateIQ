import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import NavigationConditional from "@/components/NavigationConditional";
import FooterConditional from "@/components/FooterConditional";
import AIChatWidgetConditional from "@/components/AIChatWidgetConditional";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import UnsupportedBrowserBanner from "@/components/UnsupportedBrowserBanner";
import { BRAND } from "@/lib/brand";

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

const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const viewport: Viewport = { themeColor: "#0B1020" };

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: "%s" },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: BRAND.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  // Pre-launch: noindex everywhere until NEXT_PUBLIC_ALLOW_INDEXING=true
  robots: ALLOW_INDEXING
    ? { index: true, follow: true }
    : { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`}>
      <head>
        {/* Google Analytics: add a NEW OperateIQ GA4 property here when ready */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: BRAND.name,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description: BRAND.description,
              url: BRAND.url,
              offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: "49", highPrice: "299" },
            }),
          }}
        />
      </head>
      <body className="bg-mesh antialiased">
        <UnsupportedBrowserBanner />
        <AnalyticsTracker />
        <NavigationConditional />
        <main>{children}</main>
        <FooterConditional />
        <AIChatWidgetConditional />
      </body>
    </html>
  );
}
