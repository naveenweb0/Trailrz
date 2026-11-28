import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAdditionalTicketPrice,
  calculateBundleQuantityPrice,
  generateBundleSchedule,
  validateBundlePricing,
} from "@/lib/pricing";
import { findIndianCity, searchIndianCities, INDIAN_CITIES } from "@/lib/indian-cities";

describe("Advanced Ticket Bundle Pricing", () => {
  test("calculates additional ticket price and bundle schedule accurately", () => {
    // 1 ticket = ₹499 (49900p), 2 tickets = ₹749 (74900p) -> additional = ₹250 (25000p)
    assert.equal(calculateAdditionalTicketPrice(49900, 74900), 25000);

    const tier = {
      price: 49900,
      bundleEnabled: true,
      twoTicketPrice: 74900,
      maxPerBooking: 5,
      bundlePrices: {},
    };

    assert.equal(calculateBundleQuantityPrice(tier, 1), 49900);
    assert.equal(calculateBundleQuantityPrice(tier, 2), 74900);
    assert.equal(calculateBundleQuantityPrice(tier, 3), 99900);
    assert.equal(calculateBundleQuantityPrice(tier, 4), 124900);
    assert.equal(calculateBundleQuantityPrice(tier, 5), 149900);

    const schedule = generateBundleSchedule(tier);
    assert.equal(schedule.length, 5);
    assert.deepEqual(
      schedule.map((s) => s.price),
      [49900, 74900, 99900, 124900, 149900]
    );
    assert.equal(schedule.every((s) => !s.isOverride), true);
  });

  test("applies manual overrides while keeping non-overridden quantities auto-calculated", () => {
    const tier = {
      price: 49900,
      bundleEnabled: true,
      twoTicketPrice: 74900,
      maxPerBooking: 5,
      bundlePrices: { "3": 95000 },
    };

    assert.equal(calculateBundleQuantityPrice(tier, 2), 74900);
    assert.equal(calculateBundleQuantityPrice(tier, 3), 95000);
    assert.equal(calculateBundleQuantityPrice(tier, 4), 124900);

    const schedule = generateBundleSchedule(tier);
    assert.equal(schedule[2].isOverride, true);
    assert.equal(schedule[3].isOverride, false);
  });

  test("falls back to linear multiplication when bundle pricing is disabled", () => {
    const tier = {
      price: 49900,
      bundleEnabled: false,
      twoTicketPrice: 74900,
      maxPerBooking: 4,
      bundlePrices: { "3": 95000 },
    };

    assert.equal(calculateBundleQuantityPrice(tier, 1), 49900);
    assert.equal(calculateBundleQuantityPrice(tier, 2), 99800);
    assert.equal(calculateBundleQuantityPrice(tier, 3), 149700);
  });

  test("validates non-negative and logically consistent pricing", () => {
    assert.equal(
      validateBundlePricing({
        price: 49900,
        bundleEnabled: true,
        twoTicketPrice: 74900,
        maxPerBooking: 5,
      }),
      null
    );

    assert.ok(
      validateBundlePricing({
        price: 50000,
        bundleEnabled: true,
        twoTicketPrice: 40000,
        maxPerBooking: 5,
      })?.includes("cannot be less")
    );

    assert.ok(
      validateBundlePricing({
        price: -100,
        bundleEnabled: false,
        maxPerBooking: 5,
      })?.includes("0 or greater")
    );

    assert.ok(
      validateBundlePricing({
        price: 49900,
        bundleEnabled: true,
        twoTicketPrice: 74900,
        maxPerBooking: 1,
      })?.includes("at least 2")
    );
  });
});

describe("Indian Cities Dataset & Search", () => {
  test("includes required major Indian cities with state and coordinates", () => {
    const required = [
      "Chandigarh",
      "Mohali",
      "Panchkula",
      "Delhi",
      "Mumbai",
      "Bengaluru",
      "Hyderabad",
      "Pune",
      "Jaipur",
      "Amritsar",
      "Ludhiana",
      "Patiala",
    ];
    for (const name of required) {
      const found = findIndianCity(name);
      assert.ok(found, `Expected city ${name} to be present`);
      assert.ok(found.state.length > 0);
      assert.ok(Number.isFinite(found.lat));
      assert.ok(Number.isFinite(found.lng));
    }
    assert.ok(INDIAN_CITIES.length >= 90);
  });

  test("searches by city name, alias, and state", () => {
    assert.equal(searchIndianCities("chandigarh")[0]?.city, "Chandigarh");
    assert.equal(searchIndianCities("Bangalore")[0]?.city, "Bengaluru");
    const punjabCities = searchIndianCities("Punjab");
    assert.ok(punjabCities.some((c) => c.city === "Amritsar"));
    assert.ok(punjabCities.some((c) => c.city === "Ludhiana"));
  });
});
