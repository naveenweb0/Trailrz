import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { DEMO_EVENT_SLUG, ensureDemoEvent } from "@/lib/demo-event";
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
      prisma.ticketType.deleteMany({
        where: { event: { slug: { not: DEMO_EVENT_SLUG } } },
      }),
      prisma.event.deleteMany({
        where: { slug: { not: DEMO_EVENT_SLUG } },
      }),
      prisma.customer.deleteMany({}),
      prisma.gateScan.deleteMany({}),
      prisma.subscriber.deleteMany({}),
      prisma.contactMessage.deleteMany({}),
      prisma.webhookEvent.deleteMany({}),
      prisma.auditLog.deleteMany({}),
    ]);

    const demo = await ensureDemoEvent("draft");
    await prisma.$transaction([
      prisma.event.update({
        where: { id: demo.id },
        data: { status: "draft" },
      }),
      prisma.ticketType.updateMany({
        where: { eventId: demo.id },
        data: { sold: 0, reserved: 0 },
      }),
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

    await audit(member, "database.clear", "all_except_users_and_demo_event", deleted);

    return jsonOk({
      ok: true,
      deleted,
      demo_event_id: demo.id,
      demo_event_status: "draft",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
