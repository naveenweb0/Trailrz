import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { confirmationHtml, queueEmail, sendNotification } from "@/lib/resend";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireRole(request, ...STAFF);
    const { id } = await params;

    let n = await prisma.notification.findFirst({
      where: {
        bookingId: id,
        kind: "booking_confirmation",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!n) {
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          tickets: {
            select: {
              id: true,
              serial: true,
              tierName: true,
              holderName: true,
              status: true,
            },
          },
        },
      });

      if (!booking || booking.status !== "confirmed") {
        throw new ApiError(404, "No confirmation email exists for this booking");
      }

      const ev = (booking.eventSnapshot as Record<string, any>) || {};
      n = await queueEmail(
        booking,
        "booking_confirmation",
        `Your passes for ${ev.title || "TRAILRZ"} · ${booking.reference}`,
        confirmationHtml(booking, booking.tickets)
      );
    } else {
      // Only re-queue if already sent/delivered; atomic so in-flight "sending" is untouched
      await prisma.notification.updateMany({
        where: {
          id: n.id,
          status: { in: ["sent", "delivered"] },
        },
        data: { status: "queued" },
      });

      await sendNotification(n.id);
    }

    await audit(member, "notification.resend", n.id);

    const updated = await prisma.notification.findUnique({
      where: { id: n.id },
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
    });

    return jsonOk({
      id: updated?.id,
      channel: updated?.channel,
      kind: updated?.kind,
      booking_id: updated?.bookingId,
      booking_reference: updated?.bookingReference,
      event_id: updated?.eventId,
      to: updated?.to,
      subject: updated?.subject,
      status: updated?.status,
      attempts: updated?.attempts,
      provider_id: updated?.providerId,
      last_error: updated?.lastError,
      created_at: updated?.createdAt.toISOString(),
      updated_at: updated?.updatedAt.toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
