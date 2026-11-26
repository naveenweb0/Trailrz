import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonOk, handleApiError } from "@/lib/api-response";

const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  topic: z.string().max(60),
  message: z.string().min(10).max(3000),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "contact", 4, 600);

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    await prisma.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase().trim(),
        topic: parsed.data.topic,
        message: parsed.data.message,
        status: "new",
      },
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
