import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...STAFF);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const eventId = searchParams.get("event_id");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (eventId) {
      where.eventId = eventId;
    }
    if (q) {
      const s = q.trim();
      where.OR = [
        { serial: { contains: s, mode: "insensitive" } },
        { bookingReference: { contains: s, mode: "insensitive" } },
        { holderName: { contains: s, mode: "insensitive" } },
        { eventTitle: { contains: s, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    const items = tickets.map((t) => ({
      id: t.id,
      serial: t.serial,
      booking_id: t.bookingId,
      booking_reference: t.bookingReference,
      event_id: t.eventId,
      event_title: t.eventTitle,
      ticket_type_id: t.ticketTypeId,
      tier_name: t.tierName,
      holder_name: t.holderName,
      customer_id: t.customerId,
      status: t.status,
      issued_at: t.issuedAt.toISOString(),
      redeemed_at: t.redeemedAt ? t.redeemedAt.toISOString() : null,
      redeemed_by: t.redeemedBy,
      redeemed_by_name: t.redeemedByName,
      redeemed_gate: t.redeemedGate,
      redeemed_method: t.redeemedMethod,
      voided_at: t.voidedAt ? t.voidedAt.toISOString() : null,
      void_reason: t.voidReason,
      voided_by: t.voidedBy,
    }));

    return jsonOk({
      items,
      total,
      page,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
