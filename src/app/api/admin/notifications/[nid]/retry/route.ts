import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { sendNotification } from "@/lib/resend";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nid: string }> }
) {
  try {
    await requireRole(request, ...STAFF);
    const { nid } = await params;

    const n = await prisma.notification.findUnique({
      where: { id: nid },
    });

    if (!n || !["failed", "not_configured"].includes(n.status)) {
      throw new ApiError(409, "Only failed or unsent notifications can be retried");
    }

    await sendNotification(nid);

    const updated = await prisma.notification.findUnique({
      where: { id: nid },
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
