import { prisma } from "./prisma";
import { code, newId, compareDigest } from "./constants";
import { qrSign } from "./qr";
import { confirmationHtml, queueEmail } from "./resend";
import { razorpayReady, rpClient } from "./razorpay";
import { audit } from "./audit";
import { sellDirect } from "./inventory";
import { ApiError } from "./api-response";

export async function getBookingWithKey(bookingId: string, key?: string | null) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!b) {
    throw new ApiError(404, "Reservation not found");
  }
  if (!key || !compareDigest(b.accessKey, key)) {
    throw new ApiError(403, "Invalid or missing reservation key");
  }
  return b;
}


export function ticketPublic(t: any) {
  return {
    id: t.id,
    serial: t.serial,
    tier_name: t.tierName || t.tier_name,
    holder_name: t.holderName || t.holder_name,
    status: t.status,
    issued_at: t.issuedAt ? new Date(t.issuedAt).toISOString() : null,
    redeemed_at: t.redeemedAt ? new Date(t.redeemedAt).toISOString() : null,
    event_id: t.eventId || t.event_id,
    booking_reference: t.bookingReference || t.booking_reference,
    qr: t.status === "VALID" ? qrSign(t.id) : null,
  };
}

export function bookingPublic(b: any) {
  const cust = b.customerSnapshot || b.customer || {};
  return {
    id: b.id,
    reference: b.reference,
    event: b.eventSnapshot || b.event,
    event_id: b.eventId || b.event_id,
    items: b.items,
    amount: b.amount,
    currency: b.currency,
    status: b.status,
    payment_status: b.paymentStatus || b.payment_status,
    hold_expires_at: b.holdExpiresAt ? new Date(b.holdExpiresAt).toISOString() : null,
    created_at: b.createdAt ? new Date(b.createdAt).toISOString() : null,
    confirmed_at: b.confirmedAt ? new Date(b.confirmedAt).toISOString() : null,
    ticket_count: b.ticketCount ?? b.ticket_count ?? 0,
    customer: {
      name: cust.name,
      email: cust.email,
      phone: cust.phone,
    },
  };
}

export async function finalizeBooking(
  bookingId: string,
  payment: { id: string } | null
): Promise<any> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!b) {
    throw new ApiError(404, "Booking not found");
  }

  if (b.status === "confirmed") {
    return b;
  }

  if (b.finalizing) {
    throw new ApiError(409, "Booking confirmation is already in progress");
  }

  // Mark finalizing
  await prisma.booking.update({
    where: { id: bookingId },
    data: { finalizing: true },
  });

  const booking = b;

  if (booking.status === "confirmed") {
    return booking;
  }

  try {
    const items = (booking.items as Array<{
      ticket_type_id: string;
      name: string;
      unit_price: number;
      quantity: number;
    }>) || [];

    if (booking.status === "held") {
      // Move from reserved to sold
      for (const it of items) {
        await prisma.$executeRaw`
          UPDATE "ticket_types"
          SET "sold" = "sold" + ${it.quantity},
              "reserved" = GREATEST(0, "reserved" - ${it.quantity}),
              "updated_at" = NOW()
          WHERE "id" = ${it.ticket_type_id}
        `;
      }
    } else {
      // Hold lapsed before payment: re-secure inventory directly
      const secured: typeof items = [];
      let allSecured = true;
      for (const it of items) {
        if (await sellDirect(it.ticket_type_id, it.quantity)) {
          secured.push(it);
        } else {
          allSecured = false;
          break;
        }
      }

      if (!allSecured) {
        // Rollback secured tiers
        for (const s of secured) {
          await prisma.$executeRaw`
            UPDATE "ticket_types"
            SET "sold" = GREATEST(0, "sold" - ${s.quantity}), "updated_at" = NOW()
            WHERE "id" = ${s.ticket_type_id}
          `;
        }

        // Flag booking for refund
        return await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "refund_due",
            paymentStatus: payment ? "paid" : booking.paymentStatus,
            paymentId: payment?.id || null,
            finalizing: false,
            updatedAt: new Date(),
          },
        });
      }
    }

    // Generate pass tickets
    const ticketsData: Array<{
      id: string;
      serial: string;
      bookingId: string;
      bookingReference: string;
      eventId: string;
      eventTitle: string;
      ticketTypeId: string;
      tierName: string;
      holderName: string;
      customerId: string;
      status: "VALID";
      issuedAt: Date;
    }> = [];

    const ev = (booking.eventSnapshot as any) || {};
    const cust = (booking.customerSnapshot as any) || {};

    for (const it of items) {
      for (let i = 0; i < it.quantity; i++) {
        ticketsData.push({
          id: newId(),
          serial: code("TRZ", 10),
          bookingId: booking.id,
          bookingReference: booking.reference,
          eventId: booking.eventId,
          eventTitle: ev.title || "Experience",
          ticketTypeId: it.ticket_type_id,
          tierName: it.name,
          holderName: cust.name || "Guest",
          customerId: booking.customerId,
          status: "VALID",
          issuedAt: new Date(),
        });
      }
    }

    if (ticketsData.length > 0) {
      await prisma.ticket.createMany({
        data: ticketsData,
      });
    }

    const confirmed = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "confirmed",
        paymentStatus: payment ? "paid" : "not_required",
        paymentId: payment?.id || null,
        confirmedAt: new Date(),
        finalizing: false,
        ticketCount: ticketsData.length,
        updatedAt: new Date(),
      },
    });

    // Send confirmation email
    await queueEmail(
      confirmed,
      "booking_confirmation",
      `Your passes for ${ev.title || "TRAILRZ"} · ${booking.reference}`,
      confirmationHtml(confirmed, ticketsData)
    );

    return confirmed;
  } catch (err) {
    console.error("finalizeBooking failed on", bookingId, err);
    await prisma.booking.update({
      where: { id: bookingId },
      data: { finalizing: false },
    });
    throw err;
  }
}

