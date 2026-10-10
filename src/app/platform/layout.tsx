import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Master Console | OperateIQ",
  description: "OperateIQ Platform Master Control Center — multi-tenant management and support impersonation.",
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
