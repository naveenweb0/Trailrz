import { NextRequest } from "next/server";
import { currentMember } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const member = await currentMember(req);
    return jsonOk({
      id: member.id,
      user_id: member.userId,
      email: member.email,
      name: member.name,
      role: member.role,
      assigned_event_ids: member.assignedEventIds,
      env: member.env,
      created_at: member.createdAt.toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
