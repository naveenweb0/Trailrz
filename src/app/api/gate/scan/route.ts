import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { GATE_STAFF } from "@/lib/constants";
import { qrVerify } from "@/lib/qr";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAllowedEvents } from "@/lib/gate";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

const scanSchema = z.object({
  event_id: z.string().min(1),
  payload: z.string().optional(),
  ticket_id: z.string().optional(),
  gate_label: z.string().default("Main gate"),
});

export const dynamic = "force-dynamic";

function ticketView(t: any) {
  return {
    id: t.id,
    serial: t.serial,
    tier_name: t.tierName || t.tier_name,
    holder_name: t.holderName || t.holder_name,
    event_title: t.eventTitle || t.event_title,
    booking_reference: t.bookingReference || t.booking_reference,
    status: t.status,
    redeemed_at: t.redeemedAt ? new Date(t.redeemedAt).toISOString() : null,
  };
}

async function logScan(
  member: any,
  eventId: string,
  gateLabel: string,
  result: string,
  ticket?: any,
  method: string = "qr"
) {
  try {
    await prisma.gateScan.create({
      data: {
        operatorId: member.userId,
        operatorName: member.name,
        eventId,
        gateLabel: gateLabel.slice(0, 40),
        result,
        ticketId: ticket?.id || null,
        method,
      },
    });
  } catch (err) {
    console.error("Failed to log gate scan", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireRole(request, ...GATE_STAFF);
    await enforceRateLimit(request, `scan:${member.userId}`, 90, 60);

    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const { event_id, payload, ticket_id, gate_label } = parsed.data;

    const allowed = await getAllowedEvents(member);
    const ev = allowed.find((e) => e.id === event_id);
    if (!ev) {
      throw new ApiError(403, "You are not assigned to this event");
    }

    const method = ticket_id ? "manual" : "qr";
    const tid = ticket_id || (payload ? qrVerify(payload) : null);

    if (!tid) {
      await logScan(member, ev.id, gate_label, "INVALID");
      return jsonOk({
        result: "INVALID",
        reason: "This code is not a genuine TRAILRZ pass (signature check failed).",
      });
    }

    const t = await prisma.ticket.findUnique({
      where: { id: tid },
    });

    if (!t) {
      await logScan(member, ev.id, gate_label, "INVALID", null, method);
      return jsonOk({
        result: "INVALID",
        reason: "No pass with this code exists.",
      });
    }

    if (t.eventId !== ev.id) {
      await logScan(member, ev.id, gate_label, "WRONG_EVENT", t, method);
      return jsonOk({
        result: "WRONG_EVENT",
        reason: `This pass is for “${t.eventTitle}”, not this event.`,
        ticket: ticketView(t),
      });
    }

    const stamp = new Date();

    // Atomic admission
    const updateRes = await prisma.ticket.updateMany({
      where: {
        id: tid,
        status: "VALID",
      },
      data: {
        status: "REDEEMED",
        redeemedAt: stamp,
        redeemedBy: member.userId,
        redeemedByName: member.name,
        redeemedGate: gate_label.slice(0, 40),
        redeemedMethod: method,
      },
    });

    if (updateRes.count === 1) {
      const updated = await prisma.ticket.findUnique({ where: { id: tid } });
      await logScan(member, ev.id, gate_label, "GRANTED", updated, method);
      return jsonOk({
        result: "GRANTED",
        ticket: ticketView(updated),
        admitted_at: stamp.toISOString(),
      });
    }

    if (t.status === "REDEEMED") {
      await logScan(member, ev.id, gate_label, "DUPLICATE", t, method);
      return jsonOk({
        result: "DUPLICATE",
        reason: "This pass has already been used.",
        ticket: ticketView(t),
        previous_admission: {
          at: t.redeemedAt ? t.redeemedAt.toISOString() : null,
          by: t.redeemedByName,
          gate: t.redeemedGate,
        },
      });
    }

    await logScan(member, ev.id, gate_label, "INVALID", t, method);
    return jsonOk({
      result: "INVALID",
      reason: "This pass has been voided and cannot be admitted.",
      ticket: ticketView(t),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
