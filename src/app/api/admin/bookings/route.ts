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
    const bookingStatus = searchParams.get("bookingStatus")?.trim() || "";
    const paymentStatus = searchParams.get("paymentStatus")?.trim() || "";
    const date = searchParams.get("date")?.trim() || "";

    const where: any = {};
    if (eventId && eventId !== "All") where.eventId = eventId;
    if (bookingStatus && bookingStatus !== "All") where.bookingStatus = bookingStatus;
    if (paymentStatus && paymentStatus !== "All") where.paymentStatus = paymentStatus;

    if (search) {
      where.OR = [
        { bookingReference: { contains: search } },
        { customerName: { contains: search } },
        { customerEmail: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    if (date) {
      const parsedDate = new Date(date);
      const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: { id: true, title: true, city: true, eventDate: true, venueName: true },
        },
        items: true,
        tickets: {
          include: { ticketType: true, checkIn: true },
        },
        payments: true,
        refunds: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error: any) {
    console.error("GET /api/admin/bookings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
