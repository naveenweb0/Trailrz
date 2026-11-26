import { NextRequest } from "next/server";
import { queryEvents } from "@/lib/public-events";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const city = searchParams.get("city");
    const category = searchParams.get("category");
    const mood = searchParams.get("mood");
    const original = searchParams.get("original") === "true";
    const when = searchParams.get("when");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const priceMaxParam = searchParams.get("price_max");
    const priceMax = priceMaxParam ? parseInt(priceMaxParam, 10) * 100 : null;
    const availability = searchParams.get("availability");
    const sort = searchParams.get("sort") || "date";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));

    let cards: any[] = [];
    try {
      cards = await queryEvents({
        q,
        city,
        category,
        mood,
        original,
        when,
        dateFrom,
        dateTo,
        priceMax,
        avail: availability,
        sort,
      });
    } catch (dbErr) {
      console.warn("DB notice in /api/public/events, using empty fallback list");
    }

    const start = (page - 1) * limit;
    const items = cards.slice(start, start + limit);
    const total = cards.length;
    const pages = Math.max(1, Math.ceil(total / limit));

    return jsonOk({
      items,
      total,
      page,
      pages,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
