import { NextRequest, NextResponse } from "next/server";
import { getClerkPublishableKey, getClerkSecretKey } from "@/lib/env";

export async function GET(req: NextRequest) {
  const pubKey = getClerkPublishableKey();
  const secKey = getClerkSecretKey();
  const enabled = Boolean(pubKey && secKey);
  const isProduction = pubKey.startsWith("pk_live_");

  return NextResponse.json({
    enabled,
    publishable_key: pubKey,
    proxy_url: isProduction ? "/api/__clerk" : "",
  });
}
