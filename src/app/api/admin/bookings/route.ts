import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { buildBookingFilter, serializeBookingItem } from "@/lib/admin-events";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {

  try {
    await requireRole(request, ...STAFF);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const eventId = searchParams.get("event_id");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const where = buildBookingFilter(q, status, eventId);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return jsonOk({
      items: items.map(serializeBookingItem),
      total,
      page,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
