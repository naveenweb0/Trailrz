import { prisma } from "./prisma";
import { iso } from "./constants";

export interface TierLike {
  capacity: number;
  sold: number;
  reserved: number;
}

export function remaining(t: TierLike): number {
  return Math.max(0, t.capacity - (t.sold || 0) - (t.reserved || 0));
}

export function availability(t: TierLike): "sold_out" | "limited" | "available" {
  const r = remaining(t);
  if (r === 0) return "sold_out";
  const threshold = Math.max(5, Math.floor(t.capacity / 10));
  return r <= threshold ? "limited" : "available";
}

export async function reserve(ticketTypeId: string, qty: number): Promise<boolean> {
  const count = await prisma.$executeRaw`
    UPDATE "ticket_types"
    SET "reserved" = "reserved" + ${qty}, "updated_at" = NOW()
    WHERE "id" = ${ticketTypeId}
      AND ("sold" + "reserved" + ${qty}) <= "capacity"
  `;
  return count === 1;
}

export async function release(ticketTypeId: string, qty: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "ticket_types"
    SET "reserved" = GREATEST(0, "reserved" - ${qty}), "updated_at" = NOW()
    WHERE "id" = ${ticketTypeId}
  `;
}

export async function sellDirect(ticketTypeId: string, qty: number): Promise<boolean> {
  const count = await prisma.$executeRaw`
    UPDATE "ticket_types"
    SET "sold" = "sold" + ${qty}, "updated_at" = NOW()
    WHERE "id" = ${ticketTypeId}
      AND ("sold" + "reserved" + ${qty}) <= "capacity"
  `;
  return count === 1;
}

export async function expireHold(bookingId: string, status: "expired" | "cancelled" = "expired"): Promise<boolean> {
  // Atomic check and update using transaction
  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.status !== "held" || booking.finalizing) {
      return null;
    }

    const res = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return res;
  });

  if (!updated) {
    return false;
  }

  const items = (updated.items as Array<{ ticket_type_id: string; quantity: number }>) || [];
  for (const it of items) {
    await release(it.ticket_type_id, it.quantity);
  }

  return true;
}

export async function releaseExpiredHolds(eventId?: string, limit = 25): Promise<number> {
  const expired = await prisma.booking.findMany({
    where: {
      status: "held",
      finalizing: false,
      holdExpiresAt: { lt: new Date() },
      ...(eventId ? { eventId } : {}),
    },
    select: { id: true },
    orderBy: { holdExpiresAt: "asc" },
    take: limit,
  });

  let released = 0;
  for (const b of expired) {
    if (await expireHold(b.id, "expired")) {
      released++;
    }
  }
  return released;
}
