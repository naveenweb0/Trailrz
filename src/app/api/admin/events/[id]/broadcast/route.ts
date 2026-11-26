import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { broadcastHtml, queueEmail } from "@/lib/resend";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError } from "@/lib/api-response";

const broadcastSchema = z.object({
  kind: z.enum(["event_update", "event_reminder", "cancellation"]),
  subject: z.string().min(3).max(140),
  message: z.string().min(5).max(4000),
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
    const parsed = broadcastSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const { kind, subject, message } = parsed.data;

    const bookings = await prisma.booking.findMany({
      where: {
        eventId: id,
        status: "confirmed",
      },
    });

    let count = 0;
    for (const b of bookings) {
      const html = broadcastHtml(b, subject, message);
      await queueEmail(b, kind, subject, html);
      count++;
    }

    await audit(member, "event.broadcast", id, { kind, recipients: count });

    return jsonOk({ queued: count });
  } catch (err) {
    return handleApiError(err);
  }
}
