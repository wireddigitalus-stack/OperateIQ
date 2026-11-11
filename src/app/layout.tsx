import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavigationConditional from "@/components/NavigationConditional";
import FooterConditional from "@/components/FooterConditional";
import AIChatWidgetConditional from "@/components/AIChatWidgetConditional";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import UnsupportedBrowserBanner from "@/components/UnsupportedBrowserBanner";
import AuthHashRedirect from "@/components/AuthHashRedirect";
import AuthFetchBridge from "@/components/AuthFetchBridge";
import SafeWidgetBoundary from "@/components/SafeWidgetBoundary";
import localFont from "next/font/local";
import { BRAND } from "@/lib/brand";

// Self-hosted variable fonts (no build-time network fetch).
const dmSans = localFont({
  src: "./fonts/DMSans-latin-var.woff2",
  weight: "400 800",
  variable: "--font-dm-sans",
  display: "swap",
});
const inter = localFont({
  src: "./fonts/Inter-latin-var.woff2",
  weight: "400 600",
  variable: "--font-inter",
  display: "swap",
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
              offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: "29", highPrice: "149" },
            }),
          }}
        />
      </head>
      <body className="bg-mesh antialiased">
        <SafeWidgetBoundary name="auth-fetch-bridge">
          <AuthFetchBridge />
        </SafeWidgetBoundary>
        <AuthHashRedirect />
        <SafeWidgetBoundary name="unsupported-browser-banner">
          <UnsupportedBrowserBanner />
        </SafeWidgetBoundary>
        <AnalyticsTracker />
        <SafeWidgetBoundary name="public-navigation">
          <NavigationConditional />
        </SafeWidgetBoundary>
        <main>{children}</main>
        <SafeWidgetBoundary name="public-footer">
          <FooterConditional />
        </SafeWidgetBoundary>
        <AIChatWidgetConditional />
      </body>
    </html>
  );
}
