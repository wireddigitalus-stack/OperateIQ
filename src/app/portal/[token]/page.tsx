import type { Metadata } from "next";
import PortalClient from "./PortalClient";

export const metadata: Metadata = {
  title: "Resident Portal · PropOpsIQ",
  description: "View your rent balance, payment instructions, receipts, lease documents, and maintenance requests.",
  robots: { index: false, follow: false },
};

export default async function ResidentPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PortalClient token={token} />;
}
