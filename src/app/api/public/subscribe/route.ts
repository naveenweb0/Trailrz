import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

const subscribeSchema = z.object({
  email: z.string().email(),
  consent: z.boolean(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "sub", 5, 600);

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    if (!parsed.data.consent) {
      throw new ApiError(422, "Please confirm you'd like to receive our letters");
    }

    const email = parsed.data.email.toLowerCase().trim();

    await prisma.subscriber.upsert({
      where: { email },
      update: {},
      create: {
        email,
        source: "newsletter",
      },
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
