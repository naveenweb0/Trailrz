import React from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getAvailableTicketQuantity } from "@/lib/inventory";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import EventClientView from "./EventClientView";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      shortDescription: true,
      metaTitle: true,
      metaDescription: true,
      coverImage: true,
      city: true,
    },
  });

  if (!event) return { title: "Experience Not Found — TRAILRZ" };

  return {
    title: `${event.metaTitle || event.title} — TRAILRZ`,
    description: event.metaDescription || event.shortDescription,
    openGraph: {
      title: `${event.title} in ${event.city} | TRAILRZ`,
      description: event.shortDescription,
      images: [event.coverImage],
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      ticketTypes: {
        where: { status: "ACTIVE" },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }

  // Get real-time available quantity for each ticket type
  const ticketTypesWithLiveInventory = await Promise.all(
    event.ticketTypes.map(async (t) => {
      const liveQty = await getAvailableTicketQuantity(t.id);
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        price: t.price,
        quantityTotal: t.quantityTotal,
        quantitySold: t.quantitySold,
        availableQuantity: liveQty,
        maxPerBooking: t.maxPerBooking,
        minPerBooking: t.minPerBooking,
        status: liveQty <= 0 ? "SOLD_OUT" : t.status,
      };
    })
  );

  // Parse JSON fields safely
  let highlights: string[] = [];
  let rules: string[] = [];
  let faqs: { q: string; a: string }[] = [];

  try {
    highlights = JSON.parse(event.highlights || "[]");
  } catch {
    highlights = [];
  }
  try {
    rules = JSON.parse(event.rules || "[]");
  } catch {
    rules = [];
  }
  try {
    faqs = JSON.parse(event.faqs || "[]");
  } catch {
    faqs = [];
  }

  // Schema.org Event JSON-LD structured data for Google SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.shortDescription,
    startDate: new Date(event.eventDate).toISOString(),
    image: [event.coverImage],
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venueName,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.fullAddress,
        addressLocality: event.city,
        addressCountry: "IN",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "TRAILRZ Experiences",
      url: "https://trailrz.com",
    },
    offers: ticketTypesWithLiveInventory.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: (t.price / 100).toFixed(2),
      priceCurrency: "INR",
      availability:
        t.availableQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      validFrom: event.bookingOpensAt.toISOString(),
    })),
  };

  const formattedEvent = {
    id: event.id,
    title: event.title,
    slug: event.slug,
    shortDescription: event.shortDescription,
    fullDescription: event.fullDescription,
    category: event.category,
    subcategory: event.subcategory,
    eventType: event.eventType,
    isFeatured: event.isFeatured,
    isOriginal: event.isOriginal,
    mood: event.mood,
    coverImage: event.coverImage,
    city: event.city,
    venueName: event.venueName,
    fullAddress: event.fullAddress,
    googleMapsUrl: event.googleMapsUrl,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    ageRestriction: event.ageRestriction,
    highlights,
    whatToExpect: event.whatToExpect,
    artistInfo: event.artistInfo,
    rules,
    faqs,
    cancellationPolicy: event.cancellationPolicy,
    accessibilityInfo: event.accessibilityInfo,
    entryInstructions: event.entryInstructions,
    images: event.images,
    ticketTypes: ticketTypesWithLiveInventory,
  };

  return (
    <div className="min-h-screen flex flex-col bg-trailrz-ivory">
      {/* Structured SEO data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      <main className="flex-grow">
        <EventClientView event={formattedEvent} />
      </main>

      <Footer />
    </div>
  );
}
