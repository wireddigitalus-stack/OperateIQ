import type { Metadata } from "next";

// QR capture / agent meet pages are private lead-gen tools — never index
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MeetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
