"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";

const appearance = {
  variables: {
    colorPrimary: "#181614",
    colorPrimaryForeground: "#FAF7F2",
    colorBackground: "#FFFDF9",
    colorForeground: "#181614",
    colorInput: "#FFFFFF",
    colorInputForeground: "#181614",
    colorBorder: "#E6DED0",
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    borderRadius: "2px",
  },
};

const isKeyValid = (key) => {
  if (!key || typeof key !== "string") return false;
  if (!key.startsWith("pk_test_") && !key.startsWith("pk_live_")) return false;
  if (key.includes("mock") || key.includes("placeholder")) return false;
  try {
    const raw = key.replace(/^pk_(test|live)_/, "");
    const decoded = typeof window !== "undefined" ? atob(raw) : Buffer.from(raw, "base64").toString("utf-8");
    return decoded.endsWith("$") && decoded.includes(".");
  } catch {
    return false;
  }
};

export default function ClerkAuthProvider({ children }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const cfg = await (await fetch(`/api/clerk/config`)).json();
        if (cfg.enabled) return cancelled || setConfig(cfg);
      } catch {}
      if (cancelled) return;
      if (attempt >= 5) return setUnavailable(true);
      setTimeout(() => load(attempt + 1), 1000);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (unavailable) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="font-display text-3xl mb-3">Sign-in Unavailable</h2>
          <p className="text-mineral text-sm mb-6">Staff authentication service could not be reached.</p>
          <Link href="/" className="btn-ink text-sm">Return to TRAILRZ</Link>
        </div>
      </div>
    );
  }

  if (!config) return null;

  if (!isKeyValid(config.publishable_key)) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="font-display text-3xl mb-3">Authentication Not Configured</h2>
          <p className="text-mineral text-sm mb-6">
            To access staff features (admin & gate), configure your real Clerk keys in <code className="bg-linen px-1 py-0.5 rounded text-ink">.env</code>:
            <br />
            <span className="block mt-2 font-mono text-xs text-ink-deep font-bold">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span>
            <span className="block font-mono text-xs text-ink-deep font-bold">CLERK_SECRET_KEY</span>
          </p>
          <Link href="/" className="btn-ink text-sm">Return to TRAILRZ</Link>
        </div>
      </div>
    );
  }
  return (
    <ClerkProvider
      publishableKey={config.publishable_key}
      proxyUrl={config.proxy_url || undefined}
      appearance={appearance}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/admin"
      signUpFallbackRedirectUrl="/admin"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkProvider>
  );
}
