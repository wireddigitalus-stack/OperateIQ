import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/AdminHeader";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export const metadata: Metadata = {
  title: "PropOpsIQ | Property Intelligence Platform",
  description: "Internal admin dashboard for PropOpsIQ — real-time property analytics, lead management, content editing, and marketing tools.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "PropOpsIQ — Admin Dashboard",
    description: "Property Intelligence Platform · Lead management, content editing, analytics & marketing tools.",
    siteName: "PropOpsIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PropOpsIQ — Admin Dashboard",
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
      <div className="admin-content-wrapper pt-16">
        <Suspense fallback={<div className="min-h-screen bg-[#040812]" />}>
          {children}
        </Suspense>
      </div>
    </>
  );
}
