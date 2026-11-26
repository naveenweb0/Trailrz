import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { GATE_STAFF } from "@/lib/constants";
import { getAllowedEvents } from "@/lib/gate";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const member = await requireRole(request, ...GATE_STAFF);
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("event_id") || "";
    const gateLabel = searchParams.get("gate_label") || "Main gate";

    const allowed = await getAllowedEvents(member);
    const ev = allowed.find((e) => e.id === eventId);
    if (!ev) {
      throw new ApiError(403, "You are not assigned to this event");
    }

    const since = new Date(Date.now() - 18 * 3600 * 1000);

    const mineCounts: Record<string, number> = {
      GRANTED: 0,
      DUPLICATE: 0,
      INVALID: 0,
      WRONG_EVENT: 0,
    };

    const scans = await prisma.gateScan.groupBy({
      by: ["result"],
      where: {
        eventId: ev.id,
        operatorId: member.userId,
        at: { gte: since },
      },
      _count: {
        _all: true,
      },
    });

    for (const s of scans) {
      mineCounts[s.result] = s._count._all;
    }

    const last = await prisma.gateScan.findFirst({
      where: {
        eventId: ev.id,
        operatorId: member.userId,
      },
      orderBy: { at: "desc" },
    });

    const eventAdmitted = await prisma.ticket.count({
      where: {
        eventId: ev.id,
        status: "REDEEMED",
      },
    });

    const eventTotal = await prisma.ticket.count({
      where: {
        eventId: ev.id,
        status: { in: ["VALID", "REDEEMED"] },
      },
    });

    return jsonOk({
      event: ev,
      gate_label: gateLabel,
      operator: member.name,
      session: mineCounts,
      event_admitted: eventAdmitted,
      event_total: eventTotal,
      last_scan: last
        ? {
            id: last.id,
            operator_id: last.operatorId,
            operator_name: last.operatorName,
            event_id: last.eventId,
            gate_label: last.gateLabel,
            result: last.result,
            ticket_id: last.ticketId,
            method: last.method,
            at: last.at.toISOString(),
          }
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
