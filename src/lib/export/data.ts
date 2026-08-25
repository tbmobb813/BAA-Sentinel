import "server-only";

import { prisma } from "@/lib/prisma";

export type AuditExportRow = {
  vendorName: string;
  contactName: string;
  contactEmail: string;
  vendorStatus: string;
  // "NONE" is a synthetic value for vendors with no verification cycle
  // started yet -- not a real RequestStatus.
  requestStatus: string;
  sentAt: Date;
  dueDate: Date;
  completedAt: Date | null;
  responseSummary: string | null;
  reminderCount: number;
  lastReminderAt: Date | null;
  baaSignedDate: Date | null;
  baaExpirationDate: Date | null;
  baaVerified: boolean | null;
};

export type AuditExportData = {
  organizationName: string;
  generatedAt: Date;
  rows: AuditExportRow[];
  summary: { compliant: number; pending: number; overdueOrAtRisk: number };
};

// One row per VerificationRequest -- the audit trail is "what was asked,
// when, what came back" across every annual cycle, not just each vendor's
// current status (the dashboard already shows that snapshot).
export async function getAuditExportData(organizationId: string): Promise<AuditExportData> {
  const [organization, vendors] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.vendor.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: {
        requests: { orderBy: { sentAt: "desc" } },
        baaRecords: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const rows: AuditExportRow[] = vendors.flatMap((vendor) => {
    const latestBaaRecord = vendor.baaRecords[0];

    if (vendor.requests.length === 0) {
      // Vendor has never had a verification cycle started -- still worth a
      // row so the export accounts for every vendor, not just ones with
      // history.
      const noRequestRow: AuditExportRow = {
        vendorName: vendor.name,
        contactName: vendor.contactName,
        contactEmail: vendor.contactEmail,
        vendorStatus: vendor.status,
        requestStatus: "NONE",
        sentAt: vendor.createdAt,
        dueDate: vendor.createdAt,
        completedAt: null,
        responseSummary: null,
        reminderCount: 0,
        lastReminderAt: null,
        baaSignedDate: latestBaaRecord?.signedDate ?? null,
        baaExpirationDate: latestBaaRecord?.expirationDate ?? null,
        baaVerified: latestBaaRecord?.isVerified ?? null,
      };
      return [noRequestRow];
    }

    return vendor.requests.map((request): AuditExportRow => ({
      vendorName: vendor.name,
      contactName: vendor.contactName,
      contactEmail: vendor.contactEmail,
      vendorStatus: vendor.status,
      requestStatus: request.status,
      sentAt: request.sentAt,
      dueDate: request.dueDate,
      completedAt: request.completedAt,
      responseSummary: request.responseSummary,
      reminderCount: request.reminderCount,
      lastReminderAt: request.lastReminderAt,
      baaSignedDate: latestBaaRecord?.signedDate ?? null,
      baaExpirationDate: latestBaaRecord?.expirationDate ?? null,
      baaVerified: latestBaaRecord?.isVerified ?? null,
    }));
  });

  const summary = {
    compliant: vendors.filter((v) => v.status === "COMPLIANT").length,
    pending: vendors.filter((v) => v.status === "PENDING").length,
    overdueOrAtRisk: vendors.filter((v) => v.status === "OVERDUE" || v.status === "AT_RISK")
      .length,
  };

  return {
    organizationName: organization.name,
    generatedAt: new Date(),
    rows,
    summary,
  };
}
