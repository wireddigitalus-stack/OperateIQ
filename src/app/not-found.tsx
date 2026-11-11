import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] bg-[#070B14] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-[#0E1526] border border-white/10 p-8 shadow-2xl space-y-5 text-center">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-bold tracking-wider uppercase">
          404 · Page Not Found
        </div>
        <h1 className="text-2xl font-black tracking-tight">We couldn&apos;t find that page</h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          The link may have moved or the workspace URL may not be published yet.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition"
          >
            Back to PropOpsIQ Home
          </Link>
          <Link
            href="/admin"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 font-semibold text-xs transition"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
