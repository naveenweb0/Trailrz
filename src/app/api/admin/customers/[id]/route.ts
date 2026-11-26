import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { serializeBookingItem } from "@/lib/admin-events";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";


export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ...STAFF);
    const { id } = await params;

    const c = await prisma.customer.findUnique({
      where: { id },
    });
    if (!c) {
      throw new ApiError(404, "Not found");
    }

    const bookings = await prisma.booking.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return jsonOk({
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      phone_digits: c.phoneDigits,
      last_seen_at: c.lastSeenAt.toISOString(),
      created_at: c.createdAt.toISOString(),
      history: bookings.map(serializeBookingItem),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
