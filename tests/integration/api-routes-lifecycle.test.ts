import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../../src/lib/prisma";
import { newId, code } from "../../src/lib/constants";
import { qrSign, qrVerify } from "../../src/lib/qr";

// Import Next.js route handlers directly
import { GET as getMeta } from "../../src/app/api/public/meta/route";
import { POST as postContact } from "../../src/app/api/public/contact/route";
import { POST as postSubscribe } from "../../src/app/api/public/subscribe/route";
import { GET as getPublicEvents } from "../../src/app/api/public/events/route";
import { GET as getPublicHome } from "../../src/app/api/public/home/route";
import { POST as postHold } from "../../src/app/api/checkout/hold/route";
import { GET as getHold } from "../../src/app/api/checkout/[booking_id]/route";
import { POST as postPay } from "../../src/app/api/checkout/[booking_id]/pay/route";
import { GET as getBooking } from "../../src/app/api/bookings/[booking_id]/route";
import { POST as postLookup } from "../../src/app/api/tickets/lookup/route";
import { GET as getGatePing } from "../../src/app/api/gate/ping/route";
import { POST as postGateScan } from "../../src/app/api/gate/scan/route";
import { GET as getGateSummary } from "../../src/app/api/gate/summary/route";
import { GET as getAdminOverview } from "../../src/app/api/admin/overview/route";
import { GET as getAdminInventory } from "../../src/app/api/admin/inventory/route";
import { POST as postVoidTicket } from "../../src/app/api/admin/tickets/[id]/void/route";
import { GET as getAdminAudit } from "../../src/app/api/admin/audit/route";

process.env.QR_SIGNING_SECRET = process.env.QR_SIGNING_SECRET || "test-secret-key-32-chars-long-abcde";

// Track test IDs for clean isolation
const testEventIds: string[] = [];
const testCustomerIds: string[] = [];
const testBookingIds: string[] = [];
const testTicketIds: string[] = [];
const testTicketTypeIds: string[] = [];
const testUserIds: string[] = [];
const testMessageIds: string[] = [];
const testSubscriberIds: string[] = [];
const testScanIds: string[] = [];
const testAuditIds: string[] = [];

// Helper to create synthetic Clerk JWT with user_id / sub
function makeTestAuthHeader(userId: string): { Authorization: string } {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString("base64");
  return { Authorization: `Bearer ${header}.${payload}.signature` };
}

