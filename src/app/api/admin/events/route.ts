import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { EVENT_STAFF } from "@/lib/constants";
import { withInventory, saveTiers, toEventData, EventInput } from "@/lib/admin-events";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...EVENT_STAFF);

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status");

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { venue: { contains: q, mode: "insensitive" } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startAt: "desc" },
      take: 500,
    });

    const items = await Promise.all(events.map((e) => withInventory(e)));

    return jsonOk({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireRole(request, ...EVENT_STAFF);

    const body = (await request.json()) as EventInput;
    const data = toEventData(body);

    const existingSlug = await prisma.event.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new ApiError(409, "That URL slug is already used by another event");
    }

    if (data.gateKey) {
      const existingGate = await prisma.event.findUnique({
        where: { gateKey: data.gateKey },
      });
      if (existingGate) {
        throw new ApiError(409, "That Gate ID is already used by another event");
      }
    }

    const created = await prisma.event.create({
      data: {
        ...data,
        status: "draft",
        createdBy: member.userId,
      },
    });

    if (body.tiers && body.tiers.length > 0) {
      await saveTiers(created.id, body.tiers);
    }

    await audit(member, "event.create", created.id, { title: created.title });

    const full = await withInventory(created);
    return jsonOk(full);
  } catch (err) {
    return handleApiError(err);
  }
}
