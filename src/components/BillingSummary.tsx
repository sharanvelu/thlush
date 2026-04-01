'use client';

import {BillingItem as TypeBillingItem} from "@/types/billing";
import {calculateTotalTaxPriceValue, calculateTotalValue, shouldIgnoreTax} from "@/helpers";
import {useMemo} from "react";

interface BillingSummaryProps {
  customerName: string;
  billingItems: TypeBillingItem[];
  isSaving: boolean;
  onSave: () => void;
  onClear: () => void;
  onPrint: () => void;
}

export default function BillingSummary({customerName, billingItems, isSaving, onSave, onClear, onPrint}: BillingSummaryProps) {
  const hasItems: boolean = billingItems.length > 0;
  const canSave: boolean = hasItems && !isSaving && !!customerName.trim();

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

  return (
    <div
      className={`fixed bottom-0 lg:sticky lg:top-18.5 ${hasItems ? '' : 'hidden'} lg:block w-full lg:w-1/4 h-1/3 lg:h-2/5 overflow-auto p-6 mt-0 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 items-center bg-gray-50 dark:bg-gray-800 px-4 rounded-2xl`}
    >
      {/* Customer */}
      {customerName !== '' && (
        <div className="text-[14px] text-[#5c5c68] dark:text-gray-300 lg:mb-2 min-h-5 lg:pb-2 border-b">
          <span className="text-[16px] font-extrabold">Customer:</span> {customerName}
        </div>
      )}

      {/* Line items */}
      <div className="text-sm text-[#555] dark:text-gray-300 min-h-15 lg:pb-2 border-b">
        {hasItems ? billingItems.map((item: TypeBillingItem) => (
          <div key={item.id} className="flex justify-between py-1">
            <div className="w-3/6 px-1.5">{item.name}</div>
            <div className="w-1/6 px-1.5 text-right">X {item.quantity}</div>
            <div className="w-2/6 px-1.5 text-right">
              {`${item.currency} ${calculateTotalValue(item.price, item.sgst, item.cgst, item.quantity)}`}
            </div>
          </div>
        )) : (
          <span>No food items selected yet.<br/></span>
        )}
      </div>

      {/* Totals */}
      <div className="flex flex-col justify-between text-sm lg:text-xl lg:font-bold lg:h-full">
        <div className="py-2 lg:py-5">
          <div className="flex">
            {!shouldIgnoreTax() && (
              <>
                <div className="w-3/6 p-1.5">Price</div>
                <div className="w-3/6 p-1.5">Tax</div>
              </>
            )}
            <div className="w-3/6 p-1.5">Total</div>
          </div>
          <div className="flex">
            {!shouldIgnoreTax() && (
              <>
                <div className="w-3/6 p-1.5">₹{totals.subtotal}</div>
                <div className="w-3/6 p-1.5">₹{totals.tax}</div>
              </>
            )}
            <div className="w-3/6 p-1.5">₹{totals.total}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row gap-3 flex-wrap">
          <button
            className="flex-1 min-w-40 rounded-[14px] px-5 py-2 text-[15px] font-semibold border-2 border-solid border-[#ffb347] text-[#ff7a18] bg-transparent cursor-pointer"
            onClick={onClear}
          >
            Clear All
          </button>
          <button
            className="flex gap-2 justify-center flex-1 min-w-45 border-none rounded-2xl px-5 py-2 text-[16px] font-semibold -bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{boxShadow: "0 12px 25px rgba(255,122,24,.3)"}}
            onClick={onSave}
            disabled={!canSave}
          >
            <svg width="23px" height="23px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 13V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16M4 8V6C4 4.89543 4.89543 4 6 4H14.1716C14.702 4 15.2107 4.21071 15.5858 4.58579L19.4142 8.41421C19.7893 8.78929 20 9.29799 20 9.82843V12M15 20V15H9V20" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isSaving ? 'Saving...' : 'Save Invoice'}
          </button>
          <button
            className="flex gap-2 justify-center flex-1 min-w-45 border-none rounded-2xl px-5 py-2 text-[16px] font-semibold -bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer"
            style={{boxShadow: "0 12px 25px rgba(255,122,24,.3)"}}
            onClick={onPrint}
          >
            <svg width="23px" height="23px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 15H16V18M16 18V21H8V18H4V9H8M16 18H20V9H8M8 9V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
