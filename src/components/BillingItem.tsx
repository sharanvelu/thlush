'use client';

import {MenuItem} from "@/types/menu";
import {useEffect, useState} from "react";

export default function BillingItem({menu, defaultCount}: { menu: MenuItem, defaultCount: number }) {
  const [count, setCount] = useState<number>(0);

  const increment = () => {
    setCount(count + 1);
  }
  const decrement = () => {
    setCount(Math.max(count - 1, 0));
  }

  useEffect(() => {
    setCount(defaultCount)
  }, [defaultCount]);

  return (
    <div
      className="flex flex-col gap-1.5 min-h-45 border-2 border-[#f0e6dd] dark:border-gray-700 bg-[#fffbf6] dark:bg-gray-950 text-[#1f1f1f] p-4.5 rounded-2xl">
      <h3 className="m-0 text-[18px] text-[#1f1f1f]] dark:text-gray-300 font-bold">{menu.name}</h3>
      <p className="mt-[1em] mb-[1em] text-[#1f1f1f]] dark:text-gray-300">{menu.description || ''}</p>
      <span className="text-[#f0673a] font-semibold">{menu.currency}{menu.price.toFixed(2)}</span>

      <div className="controls mt-auto flex items-center justify-between gap-3">
        <button
          className="w-9.5 h-9.5 rounded-xl border-none text-[22px] text-white cursor-pointer bg-[#1f70ff] active:not-disabled:scale-95 disabled:cursor-not-allowed"
          aria-label="Decrease quantity"
          style={{transition: "transform .15s"}}
          onClick={() => decrement()}
          disabled={count == 0}
        >-
        </button>
        <div className="flex-1 text-center text-[18px] text-[#1f1f1f]] dark:text-gray-300 font-semibold">
          {count}
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