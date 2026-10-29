'use client';

import {MenuItem as TypeMenuItem} from "@/types/menu";
import {useEffect, useState} from "react";
import {BillingItem as TypeBillingItem} from "@/types/billing";
import {calculateTotalValue} from "@/helpers";
import Icon from "@/components/Icon";

interface BillingItemProp {
  menu: TypeMenuItem,
  billingQuantity: number,
  updateItem: (item: TypeBillingItem, quantity: number) => void
}

export default function BillingItem({menu, billingQuantity, updateItem}: BillingItemProp) {
  const [quantity, setQuantity] = useState<number>(0);

  const increment = () => {
    const currentValue: number = Math.min(100, quantity + 1);
    setQuantity(currentValue);
    updateItem(menu as TypeBillingItem, currentValue);
  }
  const decrement = () => {
    const currentValue: number = Math.max(0, quantity - 1);
    setQuantity(currentValue);
    updateItem(menu as TypeBillingItem, currentValue);
  }

  const updateQuantity = (value: string) => {
    if (value === '') {
      setQuantity(0);
      updateItem(menu as TypeBillingItem, 0);
      return
    }

    if (parseInt(value)) {
      // Should be less than 0 and greater than 100
      const currentValue: number = Math.max(0, Math.min(100, parseInt(value)));
      setQuantity(currentValue);
      updateItem(menu as TypeBillingItem, currentValue)
      return
    }
  }

  useEffect(() => {
    setQuantity(billingQuantity)
  }, [billingQuantity]);

  const inCart: boolean = quantity > 0;

  return (
    <div
      className={`flex flex-col gap-2 min-h-[104px] rounded-[10px] p-3.5 transition-[box-shadow,background-color] duration-150 ${inCart ? 'bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent)]' : 'bg-surface shadow-ring hover:shadow-[0_0_0_1px_var(--line-strong),0_2px_8px_-2px_rgba(60,40,10,0.12)]'}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-ink leading-5 min-w-0">{menu.name}</h3>
        <span className="num text-[13px] font-medium text-ink shrink-0">{menu.currency}{calculateTotalValue(menu.price, menu.cgst, menu.sgst)}</span>
      </div>
      {menu.description && <p className="text-[12px] leading-4 text-ink-3 line-clamp-2">{menu.description}</p>}

      <div className="mt-auto pt-1 flex items-center justify-end">
        {inCart ? (
          <div className="pop flex items-center gap-1 rounded-[8px] bg-surface p-0.5 shadow-ring">
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              aria-label="Decrease quantity"
              onClick={() => decrement()}
            >
              <Icon name="minus" size={14}/>
            </button>
            <input
              className="num w-9 bg-transparent text-center text-[13px] font-semibold text-ink focus-visible:outline-none"
              type="text"
              inputMode="numeric"
              aria-label={`${menu.name} quantity`}
              value={quantity}
              onChange={(e) => updateQuantity(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm btn-icon"
              aria-label="Increase quantity"
              onClick={() => increment()}
            >
              <Icon name="plus" size={14}/>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label={`Add ${menu.name}`}
            onClick={() => increment()}
          >
            <Icon name="plus" size={14}/>
            Add
          </button>
        )}
      </div>
    </div>
  );
}
