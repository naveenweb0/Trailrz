import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

const voidSchema = z.object({
  reason: z.string().min(3).max(200),
});

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireRole(request, ...STAFF);
    const { id } = await params;

    const body = await request.json();
    const parsed = voidSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const stamp = new Date();
    const res = await prisma.ticket.updateMany({
      where: {
        id,
        status: "VALID",
      },
      data: {
        status: "VOID",
        voidedAt: stamp,
        voidReason: parsed.data.reason,
        voidedBy: member.userId,
      },
    });

    if (res.count === 0) {
      throw new ApiError(409, "Only VALID passes can be voided");
    }

    const t = await prisma.ticket.findUnique({
      where: { id },
    });

    await audit(member, "ticket.void", id, { reason: parsed.data.reason });

    return jsonOk({
      id: t?.id,
      serial: t?.serial,
      tier_name: t?.tierName,
      holder_name: t?.holderName,
      status: t?.status,
      issued_at: t?.issuedAt.toISOString(),
      voided_at: t?.voidedAt ? t.voidedAt.toISOString() : null,
      void_reason: t?.voidReason,
      voided_by: t?.voidedBy,
      event_id: t?.eventId,
      booking_reference: t?.bookingReference,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
