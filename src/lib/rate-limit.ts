import { NextRequest } from "next/server";
import { isDistributedRateLimitingEnabled, rateLimitRedis } from "./rate-limit-redis";

export { isDistributedRateLimitingEnabled, rateLimitRedis };

const hits = new Map<string, number[]>();
const MAX_BUCKETS = 2000;

export class RateLimitError extends Error {
  status = 429;
  constructor(message = "Too many attempts. Please wait a moment and try again.") {
    super(message);
    this.name = "RateLimitError";
  }
}

function pruneHits(nowSec: number, windowSeconds: number): void {
  if (hits.size <= MAX_BUCKETS) return;
  const cutoff = nowSec - windowSeconds;
  for (const [k, queue] of hits.entries()) {
    const active = queue.filter((t) => t > cutoff);
    if (active.length === 0) {
      hits.delete(k);
    } else {
      hits.set(k, active);
    }
  }
}

export function rateLimit(req: NextRequest, bucket: string, limit: number, windowSeconds: number): void {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = (forwarded.split(",")[0] || req.headers.get("x-real-ip") || "127.0.0.1").trim();
  const key = `${bucket}:${ip}`;
  const nowSec = Date.now() / 1000;
  const cutoff = nowSec - windowSeconds;

  pruneHits(nowSec, windowSeconds);

  let queue = hits.get(key) || [];
  queue = queue.filter((t) => t > cutoff);

  if (queue.length >= limit) {
    hits.set(key, queue);
    throw new RateLimitError();
  }

  queue.push(nowSec);
  hits.set(key, queue);
}

export async function enforceRateLimit(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  if (isDistributedRateLimitingEnabled()) {
    await rateLimitRedis(req, bucket, limit, windowSeconds);
    return;
  }
  rateLimit(req, bucket, limit, windowSeconds);
}
