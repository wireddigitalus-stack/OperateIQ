import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import NavigationConditional from "@/components/NavigationConditional";
import FooterConditional from "@/components/FooterConditional";
import AIChatWidgetConditional from "@/components/AIChatWidgetConditional";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import UnsupportedBrowserBanner from "@/components/UnsupportedBrowserBanner";
import AuthHashRedirect from "@/components/AuthHashRedirect";
import AuthFetchBridge from "@/components/AuthFetchBridge";
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
    images: [
      {
        url: "/og-share.png",
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — ${BRAND.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: ["/og-share.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/operateiq_google_ICON_logo_1791954043128.png", type: "image/png" },
      { url: "/icon.png", type: "image/png", sizes: "64x64" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
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
              offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: "99", highPrice: "499" },
            }),
          }}
        />
      </head>
      <body className="bg-mesh antialiased">
        <AuthFetchBridge />
        <AuthHashRedirect />
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
