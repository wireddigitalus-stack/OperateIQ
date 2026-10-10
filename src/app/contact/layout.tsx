import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Contact | ${BRAND.name}`,
  description: `Questions about ${BRAND.name}? Talk to our team about plans, onboarding, or a demo.`,
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
