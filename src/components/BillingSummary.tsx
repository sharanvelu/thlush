'use client';

import {BillingItem as TypeBillingItem} from "@/types/billing";
import {calculateTotalTaxPriceValue, calculateTotalValue, shouldIgnoreTax} from "@/helpers";
import {useMemo} from "react";
import Icon from "@/components/Icon";

interface BillingSummaryProps {
  customerName: string;
  billingItems: TypeBillingItem[];
  isSaving: boolean;
  isPrinting: boolean;
  onSave: () => void;
  onClear: () => void;
  onPrint: () => void;
}

export default function BillingSummary({customerName, billingItems, isSaving, isPrinting, onSave, onClear, onPrint}: BillingSummaryProps) {
  const hasItems: boolean = billingItems.length > 0;
  const canSave: boolean = hasItems && !isSaving && !isPrinting && !!customerName.trim();

  const totals = useMemo(() => {
    const subtotal: number = billingItems.reduce(
      (sum: number, item: TypeBillingItem): number => sum + (item.price * item.quantity), 0
    );
    const tax: number = billingItems.reduce(
      (sum: number, item: TypeBillingItem): number => sum + calculateTotalTaxPriceValue(item.price, item.sgst, item.cgst, item.quantity), 0
    );
    const total: number = billingItems.reduce(
      (sum: number, item: TypeBillingItem): number => sum + calculateTotalValue(item.price, item.sgst, item.cgst, item.quantity), 0
    );
    return {subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: total.toFixed(2)};
  }, [billingItems]);

  const ignoreTax: boolean = shouldIgnoreTax();

  return (
    <div className="receipt mb-2">
      <div className="px-5 pt-5 pb-3 text-center">
        <p className="eyebrow">Thlush</p>
        <h2 className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] text-ink">Current bill</h2>
        {customerName.trim() !== '' && (
          <p className="mt-1 text-[12px] text-ink-2 truncate">For {customerName}</p>
        )}
      </div>
      <hr className="rule-dash mx-5"/>

      {/* Line items */}
      <div className="px-5 py-3 max-h-[40vh] overflow-auto">
        {hasItems ? (
          <ul className="flex flex-col gap-2">
            {billingItems.map((item: TypeBillingItem) => (
              <li key={item.id} className="flex items-baseline gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-ink">{item.name}</span>
                <span className="num text-ink-3 shrink-0">x{item.quantity}</span>
                <span className="num w-20 text-right text-ink shrink-0">
                  {item.currency}{calculateTotalValue(item.price, item.sgst, item.cgst, item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center text-ink-3">
            <Icon name="receipt" size={22}/>
            <p className="text-[13px]">No items yet. Tap Add on a menu item.</p>
          </div>
        )}
      </div>
      <hr className="rule-dash mx-5"/>

      {/* Totals */}
      <div className="px-5 py-4">
        {!ignoreTax && (
          <div className="mb-2 flex flex-col gap-1 text-[13px] text-ink-2">
            <div className="flex justify-between"><span>Subtotal</span><span className="num">₹{totals.subtotal}</span></div>
            <div className="flex justify-between"><span>Tax</span><span className="num">₹{totals.tax}</span></div>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Total</span>
          <span className="num text-[30px] font-semibold leading-9 text-ink">₹{totals.total}</span>
        </div>
      </div>
      <hr className="rule-dash mx-5"/>

      {/* Actions */}
      <div className="flex flex-col gap-2 p-5">
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-lg flex-1"
            onClick={onSave}
            disabled={!canSave}
          >
            <Icon name="check" size={16}/>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-lg flex-1"
            onClick={onPrint}
            disabled={!canSave}
          >
            <Icon name="print" size={16}/>
            {isSaving ? 'Saving...' : (isPrinting ? 'Printing...' : 'Save & Print')}
          </button>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm self-center"
          onClick={onClear}
          disabled={!hasItems}
        >
          <Icon name="trash" size={14}/>
          Clear all
        </button>
      </div>
    </div>
  );
}
