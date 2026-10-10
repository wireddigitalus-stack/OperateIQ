import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance Portal — Vision",
  description: "Team Vision Staff Maintenance Portal. Manage daily facility repairs and work orders.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Maintenance Portal — Vision",
    description: "Team Vision Staff Maintenance Portal. Manage daily facility repairs and work orders.",
    type: "website",
    url: "https://www.teamvisionllc.com/staff/maintenance",
    siteName: "Vision Maintenance",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maintenance Portal — Vision",
    description: "Team Vision Staff Maintenance Portal. Manage daily facility repairs and work orders.",
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
