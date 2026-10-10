import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/AdminHeader";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export const metadata: Metadata = {
  title: "OperateIQ | Property Intelligence Platform",
  description: "Internal admin dashboard for OperateIQ — real-time property analytics, lead management, content editing, and marketing tools.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "OperateIQ — Admin Dashboard",
    description: "Property Intelligence Platform · Lead management, content editing, analytics & marketing tools.",
    siteName: "OperateIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OperateIQ — Admin Dashboard",
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
      <ImpersonationBanner />
      {/* pt-16 gives breathing room below the fixed 56px (h-14) admin header */}
      {/* Suspense required for useSearchParams() in Next.js 15 production builds */}
      <div className="pt-16">
        <Suspense fallback={<div className="min-h-screen bg-[#040812]" />}>
          {children}
        </Suspense>
      </div>
    </>
  );
}
