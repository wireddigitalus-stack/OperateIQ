import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/AdminHeader";

export const metadata: Metadata = {
  title: "VISION | Property Intelligence Platform",
  description: "Internal admin dashboard for VISION LLC — real-time property analytics, lead management, content editing, and marketing tools.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "VISION — Admin Dashboard",
    description: "Property Intelligence Platform · Lead management, content editing, analytics & marketing tools.",
    siteName: "VISION LLC",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VISION — Admin Dashboard",
    description: "Property Intelligence Platform · Internal admin tools.",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminHeader />
      {/* pt-16 gives 4px of breathing room below the fixed 56px (h-14) admin header */}
      {/* Suspense required for useSearchParams() in Next.js 15 production builds */}
      <div className="pt-16">
        <Suspense fallback={<div className="min-h-screen bg-[#040812]" />}>
          {children}
        </Suspense>
      </div>
    </>
  );
}
