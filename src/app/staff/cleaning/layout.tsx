import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cleaning Portal — PropOpsIQ",
  description: "PropOpsIQ Staff Cleaning Portal. Manage daily property updates and reports.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Cleaning Portal — PropOpsIQ",
    description: "PropOpsIQ Staff Cleaning Portal. Manage daily property updates and reports.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/staff/cleaning`,
    siteName: "PropOpsIQ Cleaning",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cleaning Portal — PropOpsIQ",
    description: "PropOpsIQ Staff Cleaning Portal. Manage daily property updates and reports.",
  },
  manifest: "/cleaning.webmanifest",
  icons: {
    icon: "/staff/cleaning/icon",
    apple: "/staff/cleaning/apple-icon",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Cleaning",
    "theme-color": "#071207",
    "mobile-web-app-capable": "yes",
  },
};

export default function CleaningPortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
