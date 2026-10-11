import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import AdminHeader from "@/components/AdminHeader";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { IMPERSONATE_COOKIE } from "@/lib/platform";

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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isImpersonating = !!cookieStore.get(IMPERSONATE_COOKIE)?.value;

  return (
    <>
      <AdminHeader />
      <ImpersonationBanner />
      {/* pt-28 (112px) clears the fixed 56px header + 40px support mode banner with 16px buffer; pt-16 (64px) for standard header */}
      {/* Suspense required for useSearchParams() in Next.js 15 production builds */}
      <div className={`admin-content-wrapper transition-all duration-150 ${isImpersonating ? "pt-28" : "pt-16"}`}>
        <Suspense fallback={<div className="min-h-screen bg-[#040812]" />}>
          {children}
        </Suspense>
      </div>
    </>
  );
}
