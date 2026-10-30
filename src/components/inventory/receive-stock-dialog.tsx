"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { D, formatMoney } from "@/lib/money";
import type { TrackedOption } from "@/services/StockService";

interface Line {
  key: number;
  menuItemId: string;
  quantity: string;
  costPrice: string;
}

interface ReceiveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: TrackedOption[];
  suppliers: Array<{ id: number; name: string; status: "active" | "disabled" }>;
  settings: { currency: string; locale: string };
  today: string;
  onSaved: () => void;
}

const NONE = "none";
let nextKey = 1;
const blankLine = (): Line => ({ key: nextKey++, menuItemId: "", quantity: "", costPrice: "" });

const decimal = (v: string, places: number) => (new RegExp(`^\\d+(\\.\\d{1,${places}})?$`).test(v) ? new D(v) : null);

/** Records a delivery: stock goes up and each item's cost price follows what was paid. */
export function ReceiveStockDialog({ open, onOpenChange, items, suppliers, settings, today, onSaved }: ReceiveStockDialogProps) {
  const [supplierId, setSupplierId] = useState(NONE);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [blankLine()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSupplierId(NONE);
    setInvoiceNo("");
    setDate(today);
    setNotes("");
    setLines([blankLine()]);
    setError("");
  };

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const pickItem = (key: number, id: string) => {
    const item = items.find((i) => String(i.id) === id);
    update(key, { menuItemId: id, costPrice: item && new D(item.costPrice).greaterThan(0) ? item.costPrice : "" });
  };

  const total = lines.reduce((sum, l) => {
    const q = decimal(l.quantity, 3);
    const c = decimal(l.costPrice, 2);
    return q && c ? sum.plus(q.times(c)) : sum;
  }, new D(0));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = lines.filter((l) => l.menuItemId || l.quantity || l.costPrice);
    if (chosen.length === 0) return setError("Add at least one item");
    for (const l of chosen) {
      const name = items.find((i) => String(i.id) === l.menuItemId)?.name ?? "An item";
      if (!l.menuItemId) return setError("Choose an item on every line");
      const q = decimal(l.quantity, 3);
      if (!q || q.lessThanOrEqualTo(0)) return setError(`Enter a quantity for ${name}`);
      if (!decimal(l.costPrice, 2)) return setError(`Enter the cost price for ${name}`);
    }
    if (new Set(chosen.map((l) => l.menuItemId)).size !== chosen.length) return setError("Each item can only appear once. Add the quantities together.");

    setError("");
    setSaving(true);
    try {
      await api.post("/api/inventory/purchases", {
        supplierId: supplierId === NONE ? null : Number(supplierId),
        invoiceNo,
        date,
        notes,
        items: chosen.map((l) => ({ menuItemId: Number(l.menuItemId), quantity: l.quantity, costPrice: l.costPrice })),
      });
      toast.success("Stock received");
      reset();
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const first = err instanceof ApiClientError ? Object.values(err.fieldErrors ?? {})[0]?.[0] : undefined;
      setError(first ?? errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive stock</DialogTitle>
          <DialogDescription>Adds what arrived to stock and updates each item&apos;s cost price.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="purchase-supplier">Supplier</FieldLabel>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="purchase-supplier" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No supplier</SelectItem>
                  {suppliers.filter((s) => s.status === "active").map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="purchase-invoice">Invoice no.</FieldLabel>
              <Input id="purchase-invoice" value={invoiceNo} maxLength={60} onChange={(e) => setInvoiceNo(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="purchase-date">Received on</FieldLabel>
              <Input id="purchase-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Items</legend>
            {lines.map((l, index) => {
              const unit = items.find((i) => String(i.id) === l.menuItemId)?.unit;
              return (
                <div key={l.key} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
                  <Select value={l.menuItemId} onValueChange={(v) => pickItem(l.key, v)}>
                    <SelectTrigger className="col-span-2 w-full sm:col-span-1" aria-label={`Item ${index + 1}`}><SelectValue placeholder="Choose an item" /></SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input inputMode="decimal" aria-label={`Quantity ${index + 1}${unit ? ` (${unit})` : ""}`} placeholder={unit ? `Qty (${unit})` : "Qty"} value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                  <Input inputMode="decimal" aria-label={`Cost price ${index + 1}`} placeholder="Cost each" value={l.costPrice} onChange={(e) => update(l.key, { costPrice: e.target.value })} />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove item ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, blankLine()])} disabled={lines.length >= 100}>
              <Plus aria-hidden /> Add item
            </Button>
          </fieldset>

          <Field>
            <FieldLabel htmlFor="purchase-notes">Notes (optional)</FieldLabel>
            <Input id="purchase-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div aria-live="polite">
            <FieldError>{error}</FieldError>
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <p className="text-sm">Total <span className="ml-1 text-lg font-semibold tabular-nums">{formatMoney(total.toFixed(2), settings)}</span></p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || items.length === 0}>
                {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
                Receive stock
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
