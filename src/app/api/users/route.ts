import { NextRequest } from "next/server";
import { requireRole, effectiveRole } from "@/lib/auth";
import { STAFF, RANK, ROLES, UserRole } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { getClerkSecretKey } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole(req, ...STAFF);
    const env = getClerkSecretKey().startsWith("sk_live_") ? "live" : "preview";

    const people = await prisma.user.findMany({
      where: {
        OR: [{ env }, { env: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const adminRole = admin.role as UserRole;
    const allowedRoles = (ROLES as readonly UserRole[]).filter(
      (r) => RANK[r] <= RANK[adminRole]
    );


    return jsonOk({
      roles: allowedRoles,
      users: people.map((p) => ({
        id: p.id,
        user_id: p.userId,
        email: p.email,
        name: p.name,
        role: effectiveRole(p.role),
        assigned_event_ids: p.assignedEventIds,
        env: p.env,
        created_at: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
