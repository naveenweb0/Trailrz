import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { compareDigest, digits } from "@/lib/constants";
import { bookingPublic, ticketPublic } from "@/lib/booking";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

const lookupSchema = z.object({
  reference: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  key: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "lookup", 6, 600);

    const body = await request.json();
    const parsed = lookupSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const { reference, email, phone, key } = parsed.data;
    const ref = reference.trim().toUpperCase();

    const b = await prisma.booking.findUnique({
      where: { reference: ref },
    });

    let ok = false;
    const cust = (b?.customerSnapshot as any) || {};

    if (b && key) {
      ok = compareDigest(b.accessKey, key);
    } else if (b && email && phone) {
      const matchEmail = (cust.email || "").toLowerCase() === email.toLowerCase().trim();
      const matchPhone = (cust.phone_digits || digits(cust.phone || "")) === digits(phone);
      ok = matchEmail && matchPhone;
    }

    if (!ok || !b) {
      throw new ApiError(404, "No booking matches these details");
    }

    if (!["confirmed", "refund_due", "cancelled_by_admin"].includes(b.status)) {
      throw new ApiError(404, "This booking was not completed");
    }

    const tickets = await prisma.ticket.findMany({
      where: { bookingId: b.id },
      orderBy: { issuedAt: "asc" },
      take: 50,
    });

    return jsonOk({
      ...bookingPublic(b),
      tickets: tickets.map(ticketPublic),
      access_key: b.accessKey,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
