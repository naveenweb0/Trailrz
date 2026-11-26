import { NextRequest } from "next/server";
import { requireRole, effectiveRole } from "@/lib/auth";
import { STAFF, RANK, ROLES, UserRole } from "@/lib/constants";
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
    const newRole = body?.role as UserRole;
    const adminRole = admin.role as UserRole;

    if (!newRole || !(ROLES as readonly string[]).includes(newRole) || RANK[newRole] > RANK[adminRole]) {
      throw new ApiError(403, "Not allowed");
    }

    const env = getClerkSecretKey().startsWith("sk_live_") ? "live" : "preview";
    const target = await prisma.user.findFirst({
      where: {
        userId: user_id,
        OR: [{ env }, { env: null }],
      },
    });

    if (!target) {
      throw new ApiError(404, "Not found");
    }

    if (RANK[effectiveRole(target.role)] > RANK[adminRole]) {
      throw new ApiError(403, "Not allowed");
    }


    if (effectiveRole(target.role) === "superadmin" && newRole !== "superadmin") {
      const superadminCount = await prisma.user.count({
        where: {
          role: "superadmin",
          OR: [{ env }, { env: null }],
        },
      });
      if (superadminCount <= 1) {
        throw new ApiError(409, "Keep at least one superadmin");
      }
    }

    await prisma.user.update({
      where: { userId: user_id },
      data: { role: newRole },
    });

    await audit(admin, "user.role", user_id, { role: newRole });

    return jsonOk({ user_id, role: newRole });
  } catch (err) {
    return handleApiError(err);
  }
}

export const POST = PATCH;

