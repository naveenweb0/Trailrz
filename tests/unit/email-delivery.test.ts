import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendNotification,
  confirmationHtml,
  resendReady,
  isValidEmailAddress,
  isValidMailFrom,
} from "@/lib/resend";
import { finalizeBooking } from "@/lib/booking";
import { POST as webhookPost } from "@/app/api/payments/razorpay/webhook/route";
import { POST as retryPost } from "@/app/api/admin/notifications/[nid]/retry/route";
import { POST as resendPost } from "@/app/api/admin/bookings/[id]/resend/route";
import { GET as qrGet } from "@/app/api/tickets/qr/route";
import { qrSign } from "@/lib/qr";
import { getAppUrl } from "@/lib/env";
import { createStaffSessionToken } from "@/lib/session";

process.env.QR_SIGNING_SECRET = "test-secret-key-32-chars-long-abcde";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret-12345";
process.env.APP_URL = "https://trailrz.test";

const stubbedKeys: Array<{ key: string; prev: PropertyDescriptor | undefined }> = [];

function stubPrisma(stubs: Record<string, any>) {
  for (const [key, value] of Object.entries(stubs)) {
    const prev = Object.getOwnPropertyDescriptor(prisma, key);
    stubbedKeys.push({ key, prev });
    Object.defineProperty(prisma, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
}

function restorePrisma() {
  while (stubbedKeys.length > 0) {
    const { key, prev } = stubbedKeys.pop()!;
    if (prev) {
      Object.defineProperty(prisma, key, prev);
    } else {
      delete (prisma as any)[key];
    }
  }
}

describe("Production Email Delivery & Booking Reliability (Mocked)", () => {
  let origResendKey: string | undefined;
  let origMailFrom: string | undefined;

  beforeEach(() => {
    origResendKey = process.env.RESEND_API_KEY;
    origMailFrom = process.env.MAIL_FROM;
    process.env.RESEND_API_KEY = "re_test_mock_key";
    process.env.MAIL_FROM = "TRAILRZ <tickets@trailrz.test>";
  });

  afterEach(() => {
    restorePrisma();
    if (origResendKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = origResendKey;
    if (origMailFrom === undefined) delete process.env.MAIL_FROM;
    else process.env.MAIL_FROM = origMailFrom;
  });

  test("1. Successful Resend API response marks sent, stores providerId, clears lastError", async () => {
    const row: any = {
      id: "notif-1",
      channel: "email",
      kind: "booking_confirmation",
      bookingId: "bk-1",
      bookingReference: "TRZ-111111",
      eventId: "ev-1",
      to: "guest@example.com",
      subject: "Your passes",
      html: "<p>Passes</p>",
      status: "queued",
      attempts: 0,
      providerId: null,
      lastError: null,
    };

    stubPrisma({
      notification: {
        findUnique: async () => ({ ...row }),
        updateMany: async ({ where, data }: any) => {
          if (where.id === row.id && where.status.in.includes(row.status)) {
            row.status = data.status;
            row.attempts += data.attempts.increment;
            return { count: 1 };
          }
          return { count: 0 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
    });

    let sentPayload: any = null;
    const client = {
      emails: {
        send: async (payload: any) => {
          sentPayload = payload;
          return { data: { id: "re_msg_12345" }, error: null };
        },
      },
    };

    await sendNotification("notif-1", { client });

    assert.equal(row.status, "sent");
    assert.equal(row.providerId, "re_msg_12345");
    assert.equal(row.lastError, null);
    assert.equal(row.attempts, 1);
    assert.deepEqual(sentPayload.to, ["guest@example.com"]);
    assert.equal(sentPayload.from, "TRAILRZ <tickets@trailrz.test>");
  });

  test("2. Resend API error response marks failed, clears providerId, saves error in lastError", async () => {
    const row: any = {
      id: "notif-2",
      to: "guest@example.com",
      subject: "Your passes",
      html: "<p>Passes</p>",
      status: "queued",
      attempts: 0,
      providerId: null,
      lastError: null,
    };

    stubPrisma({
      notification: {
        findUnique: async () => ({ ...row }),
        updateMany: async ({ data }: any) => {
          row.status = data.status;
          row.attempts += 1;
          return { count: 1 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
    });

    const client = {
      emails: {
        send: async () => ({
          data: null,
          error: {
            statusCode: 403,
            name: "validation_error",
            message: "You can only send testing emails to your own email address.",
          },
        }),
      },
    };

    await sendNotification("notif-2", { client });

    assert.equal(row.status, "failed");
    assert.equal(row.providerId, null);
    assert.match(row.lastError, /403/);
    assert.match(row.lastError, /validation_error/);
    assert.equal(row.attempts, 1);
  });

  test("3. Resend network exception marks failed and saves exception message", async () => {
    const row: any = {
      id: "notif-3",
      to: "guest@example.com",
      subject: "Your passes",
      html: "<p>Passes</p>",
      status: "queued",
      attempts: 0,
      providerId: null,
      lastError: null,
    };

    stubPrisma({
      notification: {
        findUnique: async () => ({ ...row }),
        updateMany: async ({ data }: any) => {
          row.status = data.status;
          row.attempts += 1;
          return { count: 1 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
    });

    const client = {
      emails: {
        send: async () => {
          throw new Error("ECONNRESET: network timeout");
        },
      },
    };

    await sendNotification("notif-3", { client });

    assert.equal(row.status, "failed");
    assert.equal(row.providerId, null);
    assert.match(row.lastError, /ECONNRESET: network timeout/);
    assert.equal(row.attempts, 1);
  });

  test("4. Missing API credentials marks not_configured without calling Resend", async () => {
    delete process.env.RESEND_API_KEY;
    assert.equal(resendReady(), false);

    const row: any = {
      id: "notif-4",
      to: "guest@example.com",
      subject: "Your passes",
      html: "<p>Passes</p>",
      status: "queued",
      attempts: 0,
      providerId: null,
      lastError: null,
    };

    stubPrisma({
      notification: {
        findUnique: async () => ({ ...row }),
        updateMany: async ({ data }: any) => {
          row.status = data.status;
          row.attempts += 1;
          return { count: 1 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
    });

    let called = false;
    await sendNotification("notif-4", {
      client: {
        emails: {
          send: async () => {
            called = true;
            return { data: { id: "x" }, error: null };
          },
        },
      },
    });

    assert.equal(called, false);
    assert.equal(row.status, "not_configured");
    assert.match(row.lastError, /RESEND_API_KEY/);
  });

  test("5. Missing or invalid sender address marks not_configured without calling Resend", async () => {
    process.env.MAIL_FROM = "";
    assert.equal(resendReady(), false);
    assert.equal(isValidMailFrom("not-an-email"), false);
    assert.equal(isValidMailFrom("TRAILRZ <hello@trailrz.com>"), true);

    const row: any = {
      id: "notif-5",
      to: "guest@example.com",
      subject: "Your passes",
      html: "<p>Passes</p>",
      status: "queued",
      attempts: 0,
      providerId: null,
      lastError: null,
    };

    stubPrisma({
      notification: {
        findUnique: async () => ({ ...row }),
        updateMany: async ({ data }: any) => {
          row.status = data.status;
          row.attempts += 1;
          return { count: 1 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
    });

    let called = false;
    await sendNotification("notif-5", {
      client: {
        emails: {
          send: async () => {
            called = true;
            return { data: { id: "x" }, error: null };
          },
        },
      },
    });

    assert.equal(called, false);
    assert.equal(row.status, "not_configured");
    assert.match(row.lastError, /MAIL_FROM/);
  });

  test("6. Invalid or empty recipient marks failed safely without calling Resend", async () => {
    assert.equal(isValidEmailAddress(""), false);
    assert.equal(isValidEmailAddress("bad-email"), false);
    assert.equal(isValidEmailAddress("ok@example.com"), true);

    const row: any = {
      id: "notif-6",
      to: "invalid-recipient",
      subject: "Your passes",
      html: "<p>Passes</p>",
      status: "queued",
      attempts: 0,
      providerId: null,
      lastError: null,
    };

    stubPrisma({
      notification: {
        findUnique: async () => ({ ...row }),
        updateMany: async ({ data }: any) => {
          row.status = data.status;
          row.attempts += 1;
          return { count: 1 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
    });

    let called = false;
    await sendNotification("notif-6", {
      client: {
        emails: {
          send: async () => {
            called = true;
            return { data: { id: "x" }, error: null };
          },
        },
      },
    });

    assert.equal(called, false);
    assert.equal(row.status, "failed");
    assert.match(row.lastError, /Invalid or missing recipient/);
  });

  test("7. Successful booking confirmation generates tickets, confirms booking, and queues email", async () => {
    const booking: any = {
      id: "bk-7",
      reference: "TRZ-ABC777",
      accessKey: "K-SECRETKEY777",
      eventId: "ev-7",
      customerId: "cust-7",
      status: "held",
      paymentStatus: "not_required",
      finalizing: false,
      items: [{ ticket_type_id: "tier-1", name: "Free Pass", unit_price: 0, quantity: 2 }],
      eventSnapshot: { title: "Demo Night", venue: "Courtyard", city: "Chandigarh" },
      customerSnapshot: { name: "Aarav", email: "aarav@example.com" },
    };

    let createdTickets: any[] = [];
    let createdNotif: any = null;

    stubPrisma({
      booking: {
        findUnique: async () => ({ ...booking }),
        updateMany: async ({ where, data }: any) => {
          if (where.id === booking.id && !booking.finalizing && booking.status !== "confirmed") {
            booking.finalizing = data.finalizing;
            return { count: 1 };
          }
          return { count: 0 };
        },
        update: async ({ data }: any) => {
          Object.assign(booking, data);
          return { ...booking };
        },
      },
      $executeRaw: async () => 1,
      ticket: {
        createMany: async ({ data }: any) => {
          createdTickets = data;
          return { count: data.length };
        },
      },
      notification: {
        findFirst: async () => null,
        create: async ({ data }: any) => {
          createdNotif = data;
          return data;
        },
      },
    });

    const res = await finalizeBooking("bk-7", null);

    assert.equal(res.status, "confirmed");
    assert.equal(res.ticketCount, 2);
    assert.equal(createdTickets.length, 2);
    assert.ok(createdNotif);
    assert.equal(createdNotif.kind, "booking_confirmation");
    assert.equal(createdNotif.to, "aarav@example.com");
    assert.match(createdNotif.html, /https:\/\/trailrz\.test\/my-tickets\?ref=TRZ-ABC777/);
  });

  test("8. Email failure after successful booking does not reverse confirmed booking", async () => {
    const booking: any = {
      id: "bk-8",
      reference: "TRZ-ABC888",
      accessKey: "K-SECRETKEY888",
      eventId: "ev-8",
      customerId: "cust-8",
      status: "held",
      paymentStatus: "not_required",
      finalizing: false,
      items: [{ ticket_type_id: "tier-1", name: "Free Pass", unit_price: 0, quantity: 1 }],
      eventSnapshot: { title: "Demo Night", venue: "Courtyard", city: "Chandigarh" },
      customerSnapshot: { name: "Aarav", email: "aarav@example.com" },
    };

    stubPrisma({
      booking: {
        findUnique: async () => ({ ...booking }),
        updateMany: async () => {
          booking.finalizing = true;
          return { count: 1 };
        },
        update: async ({ data }: any) => {
          Object.assign(booking, data);
          return { ...booking };
        },
      },
      $executeRaw: async () => 1,
      ticket: {
        createMany: async () => ({ count: 1 }),
      },
      notification: {
        findFirst: async () => null,
        create: async () => {
          throw new Error("Simulated notification DB failure");
        },
      },
    });

    const res = await finalizeBooking("bk-8", null);
    assert.equal(res.status, "confirmed");
    assert.equal(res.finalizing, false);
  });

  test("9. Duplicate booking finalization does not create duplicate tickets or emails", async () => {
    const booking: any = {
      id: "bk-9",
      reference: "TRZ-ABC999",
      accessKey: "K-SECRETKEY999",
      eventId: "ev-9",
      customerId: "cust-9",
      status: "held",
      paymentStatus: "not_required",
      finalizing: false,
      items: [{ ticket_type_id: "tier-1", name: "Free Pass", unit_price: 0, quantity: 1 }],
      eventSnapshot: { title: "Demo Night", venue: "Courtyard", city: "Chandigarh" },
      customerSnapshot: { name: "Aarav", email: "aarav@example.com" },
    };

    let ticketCreates = 0;
    let notifCreates = 0;

    stubPrisma({
      booking: {
        findUnique: async () => ({ ...booking }),
        updateMany: async ({ data }: any) => {
          if (booking.status !== "confirmed" && !booking.finalizing) {
            booking.finalizing = data.finalizing;
            return { count: 1 };
          }
          return { count: 0 };
        },
        update: async ({ data }: any) => {
          Object.assign(booking, data);
          return { ...booking };
        },
      },
      $executeRaw: async () => 1,
      ticket: {
        createMany: async () => {
          ticketCreates += 1;
          return { count: 1 };
        },
      },
      notification: {
        findFirst: async () => (notifCreates > 0 ? { id: "notif-existing" } : null),
        create: async ({ data }: any) => {
          notifCreates += 1;
          return data;
        },
      },
    });

    const first = await finalizeBooking("bk-9", null);
    const second = await finalizeBooking("bk-9", null);

    assert.equal(first.status, "confirmed");
    assert.equal(second.status, "confirmed");
    assert.equal(ticketCreates, 1);
    assert.equal(notifCreates, 1);
  });

  test("10. Duplicate Razorpay webhook delivery is idempotent and does not duplicate notifications", async () => {
    const seenEvents = new Set<string>();
    const booking: any = {
      id: "bk-10",
      reference: "TRZ-WH10",
      accessKey: "K-WH10",
      eventId: "ev-10",
      customerId: "cust-10",
      status: "held",
      paymentStatus: "created",
      finalizing: false,
      items: [{ ticket_type_id: "tier-1", name: "Paid Pass", unit_price: 49900, quantity: 1 }],
      eventSnapshot: { title: "Demo Night", venue: "Courtyard", city: "Chandigarh" },
      customerSnapshot: { name: "Aarav", email: "aarav@example.com" },
    };
    let notifCreates = 0;

    stubPrisma({
      webhookEvent: {
        findUnique: async ({ where }: any) =>
          seenEvents.has(where.id) ? { id: where.id, source: "razorpay" } : null,
        upsert: async ({ where }: any) => {
          seenEvents.add(where.id);
          return { id: where.id, source: "razorpay" };
        },
      },
      payment: {
        findUnique: async () => ({
          id: "pay-row-10",
          bookingId: "bk-10",
          orderId: "order_10",
          amount: 49900,
          status: "created",
        }),
        update: async ({ data }: any) => ({ id: "pay-row-10", ...data }),
      },
      booking: {
        findUnique: async () => ({ ...booking }),
        updateMany: async () => {
          if (booking.status !== "confirmed" && !booking.finalizing) {
            booking.finalizing = true;
            return { count: 1 };
          }
          return { count: 0 };
        },
        update: async ({ data }: any) => {
          Object.assign(booking, data);
          return { ...booking };
        },
      },
      $executeRaw: async () => 1,
      ticket: {
        createMany: async () => ({ count: 1 }),
      },
      notification: {
        findFirst: async () => null,
        create: async ({ data }: any) => {
          notifCreates += 1;
          return data;
        },
      },
    });

    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_rp_10",
            order_id: "order_10",
            amount: 49900,
            status: "captured",
          },
        },
      },
    });
    const sig = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    const makeReq = () =>
      new NextRequest("http://localhost:3000/api/payments/razorpay/webhook", {
        method: "POST",
        headers: {
          "x-razorpay-signature": sig,
          "x-razorpay-event-id": "evt_unique_10",
        },
        body,
      });

    const r1 = await webhookPost(makeReq());
    const r2 = await webhookPost(makeReq());

    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(notifCreates, 1);
  });

  test("11. Failed notification retry respects status guards and prevents concurrent duplicate sends", async () => {
    const token = createStaffSessionToken({
      sub: "admin_1",
      email: "admin@trailrz.test",
      role: "superadmin",
      name: "Admin",
    });

    const row: any = {
      id: "notif-11",
      channel: "email",
      kind: "booking_confirmation",
      bookingId: "bk-11",
      bookingReference: "TRZ-11",
      eventId: "ev-11",
      to: "guest@example.com",
      subject: "Your passes",
      html: "<p>Hi</p>",
      status: "failed",
      attempts: 1,
      providerId: null,
      lastError: "Old error",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    stubPrisma({
      user: {
        findUnique: async () => ({
          userId: "admin_1",
          email: "admin@trailrz.test",
          role: "superadmin",
          name: "Admin",
          assignedEventIds: [],
        }),
      },
      notification: {
        findUnique: async () => ({ ...row }),
        updateMany: async ({ where, data }: any) => {
          if (where.status.in.includes(row.status)) {
            row.status = data.status;
            row.attempts += 1;
            return { count: 1 };
          }
          return { count: 0 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
    });

    delete process.env.RESEND_API_KEY;
    const req = new NextRequest("http://localhost:3000/api/admin/notifications/notif-11/retry", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await retryPost(req, { params: Promise.resolve({ nid: "notif-11" }) });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, "not_configured");
    assert.equal(body.attempts, 2);

    // Concurrent sendNotification while already "sending" should not increment attempts
    row.status = "sending";
    await sendNotification("notif-11");
    assert.equal(row.attempts, 2);
  });

  test("12. Confirmation email resend re-queues sent notification and audits action", async () => {
    const token = createStaffSessionToken({
      sub: "admin_1",
      email: "admin@trailrz.test",
      role: "superadmin",
      name: "Admin",
    });

    const row: any = {
      id: "notif-12",
      channel: "email",
      kind: "booking_confirmation",
      bookingId: "bk-12",
      bookingReference: "TRZ-12",
      eventId: "ev-12",
      to: "guest@example.com",
      subject: "Your passes",
      html: "<p>Hi</p>",
      status: "sent",
      attempts: 1,
      providerId: "re_old",
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    stubPrisma({
      user: {
        findUnique: async () => ({
          userId: "admin_1",
          email: "admin@trailrz.test",
          role: "superadmin",
          name: "Admin",
          assignedEventIds: [],
        }),
      },
      notification: {
        findFirst: async () => ({ ...row }),
        findUnique: async () => ({ ...row }),
        updateMany: async ({ where, data }: any) => {
          if (where.status.in.includes(row.status)) {
            row.status = data.status;
            if (data.attempts?.increment) row.attempts += data.attempts.increment;
            return { count: 1 };
          }
          return { count: 0 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
      auditLog: {
        create: async () => ({ id: "audit-1" }),
      },
    });

    delete process.env.RESEND_API_KEY;
    const req = new NextRequest("http://localhost:3000/api/admin/bookings/bk-12/resend", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await resendPost(req, { params: Promise.resolve({ id: "bk-12" }) });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.attempts, 2);
    assert.equal(body.status, "not_configured");
    assert.ok(
      confirmationHtml(
        { reference: "TRZ-1", accessKey: "K-1", eventSnapshot: { title: "X" } },
        []
      ).includes("https://trailrz.test/my-tickets")
    );
  });

  test("13. Official TRAILRZ template renders all dynamic variables, QR URL, and Open your passes button", () => {
    const html = confirmationHtml(
      {
        reference: "TRZ-OFF123",
        accessKey: "K-ACCESS-999",
        amount: 250000,
        paymentStatus: "paid",
        eventSnapshot: {
          title: "Sunset Acoustic Session",
          venue: "The Courtyard",
          city: "Chandigarh",
          address: "Sector 17 Plaza, Chandigarh",
          start_at: "2026-12-12T13:30:00.000Z",
          cover_image: { url: "https://cdn.trailrz.com/events/sunset.jpg" },
        },
        customerSnapshot: {
          name: "Riya Sharma",
          email: "riya@example.com",
        },
      },
      [
        {
          id: "tkt-uuid-101",
          serial: "TRZ-PASS-101",
          tierName: "VIP Lounge",
          status: "VALID",
        },
      ]
    );

    assert.ok(html.includes("₹2,500"));
    assert.ok(html.includes("✓ PAID"));
    assert.ok(html.includes("cid:qr-tkt-uuid-101"));
    assert.ok(html.includes("cid:qr-tkt-uuid-101"));
    assert.ok(html.includes("https://trailrz.test/my-tickets?ref=TRZ-OFF123&amp;key=K-ACCESS-999"));
    assert.ok(html.includes("Open your passes"));
    assert.ok(html.includes("contact@trailrz.com"));
  });

  test("14. Multi-ticket booking renders unique QR CID for every valid ticket", () => {
    const html = confirmationHtml(
      {
        reference: "TRZ-MULTI1",
        accessKey: "K-MULTI",
        amount: 300000,
        paymentStatus: "paid",
        eventSnapshot: {
          title: "Rooftop Jazz",
          venue: "Skyline",
          city: "Mohali",
          start_at: "2026-12-20T14:00:00.000Z",
        },
        customerSnapshot: { name: "Kabir", email: "kabir@example.com" },
      },
      [
        { id: "tkt-a", serial: "TRZ-A1", tierName: "VIP", status: "VALID" },
        { id: "tkt-b", serial: "TRZ-B2", tierName: "General", status: "VALID" },
        { id: "tkt-c", serial: "TRZ-C3", tierName: "VIP", status: "VOID" },
      ]
    );

    assert.ok(html.includes("cid:qr-tkt-a"));
    assert.ok(html.includes("cid:qr-tkt-b"));
    assert.equal(html.includes("cid:qr-tkt-c"), false);
    assert.ok(html.includes("PASS 1 OF 2"));
    assert.ok(html.includes("PASS 2 OF 2"));
    assert.ok(html.includes("TRZ-A1, TRZ-B2"));
    assert.ok(html.includes("VIP, General"));
  });

  test("15. sendNotification attaches unique inline PNG QR attachments for each CID", async () => {
    const html = confirmationHtml(
      {
        reference: "TRZ-CID1",
        accessKey: "K-CID",
        amount: 100000,
        paymentStatus: "paid",
        eventSnapshot: { title: "Jazz Night", venue: "Hall", city: "Chandigarh" },
        customerSnapshot: { name: "Aarav", email: "aarav@example.com" },
      },
      [
        { id: "tkt-cid-1", serial: "TRZ-1", tierName: "VIP", status: "VALID" },
        { id: "tkt-cid-2", serial: "TRZ-2", tierName: "VIP", status: "VALID" },
      ]
    );

    const row: any = {
      id: "notif-cid-1",
      to: "aarav@example.com",
      subject: "Your passes",
      html,
      status: "queued",
      attempts: 0,
      providerId: null,
      lastError: null,
    };

    stubPrisma({
      notification: {
        findUnique: async () => ({ ...row }),
        updateMany: async ({ data }: any) => {
          row.status = data.status;
          row.attempts += 1;
          return { count: 1 };
        },
        update: async ({ data }: any) => {
          Object.assign(row, data);
          return { ...row };
        },
      },
    });

    let sentPayload: any = null;
    const client = {
      emails: {
        send: async (payload: any) => {
          sentPayload = payload;
          return { data: { id: "re_cid_ok" }, error: null };
        },
      },
    };

    await sendNotification("notif-cid-1", { client });

    assert.equal(row.status, "sent");
    assert.equal(sentPayload.attachments.length, 2);
    assert.equal(sentPayload.attachments[0].contentId, "qr-tkt-cid-1");
    assert.equal(sentPayload.attachments[0].contentType, "image/png");
    assert.deepEqual(Array.from(sentPayload.attachments[0].content.subarray(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
    assert.equal(sentPayload.attachments[1].contentId, "qr-tkt-cid-2");
    assert.deepEqual(Array.from(sentPayload.attachments[1].content.subarray(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
  });

  test("16. QR image endpoint returns PNG for valid signed token and 403 for invalid token", async () => {
    const token = qrSign("tkt-qr-test-1");
    const validReq = new NextRequest(
      `http://localhost:3000/api/tickets/qr?token=${encodeURIComponent(token)}`
    );
    const validRes = await qrGet(validReq);
    assert.equal(validRes.status, 200);
    assert.equal(validRes.headers.get("content-type"), "image/png");
    const buf = Buffer.from(await validRes.arrayBuffer());
    // PNG magic bytes: 89 50 4E 47
    assert.deepEqual(Array.from(buf.subarray(0, 4)), [0x89, 0x50, 0x4e, 0x47]);

    const badReq = new NextRequest(
      "http://localhost:3000/api/tickets/qr?token=TRZ1.tkt-qr-test-1.tampered"
    );
    const badRes = await qrGet(badReq);
    assert.equal(badRes.status, 403);
  });

  test("17. getAppUrl rejects localhost in production and enforces https://trailrz.com", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevAppUrl = process.env.APP_URL;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.APP_URL = "http://localhost:3000";
      assert.equal(getAppUrl(), "https://trailrz.com");

      const html = confirmationHtml(
        {
          reference: "TRZ-PROD1",
          accessKey: "K-PROD1",
          amount: 100000,
          paymentStatus: "paid",
          eventSnapshot: {
            title: "Live Night",
            venue: "Plaza",
            city: "Chandigarh",
            cover_image: { url: "/img/concert.jpg" },
          },
          customerSnapshot: { name: "Guest", email: "guest@example.com" },
        },
        [{ id: "tkt-prod-1", serial: "TRZ-P1", tierName: "VIP", status: "VALID" }]
      );
      assert.equal(html.includes("localhost"), false);
      assert.ok(html.includes("https://trailrz.com/my-tickets?ref=TRZ-PROD1&amp;key=K-PROD1"));
      assert.ok(html.includes("https://trailrz.com/img/concert.jpg"));
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
      process.env.APP_URL = prevAppUrl;
    }
  });
});
