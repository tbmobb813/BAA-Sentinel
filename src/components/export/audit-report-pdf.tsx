import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555555", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statBox: { border: "1pt solid #dddddd", borderRadius: 4, padding: 8, flex: 1 },
  statLabel: { fontSize: 8, color: "#666666" },
  statValue: { fontSize: 16, marginTop: 2 },
  table: { borderTop: "1pt solid #dddddd", borderLeft: "1pt solid #dddddd" },
  tableRow: { flexDirection: "row" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f5f5f5" },
  cell: {
    padding: 6,
    borderRight: "1pt solid #dddddd",
    borderBottom: "1pt solid #dddddd",
  },
  cellHeader: {
    padding: 6,
    borderRight: "1pt solid #dddddd",
    borderBottom: "1pt solid #dddddd",
    fontFamily: "Helvetica-Bold",
  },
  colVendor: { width: "26%" },
  colContact: { width: "26%" },
  colStatus: { width: "16%" },
  colDue: { width: "16%" },
  colRisk: { width: "16%" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#999999",
    textAlign: "center",
  },
});

const STATUS_LABEL: Record<string, string> = {
  COMPLIANT: "Compliant",
  PENDING: "Pending",
  OVERDUE: "Overdue",
  AT_RISK: "At risk",
};

export interface AuditReportVendor {
  name: string;
  contactEmail: string;
  status: string;
  riskScore: number | null;
  latestDueDate: string | null;
  latestCycleStatus: string | null;
}

export function AuditReportDocument({
  organizationName,
  generatedAt,
  vendors,
}: {
  organizationName: string;
  generatedAt: Date;
  vendors: AuditReportVendor[];
}) {
  const counts = vendors.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Document title={`${organizationName} - BAA Verification Audit Report`}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>BAA Verification Audit Report</Text>
        <Text style={styles.subtitle}>
          {organizationName} — generated {generatedAt.toLocaleDateString()}
        </Text>

        <View style={styles.statsRow}>
          {(["COMPLIANT", "PENDING", "OVERDUE", "AT_RISK"] as const).map((status) => (
            <View key={status} style={styles.statBox}>
              <Text style={styles.statLabel}>{STATUS_LABEL[status]}</Text>
              <Text style={styles.statValue}>{counts[status] ?? 0}</Text>
            </View>
          ))}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.cellHeader, styles.colVendor]}>Vendor</Text>
            <Text style={[styles.cellHeader, styles.colContact]}>Contact</Text>
            <Text style={[styles.cellHeader, styles.colStatus]}>Status</Text>
            <Text style={[styles.cellHeader, styles.colDue]}>Next Due</Text>
            <Text style={[styles.cellHeader, styles.colRisk]}>Risk Score</Text>
          </View>
          {vendors.map((vendor) => (
            <View key={vendor.name + vendor.contactEmail} style={styles.tableRow}>
              <Text style={[styles.cell, styles.colVendor]}>{vendor.name}</Text>
              <Text style={[styles.cell, styles.colContact]}>{vendor.contactEmail}</Text>
              <Text style={[styles.cell, styles.colStatus]}>
                {STATUS_LABEL[vendor.status] ?? vendor.status}
              </Text>
              <Text style={[styles.cell, styles.colDue]}>{vendor.latestDueDate ?? "—"}</Text>
              <Text style={[styles.cell, styles.colRisk]}>{vendor.riskScore ?? "—"}</Text>
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages} — BAA Sentinel`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
