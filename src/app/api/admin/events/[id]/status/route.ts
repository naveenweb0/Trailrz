import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { EVENT_STAFF } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

const statusSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireRole(request, ...EVENT_STAFF);
    const { id } = await params;

    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "Invalid status");
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });
    if (!event) {
      throw new ApiError(404, "Not found");
    }

    if (parsed.data.status === "published") {
      const cover = event.coverImage as any;
      if (!cover || !cover.url) {
        throw new ApiError(422, "Add a cover image before publishing");
      }

      const activeTiersCount = await prisma.ticketType.count({
        where: {
          eventId: id,
          active: true,
        },
      });
      if (activeTiersCount === 0) {
        throw new ApiError(422, "Add at least one active ticket tier before publishing");
      }
    }

    await prisma.event.update({
      where: { id },
      data: {
        status: parsed.data.status,
      },
    });

    await audit(member, `event.${parsed.data.status}`, id);

    return jsonOk({ id, status: parsed.data.status });
  } catch (err) {
    return handleApiError(err);
  }
}
