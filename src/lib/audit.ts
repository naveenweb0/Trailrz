import { prisma } from "./prisma";
import { newId } from "./constants";

export async function audit(
  actor: { userId?: string; user_id?: string; email?: string } | null,
  action: string,
  target: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: newId(),
        actorId: actor?.userId || actor?.user_id || "system",
        actorEmail: actor?.email || null,
        action,
        target,
        meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined,
        at: new Date(),
      },
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}
