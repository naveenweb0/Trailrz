import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getAppUrl } from "@/lib/env";

function parseMetadataBase(raw: string): URL | undefined {
  if (!raw) return undefined;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(normalized);
  } catch {
    return undefined;
  }
}

const metadataBase = parseMetadataBase(getAppUrl());

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: {
    default: "TRAILRZ — Life is happening. Go be part of it.",
    template: "%s — TRAILRZ",
  },
  description:
    "Curated cultural experiences, live music, supper clubs, workshops and TRAILRZ Originals across Chandigarh, Mohali and Panchkula.",
  icons: {
    icon: "/trailrz-logo.png",
  },
  openGraph: {
    title: "TRAILRZ — Life is happening. Go be part of it.",
    description:
      "Curated cultural experiences, live music, supper clubs, workshops and TRAILRZ Originals across Chandigarh, Mohali and Panchkula.",
    type: "website",
    siteName: "TRAILRZ",
    images: ["/trailrz-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TRAILRZ — Life is happening. Go be part of it.",
    description:
      "Curated cultural experiences, live music, supper clubs, workshops and TRAILRZ Originals across Chandigarh, Mohali and Panchkula.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Fonts are self-hosted through @fontsource imports in globals.css —
            no render-blocking cross-origin stylesheet needed here. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var path = window.location.pathname || '';
                var isAppRoute = path.indexOf('/admin') === 0 || path.indexOf('/gate') === 0 || path.indexOf('/sign-in') === 0 || path.indexOf('/sign-up') === 0;
                var p = new URLSearchParams(window.location.search);
                if (!isAppRoute && !p.has('nopreload') && !sessionStorage.getItem('trz_intro')) {
                  document.documentElement.classList.add('trz-intro-pending');
                  setTimeout(function() {
                    document.documentElement.classList.remove('trz-intro-pending');
                  }, 2500);
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-parchment text-ink">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
