"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ExternalLink, LayoutDashboard } from "lucide-react";

export default function AdminHeader() {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6
      bg-[rgba(8,12,20,0.92)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">

      {/* ── Left: Logo + context badge ── */}
      <button
        onClick={() => router.push("/admin?tab=leads")}
        className="flex items-center gap-2.5 group"
        aria-label="Go to dashboard home"
      >
        <Image
          src="/vision-logo.png"
          alt="Vision LLC"
          width={88}
          height={28}
          className="h-7 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
          priority
        />
        <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.08)] text-[10px] font-black text-[#4ADE80] uppercase tracking-widest">
          <LayoutDashboard size={9} />
          Admin
        </span>
      </button>

      {/* ── Right: View Live Site CTA ── */}
      <a
        href="https://www.teamvisionllc.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
          border border-[rgba(255,255,255,0.10)] text-gray-400
          hover:border-[rgba(255,255,255,0.22)] hover:text-white
          hover:bg-[rgba(255,255,255,0.04)]
          transition-all duration-150 group"
      >
        <span className="hidden sm:inline">View Live Site</span>
        <span className="sm:hidden">Live Site</span>
        <ExternalLink size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
      </a>
    </header>
  );
}
