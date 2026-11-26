import { NextRequest } from "next/server";
import { compareDigest } from "@/lib/constants";
import { releaseExpiredHolds } from "@/lib/inventory";
import { jsonOk, ApiError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

async function handleExpire(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET || "";
    if (!secret) {
      throw new ApiError(503, "CRON_SECRET is not configured");
    }

    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!compareDigest(token, secret)) {
      throw new ApiError(401, "Unauthorized");
    }

    const released = await releaseExpiredHolds(undefined, 100);
    return jsonOk({ ok: true, released });
  } catch (err) {
    return handleApiError(err);
  }
}

export const GET = handleExpire;
export const POST = handleExpire;
