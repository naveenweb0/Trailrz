import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveBaseUrl(request: NextRequest): string {
  const configured = getAppUrl();
  if (configured) return configured;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host.split(",")[0].trim()}`;
  }

  return "https://trailrz.com";
}

export async function GET(request: NextRequest) {
  const base = resolveBaseUrl(request);
  const staticUrls = [
    "/",
    "/discover",
    "/originals",
    "/about",
    "/contact",
    "/my-tickets",
    "/privacy",
    "/terms",
    "/refund-policy",
  ];

  let eventEntries: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    eventEntries = await prisma.event.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    });
  } catch (err) {
    console.warn("Sitemap DB fetch failed, serving static routes only:", err);
  }

  const staticXml = staticUrls
    .map((u) => `<url><loc>${xmlEscape(`${base}${u}`)}</loc></url>`)
    .join("");
  const eventXml = eventEntries
    .map(
      (e) =>
        `<url><loc>${xmlEscape(`${base}/events/${e.slug}`)}</loc><lastmod>${e.updatedAt.toISOString()}</lastmod></url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticXml}${eventXml}</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
