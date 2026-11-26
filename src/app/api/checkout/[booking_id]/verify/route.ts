import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getBookingWithKey, finalizeBooking } from "@/lib/booking";
import { razorpayReady, rpClient, verifyRpSignature } from "@/lib/razorpay";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

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

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const p = await prisma.payment.findFirst({
      where: {
        bookingId: b.id,
        orderId: razorpay_order_id,
      },
    });

    if (!p || !razorpayReady()) {
      throw new ApiError(400, "Unknown payment order");
    }

    if (b.status === "confirmed" && p.status === "paid") {
      return jsonOk({
        status: b.status,
        reference: b.reference,
      });
    }

    if (!verifyRpSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      await prisma.payment.update({
        where: { id: p.id },
        data: {
          status: "signature_failed",
          updatedAt: new Date(),
        },
      });
      throw new ApiError(400, "Payment could not be verified");
    }

    let rp: any;
    try {
      rp = await rpClient().payments.fetch(razorpay_payment_id);
    } catch {
      throw new ApiError(
        502,
        "Could not confirm payment with the gateway yet. Do not pay again — check My Passes shortly."
      );
    }

    if (
      rp.order_id !== p.orderId ||
      rp.amount !== p.amount ||
      rp.status !== "captured"
    ) {
      throw new ApiError(
        409,
        "Your payment is still being confirmed by the bank. Do not pay again — your passes will appear in My Passes once it is captured."
      );
    }

    await prisma.payment.update({
      where: { id: p.id },
      data: {
        status: "paid",
        paymentId: razorpay_payment_id,
        verifiedBy: "signature",
        updatedAt: new Date(),
      },
    });

    const done = await finalizeBooking(p.bookingId, { id: razorpay_payment_id });

    return jsonOk({
      status: done.status,
      reference: done.reference,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
