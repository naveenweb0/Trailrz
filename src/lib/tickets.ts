import QRCode from "qrcode";
import crypto from "crypto";
import { prisma } from "./prisma";

/**
 * Generate a cryptographically secure random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Generate high-resolution QR code as a data URL (PNG)
 */
export async function generateQrCodeDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: {
      dark: "#111111",
      light: "#FFFFFF",
    },
  });
}

/**
 * Generate formatted ticket number (e.g. TRZ-2026-001234)
 */
export function generateTicketNumber(index = 1): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `TRZ-${year}-${randomSuffix}`;
}

/**
 * Check-in verification result interface
 */
export interface CheckInResult {
  success: boolean;
  code: "VALID_CHECK_IN" | "ALREADY_CHECKED_IN" | "INVALID_TICKET" | "CANCELLED_TICKET" | "UNPAID_BOOKING";
  message: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    attendeeName: string;
    ticketTypeName: string;
    eventTitle: string;
    eventDate: Date;
    venueName: string;
    status: string;
    checkedInAt?: Date | null;
    scannedBy?: string | null;
  };
}

/**
 * Verify and execute check-in atomically for a scanned ticket QR code
 */
export async function verifyAndCheckInTicket(
  ticketIdentifier: string, // ticketNumber or verificationToken or raw QR string
  scannerName = "Admin Gate Scanner",
  location = "Main Gate",
  device = "Gate Device"
): Promise<CheckInResult> {
  let ticketNumber = ticketIdentifier.trim();
  let verificationToken: string | null = null;

  // If scanner read JSON from QR payload
  if (ticketIdentifier.startsWith("{") && ticketIdentifier.endsWith("}")) {
    try {
      const parsed = JSON.parse(ticketIdentifier);
      if (parsed.ticketNumber) ticketNumber = parsed.ticketNumber;
      if (parsed.token) verificationToken = parsed.token;
    } catch {
      // not JSON, keep as raw string
    }
  }

  // Find ticket by:
  // 1. ticketNumber (e.g. TRZ-2026-829176)
  // 2. bookingReference (e.g. TRZ-BK-2026-34297)
  // 3. verificationToken or raw QR string
  // 4. ticket ID
  let ticket = await prisma.ticket.findFirst({
    where: {
      OR: [
        { ticketNumber },
        { id: ticketIdentifier },
        { verificationToken: verificationToken || ticketIdentifier },
        { booking: { bookingReference: ticketIdentifier } },
        { booking: { id: ticketIdentifier } },
      ],
    },
    include: {
      booking: {
        include: {
          event: true,
        },
      },
      ticketType: true,
      checkIn: true,
    },
    orderBy: {
      status: "asc", // Prioritize VALID tickets before USED
    },
  });

  // If still not found, try substring match (e.g. partial reference or number)
  if (!ticket && ticketIdentifier.length >= 4) {
    ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { ticketNumber: { contains: ticketIdentifier } },
          { booking: { bookingReference: { contains: ticketIdentifier } } },
        ],
      },
      include: {
        booking: {
          include: {
            event: true,
          },
        },
        ticketType: true,
        checkIn: true,
      },
      orderBy: {
        status: "asc",
      },
    });
  }

  if (!ticket) {
    return {
      success: false,
      code: "INVALID_TICKET",
      message: "No ticket found matching this QR code. Please verify at the help desk.",
    };
  }

  // Verify verification token if supplied in QR payload
  if (verificationToken && ticket.verificationToken !== verificationToken) {
    return {
      success: false,
      code: "INVALID_TICKET",
      message: "Security signature mismatch. Invalid QR token.",
    };
  }

  // Check booking confirmation & payment status
  if (ticket.booking.bookingStatus !== "CONFIRMED" || ticket.booking.paymentStatus !== "SUCCESSFUL") {
    return {
      success: false,
      code: "UNPAID_BOOKING",
      message: `Booking is not confirmed (Status: ${ticket.booking.bookingStatus}).`,
    };
  }

  // Check if cancelled or refunded
  if (ticket.status === "CANCELLED" || ticket.status === "REFUNDED") {
    return {
      success: false,
      code: "CANCELLED_TICKET",
      message: `This ticket has been ${ticket.status.toLowerCase()} and is not valid for entry.`,
    };
  }

  // Check if already checked in
  if (ticket.status === "USED" || ticket.checkIn) {
    return {
      success: false,
      code: "ALREADY_CHECKED_IN",
      message: `Duplicate check-in rejected! This ticket was already checked in at ${
        ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString("en-IN") : "earlier today"
      }.`,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        ticketTypeName: ticket.ticketType.name,
        eventTitle: ticket.booking.event.title,
        eventDate: ticket.booking.event.eventDate,
        venueName: ticket.booking.event.venueName,
        status: ticket.status,
        checkedInAt: ticket.checkedInAt,
        scannedBy: ticket.checkIn?.scannedBy || "Gate Scanner",
      },
    };
  }

  // Atomically perform check-in
  const now = new Date();
  const updatedTicket = await prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "USED",
        checkedInAt: now,
      },
    });

    await tx.checkIn.create({
      data: {
        ticketId: ticket.id,
        scannedBy: scannerName,
        scannedAt: now,
        location,
        device,
      },
    });

    // Audit log
    await tx.adminAuditLog.create({
      data: {
        action: "TICKET_CHECKIN",
        entityType: "Ticket",
        entityId: ticket.id,
        details: JSON.stringify({
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          eventTitle: ticket.booking.event.title,
          scannedBy: scannerName,
        }),
      },
    });

    return updated;
  });

  return {
    success: true,
    code: "VALID_CHECK_IN",
    message: "Ticket verified successfully! Welcome to the experience.",
    ticket: {
      id: updatedTicket.id,
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.attendeeName,
      ticketTypeName: ticket.ticketType.name,
      eventTitle: ticket.booking.event.title,
      eventDate: ticket.booking.event.eventDate,
      venueName: ticket.booking.event.venueName,
      status: "USED",
      checkedInAt: now,
      scannedBy: scannerName,
    },
  };
}
