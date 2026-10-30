"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { D } from "@/lib/money";
import { directionHint, MANUAL_REASONS, REASON_LABELS, type Direction, type ManualReason } from "@/lib/inventory";
import type { TrackedOption } from "@/services/StockService";

type Errors = Partial<Record<"menuItemId" | "quantity" | "reason" | "direction" | "note", string>>;

/** Adds or removes stock for one item and records why. */
export function AdjustForm({ items }: { items: TrackedOption[] }) {
  const router = useRouter();
  const [itemId, setItemId] = useState("");
  const [reason, setReason] = useState<ManualReason>("correction");
  const [direction, setDirection] = useState<Direction>("add");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const item = items.find((i) => String(i.id) === itemId);
  const qty = /^\d+(\.\d{1,3})?$/.test(quantity) ? new D(quantity) : null;
  const preview = item && qty ? new D(item.stock).plus(direction === "add" ? qty : qty.negated()) : null;

  const chooseReason = (next: ManualReason) => {
    setReason(next);
    const hint = directionHint(next);
    if (hint) setDirection(hint);
  };
  const locked = directionHint(reason) !== null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!item) next.menuItemId = "Choose an item";
    if (!qty || qty.lessThanOrEqualTo(0)) next.quantity = "Enter a quantity above zero";
    if (preview && preview.isNegative()) next.quantity = `Only ${item?.stock} ${item?.unit} on hand`;
    setErrors(next);
    if (Object.keys(next).length > 0 || !item) return;

    setSaving(true);
    try {
      await api.post("/api/inventory/adjustments", { menuItemId: item.id, direction, quantity, reason, note });
      toast.success(`${item.name} updated`);
      setQuantity("");
      setNote("");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors) {
        const mapped: Errors = {};
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field in { menuItemId: 1, quantity: 1, reason: 1, direction: 1, note: 1 } && messages[0]) mapped[field as keyof Errors] = messages[0];
        }
        if (Object.keys(mapped).length > 0) setErrors(mapped);
        else toast.error(errorMessage(error));
      } else toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6 shadow-card">
      <CardHeader>
        <CardTitle>Adjust stock</CardTitle>
        <CardDescription>Every change is written to the ledger below and can&apos;t be edited. Fix a mistake with another adjustment.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items track stock yet. Turn on Track stock for an item in the menu first.</p>
        ) : (
          <form onSubmit={submit} noValidate>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={Boolean(errors.menuItemId)}>
                  <FieldLabel htmlFor="adjust-item">Item</FieldLabel>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger id="adjust-item" className="w-full" aria-invalid={Boolean(errors.menuItemId)}>
                      <SelectValue placeholder="Choose an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item ? <FieldDescription>{item.stock} {item.unit} on hand</FieldDescription> : null}
                  <FieldError>{errors.menuItemId}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.reason)}>
                  <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
                  <Select value={reason} onValueChange={(v) => chooseReason(v as ManualReason)}>
                    <SelectTrigger id="adjust-reason" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MANUAL_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.reason}</FieldError>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel id="adjust-direction-label">Change</FieldLabel>
                  <ToggleGroup type="single" variant="outline" value={direction} onValueChange={(v) => v && !locked && setDirection(v as Direction)} aria-labelledby="adjust-direction-label" className="w-fit">
                    <ToggleGroupItem value="add" disabled={locked && direction !== "add"}>Add stock</ToggleGroupItem>
                    <ToggleGroupItem value="remove" disabled={locked && direction !== "remove"}>Remove stock</ToggleGroupItem>
                  </ToggleGroup>
                  {locked ? <FieldDescription>{REASON_LABELS[reason]} always {direction === "add" ? "adds" : "removes"} stock.</FieldDescription> : null}
                  <FieldError>{errors.direction}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.quantity)}>
                  <FieldLabel htmlFor="adjust-qty">Quantity{item ? ` (${item.unit})` : ""}</FieldLabel>
                  <Input id="adjust-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-invalid={Boolean(errors.quantity)} placeholder="0" />
                  {preview && !preview.isNegative() ? <FieldDescription>Stock after: {preview.toString()} {item?.unit}</FieldDescription> : null}
                  <FieldError>{errors.quantity}</FieldError>
                </Field>
              </div>
              <Field data-invalid={Boolean(errors.note)}>
                <FieldLabel htmlFor="adjust-note">Note (optional)</FieldLabel>
                <Input id="adjust-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Spilled during prep" />
                <FieldError>{errors.note}</FieldError>
              </Field>
              <div>
                <Button type="submit" disabled={saving}>
                  {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
                  Save adjustment
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
