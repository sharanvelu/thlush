import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  /** Percent change against the previous period, or null if there is nothing to compare. */
  change: number | null;
  /** True when both periods are zero, so "no change" is more honest than "new". */
  quiet?: boolean;
  comparedTo: string;
}

/** A headline figure with its trend. Direction is shown by icon and words as well as colour. */
export function KpiCard({ label, value, change, quiet, comparedTo }: KpiCardProps) {
  const up = change !== null && change > 0;
  const down = change !== null && change < 0;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const words =
    change === null
      ? quiet
        ? "No sales in either period"
        : `New ${comparedTo}`
      : `${up ? "Up" : down ? "Down" : "Unchanged,"} ${change === 0 ? "" : `${Math.abs(change)}%`} ${comparedTo}`.replace(/\s+/g, " ").trim();
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="flex items-center gap-1 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
              up && "bg-success/15 text-success",
              down && "bg-destructive/10 text-destructive",
              !up && !down && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {change === null ? (quiet ? "—" : "New") : `${change > 0 ? "+" : ""}${change}%`}
          </span>
          <span className="truncate text-muted-foreground">{comparedTo}</span>
          <span className="sr-only">. {words}</span>
        </p>
      </CardContent>
    </Card>
  );
}
