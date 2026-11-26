import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { serializeBookingItem } from "@/lib/admin-events";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";


export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ...STAFF);
    const { id } = await params;

    const b = await prisma.booking.findUnique({
      where: { id },
    });
    if (!b) {
      throw new ApiError(404, "Not found");
    }

    const [tickets, payments, notifications] = await Promise.all([
      prisma.ticket.findMany({
        where: { bookingId: id },
        orderBy: { issuedAt: "asc" },
        take: 50,
      }),
      prisma.payment.findMany({
        where: { bookingId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.notification.findMany({
        where: { bookingId: id },
        select: {
          id: true,
          channel: true,
          kind: true,
          bookingId: true,
          bookingReference: true,
          eventId: true,
          to: true,
          subject: true,
          status: true,
          attempts: true,
          providerId: true,
          lastError: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return jsonOk({
      ...serializeBookingItem(b),
      tickets: tickets.map((t) => ({
        id: t.id,
        serial: t.serial,
        tier_name: t.tierName,
        holder_name: t.holderName,
        status: t.status,
        issued_at: t.issuedAt.toISOString(),
        redeemed_at: t.redeemedAt ? t.redeemedAt.toISOString() : null,
        event_id: t.eventId,
        booking_reference: t.bookingReference,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        booking_id: p.bookingId,
        order_id: p.orderId,
        payment_id: p.paymentId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        refund_id: p.refundId,
        refund_status: p.refundStatus,
        refund_amount: p.refundAmount,
        refund_reason: p.refundReason,
        refund_processed_at: p.refundProcessedAt ? p.refundProcessedAt.toISOString() : null,
        verified_by: p.verifiedBy,
        last_error: p.lastError,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        channel: n.channel,
        kind: n.kind,
        booking_id: n.bookingId,
        booking_reference: n.bookingReference,
        event_id: n.eventId,
        to: n.to,
        subject: n.subject,
        status: n.status,
        attempts: n.attempts,
        provider_id: n.providerId,
        last_error: n.lastError,
        created_at: n.createdAt.toISOString(),
        updated_at: n.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireRole(request, ...STAFF);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action || "cancel";

    const b = await prisma.booking.findUnique({
      where: { id },
    });
    if (!b) {
      throw new ApiError(404, "Booking not found");
    }

    if (action === "resend_notifications" || action === "resend") {
      const { POST: resendPost } = await import("./resend/route");
      return resendPost(request, { params });
    }

    if (action === "refund") {
      const { POST: refundPost } = await import("./refund/route");
      return refundPost(request, { params });
    }

    if (action === "cancel") {
      if (b.status === "cancelled") {
        return jsonOk({ success: true, message: "Booking already cancelled", booking: b });
      }

      if (b.status === "held") {
        const { expireHold } = await import("@/lib/inventory");
        await expireHold(b.id, "cancelled");
        return jsonOk({ success: true, message: "Hold cancelled and inventory released." });
      }

      // If confirmed, cancel and restore inventory
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: b.id },
          data: { status: "cancelled", inventoryReleased: true, updatedAt: new Date() },
        });

        await tx.ticket.updateMany({
          where: { bookingId: b.id, status: "VALID" },
          data: { status: "VOID" },
        });

        const items = (b.items as Array<{ ticket_type_id: string; quantity: number }>) || [];
        for (const item of items) {
          await tx.$executeRaw`
            UPDATE "ticket_types"
            SET "sold" = GREATEST(0, "sold" - ${item.quantity}), "updated_at" = NOW()
            WHERE "id" = ${item.ticket_type_id}
          `;
        }
      });

      const { audit } = await import("@/lib/audit");
      await audit(member, "booking.cancel", b.id, { reference: b.reference, reason: body.reason || "Cancelled by admin" });

      return jsonOk({ success: true, message: "Booking cancelled and inventory released." });
    }

    throw new ApiError(400, `Unknown action: ${action}`);
  } catch (err) {
    return handleApiError(err);
  }
}
