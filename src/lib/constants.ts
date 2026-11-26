import crypto from "crypto";

export const CATEGORIES = [

  "Music",
  "Food & Dining",
  "Art & Culture",
  "Comedy",
  "Workshops",
  "Nightlife",
  "Outdoor",
  "Family",
  "Social Experiences",
  "Theatre",
] as const;

export const MOODS = [
  "Date Night",
  "With Friends",
  "Family Time",
  "Creative Escape",
  "Slow Evenings",
  "Food Lovers",
  "Music Nights",
  "Something Different",
] as const;

export const ROLES = [
  "superadmin",
  "admin",
  "event_manager",
  "gate_operator",
  "pending",
] as const;

export type UserRole = (typeof ROLES)[number];

export const DEFAULT_ROLE: UserRole = "pending";
export const RETIRED_ROLES: Record<string, UserRole> = {};

export const RANK: Record<UserRole, number> = {
  superadmin: 5,
  admin: 4,
  event_manager: 3,
  gate_operator: 2,
  pending: 1,
};

export const STAFF: readonly UserRole[] = ["superadmin", "admin"];
export const EVENT_STAFF: readonly UserRole[] = ["superadmin", "admin", "event_manager"];
export const GATE_STAFF: readonly UserRole[] = ["superadmin", "admin", "gate_operator"];

export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newId(): string {
  return crypto.randomUUID();
}

export function code(prefix: string, n: number = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  let result = "";
  for (let i = 0; i < n; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefix}-${result}`;
}

export function digits(phone: string): string {
  return (phone || "").replace(/\D/g, "").slice(-10);
}

export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function esc(s: string): string {
  return (s || "").trim().slice(0, 80);
}

export function now(): Date {
  return new Date();
}

export function iso(dt?: Date | null): string {
  return (dt || now()).toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

export function holdExpiry(): Date {
  const mins = parseInt(process.env.HOLD_MINUTES || "10", 10);
  return new Date(Date.now() + mins * 60 * 1000);
}

export function compareDigest(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

