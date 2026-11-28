import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBundleQuantityPrice,
  generateBundleSchedule,
  validateBundlePricing,
} from "@/lib/pricing";
import { findIndianCity, searchIndianCities, INDIAN_CITIES } from "@/lib/indian-cities";

describe("Advanced Ticket Bundle Pricing", () => {
  test("supports independent 1, 2, 3, and 4-ticket bundle prices without forcing fixed increment", () => {
    const tier = {
      price: 49900, // ₹499
      bundleEnabled: true,
      twoTicketPrice: 74900, // ₹749
      bundlePrices: {
        "2": 74900, // ₹749
        "3": 112200, // ₹1,122
        "4": 139900, // ₹1,399
      },
      bundleRule: { mode: "fixed_extra", extraTicketPrice: 30000 }, // +₹300 above 4
      maxPerBooking: 6,
    };

    assert.equal(calculateBundleQuantityPrice(tier, 1), 49900);
    assert.equal(calculateBundleQuantityPrice(tier, 2), 74900);
    assert.equal(calculateBundleQuantityPrice(tier, 3), 112200);
    assert.equal(calculateBundleQuantityPrice(tier, 4), 139900);
    assert.equal(calculateBundleQuantityPrice(tier, 5), 169900);
    assert.equal(calculateBundleQuantityPrice(tier, 6), 199900);

    const schedule = generateBundleSchedule(tier);
    assert.equal(schedule.length, 6);
    assert.deepEqual(
      schedule.map((s) => s.price),
      [49900, 74900, 112200, 139900, 169900, 199900]
    );
  });

  test("supports configurable >4 rules (avg_four_rate and single_ticket) and manual overrides always take priority", () => {
    const avgTier = {
      price: 49900,
      bundleEnabled: true,
      bundlePrices: { "2": 74900, "3": 112200, "4": 140000, "5": 165000 },
      bundleRule: { mode: "avg_four_rate" },
      maxPerBooking: 6,
    };
    // 5 has manual override -> 165000; 6 uses avg_four_rate -> 140000 / 4 * 6 = 210000
    assert.equal(calculateBundleQuantityPrice(avgTier, 5), 165000);
    assert.equal(calculateBundleQuantityPrice(avgTier, 6), 210000);

    const singleTier = {
      price: 49900,
      bundleEnabled: true,
      bundlePrices: { "2": 74900, "3": 112200, "4": 140000 },
      bundleRule: { mode: "single_ticket" },
      maxPerBooking: 5,
    };
    assert.equal(calculateBundleQuantityPrice(singleTier, 5), 140000 + 49900);
  });

  test("falls back to linear multiplication when bundle pricing is disabled", () => {
    const tier = {
      price: 49900,
      bundleEnabled: false,
      twoTicketPrice: 74900,
      maxPerBooking: 4,
      bundlePrices: { "2": 74900, "3": 112200 },
    };

    assert.equal(calculateBundleQuantityPrice(tier, 1), 49900);
    assert.equal(calculateBundleQuantityPrice(tier, 2), 99800);
    assert.equal(calculateBundleQuantityPrice(tier, 3), 149700);
  });

  test("validates non-negative prices and maxPerBooking bounds", () => {
    assert.equal(
      validateBundlePricing({
        price: 49900,
        bundleEnabled: true,
        twoTicketPrice: 74900,
        maxPerBooking: 5,
        bundlePrices: { "2": 74900, "3": 112200, "4": 139900 },
        bundleRule: { mode: "fixed_extra", extraTicketPrice: 30000 },
      }),
      null
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

    assert.ok(
      validateBundlePricing({
        price: 49900,
        bundleEnabled: true,
        bundlePrices: { "3": -50 },
        maxPerBooking: 4,
      })?.includes("0 or greater")
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
