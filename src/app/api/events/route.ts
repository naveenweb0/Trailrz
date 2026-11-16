import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const mood = searchParams.get("mood")?.trim() || "";
    const eventType = searchParams.get("eventType")?.trim() || "";
    const dateRange = searchParams.get("dateRange")?.trim() || "";
    const priceMin = searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) : null;
    const priceMax = searchParams.get("priceMax") ? parseInt(searchParams.get("priceMax")!) : null;
    const sort = searchParams.get("sort")?.trim() || "recommended";
    const featuredOnly = searchParams.get("featured") === "true";
    const originalOnly = searchParams.get("original") === "true";

    const where: any = {
      status: "PUBLISHED",
    };

    if (city && city !== "All Cities") {
      where.city = { contains: city };
    }

    if (category && category !== "All Categories") {
      where.category = { contains: category };
    }

    if (mood) {
      where.mood = { contains: mood };
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (featuredOnly) {
      where.isFeatured = true;
    }

    if (originalOnly) {
      where.isOriginal = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { shortDescription: { contains: search } },
        { fullDescription: { contains: search } },
        { venueName: { contains: search } },
        { city: { contains: search } },
        { category: { contains: search } },
        { artistInfo: { contains: search } },
      ];
    }

    // Date range filtering
    const now = new Date();
    if (dateRange === "today") {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      where.eventDate = {
        gte: new Date(now.setHours(0, 0, 0, 0)),
        lte: endOfDay,
      };
    } else if (dateRange === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));
      where.eventDate = {
        gte: startOfTomorrow,
        lte: endOfTomorrow,
      };
    } else if (dateRange === "this_weekend") {
      // Current weekend (Friday to Sunday)
      const day = now.getDay();
      const diffToFriday = (5 - day + 7) % 7;
      const friday = new Date(now);
      friday.setDate(now.getDate() + diffToFriday);
      friday.setHours(0, 0, 0, 0);

      const sunday = new Date(friday);
      sunday.setDate(friday.getDate() + 2);
      sunday.setHours(23, 59, 59, 999);

      where.eventDate = {
        gte: friday,
        lte: sunday,
      };
    } else if (dateRange === "this_week") {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + 7);
      where.eventDate = {
        gte: new Date(),
        lte: endOfWeek,
      };
    } else {
      // By default show upcoming events
      where.eventDate = {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // within last 24h onwards
      };
    }

    let orderBy: any = [{ isFeatured: "desc" }, { eventDate: "asc" }];
    if (sort === "newest") {
      orderBy = [{ createdAt: "desc" }];
    } else if (sort === "date") {
      orderBy = [{ eventDate: "asc" }];
    }

    const events = await prisma.event.findMany({
      where,
      orderBy,
      include: {
        ticketTypes: {
          where: { status: "ACTIVE" },
          orderBy: { price: "asc" },
        },
      },
    });

    // Map starting prices & apply price filtering if needed
    const formatted = events
      .map((ev) => {
        const minPrice = ev.ticketTypes.length > 0 ? ev.ticketTypes[0].price : 0;
        return {
          id: ev.id,
          title: ev.title,
          slug: ev.slug,
          shortDescription: ev.shortDescription,
          category: ev.category,
          subcategory: ev.subcategory,
          eventType: ev.eventType,
          isFeatured: ev.isFeatured,
          isOriginal: ev.isOriginal,
          mood: ev.mood,
          coverImage: ev.coverImage,
          city: ev.city,
          venueName: ev.venueName,
          fullAddress: ev.fullAddress,
          eventDate: ev.eventDate,
          startTime: ev.startTime,
          endTime: ev.endTime,
          status: ev.status,
          minPrice,
          ticketTypes: ev.ticketTypes.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            price: t.price,
            quantityTotal: t.quantityTotal,
            quantitySold: t.quantitySold,
            maxPerBooking: t.maxPerBooking,
            minPerBooking: t.minPerBooking,
            status: t.status,
            availableQuantity: Math.max(0, t.quantityTotal - t.quantitySold),
          })),
        };
      })
      .filter((ev) => {
        if (priceMin !== null && ev.minPrice < priceMin) return false;
        if (priceMax !== null && ev.minPrice > priceMax) return false;
        return true;
      });

    // Handle price sorting if requested
    if (sort === "price_low") {
      formatted.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sort === "price_high") {
      formatted.sort((a, b) => b.minPrice - a.minPrice);
    }

    return NextResponse.json({
      success: true,
      count: formatted.length,
      events: formatted,
    });
  } catch (error: any) {
    console.error("GET /api/events error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch experiences" },
      { status: 500 }
    );
  }
}
