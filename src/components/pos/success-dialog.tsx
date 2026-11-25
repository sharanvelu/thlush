"use client";

import { CircleCheck, Download, Eye, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { D, formatMoney } from "@/lib/money";
import type { AppSettings } from "@/types/settings";
import type { BillDetail } from "@/types/bill";

interface SuccessDialogProps {
  bill: BillDetail | null;
  settings: AppSettings;
  onNewBill: () => void;
}

/** Seconds the dialog stays open before it closes itself. */
const AUTO_CLOSE_SECONDS = 10;

/** Shown after a bill is saved: the bill number, and everything you might do with the receipt. */
export function SuccessDialog({ bill, settings, onNewBill }: SuccessDialogProps) {
  // Keyed by bill, so every saved bill gets its own full countdown.
  return bill ? <Saved key={bill.id} bill={bill} settings={settings} onNewBill={onNewBill} /> : null;
}

function Saved({ bill, settings, onNewBill }: { bill: BillDetail; settings: AppSettings; onNewBill: () => void }) {
  const [left, setLeft] = useState(AUTO_CLOSE_SECONDS);

  useEffect(() => {
    const timer = window.setInterval(() => setLeft((n) => n - 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (left <= 0) onNewBill();
  }, [left, onNewBill]);

  const money = (v: string) => formatMoney(v, { currency: bill.currency, locale: settings.locale.locale });
  const change = new D(bill.changeDue);

  return (
    <Dialog open onOpenChange={(open) => !open && onNewBill()}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        {/* Sits just left of the dialog's own close (x) button, which is at top 2, right 2. */}
        <p
          className="absolute top-2 right-11 flex h-7 items-center text-xs text-muted-foreground tabular-nums"
          aria-live="off"
        >
          Closing in {Math.max(left, 0)}s
        </p>
        <DialogHeader className="items-center text-center">
          <CircleCheck className="size-12 text-success" aria-hidden />
          <DialogTitle className="text-xl">Bill saved</DialogTitle>
          <DialogDescription>
            <span className="block text-lg font-semibold text-foreground">{bill.billNo}</span>
            <span className="block tabular-nums">Total {money(bill.totalAmount)}</span>
          </DialogDescription>
        </DialogHeader>

        {change.greaterThan(0) ? (
          <p
            role="status"
            className="rounded-lg bg-success/10 px-4 py-3 text-center text-base font-semibold text-success"
          >
            Give back {money(bill.changeDue)}
          </p>
        ) : null}

        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <a href={`/receipt/${bill.id}`} target="_blank" rel="noopener noreferrer">
                <Eye aria-hidden /> View receipt
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/api/bills/${bill.id}/pdf`} download>
                <Download aria-hidden /> Download PDF
              </a>
            </Button>
          </div>
          <Button size="lg" onClick={onNewBill} autoFocus>
            <Plus aria-hidden /> New bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
