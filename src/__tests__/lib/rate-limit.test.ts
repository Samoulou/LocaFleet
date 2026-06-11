import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

const OPTIONS = { limit: 3, windowMs: 60_000 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    expect(checkRateLimit("user-1", OPTIONS).allowed).toBe(true);
    expect(checkRateLimit("user-1", OPTIONS).allowed).toBe(true);
    expect(checkRateLimit("user-1", OPTIONS).allowed).toBe(true);
  });

  it("blocks the request that exceeds the limit", () => {
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);

    const result = checkRateLimit("user-1", OPTIONS);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("tracks keys independently", () => {
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);

    expect(checkRateLimit("user-1", OPTIONS).allowed).toBe(false);
    expect(checkRateLimit("user-2", OPTIONS).allowed).toBe(true);
  });

  it("allows again once the window has elapsed", () => {
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);
    expect(checkRateLimit("user-1", OPTIONS).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit("user-1", OPTIONS).allowed).toBe(true);
  });

  it("uses a sliding window (oldest request expiring frees a slot)", () => {
    checkRateLimit("user-1", OPTIONS);
    vi.advanceTimersByTime(30_000);
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);

    expect(checkRateLimit("user-1", OPTIONS).allowed).toBe(false);

    // First request falls out of the window after 60s total
    vi.advanceTimersByTime(30_001);
    expect(checkRateLimit("user-1", OPTIONS).allowed).toBe(true);
  });

  it("reports retryAfterSeconds matching the oldest request expiry", () => {
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);
    checkRateLimit("user-1", OPTIONS);

    vi.advanceTimersByTime(45_000);
    const result = checkRateLimit("user-1", OPTIONS);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(15);
  });
});
