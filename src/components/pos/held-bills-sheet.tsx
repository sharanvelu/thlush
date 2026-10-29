"use client";

import { Archive, Loader2, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import type { PosSettings } from "@/components/pos/pos-types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { HeldBillSummary } from "@/types/bill";

interface HeldBillsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PosSettings & { timezone: string };
  onResume: (id: number) => void;
  /** Called with the new total whenever the list is loaded or changed. */
  onCount: (count: number) => void;
}

export function HeldBillsSheet({ open, onOpenChange, settings, onResume, onCount }: HeldBillsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Held bills</SheetTitle>
          <SheetDescription>Bills parked for later. Resume one to finish it.</SheetDescription>
        </SheetHeader>
        {/* Mounted only while open, so it loads a fresh list each time. */}
        <HeldList settings={settings} onResume={onResume} onCount={onCount} />
      </SheetContent>
    </Sheet>
  );
}

function HeldList({ settings, onResume, onCount }: Omit<HeldBillsSheetProps, "open" | "onOpenChange">) {
  const [bills, setBills] = useState<HeldBillSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<HeldBillSummary | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .get<HeldBillSummary[]>("/api/bills/held")
      .then((r) => {
        if (!live) return;
        setBills(r.data);
        onCount(r.data.length);
      })
      .catch((e: unknown) => live && setError(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [onCount]);

  const discard = async () => {
    if (!discarding) return;
    setPending(true);
    try {
      await api.delete(`/api/bills/${discarding.id}`);
      const next = (bills ?? []).filter((b) => b.id !== discarding.id);
      setBills(next);
      onCount(next.length);
      toast.success("Held bill discarded");
      setDiscarding(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>;
  if (bills === null) {
    return (
      <p role="status" className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading...
      </p>
    );
  }
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground">
        <Archive className="size-8 opacity-40" aria-hidden />
        <p className="text-sm font-medium text-foreground">No held bills</p>
        <p className="text-xs">Use &quot;Hold bill&quot; to park a bill while you serve someone else.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex-1 divide-y overflow-y-auto">
        {bills.map((bill) => (
          <li key={bill.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{bill.customerName ?? settings.walkInLabel}</p>
              <p className="text-xs text-muted-foreground">
                {bill.itemCount} {bill.itemCount === 1 ? "item" : "items"}
                {bill.tableNo ? ` · Table ${bill.tableNo}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(bill.createdAt, { locale: settings.locale, timeZone: settings.timezone })}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {formatMoney(bill.total, { currency: settings.currency, locale: settings.locale })}
            </span>
            <Button size="sm" onClick={() => onResume(bill.id)}>
              <Play aria-hidden /> Resume
            </Button>
            <Button size="icon" variant="ghost" className="size-8" onClick={() => setDiscarding(bill)} aria-label="Discard this held bill">
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
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
    </>
  );
}
