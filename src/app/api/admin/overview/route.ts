import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { remaining } from "@/lib/inventory";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...STAFF);

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    const f = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
    const t = dateTo ? new Date(dateTo) : new Date(Date.now() + 60000);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "confirmed",
        confirmedAt: {
          gte: f,
          lt: t,
        },
      },
      include: {
        event: {
          select: { id: true, category: true, city: true, title: true },
        },
      },
    });

    const totRevenue = bookings.reduce((acc, b) => acc + b.amount, 0);
    const totBookings = bookings.length;
    const totTickets = bookings.reduce((acc, b) => acc + b.ticketCount, 0);

    // Group by date (YYYY-MM-DD)
    const dailyMap = new Map<string, { revenue: number; bookings: number; tickets: number }>();
    for (const b of bookings) {
      if (!b.confirmedAt) continue;
      const d = b.confirmedAt.toISOString().slice(0, 10);
      const cur = dailyMap.get(d) || { revenue: 0, bookings: 0, tickets: 0 };
      cur.revenue += b.amount;
      cur.bookings += 1;
      cur.tickets += b.ticketCount;
      dailyMap.set(d, cur);
    }

    const series = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        revenue: val.revenue,
        bookings: val.bookings,
        tickets: val.tickets,
      }));

    // Group by category and city
    const catMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};

    for (const b of bookings) {
      const c = b.event?.category || "—";
      const ci = b.event?.city || "—";
      catMap[c] = (catMap[c] || 0) + b.amount;
      cityMap[ci] = (cityMap[ci] || 0) + b.amount;
    }

    const byCategory = Object.entries(catMap).map(([name, revenue]) => ({ name, revenue }));
    const byCity = Object.entries(cityMap).map(([name, revenue]) => ({ name, revenue }));

    // Upcoming event performance
    const now = new Date();
    const upcomingEvents = await prisma.event.findMany({
      where: {
        status: "published",
        startAt: { gte: now },
      },
      include: {
        ticketTypes: true,
      },
      orderBy: { startAt: "asc" },
      take: 8,
    });

    const perf = upcomingEvents.map((e) => {
      const cap = e.ticketTypes.reduce((acc, x) => acc + x.capacity, 0);
      const sold = e.ticketTypes.reduce((acc, x) => acc + x.sold, 0);
      return {
        id: e.id,
        title: e.title,
        start_at: e.startAt.toISOString(),
        capacity: cap,
        sold,
        occupancy: cap ? Math.round((sold / cap) * 100) : 0,
      };
    });

    const ticketsRedeemed = await prisma.ticket.count({
      where: {
        status: "REDEEMED",
        redeemedAt: {
          gte: f,
          lt: t,
        },
      },
    });

    const upcomingCount = await prisma.event.count({
      where: {
        status: "published",
        startAt: { gte: now },
      },
    });

    const activeHolds = await prisma.booking.count({
      where: {
        status: "held",
        holdExpiresAt: { gte: now },
      },
    });

    const pendingPayments = await prisma.payment.count({
      where: { status: "created" },
    });

    const refundsDue = await prisma.booking.count({
      where: { status: "refund_due" },
    });

    return jsonOk({
      range: { from: f.toISOString(), to: t.toISOString() },
      revenue: totRevenue,
      bookings: totBookings,
      tickets_issued: totTickets,
      tickets_redeemed: ticketsRedeemed,
      upcoming_events: upcomingCount,
      active_holds: activeHolds,
      pending_payments: pendingPayments,
      refunds_due: refundsDue,
      series,
      by_category: byCategory,
      by_city: byCity,
      event_performance: perf,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
