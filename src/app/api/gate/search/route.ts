import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { GATE_STAFF, digits } from "@/lib/constants";
import { getAllowedEvents } from "@/lib/gate";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function ticketView(t: any) {
  return {
    id: t.id,
    serial: t.serial,
    tier_name: t.tierName || t.tier_name,
    holder_name: t.holderName || t.holder_name,
    event_title: t.eventTitle || t.event_title,
    booking_reference: t.bookingReference || t.booking_reference,
    status: t.status,
    redeemed_at: t.redeemedAt ? new Date(t.redeemedAt).toISOString() : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const member = await requireRole(request, ...GATE_STAFF);
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("event_id") || "";
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 3) {
      throw new ApiError(422, "Search term must be at least 3 characters");
    }

    const allowed = await getAllowedEvents(member);
    const ev = allowed.find((e) => e.id === eventId);
    if (!ev) {
      throw new ApiError(403, "You are not assigned to this event");
    }

    const d = digits(q);
    const whereConditions: any[] = [
      { serial: { contains: q, mode: "insensitive" } },
      { bookingReference: { contains: q, mode: "insensitive" } },
      { holderName: { contains: q, mode: "insensitive" } },
    ];

    if (d.length >= 6) {
      // Find matching bookings by phone digits
      const bookings = await prisma.booking.findMany({
        where: {
          eventId: ev.id,
          customer: {
            phoneDigits: { contains: d },
          },
        },
        select: { id: true },
      });
      if (bookings.length > 0) {
        whereConditions.push({
          bookingId: { in: bookings.map((b) => b.id) },
        });
      }
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        eventId: ev.id,
        OR: whereConditions,
      },
      take: 25,
      orderBy: { issuedAt: "desc" },
    });

    return jsonOk({
      items: tickets.map(ticketView),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
