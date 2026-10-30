import { AlertTriangle, CircleCheck, PackageX } from "lucide-react";
import Link from "next/link";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { D, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/services/DashboardService";
import { PAYMENT_METHOD_LABELS } from "@/types/bill";

interface Format {
  currency: string;
  locale: string;
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>
);

export function TopItems({ items, ...fmt }: Format & { items: DashboardData["topItems"] }) {
  if (items.length === 0) return <Empty>Items will rank here once bills come in.</Empty>;
  const max = Math.max(...items.map((i) => Number(i.quantity)));
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.name} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
              {item.name}
            </span>
            <span className="shrink-0 tabular-nums">
              {item.quantity} <span className="text-muted-foreground">sold · {formatMoney(item.revenue, fmt)}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${max > 0 ? (Number(item.quantity) / max) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LowStock({ data }: { data: NonNullable<DashboardData["lowStock"]> }) {
  if (data.items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-6 text-sm text-success">
        <CircleCheck className="size-4" aria-hidden /> Everything tracked is above its reorder level.
      </p>
    );
  }
  return (
    <>
      <ul className="space-y-2">
        {data.items.map((item) => {
          const out = new D(item.stock).lessThanOrEqualTo(0);
          const Icon = out ? PackageX : AlertTriangle;
          return (
            <li key={item.id} className="flex items-center gap-3 text-sm">
              <Icon className={cn("size-4 shrink-0", out ? "text-destructive" : "text-warning")} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", out ? "bg-destructive/10 text-destructive" : "bg-warning/20")}>
                {out ? "Out of stock" : "Low"}
              </span>
              <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
                {item.stock} / {item.reorderLevel} {item.unit}
              </span>
            </li>
          );
        })}
      </ul>
      {data.total > data.items.length ? <p className="mt-3 text-xs text-muted-foreground">and {data.total - data.items.length} more</p> : null}
    </>
  );
}

export function RecentBills({ bills, locale, timeZone, walkIn }: { bills: DashboardData["recentBills"]; locale: string; timeZone: string; walkIn: string }) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        No bills yet.
        <Button asChild size="sm">
          <Link href="/billing">Create the first bill</Link>
        </Button>
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {bills.map((bill) => (
        <li key={bill.id}>
          <Link href="/bills" className="flex items-center gap-3 rounded-md py-2.5 text-sm hover:bg-accent/40">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{bill.customerName ?? walkIn}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {bill.billNo} · {formatDateTime(bill.createdAt, { locale, timeZone })}
              </span>
            </span>
            <BillStatusBadge status={bill.status} className="hidden sm:inline-flex" />
            <span className={cn("w-24 text-right tabular-nums", bill.status !== "completed" && "text-muted-foreground line-through")}>
              {formatMoney(bill.total, { currency: bill.currency, locale })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Where payments came from. Plain bars with the numbers beside them, so no hover is needed. */
export function PaymentSplit({ rows, ...fmt }: Format & { rows: DashboardData["paymentSplit"] }) {
  if (rows.length === 0) return <Empty>No payments in this period yet.</Empty>;
  const total = rows.reduce((acc, r) => acc.plus(r.amount), new D(0));
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const share = total.isZero() ? 0 : new D(row.amount).div(total).times(100).toDecimalPlaces(1).toNumber();
        return (
          <li key={row.method} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span>{PAYMENT_METHOD_LABELS[row.method]}</span>
              <span className="tabular-nums">
                {formatMoney(row.amount, fmt)} <span className="text-muted-foreground">· {share}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
            </div>
            <p className="sr-only">
              {PAYMENT_METHOD_LABELS[row.method]}: {share}% of payments across {row.bills} bills
            </p>
          </li>
        );
      })}
    </ul>
  );
}
