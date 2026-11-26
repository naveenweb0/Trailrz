import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_SLUGS = [
  "candlelight-jazz-cellar-chandigarh",
  "artisanal-ceramic-wheel-masterclass",
  "twilight-courtyard-supper-club",
  "courtyard-standup-comedy-salon",
  "sufi-strings-heritage-night",
];

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const urlObj = new URL(dbUrl.replace(/^postgresql:\/\//, "http://"));
  console.log("=== BATCH 10: DEMO DATA CLEANUP ===");
  console.log(`Connecting to: ${urlObj.hostname}/${urlObj.pathname.replace(/^\//, "")}`);

  if (!urlObj.hostname.includes("ep-rapid-heart-beopnzo2")) {
    console.error("SAFETY ALERT: DATABASE_URL does not match expected development Neon database!");
    process.exit(1);
  }

  // Find demo events
  const demoEvents = await prisma.event.findMany({
    where: { slug: { in: DEMO_SLUGS } },
    select: { id: true, slug: true, title: true },
  });

  console.log(`Identified ${demoEvents.length} demo events to clean up:`);
  for (const e of demoEvents) {
    console.log(`  - [${e.id}] ${e.title} (${e.slug})`);
  }

  const demoEventIds = demoEvents.map((e) => e.id);

  // Transactional deletion with strict foreign key reverse ordering
  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete associated gate scans if any
    const scans = await tx.gateScan.deleteMany({
      where: { eventId: { in: demoEventIds } },
    });

    // 2. Delete associated tickets if any
    const tickets = await tx.ticket.deleteMany({
      where: { eventId: { in: demoEventIds } },
    });

    // 3. Delete associated bookings if any
    const bookings = await tx.booking.deleteMany({
      where: { eventId: { in: demoEventIds } },
    });

    // 4. Delete associated ticket types
    const ticketTypes = await tx.ticketType.deleteMany({
      where: { eventId: { in: demoEventIds } },
    });

    // 5. Delete demo events
    const events = await tx.event.deleteMany({
      where: { id: { in: demoEventIds } },
    });

    return { scans, tickets, bookings, ticketTypes, events };
  });

  console.log("\nCleanup Transaction Completed:");
  console.log(`  - Ticket Types Deleted: ${result.ticketTypes.count}`);
  console.log(`  - Events Deleted: ${result.events.count}`);
  console.log(`  - Bookings Deleted: ${result.bookings.count}`);
  console.log(`  - Tickets Deleted: ${result.tickets.count}`);
  console.log(`  - Gate Scans Deleted: ${result.scans.count}`);

  // Final table-by-table audit
  console.log("\n=== POST-CLEANUP TABLE-BY-TABLE RECORD INVENTORY ===");
  const postCounts = {
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

  let totalRemainingRows = 0;
  for (const [table, count] of Object.entries(postCounts)) {
    console.log(`- ${table}: ${count}`);
    totalRemainingRows += count;
  }

  console.log(`\nTotal rows across all 14 tables: ${totalRemainingRows}`);
  if (totalRemainingRows === 0) {
    console.log("SUCCESS: Neon development database is completely clean and ready for real operations!");
  } else {
    console.warn("WARNING: Some rows remain:", postCounts);
  }
}

main()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
