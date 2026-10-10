import Link from "next/link";

// Text wordmark until a real logo exists.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-extrabold tracking-tight text-xl ${className}`}>
      <span className="inline-block w-7 h-7 rounded-lg oiq-grad-bg shadow-[0_0_18px_rgba(99,102,241,.6)]" aria-hidden />
      <span className="text-white">
        Operate<span className="oiq-grad-text">IQ</span>
      </span>
    </Link>
  );
}
