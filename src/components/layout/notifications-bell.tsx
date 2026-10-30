"use client";

import { Bell, CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api-client";
import type { LowStockAlerts } from "@/services/StockService";

interface NotificationsBellProps {
  /** Low-stock alerts from the server render. Null when the viewer has no inventory alerts to see. */
  alerts: LowStockAlerts | null;
}

/** Notification centre. Currently carries low-stock alerts, refreshed whenever it is opened. */
export function NotificationsBell({ alerts: initial }: NotificationsBellProps) {
  const [alerts, setAlerts] = useState(initial);
  const [seenInitial, setSeenInitial] = useState(initial);
  // A new server render (after an adjustment or sale) replaces what was fetched earlier.
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setAlerts(initial);
  }

  const count = alerts?.total ?? 0;
  const refresh = (open: boolean) => {
    if (!open || initial === null) return;
    api
      .get<LowStockAlerts>("/api/inventory/alerts")
      .then((res) => setAlerts(res.data))
      .catch(() => undefined);
  };

  return (
    <Popover onOpenChange={refresh}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={count > 0 ? `Notifications, ${count} low on stock` : "Notifications, none unread"}>
          <Bell className="size-4" aria-hidden />
          {count > 0 ? (
            <span aria-hidden className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium">Notifications</p>
        {alerts && alerts.total > 0 ? (
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TriangleAlert className="size-3.5 text-warning" aria-hidden /> {alerts.total} {alerts.total === 1 ? "item is" : "items are"} low on stock
            </p>
            <ul className="mt-2 divide-y text-sm">
              {alerts.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate">{i.name}</span>
                  <span className={`shrink-0 tabular-nums ${Number(i.stock) <= 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {Number(i.stock) <= 0 ? "Out" : `${i.stock} ${i.unit}`}
                  </span>
                </li>
              ))}
            </ul>
            {alerts.total > alerts.items.length ? <p className="pt-1 text-xs text-muted-foreground">and {alerts.total - alerts.items.length} more</p> : null}
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/inventory?status=low">View stock</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
            <CircleCheck className="size-8 text-success" aria-hidden />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">{initial === null ? "Nothing needs your attention." : "Every tracked item is above its reorder level."}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
