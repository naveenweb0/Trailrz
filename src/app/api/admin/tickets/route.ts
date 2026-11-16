import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const eventId = searchParams.get("eventId")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const where: any = {};
    if (eventId && eventId !== "All") {
      where.booking = { eventId };
    }
    if (status && status !== "All") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { attendeeName: { contains: search } },
        { attendeeEmail: { contains: search } },
        { booking: { bookingReference: { contains: search } } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      take: 200,
      orderBy: { createdAt: "desc" },
      include: {
        ticketType: true,
        checkIn: true,
        booking: {
          select: {
            id: true,
            bookingReference: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            bookingStatus: true,
            paymentStatus: true,
            event: {
              select: {
                id: true,
                title: true,
                city: true,
                eventDate: true,
                venueName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error: any) {
    console.error("GET /api/admin/tickets error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 });
  }
}
