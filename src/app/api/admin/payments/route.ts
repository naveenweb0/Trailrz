import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { serializeBookingItem } from "@/lib/admin-events";
import { jsonOk, handleApiError } from "@/lib/api-response";


export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...STAFF);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (q) {
      const s = q.trim();
      where.OR = [
        { orderId: { contains: s, mode: "insensitive" } },
        { paymentId: { contains: s, mode: "insensitive" } },
        { booking: { reference: { contains: s, mode: "insensitive" } } },
        { booking: { customerSnapshot: { path: ["name"], string_contains: s } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [payments, total, refundsDue] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
      prisma.booking.findMany({
        where: { status: "refund_due" },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const items = payments.map((p) => ({
      id: p.id,
      booking_id: p.bookingId,
      order_id: p.orderId,
      payment_id: p.paymentId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      refund_id: p.refundId,
      refund_status: p.refundStatus,
      refund_amount: p.refundAmount,
      refund_reason: p.refundReason,
      refund_processed_at: p.refundProcessedAt ? p.refundProcessedAt.toISOString() : null,
      verified_by: p.verifiedBy,
      last_error: p.lastError,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));

    return jsonOk({
      items,
      total,
      page,
      refunds_due: refundsDue.map(serializeBookingItem),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
