"use client";

import { useState } from "react";
import { VegMark } from "@/components/menu/menu-primitives";
import { unitPriceOf, type PosItem } from "@/components/pos/pos-cart";
import type { PosSettings } from "@/components/pos/pos-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatMoney } from "@/lib/money";

interface OptionDialogProps {
  /** The item being customised, or null when closed. Render with `key={item.id}` so state resets. */
  item: PosItem | null;
  settings: PosSettings;
  onCancel: () => void;
  onConfirm: (variant: string | null, addons: string[]) => void;
}

/** Choose a size and extras for an item that has them. A variant is required when the item has any. */
export function OptionDialog({ item, settings, onCancel, onConfirm }: OptionDialogProps) {
  const [variant, setVariant] = useState<string | null>(item?.variants[0]?.name ?? null);
  const [addons, setAddons] = useState<string[]>([]);

  if (!item) return null;
  const money = (v: string) => formatMoney(v, { currency: settings.currency, locale: settings.locale });
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
                  <label key={v.name} className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50">
                    <RadioGroupItem value={v.name} />
                    <span className="flex-1">{v.name}</span>
                    {Number(v.priceDelta) !== 0 ? <span className="text-muted-foreground tabular-nums">{signed(v.priceDelta)}</span> : null}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
          ) : null}

          {item.addons.length > 0 ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Add-ons</legend>
              <div className="flex flex-col gap-2">
                {item.addons.map((a) => (
                  <label key={a.name} className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50">
                    <Checkbox
                      checked={addons.includes(a.name)}
                      onCheckedChange={(checked) =>
                        setAddons((list) => (checked ? [...list, a.name] : list.filter((n) => n !== a.name)))
                      }
                    />
                    <span className="flex-1">{a.name}</span>
                    <span className="text-muted-foreground tabular-nums">+{money(a.price)}</span>
                  </label>
                ))}
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
            <Button onClick={() => onConfirm(variant, addons)} disabled={item.variants.length > 0 && !variant} autoFocus>
              Add to bill
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
