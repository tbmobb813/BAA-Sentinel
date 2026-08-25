import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentOrgContext } from "@/lib/data/org";
import { getVendorsForExport } from "@/lib/data/vendors";
import { exportFilename } from "@/lib/export/filename";
import { AuditReportDocument, type AuditReportVendor } from "@/components/export/audit-report-pdf";

export async function GET() {
  const { organizationId, organization } = await getCurrentOrgContext();
  const vendors = await getVendorsForExport(organizationId);

  const rows: AuditReportVendor[] = vendors.map((vendor) => {
    const latest = vendor.requests[0];
    return {
      name: vendor.name,
      contactEmail: vendor.contactEmail,
      status: vendor.status,
      riskScore: vendor.riskScore,
      latestDueDate: latest ? latest.dueDate.toLocaleDateString() : null,
      latestCycleStatus: latest?.status ?? null,
    };
  });

  const buffer = await renderToBuffer(
    <AuditReportDocument
      organizationName={organization.name}
      generatedAt={new Date()}
      vendors={rows}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename(organization.name, "pdf")}"`,
    },
  });
}
