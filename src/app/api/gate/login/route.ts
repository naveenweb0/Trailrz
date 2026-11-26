import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createStaffSessionToken } from "@/lib/session";
import { compareDigest } from "@/lib/constants";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  key: z.string().min(1, "Gate Terminal ID is required"),
  pin: z.string().min(1, "Gate PIN is required"),
  gate_label: z.string().default("Main gate"),
});

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "gate_login", 15, 900);

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid login data");
    }

    const { key, pin, gate_label } = parsed.data;
    const cleanKey = key.trim().toLowerCase();
    const cleanPin = pin.trim();

    // Find event by gateKey or by slug or ID
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { gateKey: { equals: cleanKey, mode: "insensitive" } },
          { slug: { equals: cleanKey, mode: "insensitive" } },
          { id: cleanKey },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        venue: true,
        city: true,
        startAt: true,
        gateKey: true,
        gatePin: true,
        status: true,
      },
    });

    if (!event) {
      throw new ApiError(404, "Gate Terminal not found. Please verify the Gate ID with the event organizer.");
    }

    if (event.status === "archived") {
      throw new ApiError(403, "This event has been archived.");
    }

    const expectedPin = (event.gatePin || "2026").trim();
    if (!compareDigest(cleanPin, expectedPin)) {
      throw new ApiError(401, "Incorrect Gate PIN. Please verify the passcode.");
    }

    // Upsert a staff user entry for this gate terminal so requireRole can find it
    const operatorUserId = `gate_${event.id}`;
    await prisma.user.upsert({
      where: { userId: operatorUserId },
      update: {
        assignedEventIds: [event.id],
        role: "gate_operator",
        name: `Gate Staff — ${event.title}`,
      },
      create: {
        userId: operatorUserId,
        email: `gate+${event.slug}@trailrz.internal`,
        name: `Gate Staff — ${event.title}`,
        role: "gate_operator",
        assignedEventIds: [event.id],
      },
    });

    // Create staff session token
    const token = createStaffSessionToken({
      sub: operatorUserId,
      email: `gate+${event.slug}@trailrz.internal`,
      role: "gate_operator",
      name: `Gate Staff — ${event.title}`,
    });

    const res = jsonOk({
      token,
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        city: event.city,
        start_at: event.startAt.toISOString(),
      },
      gate: gate_label || "Main gate",
    });

    res.cookies.set("__session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
