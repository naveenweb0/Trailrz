import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...STAFF);

    const logs = await prisma.auditLog.findMany({
      orderBy: { at: "desc" },
      take: 100,
    });

    const items = logs.map((l) => ({
      id: l.id,
      actor_id: l.actorId,
      actor_email: l.actorEmail,
      action: l.action,
      target: l.target,
      meta: l.meta,
      at: l.at.toISOString(),
    }));

    return jsonOk({ items });
  } catch (err) {
    return handleApiError(err);
  }
}
