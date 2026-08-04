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

export default async function VendorsPage() {
  const { organization } = await getCurrentOrgContext();
  const { practices, vendors } = await getVendorsForOrg(organization.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
        {practices.length > 0 ? <AddVendorDialog practices={practices} /> : null}
      </div>

      {practices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No practice set up yet. Contact support to finish onboarding.
          </CardContent>
        </Card>
      ) : vendors.length === 0 ? (
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
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">
                  <Link href={`/vendors/${vendor.id}`} className="hover:underline">
                    {vendor.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {vendor.contact_name ? `${vendor.contact_name} · ` : ""}
                  {vendor.contact_email}
                </TableCell>
                <TableCell>
                  <VendorStatusBadge status={vendor.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {vendor.verification_due_date ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {vendor.risk_score ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
