import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trailrz.com";

  let eventUrls: string[] = [];
  try {
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });
    eventUrls = events.map(
      (e) => `
    <url>
      <loc>${baseUrl}/events/${e.slug}</loc>
      <lastmod>${e.updatedAt.toISOString().split("T")[0]}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>`
    );
  } catch {
    eventUrls = [];
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/discover</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/my-tickets</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/policies</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>${eventUrls.join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
