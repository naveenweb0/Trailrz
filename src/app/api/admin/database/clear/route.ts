import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const clearSchema = z.object({
  confirm: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const member = await requireRole(request, "superadmin");

    const body = await request.json().catch(() => ({}));
    const parsed = clearSchema.safeParse(body);
    if (!parsed.success || parsed.data.confirm.trim() !== "CLEAR DATABASE") {
      throw new ApiError(400, 'Confirmation phrase "CLEAR DATABASE" is required');
    }

    const [
      notifications,
      payments,
      tickets,
      bookings,
      ticketTypes,
      events,
      customers,
      gateScans,
      subscribers,
      contactMessages,
      webhookEvents,
      auditLogs,
    ] = await prisma.$transaction([
      prisma.notification.deleteMany({}),
      prisma.payment.deleteMany({}),
      prisma.ticket.deleteMany({}),
      prisma.booking.deleteMany({}),
      prisma.ticketType.deleteMany({}),
      prisma.event.deleteMany({}),
      prisma.customer.deleteMany({}),
      prisma.gateScan.deleteMany({}),
      prisma.subscriber.deleteMany({}),
      prisma.contactMessage.deleteMany({}),
      prisma.webhookEvent.deleteMany({}),
      prisma.auditLog.deleteMany({}),
    ]);

    const deleted = {
      notifications: notifications.count,
      payments: payments.count,
      tickets: tickets.count,
      bookings: bookings.count,
      ticket_types: ticketTypes.count,
      events: events.count,
      customers: customers.count,
      gate_scans: gateScans.count,
      subscribers: subscribers.count,
      contact_messages: contactMessages.count,
      webhook_events: webhookEvents.count,
      audit_logs: auditLogs.count,
    };

    await audit(member, "database.clear", "all_except_users", deleted);

    return jsonOk({ ok: true, deleted });
  } catch (err) {
    return handleApiError(err);
  }
}
