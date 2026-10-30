"use client";

import { Ban, Download, ExternalLink, LoaderCircle, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { ReverseDialog } from "@/components/bills/reverse-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { D, formatMoney } from "@/lib/money";
import { printReceipt } from "@/lib/print";
import { receiptTotals } from "@/lib/receipt";
import { ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, type BillDetail } from "@/types/bill";

export interface HistorySettings {
  locale: string;
  timezone: string;
  walkInLabel: string;
}

interface BillDetailSheetProps {
  billId: number | null;
  onClose: () => void;
  canVoid: boolean;
  settings: HistorySettings;
  /** Called after a void or refund so the list can refresh. */
  onChanged: () => void;
}

export function BillDetailSheet({ billId, onClose, canVoid, settings, onChanged }: BillDetailSheetProps) {
  return (
    <Sheet open={billId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Bill details</SheetTitle>
          <SheetDescription>Items, tax, payments and actions for this bill.</SheetDescription>
        </SheetHeader>
        {/* Mounted per bill so each opening starts fresh and loads its own data. */}
        {billId !== null ? <Body key={billId} billId={billId} canVoid={canVoid} settings={settings} onChanged={onChanged} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function Body({ billId, canVoid, settings, onChanged }: Omit<BillDetailSheetProps, "onClose" | "billId"> & { billId: number }) {
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .get<BillDetail>(`/api/bills/${billId}`)
      .then((r) => live && setBill(r.data))
      .catch((e: unknown) => live && setError(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [billId]);

  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>;
  if (!bill) {
    return (
      <p role="status" className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading...
      </p>
    );
  }

  const money = (v: string) => formatMoney(v, { currency: bill.currency, locale: settings.locale });
  const totals = receiptTotals(bill);
  const showTax = new D(bill.totalTax).greaterThan(0);
  const change = new D(bill.changeDue);
  const meta: Array<[string, string | null]> = [
    ["Date", formatDateTime(bill.createdAt, { locale: settings.locale, timeZone: settings.timezone })],
    ["Customer", bill.customer?.name ?? settings.walkInLabel],
    ["Phone", bill.customer?.phone ?? null],
    ["Cashier", bill.cashier?.name ?? null],
    ["Order", [bill.orderType ? ORDER_TYPE_LABELS[bill.orderType] : null, bill.tableNo ? `Table ${bill.tableNo}` : null].filter(Boolean).join(" · ") || null],
    ["Notes", bill.notes],
  ];

  return (
    <>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold">{bill.billNo}</p>
          <BillStatusBadge status={bill.status} />
        </div>

        {bill.status === "void" || bill.status === "refunded" ? (
          <p role="note" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm">
            <span className="font-medium">{bill.status === "void" ? "Voided" : "Refunded"}:</span> {bill.voidReason}
          </p>
        ) : null}

        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          {meta
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
        </dl>

        <table className="w-full text-sm">
          <caption className="sr-only">Items on the bill</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 font-medium">Item</th>
              <th className="py-1.5 text-right font-medium">Qty</th>
              <th className="py-1.5 text-right font-medium">Price</th>
              <th className="py-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bill.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 pr-2">
                  {item.name}
                  {new D(item.discount).greaterThan(0) ? (
                    <span className="block text-xs text-muted-foreground">Discount -{money(item.discount)}</span>
                  ) : null}
                </td>
                <td className="py-2 text-right tabular-nums">{new D(item.quantity).toString()}</td>
                <td className="py-2 text-right tabular-nums">{money(item.price)}</td>
                <td className="py-2 text-right tabular-nums">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="space-y-1 border-t pt-3 text-sm">
          <Row label="Subtotal" value={money(totals.subtotal)} />
          {new D(totals.discount).greaterThan(0) ? <Row label="Discount" value={`-${money(totals.discount)}`} /> : null}
          {showTax ? (
            <>
              <Row label="SGST" value={money(totals.sgst)} />
              <Row label="CGST" value={money(totals.cgst)} />
            </>
          ) : null}
          <div className="flex items-baseline justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(bill.totalAmount)}</dd>
          </div>
        </dl>

        {bill.payments.length > 0 ? (
          <section aria-label="Payments">
            <h3 className="mb-1.5 text-sm font-medium">Payments</h3>
            <ul className="space-y-1 text-sm">
              {bill.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {PAYMENT_METHOD_LABELS[p.method]}
                    {p.reference ? <span className="text-muted-foreground"> · {p.reference}</span> : null}
                  </span>
                  <span className="tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
              {change.greaterThan(0) ? (
                <li className="flex justify-between text-muted-foreground">
                  <span>Cash received {money(bill.amountPaid)}</span>
                  <span className="tabular-nums">Change {money(bill.changeDue)}</span>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t p-4">
        <Button variant="outline" onClick={() => void printReceipt(bill.id)}>
          <Printer aria-hidden /> Reprint
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/bills/${bill.id}/pdf`} download>
            <Download aria-hidden /> PDF
          </a>
        </Button>
        <Button variant="ghost" asChild>
          <a href={`/receipt/${bill.id}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden /> Open receipt
          </a>
        </Button>
        {canVoid && bill.status === "completed" ? (
          <Button variant="destructive" className="ml-auto" onClick={() => setReversing(true)}>
            <Ban aria-hidden /> Void / refund
          </Button>
        ) : null}
      </div>

      {reversing ? (
        <ReverseDialog
          bill={bill}
          onClose={() => setReversing(false)}
          onDone={(updated) => {
            setBill(updated);
            setReversing(false);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
