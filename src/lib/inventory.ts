import { prisma } from "./prisma";
import { generateRandomToken } from "./utils";

export interface ReservationItemInput {
  ticketTypeId: string;
  quantity: number;
}

/**
 * Release any reservations whose checkout window has expired
 */
export async function cleanupExpiredReservations() {
  const now = new Date();
  try {
    const expired = await prisma.inventoryReservation.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Also update any pending bookings tied to expired reservations
    await prisma.booking.updateMany({
      where: {
        bookingStatus: "PENDING",
        createdAt: {
          lt: new Date(now.getTime() - 15 * 60 * 1000), // 15 mins ago
        },
      },
      data: {
        bookingStatus: "EXPIRED",
      },
    });

    return expired.count;
  } catch (err) {
    console.error("Error cleaning up expired reservations:", err);
    return 0;
  }
}

/**
 * Calculate real-time available quantity for a ticket type, taking pending active reservations into account
 */
export async function getAvailableTicketQuantity(ticketTypeId: string): Promise<number> {
  await cleanupExpiredReservations();
  const now = new Date();

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    select: {
      quantityTotal: true,
      quantitySold: true,
      status: true,
    },
  });

  if (!ticketType || ticketType.status !== "ACTIVE") {
    return 0;
  }

  // Active reservations that have not expired yet
  const pendingReservations = await prisma.inventoryReservation.aggregate({
    where: {
      ticketTypeId,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    _sum: {
      quantity: true,
    },
  });

  const reservedQty = pendingReservations._sum.quantity || 0;
  const available = ticketType.quantityTotal - ticketType.quantitySold - reservedQty;

  return Math.max(0, available);
}

/**
 * Temporarily reserve inventory before payment checkout
 */
export async function reserveInventory(
  eventId: string,
  items: ReservationItemInput[],
  durationMinutes = 10
) {
  await cleanupExpiredReservations();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
  const reservationToken = `RES-${Date.now()}-${generateRandomToken("", 8)}`;

  // Run in a transaction to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // 1. Verify event is active and accepting bookings
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        bookingClosesAt: true,
        title: true,
      },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.status !== "PUBLISHED") {
      throw new Error(`This event is currently ${event.status.toLowerCase()} and cannot accept bookings.`);
    }

    if (now > event.bookingClosesAt) {
      throw new Error("Bookings for this event have closed.");
    }

    // 2. Validate each requested ticket type
    const reservationRecords = [];

    for (const item of items) {
      if (item.quantity <= 0) continue;

      const ticketType = await tx.ticketType.findUnique({
        where: { id: item.ticketTypeId },
      });

      if (!ticketType || ticketType.eventId !== eventId) {
        throw new Error("Invalid ticket type selected for this event");
      }

      if (ticketType.status !== "ACTIVE") {
        throw new Error(`Ticket category "${ticketType.name}" is not currently active.`);
      }

      // Check current pending reservations for this ticket type
      const activeReservations = await tx.inventoryReservation.aggregate({
        where: {
          ticketTypeId: item.ticketTypeId,
          status: "PENDING",
          expiresAt: { gt: now },
        },
        _sum: {
          quantity: true,
        },
      });

      const reservedQty = activeReservations._sum.quantity || 0;
      const currentAvailable = ticketType.quantityTotal - ticketType.quantitySold - reservedQty;

      if (currentAvailable < item.quantity) {
        throw new Error(
          `Not enough tickets available for "${ticketType.name}". Only ${Math.max(
            0,
            currentAvailable
          )} tickets remaining.`
        );
      }

      // Create reservation row
      const res = await tx.inventoryReservation.create({
        data: {
          reservationToken,
          eventId,
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          expiresAt,
          status: "PENDING",
        },
      });
      reservationRecords.push(res);
    }

    return {
      reservationToken,
      expiresAt,
      durationMinutes,
      items: reservationRecords,
    };
  });
}

/**
 * Release an active reservation (e.g. if customer cancels before paying)
 */
export async function releaseReservation(reservationToken: string) {
  return await prisma.inventoryReservation.updateMany({
    where: {
      reservationToken,
      status: "PENDING",
    },
    data: {
      status: "RELEASED",
    },
  });
}
