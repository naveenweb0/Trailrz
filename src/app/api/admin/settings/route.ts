import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { integrations } from "@/lib/admin-events";
import { audit } from "@/lib/audit";
import { jsonOk, handleApiError } from "@/lib/api-response";

const settingsSchema = z.object({
  platform_name: z.string().default("TRAILRZ"),
  support_email: z.string().default(""),
  support_phone: z.string().default(""),
  supported_cities: z.array(z.string()).default(["Chandigarh", "Mohali", "Panchkula"]),
  default_city: z.string().default("Chandigarh"),
  default_max_per_booking: z.number().int().min(1).max(10).default(10),
  socials: z.record(z.string(), z.string()).default({}),
  notify_on_booking: z.boolean().default(true),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...STAFF);

    const s = await prisma.platformSetting.findUnique({
      where: { id: "platform" },
    });

    const settingsData = {
      platform_name: s?.platformName || "TRAILRZ",
      support_email: s?.supportEmail || "",
      support_phone: s?.supportPhone || "",
      supported_cities: s?.supportedCities || ["Chandigarh", "Mohali", "Panchkula"],
      default_city: s?.defaultCity || "Chandigarh",
      default_max_per_booking: s?.defaultMaxPerBooking ?? 10,
      socials: s?.socials || {},
      notify_on_booking: s?.notifyOnBooking ?? true,
    };

    return jsonOk({
      settings: settingsData,
      integrations: integrations(),
      hold_minutes: parseInt(process.env.HOLD_MINUTES || "10", 10),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const member = await requireRole(request, ...STAFF);

    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const {
      platform_name,
      support_email,
      support_phone,
      supported_cities,
      default_city,
      default_max_per_booking,
      socials,
      notify_on_booking,
    } = parsed.data;

    await prisma.platformSetting.upsert({
      where: { id: "platform" },
      update: {
        platformName: platform_name,
        supportEmail: support_email,
        supportPhone: support_phone,
        supportedCities: supported_cities,
        defaultCity: default_city,
        defaultMaxPerBooking: default_max_per_booking,
        socials,
        notifyOnBooking: notify_on_booking,
      },
      create: {
        id: "platform",
        platformName: platform_name,
        supportEmail: support_email,
        supportPhone: support_phone,
        supportedCities: supported_cities,
        defaultCity: default_city,
        defaultMaxPerBooking: default_max_per_booking,
        socials,
        notifyOnBooking: notify_on_booking,
      },
    });

    await audit(member, "settings.update", "platform");

    return GET(request);
  } catch (err) {
    return handleApiError(err);
  }
}
