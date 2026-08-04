import Link from "next/link";
import { getCurrentOrgContext } from "@/lib/data/org";
import { getVendorsForOrg } from "@/lib/data/vendors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const { organization, vendorLimit } = await getCurrentOrgContext();
  const { vendors } = await getVendorsForOrg(organization.id);

  const overdue = vendors.filter((v) => v.status === "overdue").length;
  const pending = vendors.filter((v) => v.status === "pending_verification").length;
  const verified = vendors.filter((v) => v.status === "verified").length;

  const stats = [
    { label: "Total vendors", value: `${vendors.length} / ${vendorLimit === Infinity ? "∞" : vendorLimit}` },
    { label: "Verified", value: verified },
    { label: "Pending response", value: pending },
    { label: "Overdue", value: overdue },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <Button render={<Link href="/vendors" />}>Manage vendors</Button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {vendors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No vendors yet.{" "}
            <Link href="/vendors" className="underline underline-offset-4">
              Add your first vendor
            </Link>{" "}
            to start tracking annual BAA verification.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
