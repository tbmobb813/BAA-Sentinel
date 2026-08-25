import { describe, expect, it, vi, beforeEach } from "vitest";

const { prismaMock, sendVerificationRequestEmailMock, captureExceptionMock } = vi.hoisted(() => ({
  prismaMock: {
    rateLimitHit: { deleteMany: vi.fn() },
    verificationRequest: { findMany: vi.fn(), updateMany: vi.fn() },
    vendor: { update: vi.fn() },
    $transaction: vi.fn(),
  },
  sendVerificationRequestEmailMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email/verification", () => ({
  sendVerificationRequestEmail: sendVerificationRequestEmailMock,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: captureExceptionMock }));

import { processVerificationReminders } from "./process-verification-reminders";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function makeRequest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "req_1",
    vendorId: "vendor_1",
    token: "tok_1",
    status: "SENT",
    dueDate: daysFromNow(55),
    reminderCount: 0,
    vendor: { contactEmail: "a@example.com", name: "Acme" },
    ...overrides,
  };
}

describe("processVerificationReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.rateLimitHit.deleteMany.mockResolvedValue({ count: 0 });
  });

  it.each([
    [55, 0, 1],
    [25, 1, 2],
    [5, 2, 3],
  ])(
    "sends reminder #%s when %s days out with reminderCount %s",
    async (daysOut, reminderCount, expectedReminderNumber) => {
      const request = makeRequest({ dueDate: daysFromNow(daysOut as number), reminderCount });
      prismaMock.verificationRequest.findMany.mockResolvedValue([request]);
      prismaMock.verificationRequest.updateMany.mockResolvedValue({ count: 1 });

      const result = await processVerificationReminders();

      expect(sendVerificationRequestEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({ reminderNumber: expectedReminderNumber }),
      );
      expect(result.remindersSent).toBe(1);
    },
  );

  it("does not re-send a checkpoint that's already been claimed", async () => {
    // 55 days out maps to checkpoint 1, but reminderCount is already 1.
    const request = makeRequest({ dueDate: daysFromNow(55), reminderCount: 1 });
    prismaMock.verificationRequest.findMany.mockResolvedValue([request]);

    const result = await processVerificationReminders();

    expect(sendVerificationRequestEmailMock).not.toHaveBeenCalled();
    expect(result.remindersSent).toBe(0);
  });

  it("skips the send when a concurrent run already claimed the checkpoint (CAS miss)", async () => {
    const request = makeRequest({ dueDate: daysFromNow(55), reminderCount: 0 });
    prismaMock.verificationRequest.findMany.mockResolvedValue([request]);
    prismaMock.verificationRequest.updateMany.mockResolvedValue({ count: 0 });

    const result = await processVerificationReminders();

    expect(sendVerificationRequestEmailMock).not.toHaveBeenCalled();
    expect(result.remindersSent).toBe(0);
  });

  it("expires an overdue request and marks the vendor OVERDUE", async () => {
    const request = makeRequest({ dueDate: daysFromNow(-1) });
    prismaMock.verificationRequest.findMany.mockResolvedValue([request]);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        verificationRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        vendor: { update: vi.fn().mockResolvedValue({}) },
      }),
    );

    const result = await processVerificationReminders();

    expect(result.markedOverdue).toBe(1);
    expect(sendVerificationRequestEmailMock).not.toHaveBeenCalled();
  });

  it("isolates a failure so one bad request doesn't abort the rest of the sweep", async () => {
    const failing = makeRequest({
      id: "req_fail",
      dueDate: daysFromNow(55),
      reminderCount: 0,
    });
    const healthy = makeRequest({
      id: "req_ok",
      dueDate: daysFromNow(55),
      reminderCount: 0,
    });
    prismaMock.verificationRequest.findMany.mockResolvedValue([failing, healthy]);
    prismaMock.verificationRequest.updateMany
      .mockRejectedValueOnce(new Error("transient DB error"))
      .mockResolvedValueOnce({ count: 1 });

    const result = await processVerificationReminders();

    expect(result.errors).toBe(1);
    expect(result.remindersSent).toBe(1);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(sendVerificationRequestEmailMock).toHaveBeenCalledTimes(1);
  });

  it("prunes expired rate-limit rows and reports the count in the log", async () => {
    prismaMock.rateLimitHit.deleteMany.mockResolvedValue({ count: 3 });
    prismaMock.verificationRequest.findMany.mockResolvedValue([]);
    const log = vi.fn();

    await processVerificationReminders(log);

    expect(log).toHaveBeenCalledWith(expect.stringContaining("Pruned 3"));
  });
});
