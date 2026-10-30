import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/server-auth";
import { isSuperAdmin } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Platform Master Console | OpsIQ",
  description: "OpsIQ Platform Master Control Center — multi-tenant management and support impersonation.",
  robots: { index: false, follow: false },
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  // Server-side guard: tenants (authenticated non-super-admins) are strictly forbidden from /platform
  const user = await getAuthUser();
  if (user && !isSuperAdmin(user.email)) {
    redirect("/admin");
  }
  return <>{children}</>;
}
