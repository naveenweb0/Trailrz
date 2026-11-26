import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookingWithKey, bookingPublic, ticketPublic } from "@/lib/booking";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id } = await params;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || request.headers.get("x-booking-key");

    const b = await getBookingWithKey(booking_id, key);

    const tickets = await prisma.ticket.findMany({
      where: { bookingId: b.id },
      orderBy: { issuedAt: "asc" },
      take: 50,
    });

    return jsonOk({
      ...bookingPublic(b),
      tickets: tickets.map(ticketPublic),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
