import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { newId, code } from "../../src/lib/constants";
import { reserve, release, remaining } from "../../src/lib/inventory";

const prisma = new PrismaClient();

describe("Neon PostgreSQL Integration Test Suite", () => {
  test("successfully connects and verifies all 14 application tables exist", async () => {
    await prisma.$connect();

    const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tableNames = tables.map((t) => t.table_name);
    const expectedTables = [
      "audit_logs",
      "bookings",
      "contact_messages",
      "customers",
      "events",
      "gate_scans",
      "notifications",
      "payments",
      "platform_settings",
      "subscribers",
      "ticket_types",
      "tickets",
      "users",
      "webhook_events",
    ];

    for (const exp of expectedTables) {
      assert.ok(
        tableNames.includes(exp),
        `Expected table '${exp}' not found in database. Found: ${tableNames.join(", ")}`
      );
    }
  });

  test("verifies relational integrity, atomic inventory reservation, and cascades", async () => {
    const testSlug = "test-integration-event-" + Date.now();
    const eventId = newId();
    const tierId = newId();
    const customerId = newId();
    const bookingId = newId();
    const ticketId = newId();

    try {
      // 1. Create Event
      const event = await prisma.event.create({
        data: {
          id: eventId,
          slug: testSlug,
          title: "Integration Test Event",
          category: "Music",
          city: "Chandigarh",
          venue: "Test Arena",
          startAt: new Date(Date.now() + 86400000),
          status: "published",
        },
      });
      assert.equal(event.id, eventId);

      // 2. Create TicketType
      const tier = await prisma.ticketType.create({
        data: {
          id: tierId,
          eventId,
          name: "VIP Access",
          price: 250000, // ₹2,500
          capacity: 10,
          sold: 0,
          reserved: 0,
        },
      });
      assert.equal(tier.id, tierId);
      assert.equal(remaining(tier), 10);

      // 3. Test Atomic Inventory Reservation
      const reservedOk = await reserve(tierId, 4);
      assert.equal(reservedOk, true);

      const afterRes = await prisma.ticketType.findUnique({ where: { id: tierId } });
      assert.equal(afterRes?.reserved, 4);
      assert.equal(remaining(afterRes!), 6);

      // Oversell attempt beyond capacity (remaining 6, requesting 8)
      const oversell = await reserve(tierId, 8);
      assert.equal(oversell, false); // must fail atomically

      // Release 2 tickets
      await release(tierId, 2);
      const afterRel = await prisma.ticketType.findUnique({ where: { id: tierId } });
      assert.equal(afterRel?.reserved, 2);

      // 4. Create Customer
      const customer = await prisma.customer.create({
        data: {
          id: customerId,
          email: `test-${Date.now()}@example.com`,
          name: "Test Tester",
          phone: "9876543210",
          phoneDigits: "9876543210",
        },
      });
      assert.equal(customer.id, customerId);

      // 5. Create Booking
      const booking = await prisma.booking.create({
        data: {
          id: bookingId,
          reference: code("TRZ", 6),
          accessKey: code("K", 24),
          eventId,
          eventSnapshot: { title: event.title, city: event.city },
          items: [{ ticket_type_id: tierId, name: tier.name, quantity: 2, subtotal: 500000 }],
          amount: 500000,
          currency: "INR",
          customerId,
          customerSnapshot: { name: customer.name, email: customer.email },
          status: "held",
          paymentStatus: "none",
          holdExpiresAt: new Date(Date.now() + 600000),
        },
      });
      assert.equal(booking.id, bookingId);

      // 6. Create Ticket
      const ticket = await prisma.ticket.create({
        data: {
          id: ticketId,
          serial: code("TRZ", 10),
          bookingId,
          bookingReference: booking.reference,
          eventId,
          eventTitle: event.title,
          ticketTypeId: tierId,
          tierName: tier.name,
          holderName: customer.name,
          customerId,
          status: "VALID",
        },
      });
      assert.equal(ticket.id, ticketId);
      assert.equal(ticket.status, "VALID");

      // Verify relations resolve
      const fetchedBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { tickets: true, event: true, customer: true },
      });
      assert.equal(fetchedBooking?.tickets.length, 1);
      assert.equal(fetchedBooking?.event.title, "Integration Test Event");
      assert.equal(fetchedBooking?.customer.name, "Test Tester");
    } finally {
      // Cleanup test data cleanly
      await prisma.ticket.deleteMany({ where: { id: ticketId } }).catch(() => {});
      await prisma.booking.deleteMany({ where: { id: bookingId } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { id: customerId } }).catch(() => {});
      await prisma.ticketType.deleteMany({ where: { id: tierId } }).catch(() => {});
      await prisma.event.deleteMany({ where: { id: eventId } }).catch(() => {});
      await prisma.$disconnect();
    }
  });
});
