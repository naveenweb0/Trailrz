import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        ticketTypes: { orderBy: { price: "asc" } },
        sessions: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("GET /api/admin/events/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to load event" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Handle quick status changes or duplication
    if (action === "duplicate") {
      const source = await prisma.event.findUnique({
        where: { id: params.id },
        include: { ticketTypes: true, images: true },
      });

      if (!source) {
        return NextResponse.json({ success: false, error: "Source event not found" }, { status: 404 });
      }

      const newSlug = `${source.slug}-copy-${Date.now().toString(36).substring(2, 6)}`;
      const duplicated = await prisma.event.create({
        data: {
          title: `${source.title} (Copy)`,
          slug: newSlug,
          shortDescription: source.shortDescription,
          fullDescription: source.fullDescription,
          category: source.category,
          subcategory: source.subcategory,
          tags: source.tags,
          eventType: source.eventType,
          isFeatured: false,
          isOriginal: source.isOriginal,
          mood: source.mood,
          coverImage: source.coverImage,
          city: source.city,
          venueName: source.venueName,
          fullAddress: source.fullAddress,
          googleMapsUrl: source.googleMapsUrl,
          latitude: source.latitude,
          longitude: source.longitude,
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          startTime: source.startTime,
          endTime: source.endTime,
          bookingOpensAt: new Date(),
          bookingClosesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ageRestriction: source.ageRestriction,
          highlights: source.highlights,
          whatToExpect: source.whatToExpect,
          artistInfo: source.artistInfo,
          rules: source.rules,
          faqs: source.faqs,
          cancellationPolicy: source.cancellationPolicy,
          accessibilityInfo: source.accessibilityInfo,
          entryInstructions: source.entryInstructions,
          status: "DRAFT",
          images: {
            create: source.images.map((img) => ({
              url: img.url,
              caption: img.caption,
              sortOrder: img.sortOrder,
            })),
          },
          ticketTypes: {
            create: source.ticketTypes.map((t) => ({
              name: t.name,
              description: t.description,
              price: t.price,
              quantityTotal: t.quantityTotal,
              quantitySold: 0,
              maxPerBooking: t.maxPerBooking,
              minPerBooking: t.minPerBooking,
              status: "ACTIVE",
            })),
          },
        },
      });

      return NextResponse.json({ success: true, event: duplicated });
    }

    // Direct update
    const {
      title,
      shortDescription,
      fullDescription,
      category,
      subcategory,
      tags,
      eventType,
      isFeatured,
      isOriginal,
      mood,
      coverImage,
      city,
      venueName,
      fullAddress,
      googleMapsUrl,
      eventDate,
      startTime,
      endTime,
      bookingOpensAt,
      bookingClosesAt,
      ageRestriction,
      highlights,
      whatToExpect,
      artistInfo,
      rules,
      faqs,
      cancellationPolicy,
      accessibilityInfo,
      entryInstructions,
      status,
      ticketTypes,
    } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.update({
        where: { id: params.id },
        data: {
          ...(title && { title: title.trim() }),
          ...(shortDescription && { shortDescription: shortDescription.trim() }),
          ...(fullDescription && { fullDescription: fullDescription.trim() }),
          ...(category && { category }),
          ...(subcategory !== undefined && { subcategory }),
          ...(tags !== undefined && { tags: typeof tags === "string" ? tags : JSON.stringify(tags) }),
          ...(eventType && { eventType }),
          ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
          ...(isOriginal !== undefined && { isOriginal: Boolean(isOriginal) }),
          ...(mood !== undefined && { mood }),
          ...(coverImage && { coverImage }),
          ...(city && { city }),
          ...(venueName && { venueName: venueName.trim() }),
          ...(fullAddress && { fullAddress: fullAddress.trim() }),
          ...(googleMapsUrl !== undefined && { googleMapsUrl }),
          ...(eventDate && { eventDate: new Date(eventDate) }),
          ...(startTime && { startTime }),
          ...(endTime !== undefined && { endTime }),
          ...(bookingOpensAt && { bookingOpensAt: new Date(bookingOpensAt) }),
          ...(bookingClosesAt && { bookingClosesAt: new Date(bookingClosesAt) }),
          ...(ageRestriction && { ageRestriction }),
          ...(highlights !== undefined && {
            highlights: typeof highlights === "string" ? highlights : JSON.stringify(highlights),
          }),
          ...(whatToExpect !== undefined && { whatToExpect }),
          ...(artistInfo !== undefined && { artistInfo }),
          ...(rules !== undefined && {
            rules: typeof rules === "string" ? rules : JSON.stringify(rules),
          }),
          ...(faqs !== undefined && {
            faqs: typeof faqs === "string" ? faqs : JSON.stringify(faqs),
          }),
          ...(cancellationPolicy !== undefined && { cancellationPolicy }),
          ...(accessibilityInfo !== undefined && { accessibilityInfo }),
          ...(entryInstructions !== undefined && { entryInstructions }),
          ...(status && { status }),
        },
      });

      // Update or create ticket types if provided
      if (ticketTypes && Array.isArray(ticketTypes)) {
        for (const t of ticketTypes) {
          if (t.id) {
            await tx.ticketType.update({
              where: { id: t.id },
              data: {
                name: t.name,
                description: t.description || null,
                price: parseInt(t.price) || 0,
                quantityTotal: parseInt(t.quantityTotal) || 100,
                status: t.status || "ACTIVE",
              },
            });
          } else {
            await tx.ticketType.create({
              data: {
                eventId: ev.id,
                name: t.name,
                description: t.description || null,
                price: parseInt(t.price) || 0,
                quantityTotal: parseInt(t.quantityTotal) || 100,
                status: t.status || "ACTIVE",
              },
            });
          }
        }
      }

      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "EVENT_UPDATED",
          entityType: "Event",
          entityId: ev.id,
          details: JSON.stringify({ title: ev.title, status: ev.status }),
        },
      });

      return ev;
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    console.error("PUT /api/admin/events/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if event has confirmed bookings
    const bookingsCount = await prisma.booking.count({
      where: {
        eventId: params.id,
        bookingStatus: "CONFIRMED",
      },
    });

    if (bookingsCount > 0) {
      // Financial safety: As required in Section 15:
      // "Do not delete financial records or confirmed bookings when an event is cancelled."
      // Instead, safely archive/cancel it!
      const archived = await prisma.event.update({
        where: { id: params.id },
        data: { status: "ARCHIVED" },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "EVENT_ARCHIVED",
          entityType: "Event",
          entityId: params.id,
          details: JSON.stringify({
            message: `Event has ${bookingsCount} bookings. Archived instead of hard-deleting.`,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        archived: true,
        message: "Event has existing bookings. Safely archived to preserve records.",
      });
    }

    // If no bookings, safe to remove
    await prisma.event.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Event deleted successfully." });
  } catch (error: any) {
    console.error("DELETE /api/admin/events/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete event" },
      { status: 500 }
    );
  }
}
