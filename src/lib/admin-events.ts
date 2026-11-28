import { prisma } from "./prisma";
import { CATEGORIES, slugify, newId } from "./constants";
import { remaining } from "./inventory";
import { razorpayReady } from "./razorpay";
import { resendReady } from "./resend";
import { cloudinaryReady } from "./cloudinary";
import { ApiError } from "./api-response";
import { findIndianCity } from "./indian-cities";
import {
  normalizeBundleOverrides,
  validateBundlePricing,
} from "./pricing";

export interface TierInput {
  id?: string | null;
  name: string;
  description?: string;
  price: number; // in rupees from API, will convert to paise
  bundle_enabled?: boolean;
  two_ticket_price?: number | null; // in rupees from API, will convert to paise
  bundle_prices?: Record<string, number>; // in rupees from API, will convert to paise
  capacity: number;
  max_per_booking?: number;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  active?: boolean;
}

export interface EventInput {
  title: string;
  slug?: string | null;
  category: string;
  moods?: string[];
  experience_type?: string;
  is_original?: boolean;
  short_description?: string;
  description?: string;
  organizer?: string;
  city: string;
  state?: string;
  venue: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  start_at: string;
  end_at?: string | null;
  booking_opens_at?: string | null;
  booking_closes_at?: string | null;
  cover_image?: any;
  gallery?: any[];
  highlights?: string[];
  guidelines?: string[];
  why_attend?: string;
  who_should_attend?: string[];
  what_to_expect?: string[];
  included?: string[];
  faqs?: Array<{ q: string; a: string }>;
  cancellation_policy?: string;
  age_restriction?: string;
  gate_key?: string | null;
  gate_pin?: string | null;
  tiers?: TierInput[];
}

export function integrations() {
  return {
    razorpay: razorpayReady(),
    razorpay_webhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    resend: resendReady(),
    resend_webhook: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    cloudinary: cloudinaryReady(),
    whatsapp: false,
  };
}

export async function withInventory(e: any) {
  const tiers = await prisma.ticketType.findMany({
    where: { eventId: e.id },
    orderBy: { sort: "asc" },
  });

  const formattedTiers = tiers.map((t) => ({
    id: t.id,
    event_id: t.eventId,
    name: t.name,
    description: t.description,
    price: t.price, // paise
    bundle_enabled: Boolean(t.bundleEnabled),
    two_ticket_price: t.twoTicketPrice ?? null, // paise
    bundle_prices: normalizeBundleOverrides(t.bundlePrices), // paise
    capacity: t.capacity,
    sold: t.sold,
    reserved: t.reserved,
    max_per_booking: t.maxPerBooking,
    sale_starts_at: t.saleStartsAt ? t.saleStartsAt.toISOString() : null,
    sale_ends_at: t.saleEndsAt ? t.saleEndsAt.toISOString() : null,
    active: t.active,
    sort: t.sort,
    remaining: remaining(t),
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  }));

  const cap = formattedTiers.reduce((acc, t) => acc + t.capacity, 0);
  const sold = formattedTiers.reduce((acc, t) => acc + t.sold, 0);
  const reserved = formattedTiers.reduce((acc, t) => acc + t.reserved, 0);

  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    category: e.category,
    moods: e.moods || [],
    experience_type: e.experienceType || "",
    is_original: e.isOriginal || false,
    short_description: e.shortDescription || "",
    description: e.description || "",
    organizer: e.organizer || "",
    city: e.city,
    state: e.state || "",
    venue: e.venue,
    address: e.address || "",
    lat: e.lat,
    lng: e.lng,
    start_at: e.startAt ? new Date(e.startAt).toISOString() : null,
    end_at: e.endAt ? new Date(e.endAt).toISOString() : null,
    booking_opens_at: e.bookingOpensAt ? new Date(e.bookingOpensAt).toISOString() : null,
    booking_closes_at: e.bookingClosesAt ? new Date(e.bookingClosesAt).toISOString() : null,
    cover_image: e.coverImage,
    gallery: e.gallery || [],
    highlights: e.highlights || [],
    guidelines: e.guidelines || [],
    why_attend: e.whyAttend || "",
    who_should_attend: e.whoShouldAttend || [],
    what_to_expect: e.whatToExpect || [],
    included: e.included || [],
    faqs: e.faqs || [],
    cancellation_policy: e.cancellationPolicy || "",
    age_restriction: e.ageRestriction || "",
    gate_key: e.gateKey || (e.slug ? `gate-${e.slug}` : ""),
    gate_pin: e.gatePin || "2026",
    status: e.status,
    created_by: e.createdBy,
    created_at: e.createdAt ? new Date(e.createdAt).toISOString() : null,
    updated_at: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
    tiers: formattedTiers,
    capacity: cap,
    sold,
    reserved,
  };
}

