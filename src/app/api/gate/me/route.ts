import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { GATE_STAFF } from "@/lib/constants";
import { getAllowedEvents } from "@/lib/gate";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const member = await requireRole(request, ...GATE_STAFF);
    const events = await getAllowedEvents(member);

    return jsonOk({
      operator: {
        user_id: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
      },
      events,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
