export type BundleAbove4Mode = "fixed_extra" | "avg_four_rate" | "single_ticket";

export interface BundleRuleConfig {
  mode: BundleAbove4Mode;
  extraTicketPrice?: number | null; // in paise (or rupees in UI)
}

export interface BundleTierLike {
  price: number; // 1-ticket price in paise (or consistent unit)
  maxPerBooking?: number;
  max_per_booking?: number;
  bundleEnabled?: boolean;
  bundle_enabled?: boolean;
  twoTicketPrice?: number | null;
  two_ticket_price?: number | null;
  bundlePrices?: unknown;
  bundle_prices?: unknown;
  bundleRule?: unknown;
  bundle_rule?: unknown;
}

export interface BundlePriceEntry {
  quantity: number;
  price: number;
  isOverride: boolean;
  perTicket: number;
}

/**
 * Normalizes a raw bundle prices / overrides map into `{ [quantityString]: nonNegativeInt }`.
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
 * Normalizes the configurable rule for quantities > 4.
 */
export function normalizeBundleRule(raw: unknown): BundleRuleConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { mode: "fixed_extra", extraTicketPrice: null };
  }
  const r = raw as Record<string, unknown>;
  const rawMode = String(r.mode || "fixed_extra");
  const mode: BundleAbove4Mode =
    rawMode === "avg_four_rate" || rawMode === "single_ticket" || rawMode === "fixed_extra"
      ? rawMode
      : "fixed_extra";
  const rawExtra = r.extraTicketPrice ?? r.extra_ticket_price;
  const extraTicketPrice =
    rawExtra !== null && rawExtra !== undefined && String(rawExtra) !== "" && Number.isFinite(Number(rawExtra)) && Number(rawExtra) >= 0
      ? Math.round(Number(rawExtra))
      : null;
  return { mode, extraTicketPrice };
}

/**
 * Resolves the effective prices for quantities 1..4 without mutating saved values.
 */
function resolveBaseBundlePrices(tier: BundleTierLike) {
  const one = Math.max(0, Math.round(Number(tier.price) || 0));
  const prices = normalizeBundleOverrides(tier.bundlePrices ?? tier.bundle_prices);

  const rawTwo = tier.twoTicketPrice ?? tier.two_ticket_price;
  const two =
    prices["2"] !== undefined
      ? prices["2"]
      : rawTwo !== null && rawTwo !== undefined && Number.isFinite(Number(rawTwo))
      ? Math.max(0, Math.round(Number(rawTwo)))
      : one * 2;

  const three =
    prices["3"] !== undefined
      ? prices["3"]
      : Math.max(0, two + Math.max(0, two - one));

  const four =
    prices["4"] !== undefined
      ? prices["4"]
      : Math.max(0, three + Math.max(0, two - one));

  return { one, two, three, four, prices };
}

/**
 * Calculates total price for `quantity` tickets of a tier.
 *
 * Priority:
 * 1. When bundle pricing is disabled: `price * quantity`.
 * 2. Quantity 1: `price` (1-ticket price).
 * 3. Any explicitly saved price in `bundlePrices[qty]` ALWAYS takes priority.
 * 4. Quantities 2, 3, 4 use their configured prices (or fallback if unset).
 * 5. Quantities > 4 use `bundleRule` applied on top of the 4-ticket price.
 */
export function calculateBundleQuantityPrice(
  tier: BundleTierLike,
  quantity: number
): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return 0;
  }

  const enabled = Boolean(tier.bundleEnabled ?? tier.bundle_enabled);
  const { one, two, three, four, prices } = resolveBaseBundlePrices(tier);

  if (!enabled) {
    return one * quantity;
  }

  if (quantity === 1) return one;
  if (prices[String(quantity)] !== undefined) {
    return prices[String(quantity)];
  }
  if (quantity === 2) return two;
  if (quantity === 3) return three;
  if (quantity === 4) return four;

  const rule = normalizeBundleRule(tier.bundleRule ?? tier.bundle_rule);
  if (rule.mode === "avg_four_rate") {
    return Math.max(0, Math.round((four / 4) * quantity));
  }
  if (rule.mode === "single_ticket") {
    return Math.max(0, four + (quantity - 4) * one);
  }
  // fixed_extra
  const extra =
    rule.extraTicketPrice !== null && rule.extraTicketPrice !== undefined
      ? rule.extraTicketPrice
      : one;
  return Math.max(0, four + (quantity - 4) * extra);
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
  bundleRule?: unknown;
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
    params.twoTicketPrice !== null &&
    params.twoTicketPrice !== undefined &&
    (!Number.isFinite(params.twoTicketPrice) || params.twoTicketPrice < 0)
  ) {
    return "Two-ticket bundle price must be 0 or greater.";
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

  if (params.bundleRule && typeof params.bundleRule === "object" && !Array.isArray(params.bundleRule)) {
    const r = params.bundleRule as Record<string, unknown>;
    const extra = r.extraTicketPrice ?? r.extra_ticket_price;
    if (extra !== null && extra !== undefined && String(extra) !== "" && (!Number.isFinite(Number(extra)) || Number(extra) < 0)) {
      return "Extra ticket price for quantities above 4 must be 0 or greater.";
    }
  }

  return null;
}
