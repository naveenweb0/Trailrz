import crypto from "crypto";
import { getQrSigningSecret } from "./env";

export function qrSign(ticketId: string): string {
  const secret = getQrSigningSecret();
  const sig = crypto.createHmac("sha256", secret).update(ticketId).digest("hex").slice(0, 40);
  return `TRZ1.${ticketId}.${sig}`;
}

export function qrVerify(payload: string): string | null {
  const parts = (payload || "").trim().split(".");
  if (parts.length !== 3 || parts[0] !== "TRZ1") {
    return null;
  }
  const ticketId = parts[1];
  try {
    const expected = qrSign(ticketId).split(".")[2];
    const given = parts[2];
    if (expected.length !== given.length) {
      return null;
    }
    const isMatch = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
    return isMatch ? ticketId : null;
  } catch {
    return null;
  }
}
