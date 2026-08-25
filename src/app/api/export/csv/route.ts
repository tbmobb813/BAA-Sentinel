import { auth } from "@clerk/nextjs/server";
import { buildAuditExportCsv } from "@/lib/export/csv";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const csv = await buildAuditExportCsv(orgId);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="baa-sentinel-audit-${orgId}-${date}.csv"`,
    },
  });
}
