import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { sendNotification } from "@/lib/resend";
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

    const n = await prisma.notification.findFirst({
      where: {
        bookingId: id,
        kind: "booking_confirmation",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!n) {
      throw new ApiError(404, "No confirmation email exists for this booking");
    }

    if (["sent", "delivered"].includes(n.status)) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { status: "queued" },
      });
    }

    await sendNotification(n.id);
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
