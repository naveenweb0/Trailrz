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
    const range = searchParams.get("range") || "30d"; // 7d, 30d, 90d, all

    const now = new Date();
    let startDate: Date | undefined;

    if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    const bookingWhere: any = {};
    if (startDate) {
      bookingWhere.createdAt = { gte: startDate };
    }

    // Aggregate confirmed revenue
    const confirmedBookingsAgg = await prisma.booking.aggregate({
      where: {
        ...bookingWhere,
        bookingStatus: "CONFIRMED",
        paymentStatus: "SUCCESSFUL",
      },
      _sum: {
        totalAmount: true,
        totalQuantity: true,
      },
      _count: {
        id: true,
      },
    });

    const totalRevenuePaise = confirmedBookingsAgg._sum.totalAmount || 0;
    const ticketsSold = confirmedBookingsAgg._sum.totalQuantity || 0;
    const confirmedBookingsCount = confirmedBookingsAgg._count.id || 0;

    // Total bookings count (including pending/cancelled)
    const totalBookingsCount = await prisma.booking.count({
      where: bookingWhere,
    });

    // Pending payments
    const pendingPaymentsCount = await prisma.booking.count({
      where: {
        ...bookingWhere,
        bookingStatus: "PENDING",
      },
    });

    // Cancelled bookings
    const cancelledBookingsCount = await prisma.booking.count({
      where: {
        ...bookingWhere,
        bookingStatus: "CANCELLED",
      },
    });

    // Events counts
    const activeEventsCount = await prisma.event.count({
      where: { status: "PUBLISHED" },
    });

    const upcomingEventsCount = await prisma.event.count({
      where: {
        status: "PUBLISHED",
        eventDate: { gte: now },
      },
    });

    // Recent Bookings
    const recentBookings = await prisma.booking.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        event: { select: { title: true, city: true } },
      },
    });

    // Recent Payments
    const recentPayments = await prisma.payment.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            bookingReference: true,
            customerName: true,
            event: { select: { title: true } },
          },
        },
      },
    });

    // Recent Check-ins
    const recentCheckIns = await prisma.checkIn.findMany({
      take: 6,
      orderBy: { scannedAt: "desc" },
      include: {
        ticket: {
          include: {
            ticketType: { select: { name: true } },
            booking: {
              select: {
                bookingReference: true,
                event: { select: { title: true } },
              },
            },
          },
        },
      },
    });

    // Category-wise bookings
    const allConfirmedBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: "CONFIRMED",
        paymentStatus: "SUCCESSFUL",
      },
      include: {
        event: { select: { category: true } },
      },
    });

    const categoryMap: Record<string, { count: number; revenue: number }> = {};
    for (const b of allConfirmedBookings) {
      const cat = b.event?.category || "Other";
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, revenue: 0 };
      categoryMap[cat].count += b.totalQuantity;
      categoryMap[cat].revenue += b.totalAmount;
    }

    const categoryBreakdown = Object.entries(categoryMap).map(([category, stats]) => ({
      category,
      tickets: stats.count,
      revenue: stats.revenue,
    }));

    // Event-wise performance
    const events = await prisma.event.findMany({
      take: 8,
      where: { status: "PUBLISHED" },
      orderBy: { eventDate: "asc" },
      include: {
        ticketTypes: true,
        bookings: {
          where: { bookingStatus: "CONFIRMED" },
          select: { totalAmount: true, totalQuantity: true },
        },
      },
    });

    const eventPerformance = events.map((ev) => {
      const totalRev = ev.bookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const totalSold = ev.bookings.reduce((sum, b) => sum + b.totalQuantity, 0);
      const totalCapacity = ev.ticketTypes.reduce((sum, t) => sum + t.quantityTotal, 0);
      const occupancy = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

      return {
        id: ev.id,
        title: ev.title,
        city: ev.city,
        date: ev.eventDate,
        revenue: totalRev,
        ticketsSold: totalSold,
        capacity: totalCapacity,
        occupancyRate: Math.min(100, occupancy),
      };
    });

    return NextResponse.json({
      success: true,
      kpis: {
        totalRevenue: totalRevenuePaise,
        confirmedBookings: confirmedBookingsCount,
        totalBookings: totalBookingsCount,
        ticketsSold,
        upcomingEvents: upcomingEventsCount,
        activeEvents: activeEventsCount,
        pendingPayments: pendingPaymentsCount,
        cancelledBookings: cancelledBookingsCount,
      },
      recentActivity: {
        bookings: recentBookings,
        payments: recentPayments,
        checkIns: recentCheckIns,
      },
      categoryBreakdown,
      eventPerformance,
    });
  } catch (error: any) {
    console.error("GET /api/admin/overview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load admin overview." },
      { status: 500 }
    );
  }
}
