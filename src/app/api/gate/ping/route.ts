import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return jsonOk({ ok: true, at: new Date().toISOString() });
}
