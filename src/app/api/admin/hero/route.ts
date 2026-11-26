import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";
import { isSafeHref, isSafeImageUrl, normalizeHeroConfig } from "@/lib/hero";

const slideSchema = z.object({
  label: z.string().trim().min(1).max(20),
  image_url: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .refine(isSafeImageUrl, "Image URL must start with https://, http://, or /"),
  description: z.string().max(220).default(""),
});

const heroSchema = z.object({
  eyebrow: z.string().max(160).default(""),
  headline_line_1: z.string().trim().min(1, "Headline line 1 is required").max(40),
  headline_line_2: z.string().max(40).default(""),
  tagline: z.string().max(80).default(""),
  subtext: z.string().max(220).default(""),
  primary_cta_label: z.string().trim().min(1, "Primary CTA label is required").max(40),
  primary_cta_href: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine(isSafeHref, "Primary link must start with / or https://"),
  secondary_cta_label: z.string().max(40).default(""),
  secondary_cta_href: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || isSafeHref(v), "Secondary link must start with / or https://")
    .default("/originals"),
  show_board: z.boolean().default(true),
  board_eyebrow: z.string().max(60).default("Tonight's departures"),
  board_title: z.string().max(20).default("NOW SHOWING"),
  board_footnote: z.string().max(120).default(""),
  slides: z.array(slideSchema).min(1, "Keep at least one hero image slide").max(12),
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
      throw new ApiError(422, parsed.error.issues[0]?.message || "Invalid hero configuration");
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
