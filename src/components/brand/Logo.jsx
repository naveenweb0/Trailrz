import React from "react";

export function Logo({ className = "h-8", plate = false, testid = "trailrz-logo", alt = "TRAILRZ", variant = "light" }) {
  // "dark" swaps the lamp mark to its cream fill so the mark survives on the
  // black hero instead of disappearing into it.
  const dark = variant === "dark";
  const img = (
    <img
      src={dark ? "/trailrz-logo-dark.webp" : "/trailrz-logo.webp"}
      onError={(e) => {
        if (!e.currentTarget.dataset.fallback) {
          e.currentTarget.dataset.fallback = "1";
          e.currentTarget.src = dark ? "/trailrz-logo-dark.png" : "/trailrz-logo.png";
        }
      }}
      alt={alt}
      data-testid={testid}
      className={`object-contain w-auto ${className}`}
    />
  );

  if (plate) {
    return (
      <div
        className="inline-flex items-center justify-center rounded-[2px] bg-[#FAF7F2] border border-[#E6DED0] p-1 shadow-sm"
        data-testid={`${testid}-plate`}
      >
        {img}
      </div>
    );
  }

  return img;
}

export default Logo;
