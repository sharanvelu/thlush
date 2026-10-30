import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BillStatus } from "@/types/bill";

const STYLES: Record<BillStatus, string> = {
  completed: "bg-success/15 text-success",
  void: "bg-destructive/15 text-destructive",
  refunded: "bg-warning/20 text-foreground",
  held: "bg-secondary text-secondary-foreground",
};
const LABELS: Record<BillStatus, string> = { completed: "Completed", void: "Void", refunded: "Refunded", held: "Held" };

export const STATUS_LABELS = LABELS;

export function BillStatusBadge({ status, className }: { status: BillStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[status], className)}>
      {LABELS[status]}
    </Badge>
  );
}
