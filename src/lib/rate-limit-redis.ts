import { NextRequest } from "next/server";
import { RateLimitError } from "./rate-limit";

export function isDistributedRateLimitingEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export async function rateLimitRedis(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Upstash Redis credentials not available; production blocker noted in audit
    return;
  }

  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = (forwarded.split(",")[0] || "127.0.0.1").trim();
  const key = `ratelimit:${bucket}:${ip}`;
  const now = Date.now();
  const clearBefore = now - windowSeconds * 1000;

  try {
    // Sliding window pipeline via Upstash REST API
    // 1. Remove expired timestamps: ZREMRANGEBYSCORE key -inf clearBefore
    // 2. Add current timestamp: ZADD key now now
    // 3. Count entries in window: ZCARD key
    // 4. Set TTL: EXPIRE key windowSeconds
    const pipeline = [
      ["ZREMRANGEBYSCORE", key, "-inf", clearBefore],
      ["ZADD", key, now, now],
      ["ZCARD", key],
      ["EXPIRE", key, windowSeconds],
    ];

    const res = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });

    if (!res.ok) {
      console.warn("Upstash Redis rate-limit pipeline failed, falling back to permissive mode:", res.status);
      return;
    }

    const results = await res.json();
    const count = Number(results[2]?.result ?? 0);

    if (count > limit) {
      throw new RateLimitError();
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error("Upstash Redis error during rate limiting:", err);
  }
}
