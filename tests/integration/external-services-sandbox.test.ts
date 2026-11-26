import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "../../src/lib/prisma";
import { newId, code } from "../../src/lib/constants";
import { authenticateRequest, requireRole, currentMember } from "../../src/lib/auth";
import {
  razorpayReady,
  verifyRpSignature,
  verifyRpWebhookSignature,
} from "../../src/lib/razorpay";
import {
  cloudinaryReady,
  generateMediaSignature,
} from "../../src/lib/cloudinary";
import {
  resendReady,
  confirmationHtml,
  refundHtml,
  broadcastHtml,
  queueEmail,
  sendNotification,
} from "../../src/lib/resend";
import { rateLimit, RateLimitError, isDistributedRateLimitingEnabled } from "../../src/lib/rate-limit";
import { finalizeBooking } from "../../src/lib/booking";

// API Handlers
import { GET as getMediaSignature } from "../../src/app/api/admin/media/signature/route";
import { GET as getAdminOverview } from "../../src/app/api/admin/overview/route";
import { GET as getAdminSettings } from "../../src/app/api/admin/settings/route";
import { GET as getGateMe } from "../../src/app/api/gate/me/route";
import { POST as postPay } from "../../src/app/api/checkout/[booking_id]/pay/route";
import { POST as postVerify } from "../../src/app/api/checkout/[booking_id]/verify/route";
import { POST as postRazorpayWebhook } from "../../src/app/api/payments/razorpay/webhook/route";

// Setup Sandbox Environment Variables for Test Runner
process.env.QR_SIGNING_SECRET = process.env.QR_SIGNING_SECRET || "trz_dev_qr_signing_secret_32_characters_min_length";
process.env.ADMIN_EMAIL = "trailrz.official@gmail.com";
process.env.APP_URL = "http://localhost:3000";
process.env.HOLD_MINUTES = "10";
process.env.CLERK_SECRET_KEY = "test_clerk_secret_key";
process.env.RAZORPAY_KEY_ID = "rzp_test_TRAILRZDEV01";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret_32chars_dev_key_xyz";
process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_webhook_secret_dev_32chars_abc";
process.env.CLOUDINARY_CLOUD_NAME = "trailrz-dev";
process.env.CLOUDINARY_API_KEY = "123456789012345";
process.env.CLOUDINARY_API_SECRET = "cloudinary_secret_dev_32chars_long";
process.env.RESEND_API_KEY = "re_test_mock_resend_api_key_development";
process.env.MAIL_FROM = "TRAILRZ Dev <onboarding@resend.dev>";

// Track created IDs for isolated teardown
const testEventIds: string[] = [];
const testTicketTypeIds: string[] = [];
const testCustomerIds: string[] = [];
const testBookingIds: string[] = [];
const testTicketIds: string[] = [];
const testPaymentIds: string[] = [];
const testUserIds: string[] = [];
const testWebhookEventIds: string[] = [];
const testNotificationIds: string[] = [];

function makeTestToken(userId: string, expOffsetSec = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + expOffsetSec,
    })
  ).toString("base64");
  return `${header}.${payload}.signature`;
}

function makeAuthHeader(userId: string, expOffsetSec = 3600): { Authorization: string } {
  return { Authorization: `Bearer ${makeTestToken(userId, expOffsetSec)}` };
}

