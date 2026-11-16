import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import {
  generateTicketNumber,
  generateVerificationToken,
  generateQrCodeDataUrl,
} from "@/lib/tickets";
import { dispatchBookingNotifications } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    // If webhook secret is configured, verify HMAC signature
    if (webhookSecret) {
      const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn("Razorpay webhook signature verification failed.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const event = payload.event;
    console.log(`Received Razorpay webhook: ${event}`);

    // Handle payment capture / order paid
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        // Find existing payment or booking
        const existingPayment = await prisma.payment.findFirst({
          where: { razorpayOrderId: orderId },
          include: {
            booking: {
              include: {
                items: true,
                event: true,
                customer: true,
                tickets: true,
              },
            },
          },
        });

        if (existingPayment && existingPayment.booking) {
          const booking = existingPayment.booking;

          // Idempotency: only confirm if not yet confirmed
          if (booking.bookingStatus !== "CONFIRMED") {
            await prisma.$transaction(async (tx) => {
              await tx.payment.update({
                where: { id: existingPayment.id },
                data: {
                  razorpayPaymentId: paymentId || existingPayment.razorpayPaymentId,
                  status: "SUCCESSFUL",
                  rawPayload: JSON.stringify(paymentEntity),
                },
              });

              await tx.booking.update({
                where: { id: booking.id },
                data: {
                  bookingStatus: "CONFIRMED",
                  paymentStatus: "SUCCESSFUL",
                },
              });

              if (booking.reservationToken) {
                await tx.inventoryReservation.updateMany({
                  where: { reservationToken: booking.reservationToken },
                  data: { status: "CONFIRMED" },
                });
              }

              for (const item of booking.items) {
                await tx.ticketType.update({
                  where: { id: item.ticketTypeId },
                  data: { quantitySold: { increment: item.quantity } },
                });

                // Generate tickets if not already generated
                for (let q = 0; q < item.quantity; q++) {
                  const ticketNumber = generateTicketNumber(q + 1);
                  const verificationToken = generateVerificationToken();
                  const qrPayload = JSON.stringify({
                    v: "1",
                    ticketNumber,
                    token: verificationToken,
                    eventId: booking.eventId,
                  });
                  const qrDataUrl = await generateQrCodeDataUrl(qrPayload);

                  await tx.ticket.create({
                    data: {
                      ticketNumber,
                      bookingId: booking.id,
                      bookingItemId: item.id,
                      ticketTypeId: item.ticketTypeId,
                      attendeeName: booking.customerName,
                      attendeeEmail: booking.customerEmail,
                      verificationToken,
                      qrPayload: qrDataUrl,
                      status: "VALID",
                    },
                  });
                }
              }

              await tx.customer.update({
                where: { id: booking.customerId },
                data: {
                  totalBookings: { increment: 1 },
                  totalTicketsPurchased: { increment: booking.totalQuantity },
                  totalSpent: { increment: booking.totalAmount },
                },
              });
            });

            // Dispatch notification
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const ticketLink = `${baseUrl}/my-tickets?ref=${booking.bookingReference}&email=${encodeURIComponent(
              booking.customerEmail
            )}`;

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
            }).catch((err) => console.error("Webhook notification error:", err));
          }
        }
      }
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: orderId },
          data: {
            status: "FAILED",
            rawPayload: JSON.stringify(paymentEntity),
          },
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
