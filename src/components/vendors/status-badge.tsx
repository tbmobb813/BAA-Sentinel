import { Badge } from "@/components/ui/badge";
import type { VendorStatus } from "@/lib/db/types";

const STATUS_LABEL: Record<VendorStatus, string> = {
  active: "Active",
  pending_verification: "Pending verification",
  verified: "Verified",
  overdue: "Overdue",
  inactive: "Inactive",
};

const STATUS_VARIANT: Record<VendorStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "secondary",
  pending_verification: "outline",
  verified: "default",
  overdue: "destructive",
  inactive: "secondary",
};

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