export async function saveTiers(eventId: string, tiers: TierInput[]) {
  const existing = await prisma.ticketType.findMany({
    where: { eventId },
  });
  const existingMap = new Map(existing.map((t) => [t.id, t]));
  const keep = new Set<string>();

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const priceInPaise = Math.round(Number(t.price || 0) * 100);
    const bundleEnabled = Boolean(t.bundle_enabled);
    const twoTicketPriceInPaise =
      bundleEnabled && t.two_ticket_price !== null && t.two_ticket_price !== undefined && String(t.two_ticket_price) !== ""
        ? Math.round(Number(t.two_ticket_price) * 100)
        : null;
    const rawOverridesPaise: Record<string, number> = {};
    if (bundleEnabled && t.bundle_prices && typeof t.bundle_prices === "object") {
      for (const [k, v] of Object.entries(t.bundle_prices)) {
        if (v !== null && v !== undefined && String(v) !== "") {
          rawOverridesPaise[k] = Math.round(Number(v) * 100);
        }
      }
    }
    const maxPerBooking = Number(t.max_per_booking ?? 10);

    const pricingErr = validateBundlePricing({
      price: priceInPaise,
      bundleEnabled,
      twoTicketPrice: twoTicketPriceInPaise,
      maxPerBooking,
      bundlePrices: rawOverridesPaise,
    });
    if (pricingErr) {
      throw new ApiError(422, `${t.name || "Ticket tier"}: ${pricingErr}`);
    }

    const bundlePrices = bundleEnabled ? normalizeBundleOverrides(rawOverridesPaise) : {};
    const saleStartsAt = t.sale_starts_at ? new Date(t.sale_starts_at) : null;
    const saleEndsAt = t.sale_ends_at ? new Date(t.sale_ends_at) : null;

    if (t.id && existingMap.has(t.id)) {
      const cur = existingMap.get(t.id)!;
      if (t.capacity < (cur.sold + cur.reserved)) {
        throw new ApiError(
          409,
          `${t.name}: capacity cannot go below ${cur.sold + cur.reserved} (sold + held)`
        );
      }

      await prisma.ticketType.update({
        where: { id: t.id },
        data: {
          name: t.name,
          description: t.description || "",
          price: priceInPaise,
          bundleEnabled,
          twoTicketPrice: twoTicketPriceInPaise,
          bundlePrices,
          capacity: t.capacity,
          maxPerBooking,
          saleStartsAt,
          saleEndsAt,
          active: t.active ?? true,
          sort: i,
          updatedAt: new Date(),
        },
      });
      keep.add(t.id);
    } else {
      const nid = newId();
      await prisma.ticketType.create({
        data: {
          id: nid,
          eventId,
          name: t.name,
          description: t.description || "",
          price: priceInPaise,
          bundleEnabled,
          twoTicketPrice: twoTicketPriceInPaise,
          bundlePrices,
          capacity: t.capacity,
          maxPerBooking,
          saleStartsAt,
          saleEndsAt,
          active: t.active ?? true,
          sort: i,
          sold: 0,
          reserved: 0,
        },
      });
      keep.add(nid);
    }
  }

  for (const [tid, cur] of existingMap.entries()) {
    if (!keep.has(tid)) {
      if (cur.sold > 0 || cur.reserved > 0) {
        throw new ApiError(
          409,
          `${cur.name} has sold or held passes; deactivate it instead of removing`
        );
      }
      await prisma.ticketType.delete({
        where: { id: tid },
      });
    }
  }
}

