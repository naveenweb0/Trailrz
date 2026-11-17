const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function clearDemoData() {
  console.log("Removing all demo and test data from TRAILRZ database...");

  await prisma.checkIn.deleteMany();
  console.log("✓ Cleared CheckIns");

  await prisma.ticket.deleteMany();
  console.log("✓ Cleared Tickets");

  await prisma.bookingItem.deleteMany();
  console.log("✓ Cleared BookingItems");

  await prisma.refund.deleteMany();
  console.log("✓ Cleared Refunds");

  await prisma.payment.deleteMany();
  console.log("✓ Cleared Payments");

  await prisma.notification.deleteMany();
  console.log("✓ Cleared Notifications");

  await prisma.booking.deleteMany();
  console.log("✓ Cleared Bookings");

  await prisma.inventoryReservation.deleteMany();
  console.log("✓ Cleared InventoryReservations");

  await prisma.ticketType.deleteMany();
  console.log("✓ Cleared TicketTypes");

  await prisma.eventImage.deleteMany();
  console.log("✓ Cleared EventImages");

  await prisma.eventSession.deleteMany();
  console.log("✓ Cleared EventSessions");

  await prisma.event.deleteMany();
  console.log("✓ Cleared Events");

  await prisma.customer.deleteMany();
  console.log("✓ Cleared Customers");

  await prisma.adminAuditLog.deleteMany();
  console.log("✓ Cleared AdminAuditLogs");

  console.log("\nAll demo data has been successfully removed!");
  console.log("Admin account (admin@trailrz.com) and Platform Settings are preserved.");
}

clearDemoData()
  .catch((e) => {
    console.error("Error clearing demo data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
