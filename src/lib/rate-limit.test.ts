import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { rateLimitHit: { upsert: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows a request under the limit", async () => {
    prismaMock.rateLimitHit.upsert.mockResolvedValue({ count: 1 });

    await expect(checkRateLimit("k", 10, 60)).resolves.toBe(true);
  });

  it("blocks a request once the count exceeds the limit", async () => {
    prismaMock.rateLimitHit.upsert.mockResolvedValue({ count: 11 });

    await expect(checkRateLimit("k", 10, 60)).resolves.toBe(false);
  });

  it("buckets two calls within the same window to the same windowStart", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    prismaMock.rateLimitHit.upsert.mockResolvedValue({ count: 1 });
    await checkRateLimit("k", 10, 300);

    vi.setSystemTime(new Date("2026-01-01T00:00:59.000Z"));
    prismaMock.rateLimitHit.upsert.mockResolvedValue({ count: 2 });
    await checkRateLimit("k", 10, 300);

    const firstWindowStart = prismaMock.rateLimitHit.upsert.mock.calls[0][0].where
      .key_windowStart.windowStart;
    const secondWindowStart = prismaMock.rateLimitHit.upsert.mock.calls[1][0].where
      .key_windowStart.windowStart;
    expect(firstWindowStart).toEqual(secondWindowStart);
  });

  it("buckets calls straddling a window boundary to different windowStarts", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:04:59.000Z"));
    prismaMock.rateLimitHit.upsert.mockResolvedValue({ count: 1 });
    await checkRateLimit("k", 10, 300);

    vi.setSystemTime(new Date("2026-01-01T00:05:01.000Z"));
    prismaMock.rateLimitHit.upsert.mockResolvedValue({ count: 1 });
    await checkRateLimit("k", 10, 300);

    const firstWindowStart = prismaMock.rateLimitHit.upsert.mock.calls[0][0].where
      .key_windowStart.windowStart;
    const secondWindowStart = prismaMock.rateLimitHit.upsert.mock.calls[1][0].where
      .key_windowStart.windowStart;
    expect(firstWindowStart).not.toEqual(secondWindowStart);
  });
});
