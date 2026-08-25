import "server-only";

import { getAuditExportData } from "@/lib/export/data";

// RFC 4180 quoting: wrap in quotes if the field contains a comma, quote, or
// newline, and double any embedded quotes.
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map(csvField).join(",");
}

const COLUMNS = [
  "Vendor Name",
  "Contact Name",
  "Contact Email",
  "Vendor Status",
  "Request Status",
  "Sent",
  "Due",
  "Completed",
  "Response Summary",
  "Reminders Sent",
  "Last Reminder",
  "BAA Signed Date",
  "BAA Expiration",
  "BAA Verified",
];

const dateStr = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function buildAuditExportCsv(organizationId: string): Promise<string> {
  const { rows } = await getAuditExportData(organizationId);

  const lines = [
    csvRow(COLUMNS),
    ...rows.map((row) =>
      csvRow([
        row.vendorName,
        row.contactName,
        row.contactEmail,
        row.vendorStatus,
        row.requestStatus,
        dateStr(row.sentAt),
        dateStr(row.dueDate),
        dateStr(row.completedAt),
        row.responseSummary ?? "",
        String(row.reminderCount),
        dateStr(row.lastReminderAt),
        dateStr(row.baaSignedDate),
        dateStr(row.baaExpirationDate),
        row.baaVerified === null ? "" : row.baaVerified ? "Yes" : "No",
      ]),
    ),
  ];

  return lines.join("\r\n");
}
