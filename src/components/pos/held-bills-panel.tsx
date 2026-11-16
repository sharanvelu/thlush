"use client";

import { Archive, ChefHat, ChevronDown, ChevronUp, Play, Trash2, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import type { PosSettings } from "@/components/pos/pos-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { HeldBillSummary } from "@/types/bill";

/** Rows visible before "Show more", and the most rows the expanded list shows before it scrolls. */
const COLLAPSED_ROWS = 3;
const MAX_EXPANDED_ROWS = 10;

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
export function HeldBillsPanel({ bills: unsorted, activeId, settings, onResume, onDiscarded }: HeldBillsPanelProps) {
  const [discarding, setDiscarding] = useState<HeldBillSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const listId = useId();
  // Orders the kitchen already has come first. Within each group the list keeps its order (newest first).
  const bills = [...unsorted].sort((a, b) => Number(b.kotCount > 0) - Number(a.kotCount > 0));

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
      <ul
        id={listId}
        className={cn(
          expanded ? "max-h-[33rem]" : "max-h-40",
          "divide-y divide-warning/30 overflow-y-auto border-t border-dashed border-warning/40",
        )}
      >
        {bills.map((bill) => {
          const active = bill.id === activeId;
          return (
            <li
              key={bill.id}
              className={cn("flex items-center gap-2 px-3 py-2", bill.kotCount > 0 && "border-l-4 border-l-warning bg-warning/10")}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{bill.customerName ?? settings.walkInLabel}</span>
                  {bill.kotCount > 0 ? (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-warning">
                      <ChefHat className="size-3" aria-hidden /> Sent{bill.kotCount > 1 ? ` ×${bill.kotCount}` : ""}
                    </Badge>
                  ) : null}
                </p>
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
                className={cn("size-8", bill.kotCount > 0 && "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive")}
                onClick={() => setDiscarding(bill)}
                aria-label={`Discard held bill for ${bill.customerName ?? settings.walkInLabel}${bill.kotCount > 0 ? ", already sent to the kitchen" : ""}`}
                title={bill.kotCount > 0 ? "Already sent to the kitchen. Discard with care." : "Discard this held bill"}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>

      {bills.length > COLLAPSED_ROWS ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-none border-t border-dashed border-warning/40 text-xs"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <>
              <ChevronUp aria-hidden /> Show less
            </>
          ) : (
            <>
              <ChevronDown aria-hidden /> Show more ({Math.min(bills.length, MAX_EXPANDED_ROWS)})
            </>
          )}
        </Button>
      ) : null}

      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(o) => !o && setDiscarding(null)}
        title={discarding && discarding.kotCount > 0 ? "Discard an order already sent to the kitchen?" : "Discard this held bill?"}
        description={
          discarding && discarding.kotCount > 0 ? (
            <div className="flex flex-col gap-3">
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  The kitchen has already been sent {discarding.kotCount === 1 ? "this order once" : `this order ${discarding.kotCount} times`}. The
                  food may be cooked or on its way. Discarding does not tell the kitchen to stop.
                </span>
              </p>
              <p>The bill and its items are deleted. This can&apos;t be undone.</p>
            </div>
          ) : (
            "The parked bill and its items are deleted. This can't be undone."
          )
        }
        confirmLabel={discarding && discarding.kotCount > 0 ? "Discard anyway" : "Discard"}
        destructive
        pending={pending}
        onConfirm={discard}
      />
    </section>
  );
}
