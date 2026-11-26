import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { finalizeBooking } from "@/lib/booking";
import { queueEmail, refundHtml } from "@/lib/resend";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      throw new ApiError(503, "Webhook not configured");
    }

    const raw = await request.text();
    const sig = request.headers.get("x-razorpay-signature") || "";

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex");

    const bufSig = Buffer.from(sig);
    const bufExpected = Buffer.from(expectedSig);

    if (
      bufSig.length !== bufExpected.length ||
      !crypto.timingSafeEqual(bufSig, bufExpected)
    ) {
      throw new ApiError(400, "Invalid signature");
    }

    const eventId =
      request.headers.get("x-razorpay-event-id") ||
      crypto.createHash("sha256").update(raw).digest("hex");

    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (existingEvent) {
      return jsonOk({ ok: true });
    }

    const evt = JSON.parse(raw);
    const paymentPayload = evt.payload?.payment?.entity;
    const refundPayload = evt.payload?.refund?.entity;

    if (
      paymentPayload?.order_id &&
      ["payment.captured", "order.paid"].includes(evt.event)
    ) {
      const p = await prisma.payment.findUnique({
        where: { orderId: paymentPayload.order_id },
      });

      if (p && paymentPayload.amount === p.amount) {
        await prisma.payment.update({
          where: { id: p.id },
          data: {
            status: "paid",
            paymentId: paymentPayload.id,
            verifiedBy: "webhook",
            updatedAt: new Date(),
          },
        });
        await finalizeBooking(p.bookingId, { id: paymentPayload.id });
      }
    } else if (paymentPayload?.order_id && evt.event === "payment.failed") {
      const p = await prisma.payment.findUnique({
        where: { orderId: paymentPayload.order_id },
      });
      if (p && p.status === "created") {
        await prisma.payment.update({
          where: { id: p.id },
          data: {
            status: "failed",
            updatedAt: new Date(),
          },
        });
      }
    } else if (["refund.processed", "refund.failed"].includes(evt.event) && refundPayload) {
      const payId = refundPayload.payment_id;
      const rfndId = refundPayload.id;

      const p = await prisma.payment.findFirst({
        where: {
          OR: [
            ...(payId ? [{ paymentId: payId }] : []),
            ...(rfndId ? [{ refundId: rfndId }] : []),
          ],
        },
      });

      if (p) {
        if (evt.event === "refund.processed") {
          if (p.refundStatus !== "processed") {
            await prisma.payment.update({
              where: { id: p.id },
              data: {
                status: "refunded",
                refundStatus: "processed",
                refundProcessedAt: new Date(),
                updatedAt: new Date(),
              },
            });

            const b = await prisma.booking.update({
              where: { id: p.bookingId },
              data: {
                status: "refunded",
                paymentStatus: "refunded",
                updatedAt: new Date(),
              },
            });

            // Void admission tickets for this refunded booking
            await prisma.ticket.updateMany({
              where: {
                bookingId: p.bookingId,
                status: "VALID",
              },
              data: {
                status: "VOID",
                voidReason: "Refund processed via gateway webhook",
                voidedAt: new Date(),
                voidedBy: "webhook:razorpay",
              },
            });

            // Release inventory if not already released
            if (!b.inventoryReleased) {
              const items = (b.items as Array<{ ticket_type_id: string; quantity: number }>) || [];
              for (const it of items) {
                await prisma.$executeRaw`
                  UPDATE "ticket_types"
                  SET "sold" = GREATEST(0, "sold" - ${it.quantity}), "updated_at" = NOW()
                  WHERE "id" = ${it.ticket_type_id}
                `;
              }
              await prisma.booking.update({
                where: { id: b.id },
                data: { inventoryReleased: true },
              });
            }

            await queueEmail(
              b,
              "booking_refunded",
              `Your refund has been processed · ${b.reference}`,
              refundHtml(b, p)
            );
          }
        } else if (evt.event === "refund.failed") {
          await prisma.payment.update({
            where: { id: p.id },
            data: {
              refundStatus: "failed",
              lastError: refundPayload.error_description || "Refund failed",
              updatedAt: new Date(),
            },
          });

          await prisma.booking.update({
            where: { id: p.bookingId },
            data: {
              paymentStatus: "refund_failed",
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    await prisma.webhookEvent.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        source: "razorpay",
      },
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
