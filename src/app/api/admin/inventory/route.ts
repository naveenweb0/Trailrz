import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { EVENT_STAFF } from "@/lib/constants";
import { withInventory } from "@/lib/admin-events";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...EVENT_STAFF);

    const events = await prisma.event.findMany({
      where: {
        status: { not: "archived" },
      },
      orderBy: { startAt: "asc" },
    });

    const items = await Promise.all(
      events.map(async (e) => {
        const inv = await withInventory(e);
        const expiredHolds = await prisma.booking.count({
          where: {
            eventId: e.id,
            status: "expired",
          },
        });
        const activeHolds = await prisma.booking.count({
          where: {
            eventId: e.id,
            status: "held",
          },
        });

        return {
          id: inv.id,
          title: inv.title,
          start_at: inv.start_at,
          status: inv.status,
          tiers: inv.tiers,
          capacity: inv.capacity,
          sold: inv.sold,
          reserved: inv.reserved,
          expired_holds: expiredHolds,
          active_holds: activeHolds,
        };
      })
    );

    return jsonOk({ items });
  } catch (err) {
    return handleApiError(err);
  }
}
