'use client';

import {MenuItem as TypeMenuItem} from "@/types/menu";
import {useEffect, useState} from "react";
import {BillingItem as TypeBillingItem} from "@/types/billing";
import {calculateTotalValue} from "@/helpers";

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

  return (
    <div
      className="flex flex-col gap-1.5 min-h-45 border-2 border-[#f0e6dd] dark:border-gray-700 bg-[#fffbf6] dark:bg-gray-950 text-[#1f1f1f] p-4.5 rounded-2xl">
      <h3 className="m-0 text-[18px] text-[#1f1f1f]] dark:text-gray-300 font-bold">{menu.name}</h3>
      <p className="mt-[1em] mb-[1em] text-[#1f1f1f]] dark:text-gray-300">{menu.description || ''}</p>
      <span className="text-[#f0673a] font-semibold">{menu.currency}{calculateTotalValue(menu.price, menu.cgst, menu.sgst)}</span>

      <div className="controls mt-auto flex items-center justify-between gap-3">
        <button
          className="w-9.5 h-9.5 rounded-xl border-none text-[22px] text-white cursor-pointer bg-[#1f70ff] active:not-disabled:scale-95 disabled:cursor-not-allowed"
          aria-label="Decrease quantity"
          style={{transition: "transform .15s"}}
          onClick={() => decrement()}
          disabled={quantity == 0}
        >-
        </button>
        <div className="flex-1 text-center text-[18px] text-[#1f1f1f]] dark:text-gray-300 font-semibold">
          <input
            className="w-full p-1.5 text-center focus-visible:outline-none"
            type="text"
            value={quantity}
            onChange={(e) => updateQuantity(e.target.value)}
          />
        </div>
        <button
          className="w-9.5 h-9.5 rounded-xl border-none text-[22px] text-white cursor-pointer bg-[#1f70ff] active:scale-95"
          aria-label="Increase quantity"
          style={{transition: "transform .15s"}}
          onClick={() => increment()}
        >+
        </button>
      </div>
    </div>
  );
} 