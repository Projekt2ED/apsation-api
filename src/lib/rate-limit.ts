import "server-only";

import { buildApiErrorPayload } from "@/lib/api-errors";

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 60;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterSeconds: number;
};

function readPositiveInteger(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  const parsed = raw ? Number(raw) : fallback;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getConfig() {
  return {
    windowMs:
      readPositiveInteger(
        "RATE_LIMIT_WINDOW_SECONDS",
        DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      ) * 1000,
    maxRequests: readPositiveInteger(
      "RATE_LIMIT_MAX_REQUESTS",
      DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    ),
  };
}

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const { windowMs, maxRequests } = getConfig();
  const now = Date.now();
  const key = identifier.trim();
  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + windowMs,
        };

  cleanupExpiredBuckets(now);
  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, maxRequests - bucket.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed: bucket.count <= maxRequests,
    limit: maxRequests,
    remaining,
    resetAt: new Date(bucket.resetAt).toISOString(),
    retryAfterSeconds,
  };
}

export function buildRateLimitResponsePayload(result: RateLimitResult) {
  return buildApiErrorPayload({
    code: "rate_limit_exceeded",
    message: "Rate limit exceeded.",
    status: 429,
    meta: {
      rateLimit: {
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.resetAt,
        retryAfterSeconds: result.retryAfterSeconds,
      },
    },
  });
}
