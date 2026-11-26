import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F2] text-[#181614] px-6 text-center">
      <div className="max-w-md">
        <span className="beam-wedge mb-6 inline-block" aria-hidden />
        <p className="text-xs uppercase tracking-[0.14em] text-[#686053] mb-3">404 · Not found</p>
        <h1 className="font-display text-4xl sm:text-5xl mb-4 leading-tight">
          This room is empty.
        </h1>
        <p className="text-[#686053] mb-8 text-sm leading-relaxed">
          The page or experience you&apos;re looking for may have moved or ended.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="btn-ink px-6 py-3 text-sm font-medium">
            Back to home
          </Link>
          <Link href="/discover" className="btn-line px-6 py-3 text-sm font-medium">
            Discover experiences
          </Link>
        </div>
      </div>
    </div>
  );
}
