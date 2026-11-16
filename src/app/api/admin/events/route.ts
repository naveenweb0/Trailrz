import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const where: any = {};
    if (city && city !== "All") where.city = city;
    if (category && category !== "All") where.category = category;
    if (status && status !== "All") where.status = status;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { venueName: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { eventDate: "desc" },
      include: {
        ticketTypes: true,
        _count: {
          select: {
            bookings: { where: { bookingStatus: "CONFIRMED" } },
          },
        },
      },
    });

    const formatted = events.map((ev) => {
      const totalCapacity = ev.ticketTypes.reduce((acc, t) => acc + t.quantityTotal, 0);
      const totalSold = ev.ticketTypes.reduce((acc, t) => acc + t.quantitySold, 0);

      return {
        ...ev,
        totalCapacity,
        totalSold,
        confirmedBookingsCount: ev._count.bookings,
      };
    });

    return NextResponse.json({ success: true, count: formatted.length, events: formatted });
  } catch (error: any) {
    console.error("GET /api/admin/events error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      slug: customSlug,
      shortDescription,
      fullDescription,
      category,
      subcategory,
      tags = [],
      eventType = "CURATED",
      isFeatured = false,
      isOriginal = false,
      mood,
      coverImage,
      galleryImages = [],
      city,
      venueName,
      fullAddress,
      googleMapsUrl,
      latitude,
      longitude,
      eventDate,
      startTime,
      endTime,
      bookingOpensAt,
      bookingClosesAt,
      ageRestriction = "16+",
      highlights = [],
      whatToExpect,
      artistInfo,
      rules = [],
      faqs = [],
      cancellationPolicy,
      accessibilityInfo,
      entryInstructions,
      metaTitle,
      metaDescription,
      status = "PUBLISHED",
      ticketTypes = [],
    } = body;

    if (!title || !shortDescription || !fullDescription || !category || !city || !venueName || !eventDate || !startTime) {
      return NextResponse.json(
        { success: false, error: "Please fill in all required event details." },
        { status: 400 }
      );
    }

    let slug = customSlug ? slugify(customSlug) : slugify(title);
    // Ensure slug uniqueness
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).substring(2, 6)}`;
    }

    const parsedEventDate = new Date(eventDate);
    const parsedBookingOpens = bookingOpensAt ? new Date(bookingOpensAt) : new Date();
    const parsedBookingCloses = bookingClosesAt
      ? new Date(bookingClosesAt)
      : new Date(parsedEventDate.getTime() - 2 * 60 * 60 * 1000);

    const createdEvent = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.create({
        data: {
          title: title.trim(),
          slug,
          shortDescription: shortDescription.trim(),
          fullDescription: fullDescription.trim(),
          category,
          subcategory: subcategory?.trim() || null,
          tags: JSON.stringify(tags),
          eventType,
          isFeatured: Boolean(isFeatured),
          isOriginal: Boolean(isOriginal) || eventType === "TRAILRZ_ORIGINAL",
          mood: mood?.trim() || null,
          coverImage:
            coverImage ||
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
          city,
          venueName: venueName.trim(),
          fullAddress: fullAddress.trim(),
          googleMapsUrl: googleMapsUrl?.trim() || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          eventDate: parsedEventDate,
          startTime,
          endTime: endTime || null,
          bookingOpensAt: parsedBookingOpens,
          bookingClosesAt: parsedBookingCloses,
          ageRestriction,
          highlights: JSON.stringify(highlights),
          whatToExpect: whatToExpect?.trim() || null,
          artistInfo: artistInfo?.trim() || null,
          rules: JSON.stringify(rules),
          faqs: JSON.stringify(faqs),
          cancellationPolicy: cancellationPolicy?.trim() || null,
          accessibilityInfo: accessibilityInfo?.trim() || null,
          entryInstructions: entryInstructions?.trim() || null,
          metaTitle: metaTitle?.trim() || title,
          metaDescription: metaDescription?.trim() || shortDescription,
          status,
          images: {
            create: galleryImages.map((img: any, idx: number) => ({
              url: typeof img === "string" ? img : img.url,
              caption: typeof img === "object" ? img.caption : null,
              sortOrder: idx,
            })),
          },
          ticketTypes: {
            create:
              ticketTypes.length > 0
                ? ticketTypes.map((t: any) => ({
                    name: t.name,
                    description: t.description || null,
                    price: parseInt(t.price) || 0, // paise
                    quantityTotal: parseInt(t.quantityTotal) || 100,
                    quantitySold: 0,
                    maxPerBooking: parseInt(t.maxPerBooking) || 6,
                    minPerBooking: parseInt(t.minPerBooking) || 1,
                    status: t.status || "ACTIVE",
                  }))
                : [
                    {
                      name: "General Admission",
                      description: "Standard Entry Ticket",
                      price: 49900,
                      quantityTotal: 100,
                      quantitySold: 0,
                      status: "ACTIVE",
                    },
                  ],
          },
        },
        include: {
          ticketTypes: true,
          images: true,
        },
      });

      // Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "EVENT_CREATED",
          entityType: "Event",
          entityId: ev.id,
          details: JSON.stringify({ title: ev.title, slug: ev.slug, city: ev.city }),
        },
      });

      return ev;
    });

    return NextResponse.json({ success: true, event: createdEvent });
  } catch (error: any) {
    console.error("POST /api/admin/events error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create event" },
      { status: 500 }
    );
  }
}