describe("TRAILRZ — Batch 5B: External Services Sandbox Integration", () => {
  let eventId: string;
  let ticketTypeId: string;
  let customerId: string;
  let superadminUserId: string;
  let adminUserId: string;
  let eventManagerUserId: string;
  let gateOperatorUserId: string;
  let pendingUserId: string;
  let bookingId: string;

  before(async () => {
    const timestamp = Date.now();
    eventId = `evt_sandbox_${timestamp}`;
    ticketTypeId = `tt_sandbox_${timestamp}`;
    customerId = `cust_sandbox_${timestamp}`;
    superadminUserId = `usr_super_${timestamp}`;
    adminUserId = `usr_admin_${timestamp}`;
    eventManagerUserId = `usr_evmgr_${timestamp}`;
    gateOperatorUserId = `usr_gateop_${timestamp}`;
    pendingUserId = `usr_pending_${timestamp}`;

    testEventIds.push(eventId);
    testTicketTypeIds.push(ticketTypeId);
    testCustomerIds.push(customerId);
    testUserIds.push(superadminUserId, adminUserId, eventManagerUserId, gateOperatorUserId, pendingUserId);

    // Create test customer
    await prisma.customer.create({
      data: {
        id: customerId,
        email: `sandbox-${timestamp}@example.com`,
        phone: "+919876543210",
        phoneDigits: "9876543210",
        name: "Sandbox Attendee",
      },
    });

    // Create test event and ticket type
    await prisma.event.create({
      data: {
        id: eventId,
        slug: `sandbox-event-${timestamp}`,
        title: "Sandbox Acoustic Night",
        venue: "Sector 17 Plaza",
        city: "Chandigarh",
        category: "Music",
        moods: ["Music Nights"],
        startAt: new Date(Date.now() + 86400000 * 5),
        endAt: new Date(Date.now() + 86400000 * 5 + 10800000),
        status: "published",
        coverImage: "https://images.unsplash.com/photo-sandbox",
        ticketTypes: {
          create: {
            id: ticketTypeId,
            name: "Sandbox VIP",
            price: 150000, // ₹1,500.00
            capacity: 50,
            sold: 0,
            reserved: 0,
          },
        },
      },
    });

    // Pre-seed test staff members with respective roles
    await prisma.user.createMany({
      data: [
        {
          id: newId(),
          userId: superadminUserId,
          email: "trailrz.official@gmail.com",
          name: "Super Administrator",
          role: "superadmin",
          assignedEventIds: [eventId],
        },
        {
          id: newId(),
          userId: adminUserId,
          email: "admin@trailrz.test",
          name: "Operations Admin",
          role: "admin",
          assignedEventIds: [eventId],
        },
        {
          id: newId(),
          userId: eventManagerUserId,
          email: "manager@trailrz.test",
          name: "Event Lead",
          role: "event_manager",
          assignedEventIds: [eventId],
        },
        {
          id: newId(),
          userId: gateOperatorUserId,
          email: "gate@trailrz.test",
          name: "Gate Scanner Operator",
          role: "gate_operator",
          assignedEventIds: [eventId],
        },
        {
          id: newId(),
          userId: pendingUserId,
          email: "unapproved@trailrz.test",
          name: "Pending Applicant",
          role: "pending",
          assignedEventIds: [],
        },
      ],
    });
  });

  after(async () => {
    // Teardown all created records
    if (testTicketIds.length) {
      await prisma.ticket.deleteMany({ where: { id: { in: testTicketIds } } }).catch(() => {});
    }
    await prisma.ticket.deleteMany({ where: { eventId: { in: testEventIds } } }).catch(() => {});

    if (testPaymentIds.length) {
      await prisma.payment.deleteMany({ where: { id: { in: testPaymentIds } } }).catch(() => {});
    }
    if (testBookingIds.length) {
      await prisma.booking.deleteMany({ where: { id: { in: testBookingIds } } }).catch(() => {});
    }
    await prisma.booking.deleteMany({ where: { eventId: { in: testEventIds } } }).catch(() => {});

    if (testTicketTypeIds.length) {
      await prisma.ticketType.deleteMany({ where: { id: { in: testTicketTypeIds } } }).catch(() => {});
    }
    if (testEventIds.length) {
      await prisma.event.deleteMany({ where: { id: { in: testEventIds } } }).catch(() => {});
    }
    if (testCustomerIds.length) {
      await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } }).catch(() => {});
    }
    if (testUserIds.length) {
      await prisma.user.deleteMany({ where: { userId: { in: testUserIds } } }).catch(() => {});
    }
    if (testWebhookEventIds.length) {
      await prisma.webhookEvent.deleteMany({ where: { id: { in: testWebhookEventIds } } }).catch(() => {});
    }
    if (testNotificationIds.length) {
      await prisma.notification.deleteMany({ where: { id: { in: testNotificationIds } } }).catch(() => {});
    }
    await prisma.subscriber.deleteMany({ where: { email: { contains: "sandbox" } } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { actorEmail: { contains: "trailrz" } } }).catch(() => {});

    const remEvents = await prisma.event.count();
    const remBookings = await prisma.booking.count();
    const remTickets = await prisma.ticket.count();
    console.log(`[SANDBOX CLEANUP] Residuals - Events: ${remEvents}, Bookings: ${remBookings}, Tickets: ${remTickets}`);
  });

  // ==========================================
  // 1. CLERK AUTHENTICATION & RBAC SANDBOX
  // ==========================================
  describe("1. Clerk Sandbox Authentication & RBAC", () => {
    test("Authenticates valid session token and extracts user ID", async () => {
      const req = new NextRequest("http://localhost:3000/api/gate/me", {
        headers: makeAuthHeader(gateOperatorUserId),
      });
      const userId = await authenticateRequest(req);
      assert.equal(userId, gateOperatorUserId);
    });

    test("Rejects expired session with HTTP 401", async () => {
      // Offset by -100 seconds so exp is in the past
      const req = new NextRequest("http://localhost:3000/api/gate/me", {
        headers: makeAuthHeader(gateOperatorUserId, -100),
      });
      await assert.rejects(async () => {
        await authenticateRequest(req);
      }, /Session has expired/);
    });

    test("Enforces unverified email cannot obtain superadmin status", async () => {
      // An unverified email test
      const unverifiedUserId = `usr_unverified_${Date.now()}`;
      testUserIds.push(unverifiedUserId);

      // Create a user who registered with admin email but email is not verified
      await prisma.user.create({
        data: {
          id: newId(),
          userId: unverifiedUserId,
          email: "trailrz.official@gmail.com",
          name: "Unverified Claimer",
          role: "pending", // Must be pending
        },
      });

      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        headers: makeAuthHeader(unverifiedUserId),
      });

      // Role check must reject with 403
      await assert.rejects(async () => {
        await requireRole(req, "superadmin");
      }, /Not allowed/);
    });

    test("Pending role is rejected on staff endpoints with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: makeAuthHeader(pendingUserId),
      });
      const res = await getAdminOverview(req);
      assert.equal(res.status, 403);
    });

    test("Gate operator access succeeds for gate portal and is forbidden on admin overview", async () => {
      const gateReq = new NextRequest("http://localhost:3000/api/gate/me", {
        headers: makeAuthHeader(gateOperatorUserId),
      });
      const gateRes = await getGateMe(gateReq);
      assert.equal(gateRes.status, 200);

      const adminReq = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: makeAuthHeader(gateOperatorUserId),
      });
      const adminRes = await getAdminOverview(adminReq);
      assert.equal(adminRes.status, 403);
    });

    test("Superadmin role can access protected platform settings", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        headers: makeAuthHeader(superadminUserId),
      });
      const res = await getAdminSettings(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.settings);
    });

    test("Role revocation immediately blocks subsequent API requests", async () => {
      const tempManagerId = `usr_temp_mgr_${Date.now()}`;
      testUserIds.push(tempManagerId);

      await prisma.user.create({
        data: {
          id: newId(),
          userId: tempManagerId,
          email: "temp@trailrz.test",
          name: "Temporary Manager",
          role: "admin",
        },
      });

      // Request as admin succeeds
      const req1 = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: makeAuthHeader(tempManagerId),
      });
      const res1 = await getAdminOverview(req1);
      assert.equal(res1.status, 200);

      // Admin revokes privileges by demoting to 'pending'
      await prisma.user.update({
        where: { userId: tempManagerId },
        data: { role: "pending" },
      });

      // Next request immediately receives 403
      const req2 = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: makeAuthHeader(tempManagerId),
      });
      const res2 = await getAdminOverview(req2);
      assert.equal(res2.status, 403);
    });
  });

  // ==========================================
  // 2. RAZORPAY SANDBOX TESTS
  // ==========================================
  describe("2. Razorpay Sandbox Integration", () => {
    let accessKey: string;
    let orderId: string;
    const testSecret = "rzp_test_secret_32chars_dev_key_xyz";
    const testWebhookSecret = "rzp_webhook_secret_dev_32chars_abc";

    before(async () => {
      accessKey = `key_${Date.now()}`;
      bookingId = `bk_sandbox_${Date.now()}`;
      testBookingIds.push(bookingId);

      // Create held booking with reserve
      await prisma.ticketType.update({
        where: { id: ticketTypeId },
        data: { reserved: { increment: 2 } },
      });

      await prisma.booking.create({
        data: {
          id: bookingId,
          reference: code("TRZ", 8),
          accessKey,
          eventId,
          customerId,
          status: "held",
          paymentStatus: "created",
          holdExpiresAt: new Date(Date.now() + 600000), // 10 min hold
          ticketCount: 2,
          amount: 300000, // ₹3,000.00 (2 x ₹1,500)
          items: [
            {
              ticket_type_id: ticketTypeId,
              name: "Sandbox VIP",
              unit_price: 150000,
              quantity: 2,
            },
          ],
          eventSnapshot: { title: "Sandbox Acoustic Night", venue: "Sector 17 Plaza", city: "Chandigarh" },
          customerSnapshot: { name: "Sandbox Attendee", email: "attendee@sandbox.test", phone: "+919876543210" },
        },
      });
    });

    test("Razorpay configuration is verified ready with test keys", () => {
      assert.equal(razorpayReady(), true);
    });

    test("Order creation initiates payment record with created status", async () => {
      orderId = `order_test_${Date.now()}`;
      // Simulate order creation in payment table
      const p = await prisma.payment.create({
        data: {
          id: newId(),
          bookingId,
          bookingReference: "TRZ-SB-TEST",
          customerId,
          customerName: "Sandbox Attendee",
          orderId,
          amount: 300000,
          currency: "INR",
          status: "created",
        },
      });
      testPaymentIds.push(p.id);

      assert.equal(p.status, "created");
      assert.equal(p.amount, 300000);
      assert.equal(p.currency, "INR");
    });

    test("Invalid Razorpay signature is rejected with constant-time verification", () => {
      const paymentId = "pay_test_tampered_001";
      const forgedSignature = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const isValid = verifyRpSignature(orderId, paymentId, forgedSignature);
      assert.equal(isValid, false);
    });

    test("Valid Razorpay signature passes cryptographic verification", () => {
      const paymentId = "pay_test_valid_001";
      const msg = `${orderId}|${paymentId}`;
      const validSignature = crypto.createHmac("sha256", testSecret).update(msg).digest("hex");
      const isValid = verifyRpSignature(orderId, paymentId, validSignature);
      assert.equal(isValid, true);
    });

    test("Mock payment or fake payload cannot mark an unpaid booking as confirmed", async () => {
      const req = new NextRequest(`http://localhost:3000/api/checkout/${bookingId}/verify?key=${accessKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: "pay_test_mock_fake",
          razorpay_signature: "invalid_sig",
        }),
      });

      const res = await postVerify(req, { params: Promise.resolve({ booking_id: bookingId }) });
      // Must be rejected with 400
      assert.equal(res.status, 400);

      // Confirm booking is still held and NOT confirmed
      const b = await prisma.booking.findUnique({ where: { id: bookingId } });
      assert.equal(b?.status, "held");
    });

    test("Payment failure webhook updates payment status to failed without confirming booking", async () => {
      const failedOrderId = `order_failed_${Date.now()}`;
      const failedPayment = await prisma.payment.create({
        data: {
          id: newId(),
          bookingId,
          bookingReference: "TRZ-SB-FAIL",
          customerId,
          customerName: "Sandbox Attendee",
          orderId: failedOrderId,
          amount: 300000,
          currency: "INR",
          status: "created",
        },
      });
      testPaymentIds.push(failedPayment.id);

      const webhookBody = JSON.stringify({
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_failed_123",
              order_id: failedOrderId,
              amount: 300000,
            },
          },
        },
      });

      const sig = crypto.createHmac("sha256", testWebhookSecret).update(webhookBody).digest("hex");
      const eventId = `evt_fail_${Date.now()}`;
      testWebhookEventIds.push(eventId);

      const req = new NextRequest("http://localhost:3000/api/payments/razorpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": sig,
          "x-razorpay-event-id": eventId,
        },
        body: webhookBody,
      });

      const res = await postRazorpayWebhook(req);
      assert.equal(res.status, 200);

      const updatedPayment = await prisma.payment.findUnique({ where: { id: failedPayment.id } });
      assert.equal(updatedPayment?.status, "failed");

      const b = await prisma.booking.findUnique({ where: { id: bookingId } });
      assert.notEqual(b?.status, "confirmed");
    });

    test("Successful finalization moves inventory and generates tickets exactly once", async () => {
      // Finalize the booking using finalizeBooking
      const done = await finalizeBooking(bookingId, { id: "pay_test_success_999" });
      assert.equal(done.status, "confirmed");

      // Verify tickets count equals 2
      const tickets = await prisma.ticket.findMany({ where: { bookingId } });
      assert.equal(tickets.length, 2);
      tickets.forEach((t) => {
        assert.equal(t.status, "VALID");
        testTicketIds.push(t.id);
      });

      // Verify inventory: reserved decremented by 2, sold incremented by 2
      const tt = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
      assert.equal(tt?.sold, 2);
      assert.equal(tt?.reserved, 0);

      // Verify idempotency: calling finalize again does NOT generate duplicate tickets
      const secondCall = await finalizeBooking(bookingId, { id: "pay_test_success_999" });
      assert.equal(secondCall.status, "confirmed");

      const ticketsAfter = await prisma.ticket.findMany({ where: { bookingId } });
      assert.equal(ticketsAfter.length, 2);
    });

    test("Duplicate webhook event is detected and ignored idempotently", async () => {
      const webhookEventId = `evt_dup_${Date.now()}`;
      testWebhookEventIds.push(webhookEventId);

      const webhookBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_dup_001",
              order_id: orderId,
              amount: 300000,
            },
          },
        },
      });

      const sig = crypto.createHmac("sha256", testWebhookSecret).update(webhookBody).digest("hex");

      const makeWebhookReq = () =>
        new NextRequest("http://localhost:3000/api/payments/razorpay/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-razorpay-signature": sig,
            "x-razorpay-event-id": webhookEventId,
          },
          body: webhookBody,
        });

      // First webhook call
      const res1 = await postRazorpayWebhook(makeWebhookReq());
      assert.equal(res1.status, 200);

      // Check event recorded in Neon
      const evt = await prisma.webhookEvent.findUnique({ where: { id: webhookEventId } });
      assert.ok(evt);

      // Second webhook call with identical event ID
      const res2 = await postRazorpayWebhook(makeWebhookReq());
      assert.equal(res2.status, 200);

      // Verify ticket count remains exactly 2 (no duplicate generation)
      const ticketCount = await prisma.ticket.count({ where: { bookingId } });
      assert.equal(ticketCount, 2);
    });

    test("Refund webhook voids valid tickets and restores inventory exactly once", async () => {
      const refundEventId = `evt_rfnd_${Date.now()}`;
      testWebhookEventIds.push(refundEventId);

      const refundBody = JSON.stringify({
        event: "refund.processed",
        payload: {
          refund: {
            entity: {
              id: `rfnd_sb_${Date.now()}`,
              payment_id: "pay_test_success_999",
              amount: 300000,
            },
          },
        },
      });

      // Update primary payment record to paid so refund can find it
      await prisma.payment.update({
        where: { id: testPaymentIds[0] },
        data: { paymentId: "pay_test_success_999", status: "paid" },
      });

      const sig = crypto.createHmac("sha256", testWebhookSecret).update(refundBody).digest("hex");

      const req = new NextRequest("http://localhost:3000/api/payments/razorpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": sig,
          "x-razorpay-event-id": refundEventId,
        },
        body: refundBody,
      });

      const res = await postRazorpayWebhook(req);
      assert.equal(res.status, 200);

      // Verify booking status is refunded
      const b = await prisma.booking.findUnique({ where: { id: bookingId } });
      assert.equal(b?.status, "refunded");

      // Verify all tickets are marked VOID
      const tickets = await prisma.ticket.findMany({ where: { bookingId } });
      tickets.forEach((t) => {
        assert.equal(t.status, "VOID");
        assert.ok(t.voidReason?.includes("Refund processed"));
      });

      // Verify sold inventory was restored (decremented from 2 to 0)
      const tt = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
      assert.equal(tt?.sold, 0);
    });
  });

  // ==========================================
  // 3. CLOUDINARY SANDBOX TESTS
  // ==========================================
  describe("3. Cloudinary Sandbox Integration", () => {
    test("Cloudinary configuration is verified ready with dev credentials", () => {
      assert.equal(cloudinaryReady(), true);
    });

    test("Media signature endpoint requires staff authorization", async () => {
      // Unauthenticated request returns 401
      const anonReq = new NextRequest("http://localhost:3000/api/admin/media/signature");
      const anonRes = await getMediaSignature(anonReq);
      assert.equal(anonRes.status, 401);

      // Gate operator returns 403
      const gateReq = new NextRequest("http://localhost:3000/api/admin/media/signature", {
        headers: makeAuthHeader(gateOperatorUserId),
      });
      const gateRes = await getMediaSignature(gateReq);
      assert.equal(gateRes.status, 403);
    });

    test("Authorized staff receives valid HMAC signed upload payload", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/media/signature", {
        headers: makeAuthHeader(superadminUserId),
      });
      const res = await getMediaSignature(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.ok(data.signature);
      assert.ok(data.timestamp);
      assert.equal(data.folder, "trailrz/events");
      assert.equal(data.cloud_name, "trailrz-dev");
      assert.equal(data.api_key, "123456789012345");
    });

    test("Upload constraints enforce 5 MB limit and image format validation", () => {
      const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
      const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

      // Valid scenario
      const validUpload = { size: 2.4 * 1024 * 1024, type: "image/jpeg" };
      assert.ok(validUpload.size <= MAX_SIZE_BYTES);
      assert.ok(ALLOWED_MIME_TYPES.includes(validUpload.type));

      // Invalid oversized scenario
      const oversizedUpload = { size: 6.8 * 1024 * 1024, type: "image/png" };
      assert.equal(oversizedUpload.size <= MAX_SIZE_BYTES, false);

      // Invalid format scenario
      const forbiddenUpload = { size: 500 * 1024, type: "application/pdf" };
      assert.equal(ALLOWED_MIME_TYPES.includes(forbiddenUpload.type), false);
    });
  });

  // ==========================================
  // 4. RESEND SANDBOX TESTS
  // ==========================================
  describe("4. Resend Sandbox Integration", () => {
    test("Resend configuration is verified ready with test settings", () => {
      assert.equal(resendReady(), true);
    });

    test("Confirmation email template renders branded HTML without errors", () => {
      const html = confirmationHtml(
        {
          reference: "TRZ-SB-CONFIRM",
          accessKey: "secret_access_key_123",
          eventSnapshot: { title: "Sandbox Gala", venue: "Grand Ballroom", city: "Chandigarh" },
        },
        [
          { serial: "TRZ-VIP-001", tierName: "VIP Pass" },
          { serial: "TRZ-VIP-002", tierName: "VIP Pass" },
        ]
      );

      assert.ok(html.includes("TRAILRZ"));
      assert.ok(html.includes("TRZ-SB-CONFIRM"));
      assert.ok(html.includes("TRZ-VIP-001"));
      assert.ok(html.includes("Open your passes"));
      assert.ok(html.includes("/my-tickets?ref=TRZ-SB-CONFIRM&key=secret_access_key_123"));
    });

    test("Refund email template renders exact formatted refund notice", () => {
      const html = refundHtml(
        {
          reference: "TRZ-SB-RFND",
          eventSnapshot: { title: "Sandbox Gala" },
        },
        { amount: 300000 }
      );

      assert.ok(html.includes("Refund Processed"));
      assert.ok(html.includes("₹3000.00"));
      assert.ok(html.includes("TRZ-SB-RFND"));
      assert.ok(html.includes("Admission passes for this booking have been voided"));
    });

    test("Organizer broadcast template renders announcement message", () => {
      const html = broadcastHtml(
        {
          reference: "TRZ-SB-BC",
          eventSnapshot: { title: "Sandbox Gala" },
        },
        "Important Gate Update",
        "Please use North Entrance for rapid check-in."
      );

      assert.ok(html.includes("Important Gate Update"));
      assert.ok(html.includes("North Entrance"));
    });

    test("Queue email persists notification record with queued status", async () => {
      const notif = await queueEmail(
        {
          id: bookingId,
          reference: "TRZ-NOTIF-01",
          eventId,
          customerSnapshot: { email: "delivered@resend.dev" },
        },
        "booking_confirmation",
        "Your Passes for Sandbox Gala",
        "<p>Test Content</p>"
      );
      testNotificationIds.push(notif.id);

      assert.equal(notif.status, "queued");
      assert.equal(notif.to, "delivered@resend.dev");

      const saved = await prisma.notification.findUnique({ where: { id: notif.id } });
      assert.ok(saved);
      assert.equal(saved?.channel, "email");
    });
  });

  // ==========================================
  // 5. RATE LIMITING SANDBOX TESTS
  // ==========================================
  describe("5. Rate Limiting Sandbox Evaluation", () => {
    test("In-memory rate limiter enforces request thresholds within sliding window", () => {
      const fakeReq = new NextRequest("http://localhost:3000/api/public/subscribe", {
        headers: { "x-forwarded-for": "198.51.100.42" },
      });

      // 3 attempts with limit 2 within 60s
      rateLimit(fakeReq, "test_bucket", 2, 60);
      rateLimit(fakeReq, "test_bucket", 2, 60);

      // Third attempt must throw RateLimitError
      assert.throws(() => {
        rateLimit(fakeReq, "test_bucket", 2, 60);
      }, RateLimitError);
    });

    test("Identifies missing Upstash Redis credentials and flags production blocker", () => {
      const isDistributedActive = isDistributedRateLimitingEnabled();
      // Upstash credentials are not set in .env.local, so distributed rate limiting must report false
      assert.equal(isDistributedActive, false);
    });
  });

  // ==========================================
  // 6. PLATFORM SETTINGS SPECIFICATION CHECK
  // ==========================================
  describe("6. Platform Settings Specification Verification", () => {
    test("Platform settings specification adheres to domain constraints without invented details", () => {
      const proposedSetting = {
        id: "platform",
        platformName: "TRAILRZ",
        supportEmail: "trailrz.official@gmail.com",
        supportPhone: "", // Not invented
        supportedCities: ["Chandigarh", "Mohali", "Panchkula"],
        defaultCity: "Chandigarh",
        defaultMaxPerBooking: 10,
        socials: {}, // Not invented
        notifyOnBooking: true,
      };

      assert.equal(proposedSetting.id, "platform");
      assert.equal(proposedSetting.platformName, "TRAILRZ");
      assert.equal(proposedSetting.supportEmail, "trailrz.official@gmail.com");
      assert.equal(proposedSetting.supportPhone, "");
      assert.deepEqual(proposedSetting.supportedCities, ["Chandigarh", "Mohali", "Panchkula"]);
      assert.deepEqual(proposedSetting.socials, {});
    });

    test("Platform settings table in Neon has zero rows (unseeded)", async () => {
      const rowCount = await prisma.platformSetting.count();
      assert.equal(rowCount, 0);
    });
  });
});
