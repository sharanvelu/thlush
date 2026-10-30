import { Badge } from "@/components/ui/badge";
import { STOCK_STATUS_LABELS, type StockStatus } from "@/lib/inventory";
import { cn } from "@/lib/utils";

const STYLES: Record<StockStatus, string> = {
  in: "bg-success/15 text-success",
  low: "bg-warning/25 text-foreground",
  out: "bg-destructive/15 text-destructive",
};

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[status])}>
      {STOCK_STATUS_LABELS[status]}
    </Badge>
  );
}
