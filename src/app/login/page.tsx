import type { Metadata } from "next";
import ComingSoon from "@/components/marketing/ComingSoon";

export const metadata: Metadata = { title: "Log in | OperateIQ" };

export default function LoginPage() {
  return <ComingSoon title="Customer login coming soon" body="Customer accounts launch with self-serve signup. Existing administrators can use the admin portal." />;
}
