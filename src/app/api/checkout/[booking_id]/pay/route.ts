import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBookingWithKey, finalizeBooking } from "@/lib/booking";
import { expireHold } from "@/lib/inventory";
import { enforceRateLimit } from "@/lib/rate-limit";
import { razorpayReady, rpClient } from "@/lib/razorpay";
import { getRazorpayKeyId } from "@/lib/env";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id } = await params;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || request.headers.get("x-booking-key");

    await enforceRateLimit(request, "pay", 20, 60);

    const b = await getBookingWithKey(booking_id, key);

    if (b.status === "confirmed") {
      return jsonOk({ status: "confirmed" });
    }

    if (b.status === "held" && !b.finalizing && b.holdExpiresAt < new Date()) {
      await expireHold(b.id, "expired");
      throw new ApiError(409, "Your reservation hold has expired. Please select your passes again.");
    }

    if (b.status !== "held") {
      throw new ApiError(409, "Your reservation hold has expired. Please select your passes again.");
    }

    if (b.amount === 0) {
      const done = await finalizeBooking(b.id, null);
      return jsonOk({ status: done.status });
    }

    if (!razorpayReady()) {
      throw new ApiError(
        503,
        "Online payments are not configured yet. Your passes are held but cannot be paid for right now."
      );
    }

    const cust = (b.customerSnapshot as Record<string, any>) || {};
    const ev = (b.eventSnapshot as Record<string, any>) || {};

    const keyId = getRazorpayKeyId() || "";
    const isProd = process.env.NODE_ENV === "production";
    const isDevMockKey = keyId.includes("TRAILRZDEV") || keyId === "test_key";

    if (isProd && isDevMockKey) {
      throw new ApiError(503, "Online payments are not configured for production.");
    }

    // In non-production only, allow synthetic sandbox key to complete test payment
    if (!isProd && isDevMockKey) {
      console.log(`[TEST PAYMENT] Completing test payment for booking ${b.reference} (Amount: ₹${b.amount / 100})`);
      const testPayment = await prisma.payment.create({
        data: {
          bookingId: b.id,
          bookingReference: b.reference,
          customerId: b.customerId,
          customerName: cust.name || "",
          orderId: `order_test_${b.reference}_${Date.now()}`,
          paymentId: `pay_test_${Date.now()}`,
          amount: b.amount,
          currency: "INR",
          status: "captured",
        },
      });

      await finalizeBooking(b.id, testPayment);
      return jsonOk({ status: "confirmed" });
    }

    let orderId: string;
    const existing = await prisma.payment.findFirst({
      where: {
        bookingId: b.id,
        status: "created",
      },
    });

    if (existing) {
      orderId = existing.orderId;
    } else {
      let order: { id: string };
      try {
        order = (await rpClient().orders.create({
          amount: b.amount,
          currency: "INR",
          receipt: b.reference,
          payment_capture: true,
          notes: {
            booking_id: b.id,
          },
        })) as { id: string };
      } catch (err: unknown) {
        console.warn("Razorpay API order creation failed:", err);
        const isDevMock =
          !isProd && (keyId.includes("TRAILRZDEV") || keyId.startsWith("test_"));

        if (isDevMock) {
          console.log(`[TEST PAYMENT] Completing test payment for booking ${b.reference} (Amount: ₹${b.amount / 100})`);
          const testPayment = await prisma.payment.create({
            data: {
              bookingId: b.id,
              bookingReference: b.reference,
              customerId: b.customerId,
              customerName: cust.name || "",
              orderId: `order_test_${b.reference}_${Date.now()}`,
              paymentId: `pay_test_${Date.now()}`,
              amount: b.amount,
              currency: "INR",
              status: "captured",
            },
          });

          await finalizeBooking(b.id, testPayment);
          return jsonOk({ status: "confirmed" });
        }

        console.error("razorpay order create failed for", b.reference, err);
        throw new ApiError(502, "Payment gateway is unavailable. Please try again.");
      }

      orderId = order.id;

      await prisma.payment.create({
        data: {
          bookingId: b.id,
          bookingReference: b.reference,
          customerId: b.customerId,
          customerName: cust.name || "",
          orderId,
          amount: b.amount,
          currency: "INR",
          status: "created",
        },
      });

      await prisma.booking.update({
        where: { id: b.id },
        data: {
          paymentStatus: "created",
        },
      });
    }

    return jsonOk({
      status: "pending",
      order_id: orderId,
      key_id: keyId,
      amount: b.amount,
      currency: "INR",
      name: "TRAILRZ",
      description: ev.title || "Experience Passes",
      prefill: {
        name: cust.name,
        email: cust.email,
        contact: cust.phone,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
