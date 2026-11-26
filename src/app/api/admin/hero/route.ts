import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";
import { isSafeImageUrl, normalizeHeroConfig } from "@/lib/hero";

const slideSchema = z.object({
  image_url: z
    .string()
    .trim()
    .min(1, "Image is required")
    .max(1000)
    .refine(isSafeImageUrl, "Image URL must start with https://, http://, or /"),
  line_1: z.string().trim().max(11).default("NOW SHOWING"),
  line_2: z.string().trim().min(1, "Line 2 is required").max(11),
  line_3: z.string().trim().max(11).default(""),
});

const heroSchema = z.object({
  slides: z.array(slideSchema).min(1, "Keep at least one image slide").max(12),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...STAFF);

    const s = await prisma.platformSetting.findUnique({
      where: { id: "platform" },
    });

    return jsonOk(
      { hero: normalizeHeroConfig(s?.hero) },
      200,
      { "Cache-Control": "no-store" }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const member = await requireRole(request, ...STAFF);
    const body = await request.json();
    const parsed = heroSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, parsed.error.issues[0]?.message || "Invalid hero slides");
    }

    const hero = normalizeHeroConfig(parsed.data);
    const heroJson = hero as unknown as Prisma.InputJsonValue;

    await prisma.platformSetting.upsert({
      where: { id: "platform" },
      update: { hero: heroJson },
      create: {
        id: "platform",
        hero: heroJson,
      },
    });

    await audit(member, "hero.update", "platform");

    return jsonOk({ hero }, 200, { "Cache-Control": "no-store" });
  } catch (err) {
    return handleApiError(err);
  }
}
