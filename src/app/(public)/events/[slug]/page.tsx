import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import EventDetail from "@/views/public/EventDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const event = await prisma.event.findFirst({
      where: { slug, status: "published" },
      select: {
        title: true,
        shortDescription: true,
        venue: true,
        city: true,
        coverImage: true,
      },
    });

    if (!event) {
      return { title: "Experience" };
    }

    const description =
      event.shortDescription ||
      `${event.title} at ${event.venue}, ${event.city} — curated by TRAILRZ.`;
    const cover = event.coverImage as { url?: string } | null;

    return {
      title: event.title,
      description,
      openGraph: {
        title: `${event.title} — TRAILRZ`,
        description,
        type: "website",
        ...(cover?.url ? { images: [{ url: cover.url }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: `${event.title} — TRAILRZ`,
        description,
        ...(cover?.url ? { images: [cover.url] } : {}),
      },
    };
  } catch {
    return { title: "Experience" };
  }
}

export default function EventDetailPage() {
  return <EventDetail />;
}
