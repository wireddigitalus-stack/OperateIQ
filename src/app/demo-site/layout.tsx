import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ACME Commercial Partners — Class-A Office, Creative Flex & Logistics",
  description:
    "Explore premier commercial workspaces, creative tech lofts, and distribution facilities across Metro Core. Powered by PropOpsIQ Site Engine with Ultra SEO & Generative AI Search.",
  openGraph: {
    title: "ACME Commercial Partners — Class-A Office, Creative Flex & Logistics",
    description:
      "Explore premier commercial workspaces, creative tech lofts, and distribution facilities across Metro Core. Powered by PropOpsIQ Site Engine.",
    type: "website",
  },
};

export default function DemoSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#060911] text-white min-h-screen">{children}</div>;
}
