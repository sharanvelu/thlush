"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import {
  quickCashAmounts,
  type PaymentResult,
  type PaymentRowState,
  type PaymentState,
} from "@/components/pos/pos-cart";
import type { PosSettings } from "@/components/pos/pos-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { D, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/types/bill";

const METHODS: PaymentMethod[] = ["cash", "card", "upi", "other"];

interface PaymentPanelProps {
  state: PaymentState;
  onChange: (state: PaymentState) => void;
  /** Bill total, 2 decimals. */
  total: string;
  result: PaymentResult;
  settings: PosSettings;
}

let rowCounter = 0;
const newRow = (method: PaymentMethod, amount = ""): PaymentRowState => ({
  id: `row-${++rowCounter}`,
  method,
  amount,
  reference: "",
});

export function PaymentPanel({ state, onChange, total, result, settings }: PaymentPanelProps) {
  const baseId = useId();
  const money = (v: string) => formatMoney(v, { currency: settings.currency, locale: settings.locale });
  const nothingToPay = new D(total).lessThanOrEqualTo(0);

  if (nothingToPay) {
    return <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Nothing to pay on this bill.</p>;
  }

  const setSplit = (split: boolean) => {
    if (split) {
      // Start the split from what is already chosen, with the rest to collect.
      onChange({ ...state, split: true, rows: [newRow(state.method, total)] });
    } else {
      onChange({ ...state, split: false });
    }
  };

  const updateRow = (id: string, patch: Partial<PaymentRowState>) =>
    onChange({ ...state, rows: state.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const addRow = () => {
    const remaining = new D(result.remaining);
    onChange({ ...state, rows: [...state.rows, newRow(state.rows.length === 0 ? "cash" : "upi", remaining.greaterThan(0) ? remaining.toFixed(2) : "")] });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Payment</h3>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Split payment
          <Switch checked={state.split} onCheckedChange={setSplit} aria-label="Split payment" />
        </label>
      </div>

      {!state.split ? (
        <>
          <ToggleGroup
            type="single"
            variant="outline"
            value={state.method}
            onValueChange={(v) => v && onChange({ ...state, method: v as PaymentMethod })}
            className="w-full"
            aria-label="Payment method"
          >
            {METHODS.map((m) => (
              <ToggleGroupItem key={m} value={m} className="h-10 flex-1">
                {PAYMENT_METHOD_LABELS[m]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {state.method === "cash" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor={`${baseId}-received`} className="text-xs text-muted-foreground">
                Cash received
              </label>
              <Input
                id={`${baseId}-received`}
                inputMode="decimal"
                value={state.received}
                onChange={(e) => onChange({ ...state, received: e.target.value })}
                placeholder={total}
                className="h-10 text-base tabular-nums"
                aria-describedby={`${baseId}-change`}
              />
              <div className="flex flex-wrap gap-1.5">
                {quickCashAmounts(total).map((amount, index) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange({ ...state, received: index === 0 ? "" : amount })}
                  >
                    {index === 0 ? "Exact" : money(amount)}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <Input
              value={state.reference}
              onChange={(e) => onChange({ ...state, reference: e.target.value })}
              placeholder={state.method === "upi" ? "UPI transaction id (optional)" : "Reference (optional)"}
              aria-label="Payment reference"
              maxLength={60}
              className="h-9"
            />
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {state.rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-1.5">
              <Select value={row.method} onValueChange={(v) => updateRow(row.id, { method: v as PaymentMethod })}>
                <SelectTrigger className="w-24 shrink-0" aria-label={`Payment ${index + 1} method`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="decimal"
                value={row.amount}
                onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                placeholder="Amount"
                aria-label={`Payment ${index + 1} amount`}
                className="h-9 min-w-0 flex-1 tabular-nums"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => onChange({ ...state, rows: state.rows.filter((r) => r.id !== row.id) })}
                aria-label={`Remove payment ${index + 1}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addRow} disabled={state.rows.length >= 6}>
            <Plus aria-hidden /> Add payment
          </Button>
        </div>
      )}

      <div id={`${baseId}-change`} role="status" aria-live="polite" className="text-sm">
        {result.valid ? (
          new D(result.change).greaterThan(0) ? (
            <p className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 font-medium text-success">
              <span>Change to give</span>
              <span className="tabular-nums">{money(result.change)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">Paid in full.</p>
          )
        ) : (
          <p className={cn("flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2 font-medium text-destructive")}>
            <span>{state.split ? "Still to collect" : "Short by"}</span>
            <span className="tabular-nums">{money(result.remaining)}</span>
          </p>
        )}
        {!result.valid && result.message && !new D(result.remaining).greaterThan(0) ? (
          <p className="mt-1 text-xs text-destructive">{result.message}</p>
        ) : null}
      </div>
    </div>
  );
}
