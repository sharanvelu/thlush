"use client";

import {
  Archive,
  ChevronDown,
  Loader2,
  Minus,
  NotebookPen,
  Percent,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Tag,
  Trash2,
} from "lucide-react";
import { useId, useState, type Dispatch } from "react";
import { VegMark } from "@/components/menu/menu-primitives";
import { CustomerPicker } from "@/components/pos/customer-picker";
import { PaymentPanel } from "@/components/pos/payment-panel";
import {
  unitPriceOf,
  type CartAction,
  type CartLine,
  type PaymentResult,
  type PaymentState,
} from "@/components/pos/pos-cart";
import type { BillDetailsDraft, PosSettings } from "@/components/pos/pos-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { D, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BillTotals } from "@/services/calculations";
import { ORDER_TYPE_LABELS, type OrderType } from "@/types/bill";

interface CartPanelProps {
  lines: CartLine[];
  dispatch: Dispatch<CartAction>;
  details: BillDetailsDraft;
  onDetails: (patch: Partial<BillDetailsDraft>) => void;
  payment: PaymentState;
  onPayment: (state: PaymentState) => void;
  paymentResult: PaymentResult;
  totals: BillTotals;
  settings: PosSettings;
  pending: boolean;
  heldCount: number;
  resumedFromHold: boolean;
  /** Something typed on the bill is invalid (e.g. a discount). Blocks saving. */
  problem: string | null;
  onOpenHeld: () => void;
  onSave: (print: boolean) => void;
  onHold: () => void;
  onClear: () => void;
}

const ORDER_TYPES: OrderType[] = ["dine_in", "takeaway", "delivery"];

