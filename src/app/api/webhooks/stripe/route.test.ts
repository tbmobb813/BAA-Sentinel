import { describe, expect, it, vi, beforeEach } from "vitest";

const { prismaMock, captureExceptionMock } = vi.hoisted(() => ({
  prismaMock: { organization: { updateMany: vi.fn() } },
  captureExceptionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@sentry/nextjs", () => ({ captureException: captureExceptionMock }));
vi.mock("@/lib/stripe", () => ({ stripe: {} }));
vi.mock("@/lib/billing/plans", () => ({ PRICE_TO_PLAN: {} }));

import { applyIfCurrentSubscription } from "./route";

// This guard is what stops a stale/out-of-order Stripe event (a
// cancellation for a subscription that's since been superseded, two
// concurrent subscriptions from the since-fixed double-subscription bug)
// from clobbering newer state.
describe("applyIfCurrentSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies the update when it matches the org's current subscription", async () => {
    prismaMock.organization.updateMany.mockResolvedValue({ count: 1 });

    await applyIfCurrentSubscription("org_1", "sub_current", { plan: "GROWTH" });

    expect(prismaMock.organization.updateMany).toHaveBeenCalledWith({
      where: {
        id: "org_1",
        OR: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: "sub_current" }],
      },
      data: { plan: "GROWTH" },
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("no-ops and reports when the event is for a different, superseded subscription", async () => {
    prismaMock.organization.updateMany.mockResolvedValue({ count: 0 });

    await applyIfCurrentSubscription("org_1", "sub_stale", { plan: "GROWTH" });

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
