import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { retryNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";

    const where: any = {};
    if (status && status !== "All") where.status = status;
    if (type && type !== "All") where.type = type;

    const notifications = await prisma.notification.findMany({
      where,
      take: 100,
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

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error: any) {
    console.error("GET /api/admin/notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: "Notification ID required" },
        { status: 400 }
      );
    }

    const result = await retryNotification(notificationId);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("POST /api/admin/notifications retry error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retry notification" },
      { status: 500 }
    );
  }
}