export function CartPanel(props: CartPanelProps) {
  const {
    lines,
    dispatch,
    details,
    onDetails,
    payment,
    onPayment,
    paymentResult,
    totals,
    settings,
    pending,
    heldCount,
    resumedFromHold,
    problem,
    onOpenHeld,
    onSave,
    onHold,
    onClear,
  } = props;
  const baseId = useId();
  const [discountOpen, setDiscountOpen] = useState<Set<string>>(new Set());
  const [notesOpen, setNotesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const money = (v: string) => formatMoney(v, { currency: settings.currency, locale: settings.locale });
  const currencySymbol =
    new Intl.NumberFormat(settings.locale, { style: "currency", currency: settings.currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? settings.currency;

  const empty = lines.length === 0;
  const total = totals.grandTotal;
  const canSave = !empty && !pending && paymentResult.valid && !problem;

  // One line that says what is set inside "Order details", so it is visible while collapsed.
  const extras: string[] = [];
  if (details.orderType) {
    const table = details.orderType === "dine_in" && details.tableNo.trim() ? ` ${details.tableNo.trim()}` : "";
    extras.push(`${ORDER_TYPE_LABELS[details.orderType]}${table}`);
  }
  if (settings.discountsEnabled && details.discountValue.trim() !== "") {
    extras.push(
      details.discountKind === "percent"
        ? `${details.discountValue.trim()}% off`
        : `${money(new D(details.discountValue.trim() || 0).toFixed(2))} off`,
    );
  }
  if (details.notes.trim()) extras.push("Note");

  const toggleDiscount = (key: string) =>
    setDiscountOpen((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section aria-label="Current bill" className="flex h-full min-h-0 flex-col rounded-xl border bg-card shadow-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ReceiptText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <h2 className="truncate text-sm font-semibold">Current bill</h2>
          {resumedFromHold ? <Badge variant="secondary">Resumed</Badge> : null}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onOpenHeld} aria-label={`Held bills, ${heldCount}`}>
            <Archive aria-hidden /> Held
            {heldCount > 0 ? <Badge className="ml-0.5 tabular-nums">{heldCount}</Badge> : null}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={empty && !resumedFromHold}
            aria-keyshortcuts="Alt+Backspace"
          >
            <Trash2 aria-hidden /> Clear
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {empty ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
            <ReceiptText className="size-8 opacity-40" aria-hidden />
            <p className="text-sm font-medium text-foreground">The bill is empty</p>
            <p className="max-w-56 text-xs">Tap an item, or scan a barcode, to add it.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y" aria-label="Items on the bill">
            {lines.map((line, index) => {
              const result = totals.lines[index];
              const unit = unitPriceOf(line.item, line.variant, line.addons);
              const discountShown = discountOpen.has(line.key) || line.discount !== "";
              const optionText = [line.variant, ...line.addons.map((a) => `+ ${a}`)].filter(Boolean).join(" ");
              return (
                <li key={line.key} className="flex flex-col gap-2 py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <VegMark isVeg={line.item.isVeg} />
                        <span className="truncate">{line.item.name}</span>
                      </p>
                      {optionText ? <p className="truncate text-xs text-muted-foreground">{optionText}</p> : null}
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {money(unit.toFixed(2))}
                        {line.item.unit !== "pcs" ? ` / ${line.item.unit}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{money(result?.total ?? "0.00")}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1" role="group" aria-label={`Quantity of ${line.item.name}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9"
                        onClick={() => dispatch({ type: "step", key: line.key, direction: -1 })}
                        aria-label={`Remove one ${line.item.name}`}
                      >
                        <Minus className="size-4" aria-hidden />
                      </Button>
                      <input
                        key={line.quantity}
                        defaultValue={line.quantity}
                        inputMode="decimal"
                        aria-label={`Quantity of ${line.item.name}`}
                        className="h-9 w-14 rounded-lg border bg-background text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={(e) => {
                          if (e.currentTarget.value !== line.quantity) {
                            dispatch({ type: "setQuantity", key: line.key, quantity: e.currentTarget.value });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9"
                        onClick={() => dispatch({ type: "step", key: line.key, direction: 1 })}
                        aria-label={`Add one ${line.item.name}`}
                      >
                        <Plus className="size-4" aria-hidden />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      {settings.discountsEnabled ? (
                        <Button
                          type="button"
                          variant={discountShown ? "secondary" : "ghost"}
                          size="icon"
                          className="size-9"
                          onClick={() => toggleDiscount(line.key)}
                          aria-label={`Discount for ${line.item.name}`}
                          aria-expanded={discountShown}
                        >
                          <Tag className="size-4" aria-hidden />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        onClick={() => dispatch({ type: "remove", key: line.key })}
                        aria-label={`Remove ${line.item.name} from the bill`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  {discountShown && settings.discountsEnabled ? (
                    <div className="flex items-center gap-2">
                      <label htmlFor={`${baseId}-${line.key}`} className="text-xs text-muted-foreground">
                        Line discount ({settings.currency})
                      </label>
                      <Input
                        id={`${baseId}-${line.key}`}
                        inputMode="decimal"
                        value={line.discount}
                        onChange={(e) => dispatch({ type: "setDiscount", key: line.key, discount: e.target.value })}
                        placeholder="0"
                        className="h-8 w-24 tabular-nums"
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-4 border-t pt-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Customer</p>
            <CustomerPicker
              value={details.customer}
              onChange={(customer) => onDetails({ customer })}
              walkInLabel={settings.walkInLabel}
            />
          </div>

          {settings.orderTypesEnabled || settings.discountsEnabled ? (
            <div className="rounded-lg border">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                aria-controls={`${baseId}-more`}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
              >
                <span className="font-medium">Order details</span>
                <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{extras.length > 0 ? extras.join(" · ") : "Type, discount, notes"}</span>
                  <ChevronDown
                    className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", moreOpen && "rotate-180")}
                    aria-hidden
                  />
                </span>
              </button>

              <div id={`${baseId}-more`} hidden={!moreOpen} className="flex flex-col gap-4 border-t px-3 py-3">
                {settings.orderTypesEnabled ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Order type</p>
                    <div className="flex gap-2">
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={details.orderType ?? ""}
                        onValueChange={(v) => onDetails({ orderType: (v || null) as OrderType | null })}
                        className="flex-1"
                        aria-label="Order type"
                      >
                        {ORDER_TYPES.map((t) => (
                          <ToggleGroupItem key={t} value={t} className="h-9 flex-1 text-xs">
                            {ORDER_TYPE_LABELS[t]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      {details.orderType === "dine_in" ? (
                        <Input
                          value={details.tableNo}
                          onChange={(e) => onDetails({ tableNo: e.target.value })}
                          placeholder="Table"
                          aria-label="Table number"
                          maxLength={20}
                          className="h-9 w-20"
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {settings.discountsEnabled ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${baseId}-discount`} className="text-xs font-medium text-muted-foreground">
                      Bill discount
                    </label>
                    <div className="flex gap-2">
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={details.discountKind}
                        onValueChange={(v) => v && onDetails({ discountKind: v as "percent" | "flat" })}
                        aria-label="Discount type"
                      >
                        <ToggleGroupItem value="percent" className="h-9 w-10" aria-label="Percent">
                          <Percent className="size-4" aria-hidden />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="flat" className="h-9 w-10" aria-label={`Amount in ${settings.currency}`}>
                          <span aria-hidden>{currencySymbol}</span>
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <Input
                        id={`${baseId}-discount`}
                        inputMode="decimal"
                        value={details.discountValue}
                        onChange={(e) => onDetails({ discountValue: e.target.value })}
                        placeholder={details.discountKind === "percent" ? "0 %" : "0.00"}
                        className="h-9 tabular-nums"
                      />
                    </div>
                  </div>
                ) : null}

                {notesOpen || details.notes ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${baseId}-notes`} className="text-xs font-medium text-muted-foreground">
                      Notes
                    </label>
                    <Textarea
                      id={`${baseId}-notes`}
                      value={details.notes}
                      onChange={(e) => onDetails({ notes: e.target.value })}
                      rows={2}
                      maxLength={300}
                      placeholder="Less spicy, pack separately..."
                    />
                  </div>
                ) : (
                  <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setNotesOpen(true)}>
                    <NotebookPen aria-hidden /> Add a note
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          <PaymentPanel state={payment} onChange={onPayment} total={total} result={paymentResult} settings={settings} />
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t bg-card px-4 py-3">
        <dl className="flex flex-col gap-1 text-sm">
          <Row label="Subtotal" value={money(totals.subtotal)} />
          {new D(totals.totalDiscount).greaterThan(0) ? <Row label="Discount" value={`-${money(totals.totalDiscount)}`} /> : null}
          {!settings.ignoreTax ? (
            <>
              <Row label="SGST" value={money(totals.sgst)} />
              <Row label="CGST" value={money(totals.cgst)} />
            </>
          ) : null}
          <div className="mt-1 flex items-baseline justify-between border-t pt-2">
            <dt className="text-base font-semibold">Total</dt>
            <dd className="text-xl font-bold tabular-nums" aria-live="polite">
              {money(total)}
            </dd>
          </div>
        </dl>

        {problem ? (
          <p role="alert" className="text-xs text-destructive">
            {problem}
          </p>
        ) : null}

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button
            size="lg"
            className="h-11 text-base"
            disabled={!canSave}
            onClick={() => onSave(false)}
            aria-keyshortcuts="Control+Enter Meta+Enter"
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            Save bill
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11"
            disabled={!canSave}
            onClick={() => onSave(true)}
            aria-keyshortcuts="Control+Shift+Enter"
          >
            <Printer aria-hidden /> Save &amp; print
          </Button>
        </div>
        <Button variant="ghost" size="sm" disabled={empty || pending} onClick={onHold} aria-keyshortcuts="Alt+H" className="w-full">
          <Archive aria-hidden /> {resumedFromHold ? "Update held bill" : "Hold bill"}
        </Button>
      </footer>
    </section>
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
