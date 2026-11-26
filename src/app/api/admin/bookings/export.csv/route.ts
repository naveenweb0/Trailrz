import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { buildBookingFilter } from "@/lib/admin-events";
import { handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  let s = String(val);
  // Prevent CSV formula injection in spreadsheet applications
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const member = await requireRole(request, ...STAFF);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const eventId = searchParams.get("event_id");

    const where = buildBookingFilter(q, status, eventId);
    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const lines: string[] = [
      "reference,event,customer,email,tickets,amount_inr,status,payment_status,created_at,confirmed_at",
    ];

    for (const b of bookings) {
      const ev = (b.eventSnapshot as Record<string, any>) || {};
      const cust = (b.customerSnapshot as Record<string, any>) || {};
      const items = (b.items as Array<{ quantity?: number }>) || [];
      const ticketCount = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

      lines.push(
        [
          csvEscape(b.reference),
          csvEscape(ev.title || ""),
          csvEscape(cust.name || ""),
          csvEscape(cust.email || ""),
          ticketCount,
          (b.amount / 100).toFixed(2),
          csvEscape(b.status),
          csvEscape(b.paymentStatus),
          csvEscape(b.createdAt.toISOString()),
          csvEscape(b.confirmedAt ? b.confirmedAt.toISOString() : ""),
        ].join(",")
      );
    }

    await audit(member, "bookings.export", "bookings");

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=trailrz-bookings.csv",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
