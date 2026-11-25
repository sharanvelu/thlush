"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { VegMark } from "@/components/menu/menu-primitives";
import { unitPriceOf, type PosItem } from "@/components/pos/pos-cart";
import type { PosSettings } from "@/components/pos/pos-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MAX_ADDON_QUANTITY, type AddonChoice } from "@/lib/addons";
import { formatMoney } from "@/lib/money";

interface OptionDialogProps {
  /** The item being customised, or null when closed. Render with `key={item.id}` so state resets. */
  item: PosItem | null;
  settings: PosSettings;
  onCancel: () => void;
  onConfirm: (variant: string | null, addons: AddonChoice[]) => void;
  /** Starting choices when editing a line already on the bill. */
  initialVariant?: string | null;
  initialAddons?: AddonChoice[];
  confirmLabel?: string;
}

/** Choose a size and extras for an item that has them. A variant is required when the item has any. */
export function OptionDialog({
  item,
  settings,
  onCancel,
  onConfirm,
  initialVariant,
  initialAddons,
  confirmLabel = "Add to bill",
}: OptionDialogProps) {
  const [variant, setVariant] = useState<string | null>(initialVariant ?? item?.variants[0]?.name ?? null);
  // How many of each add-on, by name. An add-on at zero is not on the line.
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries((initialAddons ?? []).map((a) => [a.name, a.quantity])),
  );
  const setCount = (name: string, next: number) =>
    setCounts((current) => ({ ...current, [name]: Math.min(MAX_ADDON_QUANTITY, Math.max(0, next)) }));

  if (!item) return null;
  const money = (v: string) => formatMoney(v, { currency: settings.currency, locale: settings.locale });
  // In the menu's order, so the same choices always make the same line.
  const addons: AddonChoice[] = item.addons.flatMap((a) =>
    (counts[a.name] ?? 0) > 0 ? [{ name: a.name, quantity: counts[a.name]! }] : [],
  );
  const price = unitPriceOf(item, variant, addons);
  const signed = (delta: string) => `${Number(delta) >= 0 ? "+" : "-"}${money(String(Math.abs(Number(delta))))}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <VegMark isVeg={item.isVeg} /> {item.name}
          </DialogTitle>
          <DialogDescription>Choose options for this item.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {item.variants.length > 0 ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Size</legend>
              <RadioGroup value={variant ?? ""} onValueChange={setVariant} className="gap-2">
                {item.variants.map((v) => (
                  <label
                    key={v.name}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50"
                  >
                    <RadioGroupItem value={v.name} />
                    <span className="flex-1">{v.name}</span>
                    {Number(v.priceDelta) !== 0 ? (
                      <span className="text-muted-foreground tabular-nums">{signed(v.priceDelta)}</span>
                    ) : null}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
          ) : null}

          {item.addons.length > 0 ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Add-ons</legend>
              <div className="flex flex-col gap-2">
                {item.addons.map((a) => {
                  const count = counts[a.name] ?? 0;
                  return (
                    <div
                      key={a.name}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${count > 0 ? "border-primary bg-accent/50" : ""}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{a.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">+{money(a.price)} each</span>
                      </span>
                      <div className="flex items-center gap-1" role="group" aria-label={`Quantity of ${a.name}`}>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          disabled={count === 0}
                          onClick={() => setCount(a.name, count - 1)}
                          aria-label={`Remove one ${a.name}`}
                        >
                          <Minus className="size-4" aria-hidden />
                        </Button>
                        <span className="w-7 text-center font-medium tabular-nums" aria-live="polite">
                          {count}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          disabled={count >= MAX_ADDON_QUANTITY}
                          onClick={() => setCount(a.name, count + 1)}
                          aria-label={`Add one ${a.name}`}
                        >
                          <Plus className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-lg font-semibold tabular-nums">{money(price.toFixed(2))}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(variant, addons)}
              disabled={item.variants.length > 0 && !variant}
              autoFocus
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
