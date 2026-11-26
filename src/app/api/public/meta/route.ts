import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, MOODS } from "@/lib/constants";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let setting: any = null;
    let cities: string[] = [];

    try {
      const now = new Date();
      const [settingRow, publishedEvents] = await Promise.all([
        prisma.platformSetting.findUnique({
          where: { id: "platform" },
        }),
        prisma.event.findMany({
          where: {
            status: "published",
            startAt: { gte: now },
          },
          select: { city: true },
          distinct: ["city"],
        }),
      ]);
      setting = settingRow;
      cities = publishedEvents.map((e) => e.city).sort();
    } catch (dbErr) {
      console.warn("DB notice in /api/public/meta, using fallback platform defaults");
    }

    return jsonOk({
      categories: CATEGORIES,
      moods: MOODS,
      cities_with_events: cities,
      supported_cities: setting?.supportedCities || ["Chandigarh", "Mohali", "Panchkula"],
      support_email: setting?.supportEmail || "",
      support_phone: setting?.supportPhone || "",
      socials: setting?.socials || {},
      platform_name: setting?.platformName || "TRAILRZ",
    });
  } catch (err) {
    return jsonOk({
      categories: CATEGORIES,
      moods: MOODS,
      cities_with_events: [],
      supported_cities: ["Chandigarh", "Mohali", "Panchkula"],
      support_email: "",
      support_phone: "",
      socials: {},
      platform_name: "TRAILRZ",
    });
  }
}
