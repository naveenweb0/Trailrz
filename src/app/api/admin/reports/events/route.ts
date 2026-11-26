import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { withInventory } from "@/lib/admin-events";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...STAFF);

    const confirmedBookings = await prisma.booking.findMany({
      where: { status: "confirmed" },
      select: {
        eventId: true,
        amount: true,
      },
    });

    const revMap = new Map<string, { revenue: number; bookings: number }>();
    for (const b of confirmedBookings) {
      const cur = revMap.get(b.eventId) || { revenue: 0, bookings: 0 };
      cur.revenue += b.amount;
      cur.bookings += 1;
      revMap.set(b.eventId, cur);
    }

    const events = await prisma.event.findMany({
      orderBy: { startAt: "desc" },
    });

    const out = await Promise.all(
      events.map(async (e) => {
        const inv = await withInventory(e);
        const redeemed = await prisma.ticket.count({
          where: {
            eventId: e.id,
            status: "REDEEMED",
          },
        });
        const rev = revMap.get(e.id) || { revenue: 0, bookings: 0 };

        return {
          id: e.id,
          title: e.title,
          city: e.city,
          category: e.category,
          start_at: e.startAt.toISOString(),
          status: e.status,
          capacity: inv.capacity,
          sold: inv.sold,
          redeemed,
          revenue: rev.revenue,
          bookings: rev.bookings,
        };
      })
    );

    return jsonOk({ items: out });
  } catch (err) {
    return handleApiError(err);
  }
}
