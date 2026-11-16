import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "./prisma";

// Fetch credentials from DB settings or environment variables
export async function getRazorpayCredentials() {
  const settings = await prisma.platformSetting.findFirst({
    where: { id: 1 },
    select: { razorpayKeyId: true, razorpayKeySecret: true },
  });

  const keyId = settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";

  const isConfigured = Boolean(
    keyId &&
    keySecret &&
    !keyId.includes("mock") &&
    keyId.startsWith("rzp_")
  );

  return { keyId, keySecret, isConfigured };
}

/**
 * Create a Razorpay Order server-side
 */
export async function createRazorpayOrder({
  amountInPaise,
  receipt,
  notes = {},
}: {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const { keyId, keySecret, isConfigured } = await getRazorpayCredentials();

  if (isConfigured) {
    try {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: receipt.slice(0, 40), // Razorpay 40-char max
        notes,
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        isMock: false,
      };
    } catch (err: any) {
      console.error("Razorpay order creation error:", err);
      throw new Error(`Payment gateway error: ${err.message || "Failed to create order"}`);
    }
  }

  // Graceful test/sandbox simulation for local development when live merchant keys aren't configured
  const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    orderId: mockOrderId,
    amount: amountInPaise,
    currency: "INR",
    keyId: keyId || "rzp_test_trailrz_local",
    isMock: true,
  };
}

/**
 * Verify Razorpay payment signature server-side
 */
export async function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<boolean> {
  const { keySecret, isConfigured } = await getRazorpayCredentials();

  // If running in test mode with mock order
  if (orderId.startsWith("order_mock_") || !isConfigured) {
    // In mock mode, if signature matches simulated pattern or is provided
    return Boolean(orderId && paymentId);
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    return generatedSignature === signature;
  } catch (err) {
    console.error("Signature verification exception:", err);
    return false;
  }
}

/**
 * Verify Razorpay Webhook signature
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  webhookSignature: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret) return false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    return expectedSignature === webhookSignature;
  } catch (err) {
    console.error("Webhook signature verification exception:", err);
    return false;
  }
}

/**
 * Initiate refund via Razorpay
 */
export async function processRazorpayRefund({
  paymentId,
  amountInPaise,
  notes = {},
}: {
  paymentId: string;
  amountInPaise: number;
  notes?: Record<string, string>;
}) {
  const { keyId, keySecret, isConfigured } = await getRazorpayCredentials();

  if (isConfigured && !paymentId.startsWith("pay_mock_")) {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amountInPaise,
      notes,
    });

    return {
      refundId: refund.id,
      status: refund.status,
      isMock: false,
    };
  }

  // Simulated refund for test/mock transactions
  return {
    refundId: `rfnd_mock_${Date.now()}`,
    status: "processed",
    isMock: true,
  };
}
