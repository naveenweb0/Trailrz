import crypto from "crypto";
import Razorpay from "razorpay";
import { getRazorpayKeyId, getRazorpayKeySecret, getRazorpayWebhookSecret } from "./env";

export function razorpayReady(): boolean {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

export function rpClient(): Razorpay {
  const key_id = getRazorpayKeyId();
  const key_secret = getRazorpayKeySecret();
  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials are not configured");
  }
  return new Razorpay({ key_id, key_secret });
}

export function verifyRpSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = getRazorpayKeySecret();
  if (!secret) return false;
  const msg = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(msg).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
  } catch {
    return false;
  }
}

export function verifyRpWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = getRazorpayWebhookSecret();
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
  } catch {
    return false;
  }
}
