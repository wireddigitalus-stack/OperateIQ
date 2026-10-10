import type { Metadata } from "next";
import ComingSoon from "@/components/marketing/ComingSoon";

export const metadata: Metadata = { title: "Start your free trial | OperateIQ" };

export default function SignupPage() {
  return <ComingSoon title="Free trials open soon" body="Self-serve signup is almost ready. Want early access? Reach out and we'll set up your account." />;
}
