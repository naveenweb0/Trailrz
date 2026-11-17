import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format paise (integer) to Indian Rupee format (e.g. 49900 -> ₹499)
 */
export function formatCurrency(amountInPaise: number, includeDecimals = false): string {
  if (isNaN(amountInPaise)) return "₹0";
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals && amountInPaise % 100 !== 0 ? 2 : 0,
  }).format(rupees);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Format date for events deterministically across SSR and browser (e.g. "Mon, 30 Nov 2026")
 */
export function formatEventDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "";
  const dayName = DAYS[d.getDay()];
  const day = d.getDate();
  const monthName = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Format date with time deterministically across SSR and browser (e.g. "30 Nov 2026, 6:30 PM")
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "";
  const day = d.getDate();
  const monthName = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${monthName} ${year}, ${hours}:${minutes} ${ampm}`;
}

/**
 * Generate human-readable slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate secure random token
 */
export function generateRandomToken(prefix = "TRZ", length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}
