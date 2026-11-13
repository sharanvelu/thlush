"use client";

import { Archive, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import type { PosSettings } from "@/components/pos/pos-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { HeldBillSummary } from "@/types/bill";

interface HeldBillsPanelProps {
  bills: HeldBillSummary[];
  /** The held bill currently loaded on the screen, if any. */
  activeId: number | null;
  settings: PosSettings & { timezone: string };
  onResume: (id: number) => void;
  onDiscarded: (id: number) => void;
}

/**
 * Parked bills, always visible above the current bill. Dashed amber styling keeps them apart
 * from the solid "Current bill" card. Renders nothing when there are none.
 */
export function HeldBillsPanel({ bills, activeId, settings, onResume, onDiscarded }: HeldBillsPanelProps) {
  const [discarding, setDiscarding] = useState<HeldBillSummary | null>(null);
  const [pending, setPending] = useState(false);

  if (bills.length === 0) return null;

  const discard = async () => {
    if (!discarding) return;
    setPending(true);
    try {
      await api.delete(`/api/bills/${discarding.id}`);
      onDiscarded(discarding.id);
      toast.success("Held bill discarded");
      setDiscarding(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-label="Held bills"
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-dashed border-warning/60 bg-warning/10"
    >
      <header className="flex items-center gap-2 px-3 py-2">
        <Archive className="size-4 shrink-0 text-warning" aria-hidden />
        <h2 className="text-sm font-semibold">Held bills</h2>
        <Badge variant="secondary" className="tabular-nums">
          {bills.length}
        </Badge>
      </header>
      <ul className="max-h-40 divide-y divide-warning/30 overflow-y-auto border-t border-dashed border-warning/40">
        {bills.map((bill) => {
          const active = bill.id === activeId;
          return (
            <li key={bill.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{bill.customerName ?? settings.walkInLabel}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {bill.itemCount} {bill.itemCount === 1 ? "item" : "items"}
                  {bill.tableNo ? ` · Table ${bill.tableNo}` : ""}
                  {" · "}
                  {formatDateTime(bill.createdAt, { locale: settings.locale, timeZone: settings.timezone })}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {formatMoney(bill.total, { currency: settings.currency, locale: settings.locale })}
              </span>
              {active ? (
                <Badge variant="outline">On screen</Badge>
              ) : (
                <Button size="sm" variant="outline" className="h-8" onClick={() => onResume(bill.id)}>
                  <Play aria-hidden /> Resume
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setDiscarding(bill)}
                aria-label={`Discard held bill for ${bill.customerName ?? settings.walkInLabel}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(o) => !o && setDiscarding(null)}
        title="Discard this held bill?"
        description="The parked bill and its items are deleted. This can't be undone."
        confirmLabel="Discard"
        destructive
        pending={pending}
        onConfirm={discard}
      />
    </section>
  );
}
