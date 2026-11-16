import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableTicketQuantity } from "@/lib/inventory";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
        sessions: {
          orderBy: { sessionDate: "asc" },
        },
        ticketTypes: {
          where: { status: "ACTIVE" },
          orderBy: { price: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Get platform settings for transparent fee calculation
    const settings = await prisma.platformSetting.findFirst({
      where: { id: 1 },
      select: {
        convenienceFeePercentage: true,
        convenienceFeeFixed: true,
        taxPercentage: true,
        bookingExpiryMinutes: true,
        supportEmail: true,
        supportPhone: true,
      },
    });

    // Compute live real-time available quantities for each ticket type
    const ticketTypesWithLiveInventory = await Promise.all(
      event.ticketTypes.map(async (t) => {
        const liveAvailable = await getAvailableTicketQuantity(t.id);
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          price: t.price,
          quantityTotal: t.quantityTotal,
          quantitySold: t.quantitySold,
          maxPerBooking: t.maxPerBooking,
          minPerBooking: t.minPerBooking,
          status: liveAvailable <= 0 ? "SOLD_OUT" : t.status,
          availableQuantity: liveAvailable,
        };
      })
    );

    // Safely parse JSON text fields
    let highlights: string[] = [];
    let rules: string[] = [];
    let faqs: { q: string; a: string }[] = [];
    let tags: string[] = [];

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

    try {
      tags = JSON.parse(event.tags || "[]");
    } catch {
      tags = [];
    }

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        highlights,
        rules,
        faqs,
        tags,
        ticketTypes: ticketTypesWithLiveInventory,
      },
      pricingPolicy: {
        convenienceFeePercentage: settings?.convenienceFeePercentage ?? 2.5,
        convenienceFeeFixed: settings?.convenienceFeeFixed ?? 2000,
        taxPercentage: settings?.taxPercentage ?? 18.0,
        bookingExpiryMinutes: settings?.bookingExpiryMinutes ?? 10,
        supportEmail: settings?.supportEmail ?? "care@trailrz.com",
        supportPhone: settings?.supportPhone ?? "+91 98765 43210",
      },
    });
  } catch (error: any) {
    console.error("GET /api/events/[slug] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load event details" },
      { status: 500 }
    );
  }
}
