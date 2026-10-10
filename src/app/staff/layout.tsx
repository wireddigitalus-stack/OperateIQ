import type { Metadata } from "next";

// Staff portals are private — never index
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: null,
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