export function toEventData(body: EventInput) {
  if (!CATEGORIES.includes(body.category as any)) {
    throw new ApiError(422, "Unknown category");
  }

  const slug = slugify(body.slug || body.title);
  const cityName = body.city.trim();
  const matchedCity = findIndianCity(cityName);

  const cleanFaqs = (body.faqs || [])
    .filter((f) => f && String(f.q || "").trim().length > 0 && String(f.a || "").trim().length > 0)
    .map((f) => ({ q: String(f.q).trim(), a: String(f.a).trim() }));

  return {
    title: body.title.trim(),
    slug,
    category: body.category,
    moods: body.moods || [],
    experienceType: body.experience_type || "",
    isOriginal: body.is_original ?? false,
    shortDescription: body.short_description || "",
    description: body.description || "",
    organizer: body.organizer || "",
    city: matchedCity ? matchedCity.city : cityName,
    state: (body.state || "").trim() || matchedCity?.state || "",
    venue: body.venue.trim(),
    address: body.address || "",
    lat: body.lat ?? matchedCity?.lat ?? null,
    lng: body.lng ?? matchedCity?.lng ?? null,
    startAt: new Date(body.start_at),
    endAt: body.end_at ? new Date(body.end_at) : null,
    bookingOpensAt: body.booking_opens_at ? new Date(body.booking_opens_at) : null,
    bookingClosesAt: body.booking_closes_at ? new Date(body.booking_closes_at) : null,
    coverImage:
      typeof body.cover_image === "string"
        ? { url: body.cover_image, alt: "" }
        : body.cover_image || null,
    gallery: body.gallery || [],
    highlights: (body.highlights || []).filter((h) => h.trim().length > 0),
    guidelines: (body.guidelines || []).filter((g) => g.trim().length > 0),
    whyAttend: body.why_attend || "",
    whoShouldAttend: (body.who_should_attend || []).filter((w) => w.trim().length > 0),
    whatToExpect: (body.what_to_expect || []).filter((w) => w.trim().length > 0),
    included: (body.included || []).filter((x) => x.trim().length > 0),
    faqs: cleanFaqs,
    cancellationPolicy: body.cancellation_policy || "",
    ageRestriction: body.age_restriction || "",
    gateKey: body.gate_key ? body.gate_key.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "") : `gate-${slug}`,
    gatePin: body.gate_pin ? body.gate_pin.trim() : "2026",
  };
}

export function buildBookingFilter(q?: string | null, status?: string | null, eventId?: string | null) {
  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (eventId) {
    where.eventId = eventId;
  }
  if (q) {
    const s = q.trim();
    where.OR = [
      { reference: { contains: s, mode: "insensitive" } },
      { customerSnapshot: { path: ["name"], string_contains: s } },
      { customerSnapshot: { path: ["email"], string_contains: s } },
      { eventSnapshot: { path: ["title"], string_contains: s } },
    ];
  }
  return where;
}

export function serializeBookingItem(b: any) {
  return {
    id: b.id,
    reference: b.reference,
    event_id: b.eventId,
    event: b.eventSnapshot,
    items: b.items,
    amount: b.amount,
    currency: b.currency,
    customer_id: b.customerId,
    customer: b.customerSnapshot,
    status: b.status,
    payment_status: b.paymentStatus,
    payment_id: b.paymentId,
    hold_expires_at: b.holdExpiresAt ? b.holdExpiresAt.toISOString() : null,
    inventory_released: b.inventoryReleased,
    ticket_count: b.ticketCount,
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
    confirmed_at: b.confirmedAt ? b.confirmedAt.toISOString() : null,
  };
}