export async function initiateRefund(
  bookingId: string,
  actor: { userId: string; email?: string },
  reason: string,
  amount?: number
): Promise<{ ok: boolean; status: string; refund_id?: string; amount?: number; message?: string }> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!b) {
    throw new ApiError(404, "Booking not found");
  }

  const p = await prisma.payment.findFirst({
    where: {
      bookingId,
      status: { in: ["paid", "refunded"] },
    },
  });

  if (!p || !p.paymentId) {
    throw new ApiError(400, "No completed gateway payment found for this booking");
  }

  if (p.refundStatus === "processed") {
    return { ok: true, status: "processed", message: "Refund already processed" };
  }
  if (p.refundStatus === "initiating" || p.refundStatus === "initiated") {
    return { ok: true, status: p.refundStatus, message: `Refund is already ${p.refundStatus}` };
  }

  if (!razorpayReady()) {
    throw new ApiError(503, "Payment gateway is not configured");
  }

  const refundAmount = amount || p.amount;

  // Atomic lock on refundStatus
  const updateRes = await prisma.payment.updateMany({
    where: {
      id: p.id,
      refundStatus: { notIn: ["initiating", "initiated", "processed"] },
    },
    data: {
      refundStatus: "initiating",
      updatedAt: new Date(),
    },
  });

  if (updateRes.count === 0) {
    throw new ApiError(409, "A refund is already in progress for this payment");
  }

  let rfnd: any;
  try {
    rfnd = await rpClient().payments.refund(p.paymentId, {
      amount: refundAmount,
      notes: {
        booking_id: bookingId,
        reference: b.reference,
        reason,
      },
      receipt: `RFND-${b.reference}`,
    });
  } catch (err: any) {
    await prisma.payment.update({
      where: { id: p.id },
      data: {
        refundStatus: null,
        lastError: String(err?.message || err).slice(0, 300),
        updatedAt: new Date(),
      },
    });
    throw new ApiError(502, `Gateway refund call failed: ${err?.message || err}`);
  }

  const rfndId = rfnd?.id || null;
  await prisma.payment.update({
    where: { id: p.id },
    data: {
      refundId: rfndId,
      refundStatus: "initiated",
      refundAmount,
      refundReason: reason,
      updatedAt: new Date(),
    },
  });

  // Void valid tickets
  await prisma.ticket.updateMany({
    where: {
      bookingId,
      status: "VALID",
    },
    data: {
      status: "VOID",
      voidReason: `Refund initiated: ${reason}`,
      voidedAt: new Date(),
      voidedBy: actor.userId,
    },
  });

  // Release sold inventory if confirmed
  if (b.status === "confirmed" && !b.inventoryReleased) {
    const items = (b.items as Array<{ ticket_type_id: string; quantity: number }>) || [];
    for (const it of items) {
      await prisma.$executeRaw`
        UPDATE "ticket_types"
        SET "sold" = GREATEST(0, "sold" - ${it.quantity}), "updated_at" = NOW()
        WHERE "id" = ${it.ticket_type_id}
      `;
    }
    await prisma.booking.update({
      where: { id: bookingId },
      data: { inventoryReleased: true },
    });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "refund_initiated",
      updatedAt: new Date(),
    },
  });

  await audit(actor, "booking.refund_initiated", bookingId, {
    refund_id: rfndId,
    amount: refundAmount,
    reason,
  });

  return { ok: true, status: "initiated", refund_id: rfndId, amount: refundAmount };
}
