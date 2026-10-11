import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/AdminHeader";

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
      <div className="admin-content-wrapper pt-16">
        <Suspense fallback={<div className="min-h-screen bg-[#040812]" />}>
          {children}
        </Suspense>
      </div>
    </>
  );
}
