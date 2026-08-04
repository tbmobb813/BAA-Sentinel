import { Badge } from "@/components/ui/badge";
import type { VendorStatus } from "@prisma/client";

const STATUS_LABEL: Record<VendorStatus, string> = {
  COMPLIANT: "Compliant",
  PENDING: "Pending verification",
  OVERDUE: "Overdue",
  AT_RISK: "At risk",
};

const STATUS_VARIANT: Record<
  VendorStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  COMPLIANT: "default",
  PENDING: "outline",
  OVERDUE: "destructive",
  AT_RISK: "destructive",
};

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
