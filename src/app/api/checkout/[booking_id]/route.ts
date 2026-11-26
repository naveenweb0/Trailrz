import { NextRequest } from "next/server";
import { getBookingWithKey, bookingPublic } from "@/lib/booking";
import { expireHold } from "@/lib/inventory";
import { razorpayReady } from "@/lib/razorpay";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id } = await params;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || request.headers.get("x-booking-key");

    let b = await getBookingWithKey(booking_id, key);

    if (b.status === "held" && !b.finalizing && b.holdExpiresAt < new Date()) {
      const expired = await expireHold(b.id, "expired");
      if (expired) {
        b = { ...b, status: "expired" };
      }
    }

    return jsonOk({
      ...bookingPublic(b),
      payment_required: b.amount > 0,
      payments_enabled: razorpayReady(),
      server_now: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
