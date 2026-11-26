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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const where: any = {};
    if (q) {
      const s = q.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { phone: { contains: s, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [custs, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    const custIds = custs.map((c) => c.id);

    const confirmedBookings = await prisma.booking.findMany({
      where: {
        customerId: { in: custIds },
        status: "confirmed",
      },
      select: {
        customerId: true,
        amount: true,
        ticketCount: true,
        confirmedAt: true,
      },
    });

    const statsMap = new Map<
      string,
      { bookings: number; spent: number; tickets: number; last: string | null }
    >();

    for (const b of confirmedBookings) {
      const cur = statsMap.get(b.customerId) || { bookings: 0, spent: 0, tickets: 0, last: null };
      cur.bookings += 1;
      cur.spent += b.amount;
      cur.tickets += b.ticketCount;
      if (b.confirmedAt) {
        const iso = b.confirmedAt.toISOString();
        if (!cur.last || iso > cur.last) {
          cur.last = iso;
        }
      }
      statsMap.set(b.customerId, cur);
    }

    const items = custs.map((c) => {
      const s = statsMap.get(c.id) || { bookings: 0, spent: 0, tickets: 0, last: null };
      return {
        id: c.id,
        email: c.email,
        name: c.name,
        phone: c.phone,
        phone_digits: c.phoneDigits,
        last_seen_at: c.lastSeenAt.toISOString(),
        created_at: c.createdAt.toISOString(),
        bookings: s.bookings,
        spent: s.spent,
        tickets: s.tickets,
        last_booking_at: s.last,
      };
    });

    return jsonOk({
      items,
      total,
      page,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
