export interface BundleTierLike {
  price: number; // in paise (or consistent unit)
  maxPerBooking?: number;
  max_per_booking?: number;
  bundleEnabled?: boolean;
  bundle_enabled?: boolean;
  twoTicketPrice?: number | null;
  two_ticket_price?: number | null;
  bundlePrices?: unknown;
  bundle_prices?: unknown;
}

export interface BundlePriceEntry {
  quantity: number;
  price: number;
  isOverride: boolean;
  perTicket: number;
}

/**
 * Normalizes a raw overrides map into `{ [quantityString]: nonNegativeInt }`.
 */
export function normalizeBundleOverrides(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const qty = Number(k);
    const val = Number(v);
    if (Number.isInteger(qty) && qty >= 2 && Number.isFinite(val) && val >= 0) {
      out[String(qty)] = Math.round(val);
    }
  }
  return out;
}

/**
 * Additional ticket price = Two-ticket price - One-ticket price.
 */
export function calculateAdditionalTicketPrice(
  oneTicketPrice: number,
  twoTicketPrice: number
): number {
  return Math.round(twoTicketPrice) - Math.round(oneTicketPrice);
}

/**
 * Calculates total price for `quantity` tickets of a tier.
 *
 * Formula when bundle pricing is enabled:
 * - qty = 1: oneTicketPrice
 * - qty = 2: override["2"] ?? twoTicketPrice
 * - qty >= 3: override[qty] ?? (twoTicketPrice + (qty - 2) * (twoTicketPrice - oneTicketPrice))
 */
export function calculateBundleQuantityPrice(
  tier: BundleTierLike,
  quantity: number
): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return 0;
  }

  const one = Math.max(0, Math.round(Number(tier.price) || 0));
  const enabled = Boolean(tier.bundleEnabled ?? tier.bundle_enabled);

  if (!enabled) {
    return one * quantity;
  }

  if (quantity === 1) {
    return one;
  }

  const overrides = normalizeBundleOverrides(
    tier.bundlePrices ?? tier.bundle_prices
  );
  const rawTwo = tier.twoTicketPrice ?? tier.two_ticket_price;
  const two =
    rawTwo !== null && rawTwo !== undefined && Number.isFinite(Number(rawTwo))
      ? Math.max(0, Math.round(Number(rawTwo)))
      : one * 2;

  if (quantity === 2) {
    return overrides["2"] !== undefined ? overrides["2"] : two;
  }

  if (overrides[String(quantity)] !== undefined) {
    return overrides[String(quantity)];
  }

  const additional = two - one;
  return Math.max(0, two + (quantity - 2) * additional);
}

/**
 * Generates the complete quantity -> price schedule up to maxPerBooking.
 */
export function generateBundleSchedule(
  tier: BundleTierLike
): BundlePriceEntry[] {
  const rawMax = Number(tier.maxPerBooking ?? tier.max_per_booking ?? 10);
  const maxQ = Number.isFinite(rawMax) ? Math.max(1, Math.min(50, Math.round(rawMax))) : 10;
  const overrides = normalizeBundleOverrides(
    tier.bundlePrices ?? tier.bundle_prices
  );
  const enabled = Boolean(tier.bundleEnabled ?? tier.bundle_enabled);

  const schedule: BundlePriceEntry[] = [];
  for (let q = 1; q <= maxQ; q++) {
    const price = calculateBundleQuantityPrice(tier, q);
    const isOverride = enabled && q >= 2 && overrides[String(q)] !== undefined;
    schedule.push({
      quantity: q,
      price,
      isOverride,
      perTicket: Math.round(price / q),
    });
  }
  return schedule;
}

/**
 * Validates tier pricing configuration. Returns an error message or null if valid.
 */
export function validateBundlePricing(params: {
  price: number;
  bundleEnabled: boolean;
  twoTicketPrice?: number | null;
  maxPerBooking: number;
  bundlePrices?: unknown;
}): string | null {
  if (!Number.isFinite(params.price) || params.price < 0) {
    return "Single ticket price must be 0 or greater.";
  }

  if (
    !Number.isInteger(params.maxPerBooking) ||
    params.maxPerBooking < 1 ||
    params.maxPerBooking > 50
  ) {
    return "Max per booking must be between 1 and 50.";
  }

  if (!params.bundleEnabled) {
    return null;
  }

  if (params.maxPerBooking < 2) {
    return "Max per booking must be at least 2 when bundle pricing is enabled.";
  }

  if (
    params.twoTicketPrice === null ||
    params.twoTicketPrice === undefined ||
    !Number.isFinite(params.twoTicketPrice) ||
    params.twoTicketPrice < 0
  ) {
    return "Two-ticket bundle price must be 0 or greater.";
  }

  if (params.twoTicketPrice < params.price) {
    return "Two-ticket bundle price cannot be less than the single ticket price.";
  }

  if (params.bundlePrices && typeof params.bundlePrices === "object" && !Array.isArray(params.bundlePrices)) {
    for (const [k, v] of Object.entries(params.bundlePrices as Record<string, unknown>)) {
      const qty = Number(k);
      const val = Number(v);
      if (!Number.isInteger(qty) || qty < 2) {
        return `Invalid bundle quantity key "${k}".`;
      }
      if (!Number.isFinite(val) || val < 0) {
        return `Bundle price for ${qty} tickets must be 0 or greater.`;
      }
    }
  }

  return null;
}
