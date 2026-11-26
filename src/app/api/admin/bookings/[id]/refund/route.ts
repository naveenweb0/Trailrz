import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { STAFF } from "@/lib/constants";
import { initiateRefund } from "@/lib/booking";
import { jsonOk, handleApiError } from "@/lib/api-response";

const refundSchema = z.object({
  reason: z.string().min(3).max(200),
});

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireRole(request, ...STAFF);
    const { id } = await params;

    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      throw parsed.error;
    }

    const res = await initiateRefund(id, member, parsed.data.reason);
    return jsonOk(res);
  } catch (err) {
    return handleApiError(err);
  }
}
