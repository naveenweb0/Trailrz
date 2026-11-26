import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { integrations } from "@/lib/admin-events";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...STAFF);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    const items = notifications.map((n) => ({
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
    }));

    return jsonOk({
      items,
      total,
      page,
      integrations: integrations(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
