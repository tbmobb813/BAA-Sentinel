import { notFound } from "next/navigation";
import { getVendorDetail } from "@/lib/data/vendors";
import { VendorStatusBadge } from "@/components/vendors/status-badge";
import {
  StartVerificationButton,
  MarkVerifiedButton,
} from "@/components/vendors/verification-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function VendorDetailPage({
  params,
}: PageProps<"/vendors/[vendorId]">) {
  const { vendorId } = await params;

  let vendor;
  let cycles;
  try {
    ({ vendor, cycles } = await getVendorDetail(vendorId));
  } catch {
    notFound();
  }

  const latestCycle = cycles[0];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
          <p className="text-muted-foreground">{vendor.contact_email}</p>
        </div>
        <VendorStatusBadge status={vendor.status} />
      </div>

      {vendor.service_description ? (
        <p className="text-sm text-muted-foreground">{vendor.service_description}</p>
      ) : null}

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Annual verification</CardTitle>
          {!latestCycle || latestCycle.status === "verified" ? (
            <StartVerificationButton vendorId={vendor.id} />
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {cycles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No verification cycle started yet.
            </p>
          ) : (
            cycles.map((cycle) => (
              <div
                key={cycle.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">{cycle.status.replace("_", " ")}</p>
                  <p className="text-muted-foreground">Due {cycle.due_date}</p>
                </div>
                {cycle.status !== "verified" ? (
                  <MarkVerifiedButton vendorId={vendor.id} cycleId={cycle.id} />
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
