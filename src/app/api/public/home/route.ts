import { NextRequest } from "next/server";
import { queryEvents, getDateRange } from "@/lib/public-events";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let cards: any[] = [];
    try {
      cards = await queryEvents({});
    } catch (dbErr) {
      console.warn("DB notice in /api/public/home, using empty cards fallback");
    }

    const nowIso = new Date().toISOString();
    const weekIso = new Date(Date.now() + 7 * 86400000).toISOString();
    const [wf, wt] = getDateRange("weekend", null, null);
    const wfIso = wf ? wf.toISOString() : "";
    const wtIso = wt ? wt.toISOString() : "";

    const cities: Record<string, number> = {};
    for (const c of cards) {
      cities[c.city] = (cities[c.city] || 0) + 1;
    }

    const cityList = Object.entries(cities)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    return jsonOk({
      featured: cards.slice(0, 7),
      soon: cards.filter((c) => c.start_at && c.start_at >= nowIso && c.start_at < weekIso).slice(0, 6),
      weekend: cards.filter((c) => c.start_at && c.start_at >= wfIso && c.start_at < wtIso).slice(0, 6),
      recent: [...cards].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 6),
      limited: cards.filter((c) => c.availability === "limited").slice(0, 6),
      popular: [...cards.filter((c) => c.sold > 0)].sort((a, b) => b.sold - a.sold).slice(0, 6),
      originals: cards.filter((c) => c.is_original).slice(0, 4),
      cities: cityList,
      total: cards.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
