import type { Metadata } from "next";

// Social redirect shortcuts (/l/fb, /l/ig) — no SEO value, never index
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RedirectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
