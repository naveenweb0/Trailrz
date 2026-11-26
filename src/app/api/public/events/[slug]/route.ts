import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventCard, queryEvents, tierPublic } from "@/lib/public-events";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const e = await prisma.event.findFirst({
      where: {
        slug,
        status: "published",
      },
      include: {
        ticketTypes: {
          orderBy: { sort: "asc" },
        },
      },
    });

    if (!e) {
      throw new ApiError(404, "Experience not found");
    }

    const tiers = e.ticketTypes;
    const card = eventCard(e, tiers);

    const relatedCards = await queryEvents({ category: e.category, limit: 10 });
    const related = relatedCards.filter((c) => c.id !== e.id).slice(0, 3);

    const nowIso = new Date().toISOString();
    const cutoff3h = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    const startIso = e.startAt ? new Date(e.startAt).toISOString() : "";
    const openIso = e.bookingOpensAt ? new Date(e.bookingOpensAt).toISOString() : null;
    const closeIso = e.bookingClosesAt ? new Date(e.bookingClosesAt).toISOString() : null;

    const isCloseValid = Boolean(closeIso && (!openIso || closeIso > openIso));
    const bookingOpen =
      (!openIso || openIso <= nowIso) &&
      (!isCloseValid || (closeIso !== null && closeIso >= nowIso)) &&
      startIso >= cutoff3h;

    const activeTiers = tiers.filter((t) => t.active).map(tierPublic);

    return jsonOk({
      ...card,
      description: e.description,
      address: e.address,
      lat: e.lat,
      lng: e.lng,
      gallery: e.gallery,
      highlights: e.highlights,
      guidelines: e.guidelines,
      why_attend: e.whyAttend || "",
      who_should_attend: e.whoShouldAttend || [],
      what_to_expect: e.whatToExpect || [],
      included: e.included || [],
      faqs: e.faqs,
      cancellation_policy: e.cancellationPolicy,
      age_restriction: e.ageRestriction,
      booking_opens_at: openIso,
      booking_closes_at: closeIso,
      tiers: activeTiers,
      booking_open: bookingOpen,
      related,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
