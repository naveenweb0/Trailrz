import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { code, digits, holdExpiry } from "@/lib/constants";
import { reserve, release, releaseExpiredHolds } from "@/lib/inventory";
import { bookingPublic } from "@/lib/booking";
import { calculateBundleQuantityPrice } from "@/lib/pricing";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

const itemSchema = z.object({
  ticket_type_id: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
});

const holdSchema = z.object({
  event_id: z.string().min(1),
  items: z.array(itemSchema).min(1).max(6),
  customer: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    phone: z.string(),
  }),
  marketing_consent: z.boolean().default(false),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "hold", 15, 600);

    const body = await request.json();
    const parsed = holdSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const { event_id, customer, marketing_consent } = parsed.data;

    // Reclaim any lapsed holds for this event before checking availability
    await releaseExpiredHolds(event_id, 10).catch((e) =>
      console.warn("releaseExpiredHolds warning:", e)
    );

    const phoneClean = customer.phone.trim();
    const phoneDigs = digits(phoneClean);
    if (phoneDigs.length !== 10) {
      throw new ApiError(422, "Enter a valid 10-digit mobile number");
    }

    const totalQty = parsed.data.items.reduce((acc, it) => acc + it.quantity, 0);
    if (totalQty > 50) {
      throw new ApiError(422, "A maximum of 50 passes can be reserved in one booking");
    }

    const event = await prisma.event.findFirst({
      where: {
        id: event_id,
        status: "published",
      },
      include: {
        ticketTypes: true,
      },
    });

    if (!event) {
      throw new ApiError(404, "Experience not found or registration is closed");
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const cutoff3h = new Date(now.getTime() - 3 * 3600 * 1000);

    if (new Date(event.startAt) < cutoff3h) {
      throw new ApiError(400, "Registration for this event has ended");
    }

    if (event.bookingOpensAt && event.bookingOpensAt.toISOString() > nowIso) {
      throw new ApiError(400, "Booking for this experience is not open yet");
    }
    if (event.bookingClosesAt && event.bookingClosesAt.toISOString() < nowIso) {
      throw new ApiError(400, "Booking for this experience has closed");
    }

    const tierMap = new Map(event.ticketTypes.map((t) => [t.id, t]));
    const bookingItems: Array<{
      ticket_type_id: string;
      name: string;
      unit_price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const it of parsed.data.items) {
      const tier = tierMap.get(it.ticket_type_id);
      if (!tier || !tier.active) {
        throw new ApiError(404, "One of the selected pass types is not available");
      }

      if (tier.saleStartsAt && tier.saleStartsAt.toISOString() > nowIso) {
        throw new ApiError(400, `${tier.name} passes are not on sale yet`);
      }
      if (tier.saleEndsAt && tier.saleEndsAt.toISOString() < nowIso) {
        throw new ApiError(400, `${tier.name} pass sales have ended`);
      }

      if (it.quantity > tier.maxPerBooking) {
        throw new ApiError(422, `${tier.name}: maximum ${tier.maxPerBooking} per booking`);
      }

      const subtotal = calculateBundleQuantityPrice(tier, it.quantity);
      bookingItems.push({
        ticket_type_id: tier.id,
        name: tier.name,
        unit_price: tier.price,
        quantity: it.quantity,
        subtotal,
      });
    }

    // Atomically reserve inventory
    const secured: typeof bookingItems = [];
    for (const it of bookingItems) {
      const ok = await reserve(it.ticket_type_id, it.quantity);
      if (!ok) {
        // Roll back previously secured items
        for (const s of secured) {
          await release(s.ticket_type_id, s.quantity);
        }
        throw new ApiError(409, `Not enough ${it.name} passes left. Please choose fewer.`);
      }
      secured.push(it);
    }

    const email = customer.email.toLowerCase().trim();

    // Upsert customer record
    const cust = await prisma.customer.upsert({
      where: { email },
      update: {
        name: customer.name.trim(),
        phone: phoneClean,
        phoneDigits: phoneDigs,
        lastSeenAt: now,
      },
      create: {
        email,
        name: customer.name.trim(),
        phone: phoneClean,
        phoneDigits: phoneDigs,
        lastSeenAt: now,
      },
    });

    if (marketing_consent) {
      await prisma.subscriber.upsert({
        where: { email },
        update: {},
        create: {
          email,
          source: "checkout",
        },
      });
    }

    const reference = code("TRZ", 6);
    const accessKey = code("K", 24);
    const amount = bookingItems.reduce((acc, it) => acc + it.subtotal, 0);
    const expiresAt = holdExpiry();

    const booking = await prisma.booking.create({
      data: {
        reference,
        accessKey,
        eventId: event.id,
        eventSnapshot: {
          title: event.title,
          slug: event.slug,
          start_at: event.startAt.toISOString(),
          end_at: event.endAt ? event.endAt.toISOString() : null,
          venue: event.venue,
          city: event.city,
          state: event.state || "",
          address: event.address || "",
          cover_image: event.coverImage,
        },
        items: bookingItems,
        amount,
        currency: "INR",
        customerId: cust.id,
        customerSnapshot: {
          name: customer.name.trim(),
          email,
          phone: phoneClean,
          phone_digits: phoneDigs,
        },
        status: "held",
        paymentStatus: "none",
        holdExpiresAt: expiresAt,
      },
    });

    return jsonOk({
      ...bookingPublic(booking),
      access_key: booking.accessKey,
      payment_required: booking.amount > 0,
      server_now: now.toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
