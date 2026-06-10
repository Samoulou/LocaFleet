// ============================================================================
// In-memory sliding-window rate limiter
//
// Scope: per-process. LocaFleet runs as a single Railway instance, so this is
// sufficient for V1. If the app is ever scaled horizontally, replace with a
// shared store (Redis/Upstash) — the call sites only depend on checkRateLimit.
// ============================================================================

type RateLimitOptions = {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds to wait before retrying (0 when allowed). */
  retryAfterSeconds: number;
};

const buckets = new Map<string, number[]>();

/** Prevent unbounded memory growth from one-off keys. */
const MAX_BUCKETS = 10_000;

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterSeconds };
  }

  if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) {
    // Evict expired buckets before accepting a new key
    for (const [k, ts] of buckets) {
      if (ts.every((t) => t <= windowStart)) {
        buckets.delete(k);
      }
    }
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test helper — clears all rate-limit state. */
export function resetRateLimits(): void {
  buckets.clear();
}
