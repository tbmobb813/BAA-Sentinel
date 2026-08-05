import { notFound } from "next/navigation";
import { getCurrentOrgContext } from "@/lib/data/org";
import { getVendorDetail } from "@/lib/data/vendors";
import { VendorStatusBadge } from "@/components/vendors/status-badge";
import {
  StartVerificationButton,
  RescoreButton,
} from "@/components/vendors/verification-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const REQUEST_STATUS_LABEL: Record<string, string> = {
  SENT: "Sent",
  OPENED: "Opened by vendor",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
};

export default async function VendorDetailPage({
  params,
}: PageProps<"/vendors/[vendorId]">) {
  const { vendorId } = await params;
  const { organizationId, organization } = await getCurrentOrgContext();
  const vendor = await getVendorDetail(vendorId, organizationId);

  if (!vendor) notFound();

  const latestRequest = vendor.requests[0];
  const canStartNewRequest = !latestRequest || latestRequest.status === "COMPLETED";
  const riskScoringAvailable = organization.plan !== "STARTER";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
          <p className="text-muted-foreground">
            {vendor.contactName} · {vendor.contactEmail}
          </p>
        </div>
        <VendorStatusBadge status={vendor.status} />
      </div>

      <Separator />

      {riskScoringAvailable ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>AI risk score</CardTitle>
            <RescoreButton vendorId={vendor.id} />
          </CardHeader>
          <CardContent>
            {vendor.riskScore === null ? (
              <p className="text-sm text-muted-foreground">
                Not scored yet — runs automatically the next time this vendor
                completes a verification, or run it manually above once
                there&rsquo;s at least one completed response.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-3xl font-semibold">{vendor.riskScore}
                  <span className="text-base font-normal text-muted-foreground"> / 100</span>
                </p>
                {vendor.riskRationale ? (
                  <p className="text-sm text-muted-foreground">{vendor.riskRationale}</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Annual verification</CardTitle>
          {canStartNewRequest ? <StartVerificationButton vendorId={vendor.id} /> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {vendor.requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No verification request sent yet.
            </p>
          ) : (
            vendor.requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{REQUEST_STATUS_LABEL[request.status]}</p>
                  <p className="text-muted-foreground">
                    Due {request.dueDate.toLocaleDateString()}
                  </p>
                  {request.responseSummary ? (
                    <p className="mt-1 text-muted-foreground">
                      &ldquo;{request.responseSummary}&rdquo;
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
