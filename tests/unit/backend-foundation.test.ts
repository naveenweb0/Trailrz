import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { qrSign, qrVerify } from "@/lib/qr";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";
import { remaining, availability } from "@/lib/inventory";
import { code, slugify, digits, compareDigest, RANK, STAFF, EVENT_STAFF, GATE_STAFF, UserRole } from "@/lib/constants";
import { ApiError } from "@/lib/api-response";
import { confirmationHtml, broadcastHtml } from "@/lib/resend";
import { authenticateRequest } from "@/lib/auth";
import { normalizeHeroConfig, DEFAULT_HERO_CONFIG } from "@/lib/hero";



// Set test environment secret for QR testing
process.env.QR_SIGNING_SECRET = "test-secret-key-32-chars-long-abcde";

describe("Backend Foundation Unit & Parity Tests", () => {
  describe("QR Signer & Timing-Safe Verifier Parity", () => {
    test("signs ticket ID into TRZ1 format", () => {
      const ticketId = "test-ticket-uuid-1234";
      const payload = qrSign(ticketId);
      assert.ok(payload.startsWith("TRZ1.test-ticket-uuid-1234."));
      const parts = payload.split(".");
      assert.equal(parts.length, 3);
      assert.equal(parts[0], "TRZ1");
      assert.equal(parts[1], ticketId);
      assert.equal(parts[2].length, 40); // 40 hex chars matching core.py [:40]
    });


    test("verifies valid QR signature and returns ticket ID", () => {
      const ticketId = "valid-pass-001";
      const payload = qrSign(ticketId);
      const verifiedId = qrVerify(payload);
      assert.equal(verifiedId, ticketId);
    });

    test("rejects tampered ticket ID or signature", () => {
      const ticketId = "valid-pass-002";
      const payload = qrSign(ticketId);
      const tampered = payload.slice(0, -4) + "ffff";
      assert.equal(qrVerify(tampered), null);

      const fakePayload = "TRZ1.different-ticket.12345678901234567890123456789012";
      assert.equal(qrVerify(fakePayload), null);

      assert.equal(qrVerify("not-even-a-qr-code"), null);
      assert.equal(qrVerify(""), null);
    });
  });

  describe("Timing-Safe String Comparison", () => {
    test("compares matching strings safely", () => {
      assert.equal(compareDigest("secret-key-123", "secret-key-123"), true);
      assert.equal(compareDigest("secret-key-123", "secret-key-124"), false);
      assert.equal(compareDigest("short", "longer-string"), false);
      assert.equal(compareDigest(null, "some"), false);
      assert.equal(compareDigest(undefined, undefined), false);
    });
  });

  describe("Inventory Availability & Remaining Calculations", () => {
    test("calculates remaining correctly", () => {
      assert.equal(remaining({ capacity: 100, sold: 20, reserved: 10 }), 70);
      assert.equal(remaining({ capacity: 50, sold: 50, reserved: 0 }), 0);
      assert.equal(remaining({ capacity: 50, sold: 45, reserved: 10 }), 0); // clamped to 0
    });

    test("determines availability tier status", () => {
      // 0 remaining -> sold_out
      assert.equal(availability({ capacity: 100, sold: 100, reserved: 0 }), "sold_out");

      // remaining <= max(5, capacity/10) -> limited
      // capacity 100: threshold = max(5, 10) = 10
      assert.equal(availability({ capacity: 100, sold: 92, reserved: 0 }), "limited");
      assert.equal(availability({ capacity: 100, sold: 90, reserved: 0 }), "limited");

      // capacity 30: threshold = max(5, 3) = 5
      assert.equal(availability({ capacity: 30, sold: 25, reserved: 0 }), "limited");

      // available
      assert.equal(availability({ capacity: 100, sold: 50, reserved: 0 }), "available");
    });
  });

  describe("String & Code Helpers Parity", () => {
    test("generates booking and pass codes with correct prefixes and characters", () => {
      const trzCode = code("TRZ", 6);
      assert.ok(trzCode.startsWith("TRZ-"));
      assert.equal(trzCode.length, 10); // "TRZ-" (4) + 6 chars

      const kCode = code("K", 24);
      assert.ok(kCode.startsWith("K-"));
      assert.equal(kCode.length, 26); // "K-" (2) + 24 chars
    });

    test("slugifies strings identically to Python", () => {
      assert.equal(slugify("Sunset Acoustic Sessions 2026!"), "sunset-acoustic-sessions-2026");
      assert.equal(slugify("  --Special & Curated Event--  "), "special-curated-event");
    });

    test("cleans phone digits to last 10", () => {
      assert.equal(digits("+91 98765-43210"), "9876543210");
      assert.equal(digits("09876543210"), "9876543210");
      assert.equal(digits("9876543210"), "9876543210");
      assert.equal(digits("123"), "123");
    });
  });

  describe("Rate Limiting", () => {
    test("allows requests up to limit and throws 429 when exceeded", () => {
      const mockReq = {
        headers: new Headers({ "x-forwarded-for": "10.0.0.1" }),
      } as any;

      const key = "test-limit-" + Date.now();
      // limit 3 in 60s
      assert.doesNotThrow(() => rateLimit(mockReq, key, 3, 60));
      assert.doesNotThrow(() => rateLimit(mockReq, key, 3, 60));
      assert.doesNotThrow(() => rateLimit(mockReq, key, 3, 60));

      assert.throws(
        () => rateLimit(mockReq, key, 3, 60),
        (err: any) => {
          assert.ok(err instanceof RateLimitError);
          assert.equal(err.status, 429);
          assert.ok(err.message.includes("Too many attempts"));
          return true;
        }
      );
    });
  });

  describe("Role & Permission Hierarchy Parity", () => {
    test("maintains strict role ranking", () => {
      assert.ok(RANK["superadmin"] > RANK["admin"]);
      assert.ok(RANK["admin"] > RANK["event_manager"]);
      assert.ok(RANK["event_manager"] > RANK["gate_operator"]);
      assert.ok(RANK["gate_operator"] > RANK["pending"]);
    });

    test("verifies staff group memberships", () => {
      assert.deepEqual(Array.from(STAFF), ["superadmin", "admin"]);
      assert.deepEqual(Array.from(EVENT_STAFF), ["superadmin", "admin", "event_manager"]);
      assert.deepEqual(Array.from(GATE_STAFF), ["superadmin", "admin", "gate_operator"]);
    });
  });

  describe("Production Security Hardening", () => {
    test("escapes HTML in email templates to prevent injection", () => {
      const html = broadcastHtml(
        {
          reference: "TRZ-XSS1",
          eventSnapshot: { title: "<script>alert(1)</script>" },
        },
        "Subject <img src=x onerror=alert(1)>",
        "Body <b>bold</b>"
      );
      assert.equal(html.includes("<script>"), false);
      assert.equal(html.includes("<img"), false);
      assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));

      const conf = confirmationHtml(
        {
          reference: "TRZ-XSS2",
          accessKey: "K-1234",
          eventSnapshot: { title: "Event <svg onload=alert(1)>", venue: "Hall", city: "CHD" },
        },
        [{ serial: "TRZ-1", tierName: "<b>VIP</b>" }]
      );
      assert.equal(conf.includes("<svg"), false);
      assert.ok(conf.includes("&lt;b&gt;VIP&lt;/b&gt;"));
    });

    test("rejects unsigned synthetic JWTs outside test environment", async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevSecret = process.env.CLERK_SECRET_KEY;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";
        process.env.CLERK_SECRET_KEY = "test_clerk_secret_key";
        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
        const payload = Buffer.from(JSON.stringify({ sub: "user_attacker" })).toString("base64");
        const fakeReq = {
          headers: new Headers({ authorization: `Bearer ${header}.${payload}.fakesig` }),
          cookies: { get: () => undefined },
        } as any;

        await assert.rejects(() => authenticateRequest(fakeReq), /Invalid authentication token/);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
        process.env.CLERK_SECRET_KEY = prevSecret;
      }
    });

    test("normalizes hero config safely and filters unsafe URLs", () => {
      const normalized = normalizeHeroConfig({
        headline_line_1: "Custom Headline",
        primary_cta_href: "javascript:alert(1)",
        slides: [
          { label: "BAD", image_url: "javascript:alert(1)" },
          { label: "GOOD", image_url: "https://res.cloudinary.com/demo/image/upload/hero.jpg" },
        ],
      });
      assert.equal(normalized.headline_line_1, "Custom Headline");
      assert.equal(normalized.primary_cta_href, DEFAULT_HERO_CONFIG.primary_cta_href);
      assert.equal(normalized.slides.length, 1);
      assert.equal(normalized.slides[0].label, "GOOD");
    });
  });
});
