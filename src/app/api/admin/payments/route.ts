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
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const where: any = {};
    if (status && status !== "All") where.status = status;

    if (search) {
      where.OR = [
        { razorpayOrderId: { contains: search } },
        { razorpayPaymentId: { contains: search } },
        { booking: { bookingReference: { contains: search } } },
        { booking: { customerName: { contains: search } } },
        { booking: { customerEmail: { contains: search } } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            event: { select: { id: true, title: true } },
          },
        },
        refunds: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error: any) {
    console.error("GET /api/admin/payments error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch payments" }, { status: 500 });
  }
}
