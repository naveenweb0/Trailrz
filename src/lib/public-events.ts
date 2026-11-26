import { prisma } from "./prisma";
import { availability, remaining } from "./inventory";

export function tierPublic(t: any) {
  const r = remaining(t);
  const nowIso = new Date().toISOString();
  const onSale =
    t.active &&
    (!t.saleStartsAt || t.saleStartsAt.toISOString() <= nowIso) &&
    (!t.saleEndsAt || t.saleEndsAt.toISOString() >= nowIso);

  const avail = availability(t);
  return {
    id: t.id,
    name: t.name,
    description: t.description || "",
    price: t.price,
    max_per_booking: t.maxPerBooking ?? 10,
    availability: avail,
    remaining: avail === "limited" ? r : null,
    on_sale: onSale,
    sale_starts_at: t.saleStartsAt ? t.saleStartsAt.toISOString() : null,
    sale_ends_at: t.saleEndsAt ? t.saleEndsAt.toISOString() : null,
  };
}

export function eventCard(e: any, tiers: any[]) {
  const live = tiers.filter((t) => t.active);
  const prices = live.map((t) => t.price);
  const rem = live.reduce((acc, t) => acc + remaining(t), 0);
  const cap = live.reduce((acc, t) => acc + t.capacity, 0);

  let status: "sold_out" | "limited" | "available" | "unavailable" = "unavailable";
  if (live.length > 0) {
    if (rem === 0) {
      status = "sold_out";
    } else if (rem <= Math.max(5, Math.floor(cap / 10))) {
      status = "limited";
    } else {
      status = "available";
    }
  }

  const sold = live.reduce((acc, t) => acc + (t.sold || 0), 0);

  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    category: e.category,
    moods: e.moods || [],
    experience_type: e.experienceType || "",
    is_original: e.isOriginal || false,
    short_description: e.shortDescription || "",
    city: e.city,
    venue: e.venue,
    start_at: e.startAt ? new Date(e.startAt).toISOString() : null,
    end_at: e.endAt ? new Date(e.endAt).toISOString() : null,
    cover_image: e.coverImage,
    organizer: e.organizer || "",
    created_at: e.createdAt ? new Date(e.createdAt).toISOString() : null,
    min_price: prices.length > 0 ? Math.min(...prices) : null,
    availability: status,
    remaining: status === "limited" ? rem : null,
    sold,
  };
}

export function getDateRange(when?: string | null, dateFrom?: string | null, dateTo?: string | null) {
  // IST offset is UTC+5:30 (330 minutes)
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istNow = new Date(utcMs + 330 * 60000);
  istNow.setHours(0, 0, 0, 0);

  const istToUtc = (d: Date) => new Date(d.getTime() - 330 * 60000);

  if (when === "today") {
    const end = new Date(istNow);
    end.setDate(end.getDate() + 1);
    return [istToUtc(istNow), istToUtc(end)];
  }
  if (when === "weekend") {
    const day = istNow.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    const start = new Date(istNow);
    if (day < 5) {
      start.setDate(start.getDate() + (5 - day));
      start.setHours(17, 0, 0, 0);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + (7 - (start.getDay() || 7)) + 1);
    end.setHours(0, 0, 0, 0);
    return [istToUtc(start), istToUtc(end)];
  }
  if (when === "week") {
    const end = new Date(istNow);
    end.setDate(end.getDate() + 7);
    return [istToUtc(istNow), istToUtc(end)];
  }
  if (when === "month") {
    const end = new Date(istNow);
    end.setDate(end.getDate() + 30);
    return [istToUtc(istNow), istToUtc(end)];
  }
  if (dateFrom || dateTo) {
    const start = dateFrom ? new Date(dateFrom) : istNow;
    const end = dateTo ? new Date(new Date(dateTo).getTime() + 86400000) : null;
    return [start, end];
  }
  return [null, null];
}

export async function queryEvents(options: {
  q?: string | null;
  city?: string | null;
  category?: string | null;
  mood?: string | null;
  original?: boolean;
  when?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  priceMax?: number | null; // in paise
  avail?: string | null;
  sort?: string;
  limit?: number;
}) {
  const cutoff = new Date(Date.now() - 3 * 3600 * 1000);
  const where: any = {
    status: "published",
    startAt: { gte: cutoff },
  };

  if (options.q) {
    const s = options.q.trim();
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { venue: { contains: s, mode: "insensitive" } },
      { category: { contains: s, mode: "insensitive" } },
      { city: { contains: s, mode: "insensitive" } },
      { organizer: { contains: s, mode: "insensitive" } },
    ];
  }

  if (options.city) {
    where.city = options.city;
  }
  if (options.category) {
    where.category = options.category;
  }
  if (options.mood) {
    where.moods = { has: options.mood };
  }
  if (options.original) {
    where.isOriginal = true;
  }

  const [f, t] = getDateRange(options.when, options.dateFrom, options.dateTo);
  if (f) {
    where.startAt = { ...where.startAt, gte: f > cutoff ? f : cutoff };
  }
  if (t) {
    where.startAt = { ...where.startAt, lt: t };
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: "asc" },
    take: options.limit || 1000,
    include: {
      ticketTypes: {
        orderBy: { sort: "asc" },
      },
    },
  });

  let cards = events.map((e) => eventCard(e, e.ticketTypes));

  if (options.priceMax !== undefined && options.priceMax !== null) {
    cards = cards.filter((c) => c.min_price !== null && c.min_price <= options.priceMax!);
  }

  if (options.avail === "available") {
    cards = cards.filter((c) => c.availability === "available" || c.availability === "limited");
  } else if (options.avail === "limited") {
    cards = cards.filter((c) => c.availability === "limited");
  }

  if (options.sort === "price_asc") {
    cards.sort((a, b) => {
      if (a.min_price === null) return 1;
      if (b.min_price === null) return -1;
      return a.min_price - b.min_price;
    });
  } else if (options.sort === "price_desc") {
    cards.sort((a, b) => {
      if (a.min_price === null) return 1;
      if (b.min_price === null) return -1;
      return b.min_price - a.min_price;
    });
  }

  return cards;
}
