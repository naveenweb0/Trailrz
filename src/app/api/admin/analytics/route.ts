import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format"); // "csv" or json
    const cityFilter = searchParams.get("city") || "";

    // 1. Gross payment collections (all successful payments)
    const grossAgg = await prisma.payment.aggregate({
      where: {
        status: { in: ["SUCCESSFUL", "PARTIALLY_REFUNDED", "REFUNDED"] },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const grossAmountPaise = grossAgg._sum.amount || 0;

    // 2. Total Refunds processed
    const refundAgg = await prisma.refund.aggregate({
      where: { status: "SUCCESSFUL" },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalRefundsPaise = refundAgg._sum.amount || 0;
    const netCollectedPaise = Math.max(0, grossAmountPaise - totalRefundsPaise);

    // 3. Total confirmed tickets sold
    const ticketSalesAgg = await prisma.booking.aggregate({
      where: {
        bookingStatus: "CONFIRMED",
        paymentStatus: { in: ["SUCCESSFUL", "PARTIALLY_REFUNDED"] },
      },
      _sum: {
        totalQuantity: true,
      },
    });

    const totalTicketsSold = ticketSalesAgg._sum.totalQuantity || 0;

    // 4. Revenue by Event
    const events = await prisma.event.findMany({
      include: {
        ticketTypes: true,
        bookings: {
          where: { bookingStatus: "CONFIRMED" },
          select: {
            totalAmount: true,
            totalQuantity: true,
            createdAt: true,
          },
        },
      },
    });

    const eventReports = events.map((ev) => {
      const gross = ev.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const tickets = ev.bookings.reduce((sum, b) => sum + b.totalQuantity, 0);
      const capacity = ev.ticketTypes.reduce((sum, t) => sum + t.quantityTotal, 0);
      const occupancy = capacity > 0 ? Math.min(100, Math.round((tickets / capacity) * 100)) : 0;

      return {
        id: ev.id,
        title: ev.title,
        city: ev.city,
        category: ev.category,
        date: ev.eventDate,
        ticketsSold: tickets,
        capacity,
        occupancyRate: occupancy,
        grossRevenue: gross,
      };
    });

    // 5. Revenue by City
    const cityBreakdown: Record<string, { tickets: number; gross: number }> = {};
    for (const er of eventReports) {
      if (!cityBreakdown[er.city]) {
        cityBreakdown[er.city] = { tickets: 0, gross: 0 };
      }
      cityBreakdown[er.city].tickets += er.ticketsSold;
      cityBreakdown[er.city].gross += er.grossRevenue;
    }

    const cityStats = Object.entries(cityBreakdown).map(([city, data]) => ({
      city,
      ticketsSold: data.tickets,
      grossRevenue: data.gross,
      percentage: grossAmountPaise > 0 ? Math.round((data.gross / grossAmountPaise) * 100) : 0,
    }));

    // 6. CSV Export if requested
    if (format === "csv") {
      const rows = [
        ["Event Title", "City", "Category", "Event Date", "Tickets Sold", "Capacity", "Occupancy (%)", "Gross Revenue (₹)"],
        ...eventReports.map((e) => [
          `"${e.title.replace(/"/g, '""')}"`,
          `"${e.city}"`,
          `"${e.category}"`,
          new Date(e.date).toISOString().split("T")[0],
          e.ticketsSold,
          e.capacity,
          `${e.occupancyRate}%`,
          (e.grossRevenue / 100).toFixed(2),
        ]),
      ];

      const csvContent = rows.map((r) => r.join(",")).join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=trailrz-analytics-${new Date().toISOString().split("T")[0]}.csv`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        grossCollections: grossAmountPaise,
        totalRefunds: totalRefundsPaise,
        netCollections: netCollectedPaise,
        totalTicketsSold,
        totalTransactions: grossAgg._count.id || 0,
        refundTransactions: refundAgg._count.id || 0,
      },
      cityStats,
      eventReports,
    });
  } catch (error: any) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate analytics report" },
      { status: 500 }
    );
  }
}
