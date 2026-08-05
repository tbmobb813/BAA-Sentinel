import Link from "next/link";
import { getCurrentOrgContext } from "@/lib/data/org";
import { getVendorsForOrg } from "@/lib/data/vendors";
import { AddVendorDialog } from "@/components/vendors/add-vendor-dialog";
import { VendorStatusBadge } from "@/components/vendors/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function VendorsPage() {
  const { organizationId } = await getCurrentOrgContext();
  const vendors = await getVendorsForOrg(organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            render={<a href="/api/export/csv" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            render={<a href="/api/export/pdf" />}
          >
            Export PDF
          </Button>
          <AddVendorDialog />
        </div>
      </div>

      {vendors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No vendors yet. Add your first vendor to start tracking BAA verification.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verification due</TableHead>
              <TableHead>Risk score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => {
              const latestRequest = vendor.requests[0];
              return (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">
                    <Link href={`/vendors/${vendor.id}`} className="hover:underline">
                      {vendor.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vendor.contactName} · {vendor.contactEmail}
                  </TableCell>
                  <TableCell>
                    <VendorStatusBadge status={vendor.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {latestRequest ? latestRequest.dueDate.toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vendor.riskScore ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
