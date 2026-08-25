import { auth } from "@clerk/nextjs/server";
import { renderAuditExportPdf } from "@/lib/export/pdf";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const pdf = await renderAuditExportPdf(orgId);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="baa-sentinel-audit-${orgId}-${date}.pdf"`,
    },
  });
}
