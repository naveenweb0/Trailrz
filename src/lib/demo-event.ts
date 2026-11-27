import { prisma } from "./prisma";
import { newId } from "./constants";

export const DEMO_EVENT_SLUG = "trailrz-demo-experience";

export async function ensureDemoEvent(status: "draft" | "published" = "draft") {
  const existing = await prisma.event.findUnique({
    where: { slug: DEMO_EVENT_SLUG },
    select: { id: true, status: true },
  });

  if (existing) {
    return existing;
  }

  const startAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 3 * 60 * 60 * 1000);

  return prisma.event.create({
    data: {
      id: newId(),
      slug: DEMO_EVENT_SLUG,
      title: "TRAILRZ Demo Experience",
      category: "Music",
      moods: ["Music Nights", "With Friends"],
      experienceType: "Live Session",
      isOriginal: true,
      shortDescription: "Protected demo experience for testing bookings, passes, and gate check-in.",
      description:
        "This is a protected TRAILRZ demo event. It cannot be deleted and is automatically unpublished (set to Draft) when the database is cleared so you can republish it anytime.",
      organizer: "TRAILRZ",
      city: "Chandigarh",
      venue: "The Courtyard",
      address: "Sector 17 Plaza, Chandigarh",
      startAt,
      endAt,
      coverImage: {
        url: "/img/concert.jpg",
        alt: "TRAILRZ Demo Experience",
      },
      status,
      createdBy: "system",
      ticketTypes: {
        create: [
          {
            id: newId(),
            name: "General Pass",
            description: "Standard demo entry pass",
            price: 49900,
            capacity: 100,
            sold: 0,
            reserved: 0,
            maxPerBooking: 10,
            active: true,
            sort: 0,
          },
        ],
      },
    },
    select: { id: true, status: true },
  });
}
