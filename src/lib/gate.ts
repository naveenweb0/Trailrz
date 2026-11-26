import { prisma } from "@/lib/prisma";

export async function getAllowedEvents(member: any) {
  const cutoff = new Date(Date.now() - 2 * 86400000);
  const where: any = {
    startAt: { gte: cutoff },
  };
  if (member.role === "gate_operator") {
    where.id = { in: member.assignedEventIds || [] };
  } else {
    where.status = "published";
  }
  const events = await prisma.event.findMany({
    where,
    select: {
      id: true,
      title: true,
      venue: true,
      city: true,
      startAt: true,
    },
    orderBy: { startAt: "asc" },
    take: 100,
  });
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    venue: e.venue,
    city: e.city,
    start_at: e.startAt.toISOString(),
  }));
}
