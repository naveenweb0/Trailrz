import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  // Obfuscate credentials but show host/db
  const urlObj = new URL(dbUrl.replace(/^postgresql:\/\//, "http://"));
  console.log("=== DATABASE IDENTITY AUDIT ===");
  console.log(`Host: ${urlObj.hostname}`);
  console.log(`Database: ${urlObj.pathname.replace(/^\//, "")}`);
  console.log(`SSL Mode: ${urlObj.searchParams.get("sslmode")}`);
  console.log(`Is Development Neon DB: ${urlObj.hostname.includes("ep-rapid-heart-beopnzo2")}`);

  if (!urlObj.hostname.includes("ep-rapid-heart-beopnzo2")) {
    console.error("SAFETY ALERT: DATABASE_URL does not match expected development Neon database!");
    process.exit(1);
  }

  console.log("\n=== TABLE-BY-TABLE RECORD INVENTORY ===");
  const counts = {
    events: await prisma.event.count(),
    ticketTypes: await prisma.ticketType.count(),
    customers: await prisma.customer.count(),
    bookings: await prisma.booking.count(),
    tickets: await prisma.ticket.count(),
    payments: await prisma.payment.count(),
    users: await prisma.user.count(),
    notifications: await prisma.notification.count(),
    gateScans: await prisma.gateScan.count(),
    subscribers: await prisma.subscriber.count(),
    contactMessages: await prisma.contactMessage.count(),
    webhookEvents: await prisma.webhookEvent.count(),
    auditLogs: await prisma.auditLog.count(),
    platformSettings: await prisma.platformSetting.count(),
  };

  for (const [table, count] of Object.entries(counts)) {
    console.log(`- ${table}: ${count}`);
  }

  console.log("\n=== DETAILED RECORD INSPECTION ===");
  if (counts.events > 0) {
    const events = await prisma.event.findMany({ select: { id: true, title: true, slug: true, status: true } });
    console.log("Events:", events);
  }
  if (counts.customers > 0) {
    const customers = await prisma.customer.findMany({ select: { id: true, email: true, name: true } });
    console.log("Customers:", customers);
  }
  if (counts.bookings > 0) {
    const bookings = await prisma.booking.findMany({ select: { id: true, reference: true, status: true, amount: true } });
    console.log("Bookings:", bookings);
  }
  if (counts.users > 0) {
    const users = await prisma.user.findMany({ select: { id: true, userId: true, email: true, role: true } });
    console.log("Users:", users);
  }
  if (counts.subscribers > 0) {
    const subs = await prisma.subscriber.findMany();
    console.log("Subscribers:", subs);
  }
  if (counts.contactMessages > 0) {
    const msgs = await prisma.contactMessage.findMany();
    console.log("Contact Messages:", msgs);
  }
  if (counts.platformSettings > 0) {
    const settings = await prisma.platformSetting.findMany();
    console.log("Platform Settings:", settings);
  }
}

main()
  .catch((e) => {
    console.error("Audit error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
