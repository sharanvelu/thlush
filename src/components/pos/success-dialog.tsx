"use client";

import { CircleCheck, Download, Eye, Mail, MessageCircle, Plus, Printer } from "lucide-react";
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
import { printReceipt } from "@/lib/print";
import { buildReceiptModel, mailtoUrl, whatsappUrl } from "@/lib/receipt";
import type { AppSettings } from "@/types/settings";
import type { BillDetail } from "@/types/bill";

interface SuccessDialogProps {
  bill: BillDetail | null;
  settings: AppSettings;
  onNewBill: () => void;
}

/** Shown after a bill is saved: the bill number, and everything you might do with the receipt. */
export function SuccessDialog({ bill, settings, onNewBill }: SuccessDialogProps) {
  if (!bill) return null;
  const model = buildReceiptModel(bill, settings);
  const money = (v: string) => formatMoney(v, { currency: bill.currency, locale: settings.locale.locale });
  const change = new D(bill.changeDue);

  return (
    <Dialog open onOpenChange={(open) => !open && onNewBill()}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center">
          <CircleCheck className="size-12 text-success" aria-hidden />
          <DialogTitle className="text-xl">Bill saved</DialogTitle>
          <DialogDescription>
            <span className="block text-lg font-semibold text-foreground">{bill.billNo}</span>
            <span className="block tabular-nums">Total {money(bill.totalAmount)}</span>
          </DialogDescription>
        </DialogHeader>

        {change.greaterThan(0) ? (
          <p role="status" className="rounded-lg bg-success/10 px-4 py-3 text-center text-base font-semibold text-success">
            Give back {money(bill.changeDue)}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => void printReceipt(bill.id)}>
            <Printer aria-hidden /> Print receipt
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/bills/${bill.id}/pdf`} download>
              <Download aria-hidden /> Download PDF
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={whatsappUrl(model)} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden /> WhatsApp
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={mailtoUrl(model, bill.customer?.email ?? null)}>
              <Mail aria-hidden /> Email
            </a>
          </Button>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" asChild>
            <a href={`/receipt/${bill.id}`} target="_blank" rel="noopener noreferrer">
              <Eye aria-hidden /> View receipt
            </a>
          </Button>
          <Button size="lg" onClick={onNewBill} autoFocus>
            <Plus aria-hidden /> New bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
