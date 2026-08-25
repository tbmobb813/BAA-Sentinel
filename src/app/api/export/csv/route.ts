import { getCurrentOrgContext } from "@/lib/data/org";
import { getVendorsForExport } from "@/lib/data/vendors";
import { exportFilename } from "@/lib/export/filename";
import { csvRow } from "@/lib/export/csv-format";

const HEADERS = [
  "Vendor",
  "Contact Name",
  "Contact Email",
  "Vendor Status",
  "Risk Score",
  "Cycle Status",
  "Sent At",
  "Due Date",
  "Completed At",
  "Response Summary",
];

export async function GET() {
  const { organizationId, organization } = await getCurrentOrgContext();
  const vendors = await getVendorsForExport(organizationId);

  const rows = vendors.flatMap((vendor) => {
    const base = [
      vendor.name,
      vendor.contactName,
      vendor.contactEmail,
      vendor.status,
      vendor.riskScore,
    ];

    // A vendor with no verification cycles yet still gets one row, so
    // they're not silently missing from the audit list.
    if (vendor.requests.length === 0) {
      return [csvRow([...base, "", "", "", "", ""])];
    }

    return vendor.requests.map((request) =>
      csvRow([
        ...base,
        request.status,
        request.sentAt.toISOString(),
        request.dueDate.toISOString(),
        request.completedAt?.toISOString() ?? "",
        request.responseSummary ?? "",
      ]),
    );
  });

  const csv = [csvRow(HEADERS), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(organization.name, "csv")}"`,
    },
  });
}
