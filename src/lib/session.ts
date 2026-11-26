import crypto from "crypto";
import { getQrSigningSecret } from "./env";

export interface StaffSessionPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
  iat?: number;
  exp?: number;
}

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  return buf.toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf-8");
}

export function createStaffSessionToken(data: {
  sub: string;
  email: string;
  role: string;
  name: string;
}): string {
  const secret = getQrSigningSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: StaffSessionPayload = {
    ...data,
    iat: now,
    exp: now + 7 * 86400, // 7 days
  };

  const headerEnc = base64UrlEncode(JSON.stringify(header));
  const payloadEnc = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerEnc}.${payloadEnc}`;
  const sig = crypto.createHmac("sha256", secret).update(message).digest("base64url");

  return `${message}.${sig}`;
}

export function verifyStaffSessionToken(token: string): StaffSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;

  const [headerEnc, payloadEnc, sig] = parts;
  const secret = getQrSigningSecret();
  const message = `${headerEnc}.${payloadEnc}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(message).digest("base64url");

  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: StaffSessionPayload = JSON.parse(base64UrlDecode(payloadEnc));
    if (!payload.sub || !payload.email || !payload.role) {
      return null;
    }

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
