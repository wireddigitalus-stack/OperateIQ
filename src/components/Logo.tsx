import Link from "next/link";
import Image from "next/image";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 font-extrabold tracking-tight text-xl group ${className}`}>
      <Image
        src="/operateiq_google_ICON_logo_1791954043128.png"
        alt="OpsIQ Icon"
        width={34}
        height={34}
        className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-[0_0_14px_rgba(34,211,238,0.35)] group-hover:scale-105 transition-transform"
        priority
      />
      <span className="text-white">
        Ops<span className="oiq-grad-text">IQ</span>
      </span>
    </Link>
  );
}
