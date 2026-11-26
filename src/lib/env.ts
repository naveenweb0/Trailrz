export function getEnv(key: string, required = false): string {
  const val = process.env[key];
  if (!val && required) {
    throw new Error(`CRITICAL SECURITY CONFIGURATION ERROR: Missing required environment variable "${key}". No fallback secrets are permitted.`);
  }
  return val || "";
}

export function getQrSigningSecret(): string {
  return getEnv("QR_SIGNING_SECRET", true);
}

export function getClerkSecretKey(): string {
  return getEnv("CLERK_SECRET_KEY", false);
}

export function getClerkPublishableKey(): string {
  return getEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", false) || getEnv("CLERK_PUBLISHABLE_KEY", false);
}

export function getRazorpayKeyId(): string {
  return getEnv("RAZORPAY_KEY_ID", false);
}

export function getRazorpayKeySecret(): string {
  return getEnv("RAZORPAY_KEY_SECRET", false);
}

export function getRazorpayWebhookSecret(): string {
  return getEnv("RAZORPAY_WEBHOOK_SECRET", false);
}

export function getResendApiKey(): string {
  return getEnv("RESEND_API_KEY", false);
}

export function getMailFrom(): string {
  return getEnv("MAIL_FROM", false);
}

export function getCloudinaryCloudName(): string {
  return getEnv("CLOUDINARY_CLOUD_NAME", false);
}

export function getCloudinaryApiKey(): string {
  return getEnv("CLOUDINARY_API_KEY", false);
}

export function getCloudinaryApiSecret(): string {
  return getEnv("CLOUDINARY_API_SECRET", false);
}

export function getAdminEmails(): Set<string> {
  const raw = getEnv("ADMIN_EMAIL", false);
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getAdminEmail(): string {
  const raw = getEnv("ADMIN_EMAIL", false);
  return raw.split(",")[0]?.trim().toLowerCase() || "";
}

export function getAdminPassword(): string {
  return getEnv("ADMIN_PASSWORD", false);
}

export function getHoldMinutes(): number {
  const m = parseInt(getEnv("HOLD_MINUTES", false) || "10", 10);
  return isNaN(m) ? 10 : m;
}

export function getAppUrl(): string {
  return (getEnv("APP_URL", false) || getEnv("NEXT_PUBLIC_APP_URL", false) || "").replace(/\/+$/, "");
}
