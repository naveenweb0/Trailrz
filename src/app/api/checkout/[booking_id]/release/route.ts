import { NextRequest } from "next/server";
import { getBookingWithKey } from "@/lib/booking";
import { expireHold } from "@/lib/inventory";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id } = await params;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || request.headers.get("x-booking-key");

    const b = await getBookingWithKey(booking_id, key);
    await expireHold(b.id, "cancelled");

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
