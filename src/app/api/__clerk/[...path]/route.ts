import { NextRequest, NextResponse } from "next/server";
import { getClerkPublishableKey, getClerkSecretKey } from "@/lib/env";

const CLERK_FRONTEND_API = "https://frontend-api.clerk.dev";
const PROXY_PATH = "/api/__clerk";
const HOP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "content-length",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "content-encoding",
]);

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const pubKey = getClerkPublishableKey();
  if (!pubKey.startsWith("pk_live_")) {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }

  const { path } = await params;
  const pathStr = path.join("/");
  const url = new URL(`${CLERK_FRONTEND_API}/${pathStr}${req.nextUrl.search}`);

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set("Clerk-Proxy-Url", `https://${host.split(",")[0].trim()}${PROXY_PATH}`);
  headers.set("Clerk-Secret-Key", getClerkSecretKey());
  headers.set("X-Forwarded-For", ip);

  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((val, name) => {
      if (!HOP_HEADERS.has(name.toLowerCase())) {
        responseHeaders.append(name, val);
      }
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json({ detail: "Proxy error" }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
