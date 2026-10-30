import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance Portal — OpsIQ",
  description: "OpsIQ Staff Maintenance Portal. Manage daily facility repairs and work orders.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Maintenance Portal — OpsIQ",
    description: "OpsIQ Staff Maintenance Portal. Manage daily facility repairs and work orders.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/staff/maintenance`,
    siteName: "OpsIQ Maintenance",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maintenance Portal — OpsIQ",
    description: "OpsIQ Staff Maintenance Portal. Manage daily facility repairs and work orders.",
  },
  manifest: "/maintenance.webmanifest",
  icons: {
    icon: "/staff/maintenance/icon",
    apple: "/staff/maintenance/apple-icon",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Maintenance",
    "theme-color": "#1A1200",
    "mobile-web-app-capable": "yes",
  },
};

export default function MaintenancePortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
