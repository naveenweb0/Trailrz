"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-[#FAF7F2] text-[#181614]">
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <span className="beam-wedge mb-6 inline-block" aria-hidden />
            <h1 className="font-display text-4xl sm:text-5xl mb-4 leading-tight">Something went quiet.</h1>
            <p className="text-[#686053] mb-8 text-sm leading-relaxed">
              We encountered an unexpected error. Please refresh or try again.
            </p>
            <button
              onClick={() => reset()}
              className="btn-ink px-8 py-3 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
