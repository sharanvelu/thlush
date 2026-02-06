'use client';

import BillingItem from "@/components/BillingItem";
import {useState} from "react";
import {MenuItem as TypeMenuItem} from "@/types/menu";
import {BillingItem as TypeBillingItem} from "@/types/billing";
import {MenuItems as MenuItemsData} from "@/data/MenuItem";
import InputField from "@/components/Inputs/Input";

export default function BillingPage() {
  const [customerName, setCustomerName] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  const [billingItems, setBillingItems] = useState<TypeBillingItem[]>([]);

  const filterItems = (value: string) => {
    setFilterValue(value)
  }

  const updateItem = (item: TypeBillingItem, count: number) => {
    setBillingItems((prev: TypeBillingItem[]) => {
      const idx: number = prev.findIndex((x: TypeBillingItem): boolean => x.id === item.id);

      if (idx !== -1) {
        // update existing
        const next: TypeBillingItem[] = [...prev];
        next[idx] = {...next[idx], count};
        return next;
      }

      // add new
      return [...prev, {...item, count}];
    });
  }

  const calculateBillingItemPrice = (billingItem: TypeBillingItem): number => {
    const totalAmountBeforeTax: number = billingItem.price * billingItem.count;
    const totalTax: number = totalAmountBeforeTax * billingItem.tax / 100;

    return totalAmountBeforeTax + totalTax;
  }

  const totalBillingAmountWithoutTax = (): string => {
    return billingItems.reduce(
      (sum: number, billingItem: TypeBillingItem): number => sum + (billingItem.price * billingItem.count),
      0
    ).toFixed(2);
  }

  const totalTax = (): string => {
    return billingItems.reduce(
      (sum: number, billingItem: TypeBillingItem): number => sum + (billingItem.price * billingItem.count * billingItem.tax / 100),
      0
    ).toFixed(2);
  }

  const totalBillingAmount = (): string => {
    return billingItems.reduce(
      (sum: number, billingItem: TypeBillingItem): number => sum + calculateBillingItemPrice(billingItem),
      0
    ).toFixed(2);
  }

  const clearBilling = () => {
    const confirmation: boolean = window.confirm('Do you really want to clear the items?')
    if (confirmation) {
      setBillingItems([])
    }
  }

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 rounded-2xl sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            New Bill
          </h1>
        </div>

        <div className="mt-10 lg:flex gap-4">
          <div className="lg:w-3/4 space-y-12">
            {/* Billing Customer name */}
            <div
              className="bg-[#fffbf6] dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-8">
              <div className="mb-4">
                <label className="block mb-1.5 font-semibold text-[#1f1f1f]] dark:text-gray-300 text-sm">
                  Customer Name:
                </label>
                <input
                  className="max-w-100 w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-600 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                  type="text"
                  placeholder="Enter customer name (optional)"
                  style={{transition: "border-color 0.2s"}}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            {/* Menu Items List */}
            <div
              className="bg-gray-100 dark:bg-gray-900 px-4 py-6 rounded-2xl border-2 border-[#f0e6dd] dark:border-gray-600">
              <InputField
                id="filter"
                title="Filter"
                placeholder="Filter Items"
                value={filterValue}
                onchange={(e) => filterItems(e.target.value)}
              />
              <div className="grid gap-4.5" style={{gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"}}>
                {MenuItemsData.map((menuItem: TypeMenuItem) => (
                  <BillingItem
                    key={menuItem.id}
                    menu={menuItem}
                    billingCount={billingItems.find((x: TypeBillingItem): boolean => x.id === menuItem.id)?.count ?? 0}
                    updateItem={updateItem}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bill Pricing Section */}
          <div
            className="pt-6 mt-8 lg:mt-0 border-t border-dashed lg:border-none lg:w-1/4 border-[#e0d7cf] grid gap-3.5 items-center h-2/5">
            {customerName !== '' && (
              <div className="text-[14px] text-[#5c5c68] dark:text-gray-300 mb-2 min-h-5">
                <><span className="text-[16px] font-extrabold">Customer:</span> {customerName}</>
              </div>
            )}

            <div className="text-sm text-[#555] dark:text-gray-300 min-h-15">
              {billingItems.map((billingItem: TypeBillingItem) => (
                <div key={billingItem.id} className="flex justify-between">
                  <div className="w-3/6 p-1.5">
                    {billingItem.name}
                  </div>
                  <div className="w-1/6 p-1.5 text-right">
                    X {billingItem.count}
                  </div>
                  <div className="w-2/6 p-1.5 text-right">
                    {`${billingItem.currency} ${calculateBillingItemPrice(billingItem)}`}
                  </div>
                </div>
              ))}
              {billingItems.length == 0 && (
                <span>No food items selected yet. <br/></span>
              )}
            </div>

            <div className="flex flex-col justify-between text-xl font-bold h-full">
              <div className="py-5">
                <div className="flex">
                  <div className="w-3/6 p-1.5">Item Total</div>
                  <div className="w-3/6 p-1.5 text-right">₹<span>{totalBillingAmountWithoutTax()}</span></div>
                </div>
                <div className="flex">
                  <div className="w-3/6 p-1.5">Total Tax</div>
                  <div className="w-3/6 p-1.5 text-right">₹<span>{totalTax()}</span></div>
                </div>
                <div className="flex">
                  <div className="w-3/6 p-1.5">Grand Total</div>
                  <div className="w-3/6 p-1.5 text-right">₹<span>{totalBillingAmount()}</span></div>
                </div>
              </div>
              <div className="flex flex-col gap-3 flex-wrap">
                <button
                  className="flex-1 min-w-40 rounded-[14px] px-5 py-3.5 text-[15px] font-semibold border-2 border-solid border-[#ffb347] text-[#ff7a18] bg-transparent cursor-pointer"
                  onClick={clearBilling}
                >Clear All
                </button>
                <button
                  className="flex-1 min-w-45 border-none rounded-2xl px-5 py-3.5 text-[16px] font-semibold -bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer"
                  style={{boxShadow: "0 12px 25px rgba(255,122,24,.3)"}}
                >Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
