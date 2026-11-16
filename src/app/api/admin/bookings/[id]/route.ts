import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { processRazorpayRefund } from "@/lib/razorpay";
import { dispatchBookingNotifications } from "@/lib/notifications";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        event: true,
        customer: true,
        items: { include: { ticketType: true } },
        tickets: { include: { ticketType: true, checkIn: true } },
        payments: true,
        refunds: true,
        notifications: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("GET /api/admin/bookings/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to load booking" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, reason, amount } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        payments: { where: { status: "SUCCESSFUL" } },
        tickets: true,
        items: true,
        event: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    // ACTION 1: Resend Notifications
    if (action === "resend_notifications") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const ticketLink = `${baseUrl}/my-tickets?ref=${booking.bookingReference}&email=${encodeURIComponent(
        booking.customerEmail
      )}`;

      await dispatchBookingNotifications({
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
      });

      return NextResponse.json({
        success: true,
        message: "Confirmation notifications resent successfully.",
      });
    }

    // ACTION 2: Cancel Booking
    if (action === "cancel") {
      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.booking.update({
          where: { id: booking.id },
          data: { bookingStatus: "CANCELLED" },
        });

        // Invalidate tickets
        await tx.ticket.updateMany({
          where: { bookingId: booking.id, status: "VALID" },
          data: { status: "CANCELLED" },
        });

        // Release inventory back
        for (const item of booking.items) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              quantitySold: { decrement: item.quantity },
            },
          });
        }

        // Audit Log
        await tx.adminAuditLog.create({
          data: {
            adminUserId: admin.id,
            action: "BOOKING_CANCELLED",
            entityType: "Booking",
            entityId: booking.id,
            details: JSON.stringify({
              bookingReference: booking.bookingReference,
              reason: reason || "Cancelled by admin",
            }),
          },
        });

        return b;
      });

      return NextResponse.json({
        success: true,
        message: "Booking cancelled and inventory released.",
        booking: updated,
      });
    }

    // ACTION 3: Process Refund
    if (action === "refund") {
      const successfulPayment = booking.payments[0];
      if (!successfulPayment) {
        return NextResponse.json(
          { success: false, error: "No successful payment found to refund." },
          { status: 400 }
        );
      }

      const refundAmountPaise = amount ? parseInt(amount) : booking.totalAmount;

      if (refundAmountPaise <= 0 || refundAmountPaise > booking.totalAmount) {
        return NextResponse.json(
          { success: false, error: "Invalid refund amount specified." },
          { status: 400 }
        );
      }

      // Initiate refund through Razorpay provider
      const gatewayRefund = await processRazorpayRefund({
        paymentId: successfulPayment.razorpayPaymentId || successfulPayment.id,
        amountInPaise: refundAmountPaise,
        notes: {
          bookingReference: booking.bookingReference,
          reason: reason || "Admin initiated refund",
        },
      });

      // Update DB records in transaction
      await prisma.$transaction(async (tx) => {
        await tx.refund.create({
          data: {
            paymentId: successfulPayment.id,
            bookingId: booking.id,
            amount: refundAmountPaise,
            reason: reason || "Customer requested refund",
            razorpayRefundId: gatewayRefund.refundId,
            status: "SUCCESSFUL",
            processedBy: admin.name,
          },
        });

        const isFullRefund = refundAmountPaise >= booking.totalAmount;

        await tx.payment.update({
          where: { id: successfulPayment.id },
          data: {
            status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
          },
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            bookingStatus: isFullRefund ? "CANCELLED" : booking.bookingStatus,
            paymentStatus: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
          },
        });

        // Mark tickets as REFUNDED
        await tx.ticket.updateMany({
          where: { bookingId: booking.id },
          data: { status: "REFUNDED" },
        });

        // Audit Log
        await tx.adminAuditLog.create({
          data: {
            adminUserId: admin.id,
            action: "BOOKING_REFUNDED",
            entityType: "Booking",
            entityId: booking.id,
            details: JSON.stringify({
              bookingReference: booking.bookingReference,
              refundAmountPaise,
              refundId: gatewayRefund.refundId,
              processedBy: admin.name,
            }),
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Refund of ₹${(refundAmountPaise / 100).toFixed(2)} processed successfully.`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/admin/bookings/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process booking action" },
      { status: 500 }
    );
  }
}
