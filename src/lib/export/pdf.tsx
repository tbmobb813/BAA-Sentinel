import "server-only";

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getAuditExportData, type AuditExportRow } from "@/lib/export/data";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555555", marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  summaryLabel: { fontSize: 8, color: "#555555" },
  summaryValue: { fontSize: 14 },
  table: { display: "flex", width: "100%" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#dddddd" },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000000" },
  cell: { padding: 4, fontSize: 8 },
  headerCell: { padding: 4, fontSize: 8, fontWeight: 700 },
});

// Proportional widths sum to 100.
const COLS: { key: keyof AuditExportRow | "vendorStatus2"; label: string; width: number }[] = [
  { key: "vendorName", label: "Vendor", width: 14 },
  { key: "contactEmail", label: "Contact", width: 14 },
  { key: "vendorStatus", label: "Status", width: 9 },
  { key: "requestStatus", label: "Request", width: 9 },
  { key: "sentAt", label: "Sent", width: 8 },
  { key: "dueDate", label: "Due", width: 8 },
  { key: "completedAt", label: "Completed", width: 8 },
  { key: "reminderCount", label: "Reminders", width: 8 },
  { key: "baaVerified", label: "BAA Verified", width: 8 },
  { key: "responseSummary", label: "Response Summary", width: 14 },
];

const dateStr = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

function cellValue(row: AuditExportRow, key: (typeof COLS)[number]["key"]): string {
  switch (key) {
    case "sentAt":
    case "dueDate":
    case "completedAt":
    case "lastReminderAt":
    case "baaSignedDate":
    case "baaExpirationDate":
      return dateStr(row[key] as Date | null);
    case "baaVerified":
      return row.baaVerified === null ? "—" : row.baaVerified ? "Yes" : "No";
    case "reminderCount":
      return String(row.reminderCount);
    default:
      return String(row[key as keyof AuditExportRow] ?? "");
  }
}

function AuditReportDocument({
  organizationName,
  generatedAt,
  rows,
  summary,
}: Awaited<ReturnType<typeof getAuditExportData>>) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{organizationName} — BAA Verification Audit Report</Text>
        <Text style={styles.subtitle}>Generated {generatedAt.toISOString().slice(0, 10)}</Text>

        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Compliant</Text>
            <Text style={styles.summaryValue}>{summary.compliant}</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={styles.summaryValue}>{summary.pending}</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>Overdue / At risk</Text>
            <Text style={styles.summaryValue}>{summary.overdueOrAtRisk}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            {COLS.map((col) => (
              <Text key={col.label} style={[styles.headerCell, { width: `${col.width}%` }]}>
                {col.label}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              {COLS.map((col) => (
                <Text key={col.label} style={[styles.cell, { width: `${col.width}%` }]}>
                  {cellValue(row, col.key)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function renderAuditExportPdf(organizationId: string): Promise<Buffer> {
  const data = await getAuditExportData(organizationId);
  return renderToBuffer(<AuditReportDocument {...data} />);
}
