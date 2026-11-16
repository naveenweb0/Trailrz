import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRAILRZ — Curated Experiences & Live Event Discovery",
  description:
    "Life is happening. Go be part of it. Discover extraordinary live music, candlelight concerts, secret supper clubs, stand-up comedy, and exclusive Trailrz Originals.",
  keywords: [
    "Trailrz",
    "Events in Chandigarh",
    "Candlelight concerts",
    "Live music",
    "Experiences in Mohali",
    "Standup comedy",
    "Pottery workshops",
    "Trailrz Originals",
    "Event tickets India",
  ],
  openGraph: {
    title: "TRAILRZ — Life is happening. Go be part of it.",
    description: "Handpicked live experiences, acoustic sessions, secret suppers, and cultural events.",
    type: "website",
    locale: "en_IN",
    siteName: "TRAILRZ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-trailrz-ivory text-trailrz-black font-sans selection:bg-trailrz-red selection:text-white">
        {children}
      </body>
    </html>
  );
}