describe("Batch 4: Full Next.js Route Handlers & Portal Lifecycle Integration", () => {
  const superadminUserId = "user_test_superadmin_" + Date.now();
  const gateOpUserId = "user_test_gateop_" + Date.now();
  const testSlug = "batch4-event-" + Date.now();
  let eventId: string;
  let freeTierId: string;
  let paidTierId: string;

  before(async () => {
    await prisma.$connect();

    // Set mock clerk secret key for testing request authentication
    process.env.CLERK_SECRET_KEY = "test_clerk_secret_key";

    // 1. Create Superadmin user in Neon
    const superadminId = newId();
    testUserIds.push(superadminId);
    await prisma.user.create({
      data: {
        id: superadminId,
        userId: superadminUserId,
        email: "superadmin@trailrz.test",
        name: "Test Superadmin",
        role: "superadmin",
        assignedEventIds: [],
        env: "preview",
      },
    });

    // 2. Create Gate Operator user in Neon
    const gateOpId = newId();
    testUserIds.push(gateOpId);
    eventId = newId();
    testEventIds.push(eventId);

    await prisma.user.create({
      data: {
        id: gateOpId,
        userId: gateOpUserId,
        email: "gateop@trailrz.test",
        name: "Gate Operator One",
        role: "gate_operator",
        assignedEventIds: [eventId], // assigned to test event
        env: "preview",
      },
    });

    // 3. Create Test Event
    await prisma.event.create({
      data: {
        id: eventId,
        slug: testSlug,
        title: "Chandigarh Cultural Fusion Night",
        category: "Music",
        moods: ["Date Night", "Music Nights"],
        city: "Chandigarh",
        venue: "Tagore Theatre",
        address: "Sector 18, Chandigarh",
        startAt: new Date(Date.now() + 86400000),
        status: "published",
        shortDescription: "A curated cultural night",
        coverImage: { url: "https://example.com/cover.jpg", alt: "cover" },
      },
    });

    // 4. Create Free Tier
    freeTierId = newId();
    testTicketTypeIds.push(freeTierId);
    await prisma.ticketType.create({
      data: {
        id: freeTierId,
        eventId,
        name: "Free Pass",
        price: 0,
        capacity: 10,
        sold: 0,
        reserved: 0,
      },
    });

    // 5. Create Paid Tier
    paidTierId = newId();
    testTicketTypeIds.push(paidTierId);
    await prisma.ticketType.create({
      data: {
        id: paidTierId,
        eventId,
        name: "VIP Pass",
        price: 250000, // ₹2,500.00
        capacity: 5,
        sold: 0,
        reserved: 0,
      },
    });
  });

  after(async () => {
    // Isolated Cleanup: delete all created test data
    if (testScanIds.length) {
      await prisma.gateScan.deleteMany({ where: { id: { in: testScanIds } } }).catch(() => {});
    }
    // Delete any scans for our event
    await prisma.gateScan.deleteMany({ where: { eventId: { in: testEventIds } } }).catch(() => {});

    if (testTicketIds.length) {
      await prisma.ticket.deleteMany({ where: { id: { in: testTicketIds } } }).catch(() => {});
    }
    await prisma.ticket.deleteMany({ where: { eventId: { in: testEventIds } } }).catch(() => {});

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
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } }).catch(() => {});
    }
    if (testMessageIds.length) {
      await prisma.contactMessage.deleteMany({ where: { id: { in: testMessageIds } } }).catch(() => {});
    }
    if (testSubscriberIds.length) {
      await prisma.subscriber.deleteMany({ where: { id: { in: testSubscriberIds } } }).catch(() => {});
    }
    // Delete any subscribers created by checkout during tests
    await prisma.subscriber.deleteMany({ where: { email: { startsWith: "attendee-" } } }).catch(() => {});
    // Delete test audit logs created by test actors
    await prisma.auditLog.deleteMany({ where: { actorEmail: "superadmin@trailrz.test" } }).catch(() => {});

    // Verify test row counts return to 0
    const remEvents = await prisma.event.count({ where: { id: { in: testEventIds } } });
    const remBookings = await prisma.booking.count({ where: { id: { in: testBookingIds } } });
    const remTickets = await prisma.ticket.count({ where: { id: { in: testTicketIds } } });
    console.log(`[ROUTE LIFECYCLE CLEANUP] Residuals - Events: ${remEvents}, Bookings: ${remBookings}, Tickets: ${remTickets}`);

    assert.equal(remEvents, 0);
    assert.equal(remBookings, 0);
    assert.equal(remTickets, 0);

    await prisma.$disconnect();
  });

  // --- SECTION 1: PUBLIC PORTAL API HANDLERS ---
  describe("1. Public Portal Route Handlers", () => {
    test("GET /api/public/meta returns cities, categories, moods", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/meta");
      const res = await getMeta(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.categories));
      assert.ok(Array.isArray(data.moods));
      assert.ok(data.cities_with_events.includes("Chandigarh"));
      assert.equal(data.platform_name, "TRAILRZ");
    });

    test("POST /api/public/contact creates contact inquiry", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Inquiry Guest",
          email: "inquiry@example.com",
          topic: "Event Guidelines",
          message: "Can I bring cameras?",
        }),
      });
      const res = await postContact(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);

      // Verify row in DB
      const msg = await prisma.contactMessage.findFirst({
        where: { email: "inquiry@example.com" },
      });
      assert.ok(msg);
      testMessageIds.push(msg.id);
    });

    test("POST /api/public/subscribe saves newsletter subscriber", async () => {
      const email = `news-${Date.now()}@example.com`;
      const req = new NextRequest("http://localhost:3000/api/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent: true }),
      });
      const res = await postSubscribe(req);
      assert.equal(res.status, 200);

      const sub = await prisma.subscriber.findUnique({ where: { email } });
      assert.ok(sub);
      testSubscriberIds.push(sub.id);
    });

    test("GET /api/public/events lists published events with availability", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/events?city=Chandigarh");
      const res = await getPublicEvents(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.items.length >= 1);
      const found = data.items.find((e: any) => e.id === eventId);
      assert.ok(found);
      assert.equal(found.title, "Chandigarh Cultural Fusion Night");
      assert.equal(found.availability, "available");
    });

    test("GET /api/public/home returns curated sections", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/home");
      const res = await getPublicHome(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.featured));
      assert.ok(data.total >= 1);
    });
  });

  // --- SECTION 2: AUTHENTICATION & RBAC ENFORCEMENT ---
  describe("2. Authentication & RBAC Route Enforcement", () => {
    test("Protected routes reject unauthenticated requests with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview");
      const res = await getAdminOverview(req);
      assert.equal(res.status, 401);
    });

    test("Gate operator cannot access Admin Overview (returns 403)", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: makeTestAuthHeader(gateOpUserId),
      });
      const res = await getAdminOverview(req);
      assert.equal(res.status, 403);
    });

    test("Superadmin access to Admin Overview succeeds (returns 200)", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: makeTestAuthHeader(superadminUserId),
      });
      const res = await getAdminOverview(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.range);
      assert.equal(typeof data.revenue, "number");
    });
  });

  // --- SECTION 3: BOOKING, CHECKOUT, TICKETS & GATE LIFECYCLE ---
  describe("3. End-to-End Booking, Ticket Issuance, and Gate Scan Lifecycle", () => {
    let bookingId: string;
    let accessKey: string;
    let bookingRef: string;
    let ticketId: string;
    let ticketSerial: string;
    let signedQr: string;
    const customerEmail = `attendee-${Date.now()}@example.com`;
    const customerPhone = "+91 98765 43210";

    test("POST /api/checkout/hold atomically creates hold reservation", async () => {
      const req = new NextRequest("http://localhost:3000/api/checkout/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          items: [{ ticket_type_id: freeTierId, quantity: 2 }],
          customer: {
            name: "Harpreet Kaur",
            email: customerEmail,
            phone: customerPhone,
          },
          marketing_consent: true,
        }),
      });

      const res = await postHold(req);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.id);
      assert.ok(data.reference.startsWith("TRZ-"));
      assert.ok(data.access_key.startsWith("K-"));
      assert.equal(data.status, "held");
      assert.equal(data.amount, 0);

      bookingId = data.id;
      accessKey = data.access_key;
      bookingRef = data.reference;
      testBookingIds.push(bookingId);

      // Verify inventory reserved in Neon
      const tier = await prisma.ticketType.findUniqueOrThrow({ where: { id: freeTierId } });
      assert.equal(tier.reserved, 2);

      // Verify customer in Neon
      const cust = await prisma.customer.findUniqueOrThrow({ where: { email: customerEmail } });
      testCustomerIds.push(cust.id);
    });

    test("GET /api/checkout/[booking_id] rejects missing reservation key with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/checkout/${bookingId}`);
      const res = await getHold(req, { params: Promise.resolve({ booking_id: bookingId }) });
      assert.equal(res.status, 403);
    });

    test("GET /api/checkout/[booking_id] fetches held booking with valid key", async () => {
      const req = new NextRequest(`http://localhost:3000/api/checkout/${bookingId}?key=${accessKey}`);
      const res = await getHold(req, { params: Promise.resolve({ booking_id: bookingId }) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, bookingId);
      assert.equal(data.status, "held");
      assert.equal(data.payment_required, false);
    });

    test("POST /api/checkout/[booking_id]/pay confirms booking and issues tickets", async () => {
      const req = new NextRequest(`http://localhost:3000/api/checkout/${bookingId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Booking-Key": accessKey,
        },
      });

      const res = await postPay(req, { params: Promise.resolve({ booking_id: bookingId }) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, "confirmed");

      // Verify tickets issued in Neon
      const tickets = await prisma.ticket.findMany({ where: { bookingId } });
      assert.equal(tickets.length, 2);
      ticketId = tickets[0].id;
      ticketSerial = tickets[0].serial;
      testTicketIds.push(tickets[0].id, tickets[1].id);

      // Verify sold inventory transitioned (sold = 2, reserved = 0)
      const tier = await prisma.ticketType.findUniqueOrThrow({ where: { id: freeTierId } });
      assert.equal(tier.sold, 2);
      assert.equal(tier.reserved, 0);
    });

    test("GET /api/bookings/[booking_id] returns tickets with authentic QR payload", async () => {
      const req = new NextRequest(`http://localhost:3000/api/bookings/${bookingId}?key=${accessKey}`);
      const res = await getBooking(req, { params: Promise.resolve({ booking_id: bookingId }) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, "confirmed");
      assert.equal(data.tickets.length, 2);

      const t1 = data.tickets[0];
      assert.ok(t1.qr);
      assert.ok(t1.qr.startsWith("TRZ1."));
      signedQr = t1.qr;

      // Verify QR signature contract
      const decodedId = qrVerify(signedQr);
      assert.equal(decodedId, t1.id);
    });

    test("POST /api/tickets/lookup retrieves passes using reference + email + phone", async () => {
      const req = new NextRequest("http://localhost:3000/api/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: bookingRef,
          email: customerEmail,
          phone: "9876543210", // 10 digits
        }),
      });

      const res = await postLookup(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, bookingId);
      assert.equal(data.reference, bookingRef);
      assert.equal(data.tickets.length, 2);
    });

    test("GET /api/gate/ping responds with status", async () => {
      const req = new NextRequest("http://localhost:3000/api/gate/ping");
      const res = await getGatePing(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
    });

    test("POST /api/gate/scan rejects tampered QR code (INVALID)", async () => {
      const tamperedQr = signedQr.slice(0, -4) + "0000";
      const req = new NextRequest("http://localhost:3000/api/gate/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...makeTestAuthHeader(gateOpUserId),
        },
        body: JSON.stringify({
          event_id: eventId,
          payload: tamperedQr,
        }),
      });

      const res = await postGateScan(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.result, "INVALID");
    });

    test("POST /api/gate/scan admits authentic pass (GRANTED)", async () => {
      const req = new NextRequest("http://localhost:3000/api/gate/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...makeTestAuthHeader(gateOpUserId),
        },
        body: JSON.stringify({
          event_id: eventId,
          payload: signedQr,
        }),
      });

      const res = await postGateScan(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.result, "GRANTED");
      assert.equal(data.ticket.status, "REDEEMED");

      // Verify ticket marked REDEEMED in Neon
      const t = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      assert.equal(t.status, "REDEEMED");
      assert.ok(t.redeemedAt);
    });

    test("POST /api/gate/scan rejects previously admitted pass (DUPLICATE)", async () => {
      const req = new NextRequest("http://localhost:3000/api/gate/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...makeTestAuthHeader(gateOpUserId),
        },
        body: JSON.stringify({
          event_id: eventId,
          payload: signedQr,
        }),
      });

      const res = await postGateScan(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.result, "DUPLICATE");
    });

    test("GET /api/gate/summary aggregates gate scan statistics", async () => {
      const req = new NextRequest(`http://localhost:3000/api/gate/summary?event_id=${eventId}`, {
        headers: makeTestAuthHeader(gateOpUserId),
      });

      const res = await getGateSummary(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.session);
      assert.equal(data.session.GRANTED, 1);
      assert.equal(data.session.DUPLICATE, 1);
    });

    test("GET /api/admin/inventory reports live sold, held, and available counts", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/inventory", {
        headers: makeTestAuthHeader(superadminUserId),
      });

      const res = await getAdminInventory(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      const eventReport = data.items.find((x: any) => x.id === eventId);
      assert.ok(eventReport);
      assert.equal(eventReport.sold, 2);
    });

    test("POST /api/admin/tickets/[id]/void voids an active pass", async () => {
      // Void the second ticket
      const secondTicket = (await prisma.ticket.findMany({ where: { bookingId, status: "VALID" } }))[0];
      assert.ok(secondTicket);

      const req = new NextRequest(`http://localhost:3000/api/admin/tickets/${secondTicket.id}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...makeTestAuthHeader(superadminUserId),
        },
        body: JSON.stringify({ reason: "Customer requested exchange" }),
      });

      const res = await postVoidTicket(req, { params: Promise.resolve({ id: secondTicket.id }) });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, "VOID");

      // Verify in DB
      const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: secondTicket.id } });
      assert.equal(updated.status, "VOID");
      assert.equal(updated.voidReason, "Customer requested exchange");
    });

    test("GET /api/admin/audit records security audit actions", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/audit", {
        headers: makeTestAuthHeader(superadminUserId),
      });

      const res = await getAdminAudit(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.items));
      const voidAudit = data.items.find((a: any) => a.action === "ticket.void");
      assert.ok(voidAudit);
    });
  });
});
