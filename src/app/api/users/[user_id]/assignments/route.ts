import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";
import { getClerkSecretKey } from "@/lib/env";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const admin = await requireRole(req, ...STAFF);

    const { user_id } = await params;
    const body = await req.json();
    const eventIds = Array.isArray(body?.event_ids) ? body.event_ids.slice(0, 50) : [];

    const env = getClerkSecretKey().startsWith("sk_live_") ? "live" : "preview";
    const user = await prisma.user.findFirst({
      where: {
        userId: user_id,
        OR: [{ env }, { env: null }],
      },
    });

    if (!user) {
      throw new ApiError(404, "Not found");
    }

    await prisma.user.update({
      where: { userId: user_id },
      data: { assignedEventIds: eventIds },
    });

    await audit(admin, "user.assign_events", user_id, { event_ids: eventIds });

    return jsonOk({ user_id, assigned_event_ids: eventIds });
  } catch (err) {
    return handleApiError(err);
  }
}

export const POST = PATCH;

