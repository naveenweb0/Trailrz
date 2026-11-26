import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { newId, code } from "../../src/lib/constants";
import { reserve, release, remaining, expireHold } from "../../src/lib/inventory";
import { qrSign, qrVerify } from "../../src/lib/qr";

process.env.QR_SIGNING_SECRET = process.env.QR_SIGNING_SECRET || "test-secret-key-32-chars-long-abcde";

const prisma = new PrismaClient();

// Helper tracking for comprehensive test cleanup
const testEventIds: string[] = [];
const testCustomerIds: string[] = [];
const testBookingIds: string[] = [];
const testTicketIds: string[] = [];
const testTicketTypeIds: string[] = [];
const testPaymentIds: string[] = [];
const testUserIds: string[] = [];
const testMessageIds: string[] = [];
const testSubscriberIds: string[] = [];
const testAuditLogIds: string[] = [];

describe("TRAILRZ PostgreSQL Schema & Integration Test Suite", () => {
  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    // Isolated Cleanup: Delete all test records in reverse dependency order
    if (testAuditLogIds.length) {
      await prisma.auditLog.deleteMany({ where: { id: { in: testAuditLogIds } } }).catch(() => {});
    }
    if (testSubscriberIds.length) {
      await prisma.subscriber.deleteMany({ where: { id: { in: testSubscriberIds } } }).catch(() => {});
    }
    if (testMessageIds.length) {
      await prisma.contactMessage.deleteMany({ where: { id: { in: testMessageIds } } }).catch(() => {});
    }
    if (testUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } }).catch(() => {});
    }
    if (testTicketIds.length) {
      await prisma.ticket.deleteMany({ where: { id: { in: testTicketIds } } }).catch(() => {});
    }
    if (testPaymentIds.length) {
      await prisma.payment.deleteMany({ where: { id: { in: testPaymentIds } } }).catch(() => {});
    }
    if (testBookingIds.length) {
      await prisma.booking.deleteMany({ where: { id: { in: testBookingIds } } }).catch(() => {});
    }
    if (testTicketTypeIds.length) {
      await prisma.ticketType.deleteMany({ where: { id: { in: testTicketTypeIds } } }).catch(() => {});
    }
    if (testCustomerIds.length) {
      await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } }).catch(() => {});
    }
    if (testEventIds.length) {
      await prisma.event.deleteMany({ where: { id: { in: testEventIds } } }).catch(() => {});
    }

    // Verify all test-created records were cleaned up cleanly
    const eventsRemaining = await prisma.event.count({ where: { id: { in: testEventIds } } });
    const customersRemaining = await prisma.customer.count({ where: { id: { in: testCustomerIds } } });
    const bookingsRemaining = await prisma.booking.count({ where: { id: { in: testBookingIds } } });
    const ticketsRemaining = await prisma.ticket.count({ where: { id: { in: testTicketIds } } });
    const paymentsRemaining = await prisma.payment.count({ where: { id: { in: testPaymentIds } } });

    console.log(`\n[CLEANUP VERIFICATION] Residual row counts:`);
    console.log(`- Events: ${eventsRemaining}`);
    console.log(`- Customers: ${customersRemaining}`);
    console.log(`- Bookings: ${bookingsRemaining}`);
    console.log(`- Tickets: ${ticketsRemaining}`);
    console.log(`- Payments: ${paymentsRemaining}`);

    assert.equal(eventsRemaining, 0, "Test cleanup failed: Residual events detected");
    assert.equal(customersRemaining, 0, "Test cleanup failed: Residual customers detected");
    assert.equal(bookingsRemaining, 0, "Test cleanup failed: Residual bookings detected");
    assert.equal(ticketsRemaining, 0, "Test cleanup failed: Residual tickets detected");
    assert.equal(paymentsRemaining, 0, "Test cleanup failed: Residual payments detected");

    await prisma.$disconnect();
  });

  // 1. Connection and CRUD Test
  test("1. Prisma connection and basic CRUD operations across models", async () => {
    const eventId = newId();
    testEventIds.push(eventId);
    const slug = "crud-event-" + Date.now();

    // Create
    const event = await prisma.event.create({
      data: {
        id: eventId,
        slug,
        title: "Prisma CRUD Test Event",
        category: "Music",
        city: "Chandigarh",
        venue: "Sector 17 Plaza",
        startAt: new Date(Date.now() + 86400000),
        status: "draft",
        highlights: ["Live Band", "Acoustic Stage"],
      },
    });
    assert.equal(event.id, eventId);
    assert.equal(event.status, "draft");
    assert.deepEqual(event.highlights, ["Live Band", "Acoustic Stage"]);

    // Read
    const fetched = await prisma.event.findUnique({ where: { id: eventId } });
    assert.ok(fetched);
    assert.equal(fetched?.title, "Prisma CRUD Test Event");

    // Update
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { status: "published", shortDescription: "Updated short description" },
    });
    assert.equal(updated.status, "published");
    assert.equal(updated.shortDescription, "Updated short description");

    // ContactMessage CRUD
    const msgId = newId();
    testMessageIds.push(msgId);
    const msg = await prisma.contactMessage.create({
      data: {
        id: msgId,
        name: "CRUD User",
        email: "crud@example.com",
        topic: "General Inquiry",
        message: "Hello TRAILRZ!",
      },
    });
    assert.equal(msg.id, msgId);
    assert.equal(msg.status, "new");

    // Subscriber CRUD
    const subId = newId();
    testSubscriberIds.push(subId);
    const sub = await prisma.subscriber.create({
      data: {
        id: subId,
        email: `subscriber-${Date.now()}@example.com`,
      },
    });
    assert.equal(sub.id, subId);

    // AuditLog CRUD
    const auditId = newId();
    testAuditLogIds.push(auditId);
    const log = await prisma.auditLog.create({
      data: {
        id: auditId,
        action: "TEST_ACTION",
        target: "EVENT_" + eventId,
        meta: { sample: true },
      },
    });
    assert.equal(log.id, auditId);
  });

  // 2. Foreign-Key Relationships
  test("2. Foreign-key relationships and referential integrity enforcement", async () => {
    const fakeEventId = newId();
    const tierId = newId();

    // Attempting to create a TicketType referencing non-existent Event MUST fail with FK constraint error (P2003)
    await assert.rejects(
      async () => {
        await prisma.ticketType.create({
          data: {
            id: tierId,
            eventId: fakeEventId,
            name: "Orphan Tier",
            price: 50000,
            capacity: 10,
          },
        });
      },
      (err: any) => {
        assert.ok(
          err.code === "P2003" || err.message?.includes("foreign key constraint"),
          `Expected P2003 foreign key violation, got: ${err.message}`
        );
        return true;
      }
    );

    // Attempting to create a Booking referencing non-existent Customer MUST fail
    const fakeCustomerId = newId();
    const eventId = testEventIds[0];
    await assert.rejects(
      async () => {
        await prisma.booking.create({
          data: {
            id: newId(),
            reference: code("TRZ", 6),
            accessKey: code("K", 24),
            eventId,
            eventSnapshot: {},
            items: [],
            amount: 10000,
            customerId: fakeCustomerId,
            customerSnapshot: {},
            holdExpiresAt: new Date(Date.now() + 600000),
          },
        });
      },
      (err: any) => {
        assert.ok(
          err.code === "P2003" || err.message?.includes("foreign key constraint"),
          `Expected P2003 foreign key violation, got: ${err.message}`
        );
        return true;
      }
    );
  });

  // 3. Booking Creation and Retrieval
  test("3. Booking creation, snapshot preservation, and relational retrieval", async () => {
    const eventId = testEventIds[0];
    const tierId = newId();
    testTicketTypeIds.push(tierId);

    const tier = await prisma.ticketType.create({
      data: {
        id: tierId,
        eventId,
        name: "Gold Circle",
        price: 150000, // ₹1,500.00
        capacity: 50,
      },
    });

    const customerId = newId();
    testCustomerIds.push(customerId);
    const customer = await prisma.customer.create({
      data: {
        id: customerId,
        email: `guest-${Date.now()}@example.com`,
        name: "Amanjot Singh",
        phone: "+919876543210",
        phoneDigits: "9876543210",
      },
    });

    const bookingId = newId();
    testBookingIds.push(bookingId);
    const bookingRef = code("TRZ", 6);
    const accessKey = code("K", 24);

    const booking = await prisma.booking.create({
      data: {
        id: bookingId,
        reference: bookingRef,
        accessKey,
        eventId,
        eventSnapshot: { title: "Prisma CRUD Test Event", city: "Chandigarh" },
        items: [{ ticket_type_id: tierId, name: tier.name, unit_price: 150000, quantity: 2, subtotal: 300000 }],
        amount: 300000, // in paise
        currency: "INR",
        customerId,
        customerSnapshot: { name: customer.name, email: customer.email, phone: customer.phone },
        status: "held",
        paymentStatus: "none",
        holdExpiresAt: new Date(Date.now() + 600000),
      },
    });

    assert.equal(booking.id, bookingId);
    assert.equal(booking.reference, bookingRef);
    assert.equal(booking.amount, 300000);
    assert.equal(booking.status, "held");

    // Relational retrieval with include
    const retrieved = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        customer: true,
      },
    });
    assert.ok(retrieved);
    assert.equal(retrieved?.event.id, eventId);
    assert.equal(retrieved?.customer.email, customer.email);
    assert.equal((retrieved?.eventSnapshot as any)?.city, "Chandigarh");
  });

  // 4. Inventory Reservation and Atomic Locking
  test("4. Inventory reservation, concurrency enforcement, and atomic release", async () => {
    const eventId = testEventIds[0];
    const tierId = newId();
    testTicketTypeIds.push(tierId);

    // Create tier with small capacity for boundary testing
    await prisma.ticketType.create({
      data: {
        id: tierId,
        eventId,
        name: "Limited Front Row",
        price: 500000,
        capacity: 5,
        sold: 0,
        reserved: 0,
      },
    });

    // 1. Reserve 3 tickets successfully
    const res1 = await reserve(tierId, 3);
    assert.equal(res1, true);

    let tier = await prisma.ticketType.findUniqueOrThrow({ where: { id: tierId } });
    assert.equal(tier.reserved, 3);
    assert.equal(remaining(tier), 2);

    // 2. Attempt to reserve 3 tickets (capacity is 5, already reserved 3, requesting 3)
    // MUST fail atomically without partial increments
    const res2 = await reserve(tierId, 3);
    assert.equal(res2, false);

    // State must remain unchanged
    tier = await prisma.ticketType.findUniqueOrThrow({ where: { id: tierId } });
    assert.equal(tier.reserved, 3);
    assert.equal(remaining(tier), 2);

    // 3. Reserve exact remaining (2 tickets) -> succeeds
    const res3 = await reserve(tierId, 2);
    assert.equal(res3, true);

    tier = await prisma.ticketType.findUniqueOrThrow({ where: { id: tierId } });
    assert.equal(tier.reserved, 5);
    assert.equal(remaining(tier), 0);

    // 4. Any further reservation attempt must fail
    const res4 = await reserve(tierId, 1);
    assert.equal(res4, false);

    // 5. Release 2 tickets
    await release(tierId, 2);
    tier = await prisma.ticketType.findUniqueOrThrow({ where: { id: tierId } });
    assert.equal(tier.reserved, 3);
    assert.equal(remaining(tier), 2);
  });

  // 5. Duplicate Booking and Unique Constraints
  test("5. Duplicate booking prevention and unique constraints enforcement", async () => {
    const bookingRef = code("TRZ", 6);
    const bookingId1 = newId();
    const bookingId2 = newId();
    testBookingIds.push(bookingId1);

    const eventId = testEventIds[0];
    const customerId = testCustomerIds[0];

    // First booking
    await prisma.booking.create({
      data: {
        id: bookingId1,
        reference: bookingRef,
        accessKey: code("K", 24),
        eventId,
        eventSnapshot: {},
        items: [],
        amount: 100000,
        customerId,
        customerSnapshot: {},
        holdExpiresAt: new Date(Date.now() + 600000),
      },
    });

    // Second booking with DUPLICATE reference MUST fail with P2002
    await assert.rejects(
      async () => {
        await prisma.booking.create({
          data: {
            id: bookingId2,
            reference: bookingRef, // duplicate reference
            accessKey: code("K", 24),
            eventId,
            eventSnapshot: {},
            items: [],
            amount: 100000,
            customerId,
            customerSnapshot: {},
            holdExpiresAt: new Date(Date.now() + 600000),
          },
        });
      },
      (err: any) => {
        assert.ok(
          err.code === "P2002" || err.message?.includes("Unique constraint failed"),
          `Expected P2002 unique constraint failure, got: ${err.message}`
        );
        return true;
      }
    );

    // Verify duplicate customer email fails
    await assert.rejects(
      async () => {
        const existingCust = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
        await prisma.customer.create({
          data: {
            id: newId(),
            email: existingCust.email, // duplicate email
            name: "Duplicate Customer",
            phone: "9999999999",
            phoneDigits: "9999999999",
          },
        });
      },
      (err: any) => {
        assert.ok(err.code === "P2002", `Expected P2002 on duplicate email, got: ${err.code}`);
        return true;
      }
    );
  });

  // 6. Transaction Rollback
  test("6. Transaction atomicity and complete rollback on mid-flight error", async () => {
    const initialBookingCount = await prisma.booking.count();
    const initialCustomerCount = await prisma.customer.count();

    const rollbackCustId = newId();
    const rollbackBookingId = newId();

    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Create customer in transaction
        await tx.customer.create({
          data: {
            id: rollbackCustId,
            email: `rollback-${Date.now()}@example.com`,
            name: "Rollback User",
            phone: "9111111111",
            phoneDigits: "9111111111",
          },
        });

        // Step 2: Force failure in transaction by violating FK on booking
        await tx.booking.create({
          data: {
            id: rollbackBookingId,
            reference: code("TRZ", 6),
            accessKey: code("K", 24),
            eventId: "non-existent-event-id-99999", // Intentional FK violation!
            eventSnapshot: {},
            items: [],
            amount: 50000,
            customerId: rollbackCustId,
            customerSnapshot: {},
            holdExpiresAt: new Date(Date.now() + 600000),
          },
        });
      });
      assert.fail("Transaction should have thrown an error");
    } catch (err: any) {
      assert.ok(err, "Transaction failed as expected");
    }

    // Verify complete rollback: neither customer nor booking was committed!
    const customerAfter = await prisma.customer.findUnique({ where: { id: rollbackCustId } });
    const bookingAfter = await prisma.booking.findUnique({ where: { id: rollbackBookingId } });

    assert.equal(customerAfter, null, "Customer record should have rolled back");
    assert.equal(bookingAfter, null, "Booking record should have rolled back");

    const finalBookingCount = await prisma.booking.count();
    const finalCustomerCount = await prisma.customer.count();
    assert.equal(finalBookingCount, initialBookingCount);
    assert.equal(finalCustomerCount, initialCustomerCount);
  });

  // 7. Ticket Creation, Cryptographic QR Lookup, and Gate Validation
  test("7. Ticket creation, cryptographic QR sign/verify contract, and lookup", async () => {
    const eventId = testEventIds[0];
    const tierId = testTicketTypeIds[0];
    const customerId = testCustomerIds[0];
    const bookingId = testBookingIds[0];

    const ticketId = newId();
    testTicketIds.push(ticketId);
    const serial = code("TRZ", 10);

    const ticket = await prisma.ticket.create({
      data: {
        id: ticketId,
        serial,
        bookingId,
        bookingReference: "TRZ-REF001",
        eventId,
        eventTitle: "Prisma CRUD Test Event",
        ticketTypeId: tierId,
        tierName: "Gold Circle",
        holderName: "Amanjot Singh",
        customerId,
        status: "VALID",
      },
    });

    assert.equal(ticket.id, ticketId);
    assert.equal(ticket.status, "VALID");

    // Cryptographic QR Signing Contract
    const qrPayload = qrSign(ticket.id);
    assert.ok(qrPayload.startsWith("TRZ1."), "QR payload must have TRZ1 prefix");

    // QR Verification Contract
    const verifiedTicketId = qrVerify(qrPayload);
    assert.equal(verifiedTicketId, ticket.id, "qrVerify must accurately decode ticketId");

    // Tampered QR Payload must fail verification
    const tamperedPayload = qrPayload.slice(0, -4) + "XXXX";
    const failedVerify = qrVerify(tamperedPayload);
    assert.equal(failedVerify, null, "Tampered QR payload must be rejected");

    // Lookup by serial
    const bySerial = await prisma.ticket.findUnique({ where: { serial } });
    assert.equal(bySerial?.id, ticketId);

    // Gate redemption transition
    const redeemed = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "REDEEMED",
        redeemedAt: new Date(),
        redeemedBy: "operator_user_1",
        redeemedByName: "Gate Operator One",
        redeemedGate: "Gate A",
        redeemedMethod: "qr",
      },
    });
    assert.equal(redeemed.status, "REDEEMED");
    assert.ok(redeemed.redeemedAt);

    // Duplicate Serial Prevention
    await assert.rejects(
      async () => {
        await prisma.ticket.create({
          data: {
            id: newId(),
            serial, // Duplicate serial!
            bookingId,
            bookingReference: "TRZ-REF001",
            eventId,
            eventTitle: "Prisma CRUD Test Event",
            ticketTypeId: tierId,
            tierName: "Gold Circle",
            holderName: "Another Person",
            customerId,
            status: "VALID",
          },
        });
      },
      (err: any) => {
        assert.ok(err.code === "P2002", `Expected P2002 on duplicate ticket serial, got: ${err.code}`);
        return true;
      }
    );
  });

  // 8. Payment Record Persistence
  test("8. Payment record persistence, lifecycle statuses, and refund fields", async () => {
    const bookingId = testBookingIds[0];
    const customerId = testCustomerIds[0];
    const paymentId = newId();
    testPaymentIds.push(paymentId);

    const orderId = "order_rzp_" + Date.now();
    const rzpPaymentId = "pay_rzp_" + Date.now();

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        bookingId,
        bookingReference: "TRZ-REF001",
        customerId,
        customerName: "Amanjot Singh",
        gateway: "razorpay",
        orderId,
        paymentId: rzpPaymentId,
        amount: 300000, // paise
        currency: "INR",
        status: "paid",
        verifiedBy: "signature",
      },
    });

    assert.equal(payment.id, paymentId);
    assert.equal(payment.orderId, orderId);
    assert.equal(payment.amount, 300000);
    assert.equal(payment.status, "paid");

    // Update with refund information
    const refunded = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "refunded",
        refundId: "rfnd_rzp_" + Date.now(),
        refundStatus: "processed",
        refundAmount: 300000,
        refundReason: "Customer requested cancellation",
        refundProcessedAt: new Date(),
      },
    });

    assert.equal(refunded.status, "refunded");
    assert.equal(refunded.refundStatus, "processed");
    assert.equal(refunded.refundAmount, 300000);

    // Duplicate Order ID MUST fail
    await assert.rejects(
      async () => {
        await prisma.payment.create({
          data: {
            id: newId(),
            bookingId,
            bookingReference: "TRZ-REF001",
            customerId,
            customerName: "Amanjot Singh",
            orderId, // duplicate orderId!
            amount: 300000,
            status: "created",
          },
        });
      },
      (err: any) => {
        assert.ok(err.code === "P2002", `Expected P2002 on duplicate orderId, got: ${err.code}`);
        return true;
      }
    );
  });

  // 9. Data Integrity, Enums, and Cascades
  test("9. Data integrity, enum constraints, and cascade delete behavior", async () => {
    // 1. Enum Constraint Test: Attempt to pass an invalid status to PostgreSQL enum
    await assert.rejects(
      async () => {
        await prisma.event.create({
          data: {
            id: newId(),
            slug: "invalid-enum-event",
            title: "Invalid Enum Event",
            category: "Music",
            city: "Chandigarh",
            venue: "Test Arena",
            startAt: new Date(),
            status: "INVALID_STATUS" as any, // Illegal enum value!
          },
        });
      },
      (err: any) => {
        assert.ok(
          err.message?.includes("Invalid") || err.message?.includes("enum"),
          `Expected enum validation error, got: ${err.message}`
        );
        return true;
      }
    );

    // 2. Cascade Delete Test
    // Create isolated event with ticket types and verify deleting event cascades to ticket types
    const cascadeEventId = newId();
    const cascadeTierId = newId();

    await prisma.event.create({
      data: {
        id: cascadeEventId,
        slug: "cascade-test-event-" + Date.now(),
        title: "Cascade Test Event",
        category: "Art & Culture",
        city: "Chandigarh",
        venue: "Gallery",
        startAt: new Date(Date.now() + 86400000),
        status: "draft",
      },
    });

    await prisma.ticketType.create({
      data: {
        id: cascadeTierId,
        eventId: cascadeEventId,
        name: "Cascade Tier",
        price: 10000,
        capacity: 10,
      },
    });

    // Verify tier exists
    const tierCheck = await prisma.ticketType.findUnique({ where: { id: cascadeTierId } });
    assert.ok(tierCheck);

    // Delete Event
    await prisma.event.delete({ where: { id: cascadeEventId } });

    // Verify Tier was cascaded
    const tierAfter = await prisma.ticketType.findUnique({ where: { id: cascadeTierId } });
    assert.equal(tierAfter, null, "Child TicketType should have been cascade deleted with Event");
  });
});
