import Link from "next/link";

// Text wordmark until a real logo exists.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-extrabold tracking-tight text-xl ${className}`}>
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg oiq-grad-bg shadow-[0_0_18px_rgba(99,102,241,.6)] text-white font-black text-xs leading-none tracking-tight select-none border border-white/20" aria-hidden>
        IQ
      </span>
      <span className="text-white">
        Operate<span className="oiq-grad-text">IQ</span>
      </span>
    </Link>
  );
}
