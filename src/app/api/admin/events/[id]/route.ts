import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { EVENT_STAFF, STAFF } from "@/lib/constants";
import { withInventory, saveTiers, toEventData, EventInput } from "@/lib/admin-events";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ...EVENT_STAFF);
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
    });
    if (!event) {
      throw new ApiError(404, "Not found");
    }

    return jsonOk(await withInventory(event));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireRole(request, ...EVENT_STAFF);
    const { id } = await params;

    const cur = await prisma.event.findUnique({
      where: { id },
    });
    if (!cur) {
      throw new ApiError(404, "Not found");
    }

    const body = (await request.json()) as EventInput;
    const data = toEventData(body);

    const existingSlug = await prisma.event.findFirst({
      where: {
        slug: data.slug,
        id: { not: id },
      },
    });
    if (existingSlug) {
      throw new ApiError(409, "That URL slug is already used by another event");
    }

    if (data.gateKey) {
      const existingGate = await prisma.event.findFirst({
        where: {
          gateKey: data.gateKey,
          id: { not: id },
        },
      });
      if (existingGate) {
        throw new ApiError(409, "That Gate ID is already used by another event");
      }
    }

    if (body.tiers) {
      await saveTiers(id, body.tiers);
    }

    const updated = await prisma.event.update({
      where: { id },
      data,
    });

    await audit(member, "event.update", id);

    return jsonOk(await withInventory(updated));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireRole(request, ...STAFF);
    const { id } = await params;

    const bookingCount = await prisma.booking.count({
      where: { eventId: id },
    });
    if (bookingCount > 0) {
      throw new ApiError(409, "This event has bookings. Archive it instead.");
    }

    await prisma.ticketType.deleteMany({
      where: { eventId: id },
    });
    await prisma.event.delete({
      where: { id },
    });

    await audit(member, "event.delete", id);

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
