import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase();
    const phone = searchParams.get("phone")?.trim();

    if (!ref && !email && !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter your Booking Reference and verified Email or Mobile Number.",
        },
        { status: 400 }
      );
    }

    const where: any = {};

    if (ref) {
      // Must match booking reference AND customer email/phone for security
      where.bookingReference = ref;

      if (!email && !phone) {
        return NextResponse.json(
          {
            success: false,
            error: "For privacy and ticket security, please provide the email address or phone used during booking.",
          },
          { status: 401 }
        );
      }

      if (email) {
        where.customerEmail = email;
      }
      if (phone) {
        let cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
        where.OR = [
          { customerPhone: { contains: phone } },
          { customerPhone: { contains: cleanPhone } },
        ];
      }
    } else {
      // Retrieve all bookings for this verified customer email or phone
      if (email && phone) {
        where.OR = [{ customerEmail: email }, { customerPhone: { contains: phone } }];
      } else if (email) {
        where.customerEmail = email;
      } else if (phone) {
        let cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
        where.OR = [
          { customerPhone: { contains: phone } },
          { customerPhone: { contains: cleanPhone } },
        ];
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          include: {
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        items: true,
        tickets: {
          include: {
            ticketType: true,
            checkIn: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            razorpayPaymentId: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (bookings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No bookings found matching the provided reference and contact details.",
        },
        { status: 404 }
      );
    }

    const now = new Date();
    const upcoming: any[] = [];
    const past: any[] = [];

    for (const b of bookings) {
      const eventDate = new Date(b.event.eventDate);
      const isPast = eventDate < now;

      const formattedBooking = {
        id: b.id,
        bookingReference: b.bookingReference,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        customerPhone: b.customerPhone,
        totalQuantity: b.totalQuantity,
        subtotal: b.subtotal,
        convenienceFee: b.convenienceFee,
        taxAmount: b.taxAmount,
        totalAmount: b.totalAmount,
        bookingStatus: b.bookingStatus,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
        event: {
          id: b.event.id,
          title: b.event.title,
          slug: b.event.slug,
          category: b.event.category,
          eventType: b.event.eventType,
          coverImage: b.event.coverImage,
          city: b.event.city,
          venueName: b.event.venueName,
          fullAddress: b.event.fullAddress,
          googleMapsUrl: b.event.googleMapsUrl,
          eventDate: b.event.eventDate,
          startTime: b.event.startTime,
          endTime: b.event.endTime,
          ageRestriction: b.event.ageRestriction,
          entryInstructions: b.event.entryInstructions,
          cancellationPolicy: b.event.cancellationPolicy,
        },
        tickets: b.tickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          attendeeName: t.attendeeName,
          ticketTypeName: t.ticketType.name,
          status: t.status,
          qrPayload: t.qrPayload,
          checkedInAt: t.checkedInAt,
          isCheckedIn: t.status === "USED" || Boolean(t.checkIn),
        })),
        payments: b.payments,
      };

      if (isPast) {
        past.push(formattedBooking);
      } else {
        upcoming.push(formattedBooking);
      }
    }

    return NextResponse.json({
      success: true,
      count: bookings.length,
      upcoming,
      past,
      all: [...upcoming, ...past],
    });
  } catch (error: any) {
    console.error("GET /api/my-tickets error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve tickets." },
      { status: 500 }
    );
  }
}
