import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import {
  generateTicketNumber,
  generateVerificationToken,
  generateQrCodeDataUrl,
} from "@/lib/tickets";
import { dispatchBookingNotifications } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      paymentId,
      signature,
      bookingReference,
      paymentMethod = "Razorpay",
    } = body;

    if (!bookingReference) {
      return NextResponse.json(
        { success: false, error: "Missing booking reference." },
        { status: 400 }
      );
    }

    // 1. Fetch booking with items and event
    const booking = await prisma.booking.findUnique({
      where: { bookingReference },
      include: {
        items: true,
        event: true,
        customer: true,
        payments: true,
        tickets: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking reference not found." },
        { status: 404 }
      );
    }

    // 2. Idempotency Check: If already confirmed, return existing tickets without duplicating
    if (booking.bookingStatus === "CONFIRMED" && booking.paymentStatus === "SUCCESSFUL") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        bookingReference: booking.bookingReference,
        booking: {
          id: booking.id,
          reference: booking.bookingReference,
          status: booking.bookingStatus,
          eventTitle: booking.event.title,
          eventDate: booking.event.eventDate,
          venueName: booking.event.venueName,
          totalAmount: booking.totalAmount,
          totalQuantity: booking.totalQuantity,
        },
        tickets: booking.tickets,
      });
    }

    // 3. Signature verification (unless free event with zero amount)
    if (booking.totalAmount > 0) {
      if (!orderId || !paymentId) {
        return NextResponse.json(
          { success: false, error: "Missing payment transaction details." },
          { status: 400 }
        );
      }

      const isValidSignature = await verifyRazorpayPaymentSignature({
        orderId,
        paymentId,
        signature: signature || "",
      });

      if (!isValidSignature) {
        // Record failed payment attempt
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.totalAmount,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            status: "FAILED",
            rawPayload: JSON.stringify({ error: "Invalid payment signature" }),
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: "Payment verification failed. Signature mismatch.",
          },
          { status: 400 }
        );
      }
    }

    // 4. Atomic transaction to confirm booking and issue tickets
    const confirmedData = await prisma.$transaction(async (tx) => {
      // Update Payment record
      if (booking.totalAmount > 0) {
        const existingPayment = await tx.payment.findFirst({
          where: {
            bookingId: booking.id,
            razorpayOrderId: orderId,
          },
        });

        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              razorpayPaymentId: paymentId,
              razorpaySignature: signature || null,
              paymentMethod,
              status: "SUCCESSFUL",
            },
          });
        } else {
          await tx.payment.create({
            data: {
              bookingId: booking.id,
              amount: booking.totalAmount,
              currency: "INR",
              provider: "RAZORPAY",
              razorpayOrderId: orderId,
              razorpayPaymentId: paymentId,
              razorpaySignature: signature || null,
              paymentMethod,
              status: "SUCCESSFUL",
            },
          });
        }
      }

      // Update Booking status
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: "CONFIRMED",
          paymentStatus: "SUCCESSFUL",
        },
      });

      // Confirm inventory reservations
      if (booking.reservationToken) {
        await tx.inventoryReservation.updateMany({
          where: {
            reservationToken: booking.reservationToken,
          },
          data: {
            status: "CONFIRMED",
          },
        });
      }

      // Increment quantitySold for each ticket category
      for (const item of booking.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            quantitySold: { increment: item.quantity },
          },
        });
      }

      // Parse optional attendee names
      let attendeeList: string[] = [];
      try {
        if (booking.notes) attendeeList = JSON.parse(booking.notes);
      } catch {
        attendeeList = [];
      }

      // Generate digital tickets with QR codes
      const generatedTickets = [];
      let attendeeIndex = 0;

      for (const item of booking.items) {
        for (let q = 0; q < item.quantity; q++) {
          const ticketNumber = generateTicketNumber(q + 1);
          const verificationToken = generateVerificationToken();

          // QR payload contains secure verification token, ticketNumber, and eventId
          const qrPayload = JSON.stringify({
            v: "1",
            ticketNumber,
            token: verificationToken,
            eventId: booking.eventId,
          });

          const qrDataUrl = await generateQrCodeDataUrl(qrPayload);

          const attendeeName =
            attendeeList[attendeeIndex] ||
            (attendeeIndex === 0
              ? booking.customerName
              : `${booking.customerName} (Guest ${attendeeIndex + 1})`);

          attendeeIndex++;

          const createdTicket = await tx.ticket.create({
            data: {
              ticketNumber,
              bookingId: booking.id,
              bookingItemId: item.id,
              ticketTypeId: item.ticketTypeId,
              attendeeName,
              attendeeEmail: booking.customerEmail,
              verificationToken,
              qrPayload: qrDataUrl, // Store data URL for instant rendering on confirmation & downloads
              status: "VALID",
            },
            include: {
              ticketType: true,
            },
          });

          generatedTickets.push(createdTicket);
        }
      }

      // Update Customer aggregates
      await tx.customer.update({
        where: { id: booking.customerId },
        data: {
          totalBookings: { increment: 1 },
          totalTicketsPurchased: { increment: booking.totalQuantity },
          totalSpent: { increment: booking.totalAmount },
        },
      });

      // Audit Log
      await tx.adminAuditLog.create({
        data: {
          action: "BOOKING_CONFIRMED",
          entityType: "Booking",
          entityId: booking.id,
          details: JSON.stringify({
            bookingReference: booking.bookingReference,
            totalAmount: booking.totalAmount,
            ticketCount: generatedTickets.length,
            customerEmail: booking.customerEmail,
            paymentId,
          }),
        },
      });

      return { updatedBooking, generatedTickets };
    });

    // 5. Asynchronously dispatch notifications (email + whatsapp)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const ticketLink = `${baseUrl}/my-tickets?ref=${booking.bookingReference}&email=${encodeURIComponent(
      booking.customerEmail
    )}`;

    // Do not block response on notification delivery
    dispatchBookingNotifications({
      bookingId: booking.id,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      bookingReference: booking.bookingReference,
      eventTitle: booking.event.title,
      eventDate: booking.event.eventDate,
      eventTime: booking.event.startTime,
      venueName: booking.event.venueName,
      venueAddress: booking.event.fullAddress,
      totalTickets: booking.totalQuantity,
      totalAmountInPaise: booking.totalAmount,
      ticketLink,
    }).catch((err) => console.error("Notification dispatch error in verify:", err));

    return NextResponse.json({
      success: true,
      bookingReference: confirmedData.updatedBooking.bookingReference,
      booking: {
        id: confirmedData.updatedBooking.id,
        reference: confirmedData.updatedBooking.bookingReference,
        status: confirmedData.updatedBooking.bookingStatus,
        eventTitle: booking.event.title,
        eventDate: booking.event.eventDate,
        venueName: booking.event.venueName,
        totalAmount: confirmedData.updatedBooking.totalAmount,
        totalQuantity: confirmedData.updatedBooking.totalQuantity,
      },
      tickets: confirmedData.generatedTickets,
    });
  } catch (error: any) {
    console.error("POST /api/checkout/verify error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm payment and issue tickets." },
      { status: 500 }
    );
  }
}
