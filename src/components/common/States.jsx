"use client";

import { Loader2 } from "lucide-react";

export const Loading = ({ label = "Loading", dark = false }) => (
  <div data-testid="state-loading" role="status" className={`flex items-center gap-3 py-16 text-sm ${dark ? "text-[#bdb3a3]" : "text-mineral"}`}>
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}…
  </div>
);

export const Empty = ({ title, children, action }) => (
  <div data-testid="state-empty" className="border-t hairline py-16 max-w-xl">
    <span className="beam-wedge mb-5" aria-hidden />
    <h3 className="font-display text-3xl">{title}</h3>
    {children && <p className="mt-3 text-mineral leading-relaxed">{children}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div data-testid="state-error" role="alert" className="border-l-2 border-invalid pl-4 py-3 my-8 max-w-xl">
    <p className="font-medium">We couldn't load this.</p>
    <p className="text-sm text-mineral mt-1">{message}</p>
    {onRetry && (
      <button data-testid="state-error-retry" onClick={onRetry} className="mt-3 text-sm underline underline-offset-4">
        Try again
      </button>
    )}
  </div>
);
